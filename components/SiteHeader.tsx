import React from 'react';
import { usePathname } from 'next/navigation';

const SiteHeader = () => {
    const pathname = usePathname();
    return (
        <header>
            <div className="nav">
                {pathname === '/' ? (
                    <div style={{ width: '200px' }}></div> // Empty div to keep layout spacing
                ) : (
                    <Link href="/">Rotten Company</Link>
                )}
                {/* Render navigation links and menu */}
                {/* ... other nav links ... */}
            </div>
        </header>
    );
};

export default SiteHeader;