import React, { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "../../store/appStore";
import ViewerCanvas from "./ViewerCanvas";
import ImageInfoBar from "./ImageInfoBar";
import "./ImageViewer.css";

/**
 * Full-screen image/video viewer overlay.
 *
 * Keyboard shortcuts:
 *   ArrowRight / ArrowDown   — next image
 *   ArrowLeft  / ArrowUp     — previous image
 *   W                        — rotate +5°
 *   Shift+W                  — rotate +90°
 *   Q                        — rotate -5°
 *   Shift+Q                  — rotate -90°
 *   E                        — reset rotation to 0°
 *   Space                    — toggle favourite
 *   D                        — toggle info bar
 *   Escape                   — close viewer
 *   1                        — zoom to 100%
 *   2                        — zoom to fit (reset panzoom)
 */
const ImageViewer: React.FC = () => {
    const {
        viewerOpen,
        viewerIndex,
        viewerNext,
        viewerPrev,
        closeViewer,
        infoBarVisible,
        toggleInfoBar,
        getVisibleFiles,
        getImageSettings,
        updateImageSettings,
        toggleFavorite,
    } = useAppStore();

    const visibleFiles = getVisibleFiles();
    const file = visibleFiles[viewerIndex] ?? null;
    const overlayRef = useRef<HTMLDivElement>(null);

    /** Applies a rotation delta and wraps it within 0–359 degrees */
    const rotate = useCallback(
        (delta: number) => {
            if (!file) return;
            const { rotation } = getImageSettings(file.name);
            const next = (((rotation + delta) % 360) + 360) % 360;
            updateImageSettings(file.name, { rotation: next });
        },
        [file, getImageSettings, updateImageSettings],
    );

    const resetRotation = useCallback(() => {
        if (!file) return;
        updateImageSettings(file.name, { rotation: 0 });
    }, [file, updateImageSettings]);

    /** Global keyboard handler while viewer is open */
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!viewerOpen) return;

            // Prevent default browser scroll / zoom while viewing
            const handled = [
                "ArrowRight",
                "ArrowLeft",
                "ArrowUp",
                "ArrowDown",
                " ",
                "Escape",
                "KeyW",
                "KeyQ",
                "KeyE",
                "Digit1",
                "Digit2",
            ];
            if (handled.includes(e.code)) e.preventDefault();

            switch (e.code) {
                case "ArrowRight":
                case "ArrowDown":
                    viewerNext();
                    break;
                case "ArrowLeft":
                case "ArrowUp":
                    viewerPrev();
                    break;

                case "Escape":
                    closeViewer();
                    break;

                case "KeyD":
                    toggleInfoBar();
                    break;

                case "Space":
                    if (file) toggleFavorite(file.name);
                    break;

                // Rotation ── W: +5° / Shift+W: +90°
                case "KeyW":
                    rotate(e.shiftKey ? 90 : 5);
                    break;
                // Rotation ── Q: -5° / Shift+Q: -90°
                case "KeyQ":
                    rotate(e.shiftKey ? -90 : -5);
                    break;
                // Reset rotation
                case "KeyE":
                    resetRotation();
                    break;

                // Zoom shortcuts are handled by panzoom API via a custom event
                case "Digit1":
                    document.dispatchEvent(
                        new CustomEvent("viewer-zoom", { detail: { scale: 1 } }),
                    );
                    break;
                case "Digit2":
                    document.dispatchEvent(
                        new CustomEvent("viewer-zoom", { detail: { scale: "fit" } }),
                    );
                    break;

                default:
                    break;
            }
        },
        [
            viewerOpen,
            file,
            viewerNext,
            viewerPrev,
            closeViewer,
            toggleInfoBar,
            toggleFavorite,
            rotate,
            resetRotation,
        ],
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // Focus the overlay so keyboard events are captured immediately
    useEffect(() => {
        if (viewerOpen) overlayRef.current?.focus();
    }, [viewerOpen]);

    if (!viewerOpen || !file) return null;

    return (
        <div
            className="image-viewer"
            ref={overlayRef}
            tabIndex={-1}
            aria-modal="true"
            role="dialog"
            aria-label="Image viewer"
        >
            {/* Top-right close button */}
            <button
                className="image-viewer__close"
                onClick={closeViewer}
                aria-label="Close viewer"
                title="Close (Esc)"
            >
                ✕
            </button>

            {/* Left / right navigation arrows */}
            {visibleFiles.length > 1 && (
                <>
                    <button
                        className="image-viewer__nav image-viewer__nav--prev"
                        onClick={viewerPrev}
                        aria-label="Previous image"
                        title="Previous (← / ↑)"
                    >
                        ‹
                    </button>

                    <button
                        className="image-viewer__nav image-viewer__nav--next"
                        onClick={viewerNext}
                        aria-label="Next image"
                        title="Next (→ / ↓)"
                    >
                        ›
                    </button>
                </>
            )}

            {/* Canvas — pan/zoom + rotation */}
            <ViewerCanvas file={file} />

            {/* Info bar overlay (D key) */}
            {infoBarVisible && (
                <ImageInfoBar
                    file={file}
                    fileIndex={viewerIndex}
                    totalFiles={visibleFiles.length}
                />
            )}

            {/* Keyboard hint strip at the very bottom */}
            <div className="image-viewer__hints">
                W/Q rotate · Shift+W/Q 90° · E reset · Space ★ · D info · Esc close
            </div>
        </div>
    );
};

export default ImageViewer;
