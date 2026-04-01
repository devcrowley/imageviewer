import React from "react";
import "./Layout.css";

interface LayoutProps {
    sidebar: React.ReactNode;
    breadcrumb: React.ReactNode;
    content: React.ReactNode;
    statusBar: React.ReactNode;
}

/**
 * Main application shell.
 * Composes the resizable sidebar, breadcrumb strip, main content area,
 * and bottom status bar.
 */
const Layout: React.FC<LayoutProps> = ({ sidebar, breadcrumb, content, statusBar }) => {
    return (
        <div className="layout">
            <div className="layout__body">
                <aside className="layout__sidebar">{sidebar}</aside>
                <main className="layout__main">
                    <div className="layout__breadcrumb">{breadcrumb}</div>
                    {content}
                </main>
            </div>
            <footer className="layout__statusbar">{statusBar}</footer>
        </div>
    );
};

export default Layout;
