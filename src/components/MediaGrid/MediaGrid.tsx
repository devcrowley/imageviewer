import React, { useCallback, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../../store/appStore";
import type { FolderEntry, FileEntry } from "../../types";
import MediaCard from "./MediaCard";
import ContextMenu, { type ContextMenuItem } from "../ContextMenu/ContextMenu";
import RenameModal from "../RenameModal/RenameModal";
import "./MediaGrid.css";

/**
 * The main gallery pane.  Shows subfolders and media files for the current path.
 * Includes a toolbar with a search box, thumb-size slider, and favorites toggle.
 */
const MediaGrid: React.FC = () => {
    const {
        folders,
        searchFilter,
        setSearchFilter,
        thumbSize,
        setThumbSize,
        isLoadingGallery,
        getVisibleFiles,
        selectedIndex,
        setSelectedIndex,
        openViewer,
        navigateTo,
        favoritesOnly,
        toggleFavoritesOnly,
        viewerConfig,
        deleteFile,
        renameFile,
        appConfig,
    } = useAppStore();

    const visibleFiles = getVisibleFiles();

    // ── Context menu state ────────────────────────────────────────────────────
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        file: FileEntry;
        index: number;
    } | null>(null);

    // ── Rename modal state ────────────────────────────────────────────────────
    const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);

    /** Single-click selects a file card */
    const handleFileClick = useCallback(
        (index: number) => {
            setSelectedIndex(index);
        },
        [setSelectedIndex],
    );

    /** Double-click opens the full-screen viewer */
    const handleFileDoubleClick = useCallback(
        (index: number) => {
            openViewer(index);
        },
        [openViewer],
    );

    /** Clicking a folder navigates into it */
    const handleFolderClick = useCallback(
        (folder: FolderEntry) => {
            navigateTo(folder.path);
        },
        [navigateTo],
    );

    /** Opens the context menu for a file card */
    const handleContextMenu = useCallback(
        (index: number, e: React.MouseEvent) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, file: visibleFiles[index], index });
        },
        [visibleFiles],
    );

    /** Handles deletion from the context menu */
    const handleContextDelete = useCallback(
        async (file: FileEntry) => {
            if (appConfig.confirmDeletion) {
                const confirmed = await ask(
                    `Permanently delete "${file.name}"?\n\nThis cannot be undone.`,
                    { title: "Delete File", kind: "warning" },
                );
                if (!confirmed) return;
            }
            await deleteFile(file.path, file.name);
        },
        [appConfig.confirmDeletion, deleteFile],
    );

    /** Handles rename confirmation from the RenameModal */
    const handleRenameConfirm = useCallback(
        async (newName: string) => {
            if (!renameTarget) return;
            setRenameTarget(null);
            try {
                await renameFile(renameTarget.path, newName);
            } catch {
                // Error already logged in store
            }
        },
        [renameTarget, renameFile],
    );

    /** Builds the context menu item list for a given file */
    const buildMenuItems = useCallback(
        (file: FileEntry): ContextMenuItem[] => [
            {
                label: "Open",
                icon: "🔍",
                onClick: () => {
                    const idx = visibleFiles.findIndex((f) => f.path === file.path);
                    if (idx >= 0) openViewer(idx);
                },
            },
            {
                label: "Rename",
                icon: "✏️",
                onClick: () => setRenameTarget(file),
            },
            {
                label: "Show in Explorer",
                icon: "📂",
                onClick: () => invoke("show_in_explorer", { path: file.path }),
            },
            {
                label: "Delete",
                icon: "🗑️",
                danger: true,
                onClick: () => handleContextDelete(file),
            },
        ],
        [visibleFiles, openViewer, handleContextDelete],
    );

    return (
        <div className="media-grid__wrapper">
            {/* ── Toolbar ── */}
            <div className="media-grid__toolbar">
                <input
                    className="media-grid__search"
                    type="search"
                    placeholder="Filter files…"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    aria-label="Filter files"
                />

                <label className="media-grid__thumb-label" aria-label="Thumbnail size">
                    <span>Size</span>
                    <input
                        type="range"
                        min={80}
                        max={400}
                        step={10}
                        value={thumbSize}
                        onChange={(e) => setThumbSize(Number(e.target.value))}
                    />
                </label>

                <button
                    className={`media-grid__fav-btn${favoritesOnly ? " media-grid__fav-btn--active" : ""}`}
                    onClick={toggleFavoritesOnly}
                    title={favoritesOnly ? "Show all files" : "Show favourites only"}
                >
                    ★ Favourites
                </button>
            </div>

            {/* ── Grid ── */}
            {isLoadingGallery ? (
                <div className="media-grid__loading">Loading…</div>
            ) : (
                <div
                    className="media-grid__grid"
                    style={{ "--thumb-w": `${thumbSize}px` } as React.CSSProperties}
                >
                    {/* Folder cards */}
                    {!favoritesOnly &&
                        folders.map((folder: FolderEntry) => (
                            <div
                                key={folder.path}
                                className="media-card media-card--folder"
                                onDoubleClick={() => handleFolderClick(folder)}
                                title={folder.path}
                            >
                                <div className="media-card__thumb media-card__thumb--folder">
                                    📁
                                </div>
                                <span className="media-card__name">{folder.name}</span>
                                {folder.media_count > 0 && (
                                    <span className="media-card__count">{folder.media_count}</span>
                                )}
                            </div>
                        ))}

                    {/* File cards */}
                    {visibleFiles.map((file: FileEntry, idx: number) => {
                        const isFav = viewerConfig[file.name]?.favorite ?? false;
                        return (
                            <MediaCard
                                key={file.path}
                                file={file}
                                index={idx}
                                isSelected={selectedIndex === idx}
                                isFavorite={isFav}
                                thumbSize={thumbSize}
                                onClick={handleFileClick}
                                onDoubleClick={handleFileDoubleClick}
                                onContextMenu={handleContextMenu}
                            />
                        );
                    })}

                    {/* Empty state */}
                    {!isLoadingGallery && folders.length === 0 && visibleFiles.length === 0 && (
                        <div className="media-grid__empty">
                            {favoritesOnly
                                ? "No favourites in this folder."
                                : searchFilter
                                  ? "No files match your filter."
                                  : "This folder is empty."}
                        </div>
                    )}
                </div>
            )}

            {/* ── Context menu ── */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={buildMenuItems(contextMenu.file)}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* ── Rename modal ── */}
            {renameTarget && (
                <RenameModal
                    currentName={renameTarget.name}
                    onConfirm={handleRenameConfirm}
                    onCancel={() => setRenameTarget(null)}
                />
            )}
        </div>
    );
};

export default MediaGrid;
