import React, { useState, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { FileEntry } from "../../types";
import { useAppStore } from "../../store/appStore";

interface Props {
    file: FileEntry;
    /** The 0-based index of this file within the visible files list */
    fileIndex: number;
    /** Total count of visible files */
    totalFiles: number;
}

/**
 * Overlay info bar shown at the bottom of the viewer (toggled by the D key).
 * Displays file index, filename, dimensions, megapixels, and favourite status.
 */
const ImageInfoBar: React.FC<Props> = ({ file, fileIndex, totalFiles }) => {
    const { viewerConfig, toggleFavorite, favoritesOnly } = useAppStore();
    const isFavorite = viewerConfig[file.name]?.favorite ?? false;

    // Attempt to read image dimensions from a hidden img element
    const [dimensions, setDimensions] = useState<{
        w: number;
        h: number;
    } | null>(null);

    useEffect(() => {
        if (file.is_video) {
            setDimensions(null);
            return;
        }
        const img = new Image();
        img.onload = () => setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => setDimensions(null);
        img.src = convertFileSrc(file.path);
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [file.path, file.is_video]);

    const megapixels = dimensions ? ((dimensions.w * dimensions.h) / 1_000_000).toFixed(1) : null;

    return (
        <div className="info-bar">
            <span className="info-bar__index">
                {fileIndex + 1} / {totalFiles}
            </span>

            <span className="info-bar__name">{file.name}</span>

            {dimensions && (
                <span className="info-bar__dims">
                    {dimensions.w} × {dimensions.h}
                    {megapixels && <span className="info-bar__mp">{megapixels} MP</span>}
                </span>
            )}

            {favoritesOnly && (
                <span className="info-bar__badge info-bar__badge--favonly">Favourites only</span>
            )}

            <button
                className={`info-bar__fav-btn${isFavorite ? " info-bar__fav-btn--active" : ""}`}
                onClick={() => toggleFavorite(file.name)}
                title={isFavorite ? "Remove from favourites" : "Add to favourites"}
            >
                {isFavorite ? "★" : "☆"} Favourite
            </button>
        </div>
    );
};

export default ImageInfoBar;
