import React, { useRef, useEffect, useCallback } from "react";
import Panzoom from "@panzoom/panzoom";
import type { PanzoomObject } from "@panzoom/panzoom";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { FileEntry } from "../../types";
import { useAppStore } from "../../store/appStore";

interface Props {
    file: FileEntry;
}

/**
 * ViewerCanvas renders the active image or video with pan/zoom support.
 * Rotation is applied via a CSS transform on the wrapper element.
 * Pan & zoom state is persisted to _viewer.cfg on every change.
 */
const ViewerCanvas: React.FC<Props> = ({ file }) => {
    const { getImageSettings, updateImageSettings } = useAppStore();

    const containerRef = useRef<HTMLDivElement>(null);
    const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
    const panzoomRef = useRef<PanzoomObject | null>(null);
    const settings = getImageSettings(file.name);
    const src = convertFileSrc(file.path);

    // Initialise panzoom once the media element mounts
    const initPanzoom = useCallback(() => {
        if (!mediaRef.current || !containerRef.current) return;
        if (panzoomRef.current) panzoomRef.current.destroy();

        const pz = Panzoom(mediaRef.current, {
            maxScale: 20,
            minScale: 0.1,
            contain: "outside",
            startX: settings.transform.x,
            startY: settings.transform.y,
            startScale: settings.transform.scale,
        });

        // Persist transform to config on every move / zoom
        const persist = () => {
            const pan = pz.getPan();
            const scale = pz.getScale();
            updateImageSettings(file.name, {
                transform: { x: pan.x, y: pan.y, scale },
            });
        };

        mediaRef.current.addEventListener("panzoomchange", persist);

        // Mouse-wheel zoom
        containerRef.current.addEventListener("wheel", pz.zoomWithWheel);

        // Panzoom injects `overflow: hidden` on the parent element as an inline
        // style. Override it so the scaled image can expand beyond the rotate
        // wrapper and fill the full viewer overlay.
        if (mediaRef.current.parentElement) {
            mediaRef.current.parentElement.style.overflow = "visible";
        }

        panzoomRef.current = pz;
    }, [file.name, settings.transform, updateImageSettings]);

    // Re-init panzoom when the file changes
    useEffect(() => {
        initPanzoom();
        return () => {
            if (panzoomRef.current) {
                panzoomRef.current.destroy();
                panzoomRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file.path]);

    return (
        <div className="viewer-canvas" ref={containerRef}>
            {/* Rotation wrapper — CSS rotate on the outer div, panzoom on the inner element */}
            <div
                className="viewer-canvas__rotate"
                style={{ transform: `rotate(${settings.rotation}deg)` }}
            >
                {file.is_video ? (
                    <video
                        key={file.path}
                        ref={mediaRef as React.Ref<HTMLVideoElement>}
                        src={src}
                        controls
                        autoPlay
                        className="viewer-canvas__media"
                        onLoad={initPanzoom}
                    />
                ) : (
                    <img
                        key={file.path}
                        ref={mediaRef as React.Ref<HTMLImageElement>}
                        src={src}
                        alt={file.name}
                        draggable={false}
                        className="viewer-canvas__media"
                        onLoad={initPanzoom}
                    />
                )}
            </div>
        </div>
    );
};

export default ViewerCanvas;
