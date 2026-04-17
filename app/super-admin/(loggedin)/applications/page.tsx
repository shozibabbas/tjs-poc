"use client";

import ApplicationsListing from "@/components/applications/listing";
import EmgsExcelUpdater from "@/components/applications/emgs-excel-updater";
import { JSX, Usable } from "react";

export default function ApplicationsPage(props: JSX.IntrinsicAttributes & { params: Usable<{ agentId: string; }>; }) {
    return (
        <div className="space-y-6">
            <EmgsExcelUpdater />
            <ApplicationsListing {...props} />
        </div>
    )
}
