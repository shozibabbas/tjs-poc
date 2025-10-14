import React from 'react';
import ApplicationView from "@/components/applications/view";

function ApplicationViewPage(props: { params: { id: string } }) {
    return (
        <ApplicationView {...props} />
    );
}

export default ApplicationViewPage;
