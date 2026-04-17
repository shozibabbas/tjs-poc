import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PASSPORT_HEADER = "passport_no";
const VISA_STATUS_HEADER = "visa_status";

export async function POST(req: Request) {
    const token = (await cookies()).get("tjs_session")?.value;
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (session?.role !== "superadmin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const sheetName = String(formData.get("sheetName") || "").trim();

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing Excel file." }, { status: 400 });
    }

    if (!sheetName) {
        return NextResponse.json({ error: "Missing worksheet selection." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let workbook: XLSX.WorkBook;

    try {
        workbook = XLSX.read(buffer, {
            type: "buffer",
            cellStyles: true,
            cellNF: true,
            cellDates: true,
            bookVBA: true,
        });
    } catch {
        return NextResponse.json({ error: "Unable to read the uploaded XLSX file." }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
        return NextResponse.json({ error: `Worksheet \"${sheetName}\" not found.` }, { status: 400 });
    }

    const headerInfo = findHeaderRow(worksheet);
    if (!headerInfo) {
        return NextResponse.json({ error: "Could not find both Passport_No and Visa_Status columns in the selected sheet." }, { status: 400 });
    }

    const { headerRowNumber, passportColumnNumber, visaStatusColumnNumber } = headerInfo;

    const passportRows: Array<{ rowNumber: number; passport: string }> = [];
    const ref = worksheet["!ref"];
    if (!ref) {
        return NextResponse.json({ error: "Selected worksheet is empty." }, { status: 400 });
    }

    const range = XLSX.utils.decode_range(ref);
    for (let rowNumber = headerRowNumber + 1; rowNumber <= range.e.r + 1; rowNumber++) {
        const passportValue = normalizePassport(readCellText(getSheetCell(worksheet, rowNumber, passportColumnNumber)?.v));

        if (!passportValue) {
            continue;
        }

        passportRows.push({ rowNumber, passport: passportValue });
    }

    const uniquePassports = Array.from(new Set(passportRows.map((entry) => entry.passport)));
    const passportMap = await loadPassportStatusMap(uniquePassports);

    let updatedRows = 0;
    let matchedRows = 0;
    let untouchedRows = 0;

    for (const entry of passportRows) {
        const statusValue = passportMap.get(entry.passport);
        if (!statusValue) {
            untouchedRows += 1;
            continue;
        }

        matchedRows += 1;
        const visaAddress = encodeAddress(entry.rowNumber, visaStatusColumnNumber);
        const existingCell = worksheet[visaAddress];
        const existingValue = readCellText(existingCell?.v).trim();

        if (existingValue !== statusValue) {
            if (existingCell) {
                existingCell.v = statusValue;
                existingCell.t = "s";
                delete existingCell.w;
            } else {
                worksheet[visaAddress] = { t: "s", v: statusValue };
            }
            updatedRows += 1;
        }
    }

    const output = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
    });
    const downloadName = buildDownloadName(file.name);

    return new NextResponse(Buffer.from(output), {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${downloadName}"`,
            "Cache-Control": "no-store",
            "X-TJS-Updated-Rows": String(updatedRows),
            "X-TJS-Matched-Rows": String(matchedRows),
            "X-TJS-Untouched-Rows": String(untouchedRows),
            "X-TJS-Sheet-Name": sheetName,
        },
    });
}

async function loadPassportStatusMap(passports: string[]) {
    const result = new Map<string, string>();
    if (passports.length === 0) {
        return result;
    }

    const applications = await prisma.application.findMany({
        where: {
            OR: passports.map((passport) => ({
                passport: { equals: passport, mode: "insensitive" },
            })),
        },
        select: {
            passport: true,
            EMGSLink: {
                select: {
                    progressPercentage: true,
                },
            },
        },
    });

    for (const application of applications) {
        if (!application.EMGSLink?.progressPercentage) {
            continue;
        }

        const normalizedPassport = normalizePassport(application.passport);
        if (!normalizedPassport) {
            continue;
        }

        const percentage = String(application.EMGSLink.progressPercentage).trim();
        result.set(normalizedPassport, percentage.endsWith("%") ? percentage : `${percentage}%`);
    }

    return result;
}

function findHeaderRow(worksheet: XLSX.WorkSheet) {
    const ref = worksheet["!ref"];
    if (!ref) return null;

    const range = XLSX.utils.decode_range(ref);

    for (let rowIdx = range.s.r; rowIdx <= range.e.r; rowIdx++) {
        let passportColumnNumber: number | null = null;
        let visaStatusColumnNumber: number | null = null;

        for (let colIdx = range.s.c; colIdx <= range.e.c; colIdx++) {
            const address = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
            const normalized = normalizeHeader(readCellText(worksheet[address]?.v));

            if (normalized === PASSPORT_HEADER) {
                passportColumnNumber = colIdx + 1;
            }
            if (normalized === VISA_STATUS_HEADER) {
                visaStatusColumnNumber = colIdx + 1;
            }
        }

        if (passportColumnNumber != null && visaStatusColumnNumber != null) {
            return {
                headerRowNumber: rowIdx + 1,
                passportColumnNumber,
                visaStatusColumnNumber,
            };
        }
    }

    return null;
}

function normalizeHeader(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizePassport(value: string) {
    return value.trim().toUpperCase();
}

function readCellText(value: unknown): string {
    if (value == null) {
        return "";
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === "object") {
        const maybeText = value as { text?: unknown; richText?: Array<{ text?: string }>; result?: unknown; formula?: unknown };

        if (typeof maybeText.text === "string") {
            return maybeText.text;
        }
        if (Array.isArray(maybeText.richText)) {
            return maybeText.richText.map((part) => part?.text ?? "").join("");
        }
        if (maybeText.result != null) {
            return String(maybeText.result);
        }
        if (maybeText.formula != null) {
            return String(maybeText.formula);
        }
    }

    return "";
}

function encodeAddress(rowNumber: number, columnNumber: number) {
    return XLSX.utils.encode_cell({ r: rowNumber - 1, c: columnNumber - 1 });
}

function getSheetCell(worksheet: XLSX.WorkSheet, rowNumber: number, columnNumber: number) {
    return worksheet[encodeAddress(rowNumber, columnNumber)];
}

function buildDownloadName(fileName: string) {
    const cleanName = fileName.toLowerCase().endsWith(".xlsx") ? fileName.slice(0, -5) : fileName;
    return `${cleanName}-emgs-updated.xlsx`;
}