"use client";

import ApplicationEditForm from "@/components/applications/edit-form";
import { JSX, Usable } from "react";

export default function EditApplicationPage(props: JSX.IntrinsicAttributes & { params: Usable<{ id: string; }>; }) {
    return (
        <ApplicationEditForm {...props} />
    )
}
