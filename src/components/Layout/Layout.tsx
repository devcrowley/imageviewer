import React from "react";
import { useAppStore } from "../../store/appStore";
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
 * Also renders a fixed gear button in the top-right corner to open the Options modal.
 */
const Layout: React.FC<LayoutProps> = ({ sidebar, breadcrumb, content, statusBar }) => {
    const toggleOptions = useAppStore((s) => s.toggleOptions);

    return (
        <div className="layout">
            {/* ── Fixed gear button ── */}
            <button
                className="layout__gear-btn"
                onClick={toggleOptions}
                title="Options"
                aria-label="Open options"
            >
                ⚙
            </button>

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
