import React from "react";
import { useAppStore } from "../../store/appStore";
import "./Breadcrumb.css";

/**
 * Renders the current path as clickable breadcrumb segments.
 * Clicking a segment navigates to that directory.
 */
const Breadcrumb: React.FC = () => {
    const { currentPath, navigateTo } = useAppStore();

    if (!currentPath) return null;

    // Split path into parts, preserving a leading separator for absolute paths
    const rawParts = currentPath.replace(/\\/g, "/").split("/").filter(Boolean);

    // Build cumulative paths for each part so we can navigate on click
    const segments = rawParts.map((part, i) => {
        const isWindows = currentPath.includes(":");
        const joined = rawParts.slice(0, i + 1).join("/");
        // Re-prefix with drive letter colon-slash if on Windows (e.g. "C:/Users/…")
        const path = isWindows ? joined : `/${joined}`;
        return { label: part, path };
    });

    return (
        <nav className="breadcrumb" aria-label="Current path">
            {segments.map((seg, i) => {
                const isLast = i === segments.length - 1;
                return (
                    <React.Fragment key={seg.path}>
                        {i > 0 && <span className="breadcrumb__sep">›</span>}
                        {isLast ? (
                            <span className="breadcrumb__segment breadcrumb__segment--active">
                                {seg.label}
                            </span>
                        ) : (
                            <button
                                className="breadcrumb__segment"
                                onClick={() => navigateTo(seg.path)}
                                title={seg.path}
                            >
                                {seg.label}
                            </button>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

export default Breadcrumb;
