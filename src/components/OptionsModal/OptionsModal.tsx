import React from "react";
import { useAppStore } from "../../store/appStore";
import type { AppConfig } from "../../types";
import "./OptionsModal.css";

/**
 * Application settings modal.
 * All toggles write immediately to disk via saveAppConfig.
 */
const OptionsModal: React.FC = () => {
    const { appConfig, saveAppConfig, toggleOptions } = useAppStore();

    /** Helper to render a labelled toggle row */
    const Toggle = ({
        label,
        description,
        field,
    }: {
        label: string;
        description: string;
        field: keyof AppConfig;
    }) => {
        const value = appConfig[field] as boolean;
        return (
            <label className="options-modal__toggle-row">
                <div className="options-modal__toggle-text">
                    <span className="options-modal__toggle-label">{label}</span>
                    <span className="options-modal__toggle-desc">{description}</span>
                </div>
                <button
                    className={`options-modal__toggle${value ? " options-modal__toggle--on" : ""}`}
                    onClick={() => saveAppConfig({ [field]: !value } as Partial<AppConfig>)}
                    role="switch"
                    aria-checked={value}
                    aria-label={label}
                >
                    <span className="options-modal__toggle-thumb" />
                </button>
            </label>
        );
    };

    const handleThumbSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        saveAppConfig({ defaultThumbSize: Number(e.target.value) });
    };

    return (
        <div className="options-modal__backdrop" onClick={toggleOptions}>
            <div
                className="options-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Options"
            >
                {/* Header */}
                <div className="options-modal__header">
                    <h2 className="options-modal__title">Options</h2>
                    <button
                        className="options-modal__close"
                        onClick={toggleOptions}
                        aria-label="Close options"
                    >
                        ✕
                    </button>
                </div>

                {/* Settings sections */}
                <div className="options-modal__body">
                    {/* ── File operations ── */}
                    <section className="options-modal__section">
                        <h3 className="options-modal__section-title">File Operations</h3>
                        <Toggle
                            field="confirmDeletion"
                            label="Confirm file deletion"
                            description="Show a confirmation dialog before permanently deleting files."
                        />
                    </section>

                    {/* ── Startup ── */}
                    <section className="options-modal__section">
                        <h3 className="options-modal__section-title">Startup</h3>
                        <Toggle
                            field="startInLastFolder"
                            label="Start in last opened folder"
                            description="Re-open the folder from your previous session on launch."
                        />
                    </section>

                    {/* ── Viewer ── */}
                    <section className="options-modal__section">
                        <h3 className="options-modal__section-title">Viewer</h3>
                        <Toggle
                            field="alwaysShuffle"
                            label="Always shuffle images"
                            description="Navigate randomly when pressing next/previous in the viewer."
                        />
                        <Toggle
                            field="loopSlideshow"
                            label="Loop slideshow"
                            description="Wrap from last image back to first (and vice versa)."
                        />
                    </section>

                    {/* ── Gallery ── */}
                    <section className="options-modal__section">
                        <h3 className="options-modal__section-title">Gallery</h3>
                        <Toggle
                            field="showVideos"
                            label="Show video files"
                            description="Include mp4, webm, and mov files in the image grid."
                        />

                        <label className="options-modal__slider-row">
                            <div className="options-modal__toggle-text">
                                <span className="options-modal__toggle-label">Default thumbnail size</span>
                                <span className="options-modal__toggle-desc">
                                    Starting thumbnail width when the app launches ({appConfig.defaultThumbSize}px).
                                </span>
                            </div>
                            <input
                                type="range"
                                min={80}
                                max={400}
                                step={10}
                                value={appConfig.defaultThumbSize}
                                onChange={handleThumbSizeChange}
                                className="options-modal__slider"
                                aria-label="Default thumbnail size"
                            />
                        </label>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default OptionsModal;
