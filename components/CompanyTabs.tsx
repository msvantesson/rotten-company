// Import necessary components
import React from 'react';
import { Tabs } from 'some-ui-library';  // Assume you have a Tabs component

const CompanyTabs = ({ slug }) => {
    return (
        <Tabs>
            {/* Existing Tabs */}
            <Tabs.Tab label="Overview" to={`/company/${slug}/overview`} />
            <Tabs.Tab label="Details" to={`/company/${slug}/details`} />
            <Tabs.Tab label="Reviews" to={`/company/${slug}/reviews`} />
            {/* New Tab */}
            <Tabs.Tab label="Suggest edit" to={`/company/${slug}/suggest-edit`} />
        </Tabs>
    );
};

export default CompanyTabs;