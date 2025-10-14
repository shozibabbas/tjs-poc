"use client";

import ApplicationsListing from "@/components/applications/listing";
import { JSX, Usable } from "react";

export default function ApplicationsPage(props: JSX.IntrinsicAttributes & { params: Usable<{ agentId: string; }>; }) {
    return (
        <ApplicationsListing {...props} />
    )
}
