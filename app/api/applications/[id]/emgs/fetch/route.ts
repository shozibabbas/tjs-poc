// app/api/applications/[id]/emgs/fetch/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    if (application.country.toLowerCase() !== "malaysia") {
        return NextResponse.json({ error: "EMGS applies to Malaysia only." }, { status: 400 });
    }

    fetch("https://visa.educationmalaysia.gov.my/emgs/application/searchPost/", {
        "headers": {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "priority": "u=0, i",
            "sec-ch-ua": "\"Google Chrome\";v=\"141\", \"Not?A_Brand\";v=\"8\", \"Chromium\";v=\"141\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"macOS\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
            "cookie": "om_frontend=1d8tif0odsmedqalc362buvd12",
            "Referer": "https://visa.educationmalaysia.gov.my/emgs/application/searchForm"
        },
        "body": "form_key=iqs68cZJo9DLBklY&travel_doc_no=AJ8527223&nationality=PK&agreement=1",
        "method": "POST"
    });

    // Upsert EMGSLink
    const now = new Date();
    // const emgs = await prisma.eMGSLink.upsert({
    //     where: { applicationId: application.id },
    //     create: {
    //         applicationId: application.id,
    //         progressPercentage: "0",
    //         progressRemark: "Fetching EMGS details… please check back shortly.",
    //     },
    //     update: {
    //         progressRemark: "EMGS refresh requested. Please check back shortly.",
    //         updatedAt: now,
    //     },
    // });

    return NextResponse.json({
        ok: true,
        // emgsId: emgs.id
    });
}
