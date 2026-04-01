import React from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { TreeNode } from "../../types";
import { useAppStore } from "../../store/appStore";
import FolderTreeNode from "./FolderTreeNode";
import "./FolderTree.css";

/**
 * Sidebar folder tree.
 * Shows an "Open Folder" button at the top, then renders the root entry
 * and all subfolders returned by get_folder_tree.
 */
const FolderTree: React.FC = () => {
    const { rootPath, tree, currentPath, navigateTo, setRootPath } = useAppStore();

    /** Prompt user to pick a new root folder via the native dialog */
    const handleOpenFolder = async () => {
        const selected = await open({ directory: true, multiple: false });
        if (selected && typeof selected === "string") {
            setRootPath(selected);
        }
    };

    const rootName = rootPath ? (rootPath.split(/[\\/]/).filter(Boolean).pop() ?? rootPath) : null;

    return (
        <nav className="folder-tree" aria-label="Folder tree">
            {/* Open folder button */}
            <button
                className="folder-tree__open-btn"
                onClick={handleOpenFolder}
                title="Open a folder"
            >
                ＋ Open Folder
            </button>

            {/* Root entry row */}
            {rootPath ? (
                <>
                    <div
                        className={`folder-tree__node${currentPath === rootPath ? " folder-tree__node--active" : ""}`}
                        style={{ paddingLeft: "0.5rem" }}
                        onClick={() => navigateTo(rootPath)}
                        title={rootPath}
                    >
                        <span className="folder-tree__chevron folder-tree__chevron--hidden">▸</span>
                        <span className="folder-tree__icon">📁</span>
                        <span className="folder-tree__label">{rootName}</span>
                    </div>

                    {/* Recursive child tree */}
                    {tree.map((node: TreeNode) => (
                        <FolderTreeNode key={node.path} node={node} depth={1} />
                    ))}
                </>
            ) : (
                <p className="folder-tree__empty">
                    No folder open.
                    <br />
                    Click &ldquo;Open Folder&rdquo; above to browse images.
                </p>
            )}
        </nav>
    );
};

export default FolderTree;
