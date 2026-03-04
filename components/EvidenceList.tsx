import React from 'react';
import { Evidence } from './types';

const EvidenceList: React.FC<{ evidenceList: Evidence[] }> = ({ evidenceList }) => {
    return (
        <div>
            {evidenceList.map((evidence) => (
                <div key={evidence.id} className="evidence-item">
                    <h3>{evidence.title}</h3>
                    <p>{evidence.description}</p>
                    {/* Updated to render a link instead of an image */}
                    <a href={evidence.imageUrl} target="_blank" rel="noopener noreferrer">View image →</a>
                </div>
            ))}
        </div>
    );
};

export default EvidenceList;