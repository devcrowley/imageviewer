import React, { useRef, useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { FileEntry } from "../../types";

interface Props {
    file: FileEntry;
    index: number;
    isSelected: boolean;
    isFavorite: boolean;
    thumbSize: number;
    onClick: (index: number) => void;
    onDoubleClick: (index: number) => void;
}

/**
 * A single media thumbnail card in the gallery grid.
 * Shows an <img> or <video> preview depending on file type.
 * Displays a favourite star badge when the file is marked as favourite.
 */
const MediaCard: React.FC<Props> = ({
    file,
    index,
    isSelected,
    isFavorite,
    thumbSize,
    onClick,
    onDoubleClick,
}) => {
    const [errored, setErrored] = useState(false);
    const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Convert the file path to a Tauri asset URL (handles backslashes + encoding)
    const src = convertFileSrc(file.path);

    /** Debounce single/double-click to avoid firing both events */
    const handleClick = () => {
        if (clickTimer.current) return; // waiting for potential double-click
        clickTimer.current = setTimeout(() => {
            clickTimer.current = null;
            onClick(index);
        }, 200);
    };

    const handleDoubleClick = () => {
        if (clickTimer.current) {
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
        }
        onDoubleClick(index);
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (clickTimer.current) clearTimeout(clickTimer.current);
        };
    }, []);

    const classNames = [
        "media-card",
        isSelected ? "media-card--selected" : "",
        isFavorite ? "media-card--favorite" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className={classNames}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            title={file.name}
        >
            <div className="media-card__thumb" style={{ width: thumbSize, height: thumbSize }}>
                {errored ? (
                    /* Fallback when the image fails to load */
                    <div className="media-card__thumb-error">{file.is_video ? "🎬" : "🖼️"}</div>
                ) : file.is_video ? (
                    <video
                        src={src}
                        muted
                        preload="metadata"
                        className="media-card__media"
                        onError={() => setErrored(true)}
                    />
                ) : (
                    <img
                        src={src}
                        alt={file.name}
                        loading="lazy"
                        decoding="async"
                        className="media-card__media"
                        onError={() => setErrored(true)}
                    />
                )}
            </div>

            {/* Favourite star badge */}
            {isFavorite && <span className="media-card__fav-badge">★</span>}

            {/* Filename label */}
            <span className="media-card__name">{file.name}</span>
        </div>
    );
};

export default MediaCard;
