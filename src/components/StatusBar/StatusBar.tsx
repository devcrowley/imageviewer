import React from "react";
import { useAppStore } from "../../store/appStore";
import "./StatusBar.css";

/**
 * Bottom status bar.  Shows file and folder counts for the current directory
 * and the active filter/favourites state.
 */
const StatusBar: React.FC = () => {
    const { folders, files, getVisibleFiles, searchFilter, favoritesOnly, currentPath } =
        useAppStore();

    const visibleFiles = getVisibleFiles();
    const isFiltered = favoritesOnly || searchFilter.length > 0;

    return (
        <div className="status-bar">
            {currentPath ? (
                <>
                    <span className="status-bar__item">
                        {folders.length} folder{folders.length !== 1 ? "s" : ""}
                    </span>
                    <span className="status-bar__sep">·</span>
                    <span className="status-bar__item">
                        {isFiltered
                            ? `${visibleFiles.length} / ${files.length} files`
                            : `${files.length} file${files.length !== 1 ? "s" : ""}`}
                    </span>
                    {favoritesOnly && (
                        <>
                            <span className="status-bar__sep">·</span>
                            <span className="status-bar__badge status-bar__badge--fav">
                                ★ Favourites only
                            </span>
                        </>
                    )}
                    {searchFilter && (
                        <>
                            <span className="status-bar__sep">·</span>
                            <span className="status-bar__badge">
                                Filter: &ldquo;{searchFilter}&rdquo;
                            </span>
                        </>
                    )}
                </>
            ) : (
                <span className="status-bar__item status-bar__item--muted">No folder open</span>
            )}
        </div>
    );
};

export default StatusBar;
