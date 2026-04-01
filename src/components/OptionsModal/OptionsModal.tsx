import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../../store/appStore";
import type { AppConfig } from "../../types";
import "./OptionsModal.css";

/**
 * Application settings modal.
 * All toggles write immediately to disk via saveAppConfig.
 */
const OptionsModal: React.FC = () => {
    const { appConfig, saveAppConfig, toggleOptions } = useAppStore();

    /** Status feedback for context menu registration actions */
    const [ctxMenuStatus, setCtxMenuStatus] = useState<string>("");

    /** Flashes a status message for 3 seconds */
    const flashStatus = (msg: string) => {
        setCtxMenuStatus(msg);
        setTimeout(() => setCtxMenuStatus(""), 3000);
    };

    /** Writes HKCU registry entries for all supported file types + folders */
    const handleRegister = async () => {
        try {
            await invoke("register_context_menu");
            flashStatus("Registered ✓");
        } catch (e) {
            flashStatus(`Error: ${e}`);
        }
    };

    /** Removes HKCU registry entries */
    const handleUnregister = async () => {
        try {
            await invoke("unregister_context_menu");
            flashStatus("Removed ✓");
        } catch (e) {
            flashStatus(`Error: ${e}`);
        }
    };

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
                                <span className="options-modal__toggle-label">
                                    Default thumbnail size
                                </span>
                                <span className="options-modal__toggle-desc">
                                    Starting thumbnail width when the app launches (
                                    {appConfig.defaultThumbSize}px).
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

                    {/* ── Windows Integration ── */}
                    <section className="options-modal__section">
                        <h3 className="options-modal__section-title">Windows Integration</h3>
                        <div className="options-modal__action-row">
                            <div className="options-modal__toggle-text">
                                <span className="options-modal__toggle-label">
                                    Context menu
                                </span>
                                <span className="options-modal__toggle-desc">
                                    Add "Open in Imageviewer" to the Windows right-click menu for
                                    images, videos, and folders. No admin rights required.
                                </span>
                                {ctxMenuStatus && (
                                    <span className="options-modal__action-status">
                                        {ctxMenuStatus}
                                    </span>
                                )}
                            </div>
                            <div className="options-modal__btn-group">
                                <button
                                    className="options-modal__btn"
                                    onClick={handleRegister}
                                >
                                    Register
                                </button>
                                <button
                                    className="options-modal__btn options-modal__btn--danger"
                                    onClick={handleUnregister}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default OptionsModal;
