import React from "react";
import type { TreeNode } from "../../types";
import { useAppStore } from "../../store/appStore";

interface Props {
    node: TreeNode;
    depth: number;
}

/**
 * A single collapsible node in the folder tree sidebar.
 * Recursively renders child nodes when expanded.
 */
const FolderTreeNode: React.FC<Props> = ({ node, depth }) => {
    const { currentPath, expandedPaths, toggleExpanded, navigateTo } = useAppStore();

    const isExpanded = expandedPaths.has(node.path);
    const isActive = currentPath === node.path;
    const hasChildren = node.children.length > 0;

    /** Clicking the chevron toggles expansion; clicking the label navigates */
    const handleChevronClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) toggleExpanded(node.path);
    };

    const handleLabelClick = () => {
        navigateTo(node.path);
        // Auto-expand when navigating into a folder
        if (hasChildren && !isExpanded) toggleExpanded(node.path);
    };

    return (
        <>
            <div
                className={`folder-tree__node${isActive ? " folder-tree__node--active" : ""}`}
                style={{ paddingLeft: `${0.5 + depth * 0.9}rem` }}
                title={node.path}
            >
                {/* Expand/collapse chevron — only shown when there are children */}
                <span
                    className={`folder-tree__chevron${hasChildren ? "" : " folder-tree__chevron--hidden"}`}
                    onClick={handleChevronClick}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? "▾" : "▸"}
                </span>

                <span className="folder-tree__icon" onClick={handleLabelClick}>
                    {isExpanded ? "📂" : "📁"}
                </span>
                <span className="folder-tree__label" onClick={handleLabelClick}>
                    {node.name}
                </span>
            </div>

            {/* Render children only when expanded */}
            {isExpanded &&
                node.children.map((child) => (
                    <FolderTreeNode key={child.path} node={child} depth={depth + 1} />
                ))}
        </>
    );
};

export default FolderTreeNode;
