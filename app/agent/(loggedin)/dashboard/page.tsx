import React from 'react';
import {redirect} from "next/navigation";

function AgentDashboardPage() {
    redirect("/agent/applications");
    return (
        <div></div>
    );
}

export default AgentDashboardPage;
