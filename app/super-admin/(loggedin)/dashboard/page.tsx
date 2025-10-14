import React from 'react';
import {redirect} from "next/navigation";

function SuperAdminDashboardPage() {
    redirect("/super-admin/applications");
    return (
        <div></div>
    );
}

export default SuperAdminDashboardPage;
