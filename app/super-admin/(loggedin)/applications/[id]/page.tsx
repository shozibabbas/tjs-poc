import React, {Usable} from 'react';
import ApplicationView from "@/components/applications/view";

function ApplicationViewPage(props: { params: Usable<{ id: string }> }) {
    return (
        <ApplicationView {...props} />
    );
}

export default ApplicationViewPage;
