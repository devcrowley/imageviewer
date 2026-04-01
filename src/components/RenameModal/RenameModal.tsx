import React, { useState, useEffect, useRef } from "react";
import "./RenameModal.css";

interface Props {
    currentName: string;
    onConfirm: (newName: string) => void;
    onCancel: () => void;
}

/**
 * A small modal dialog for renaming a file.
 * Pre-fills the input with the current filename and selects the stem
 * (everything before the last dot) so the user can type without erasing extension.
 */
const RenameModal: React.FC<Props> = ({ currentName, onConfirm, onCancel }) => {
    const [value, setValue] = useState(currentName);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus and select the filename stem on mount
    useEffect(() => {
        if (!inputRef.current) return;
        inputRef.current.focus();
        const dotIdx = currentName.lastIndexOf(".");
        inputRef.current.setSelectionRange(0, dotIdx > 0 ? dotIdx : currentName.length);
    }, [currentName]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed && trimmed !== currentName) {
            onConfirm(trimmed);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") onCancel();
    };

    return (
        <div className="rename-modal__backdrop" onClick={onCancel}>
            <div
                className="rename-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Rename file"
            >
                <h3 className="rename-modal__title">Rename File</h3>
                <form onSubmit={handleSubmit}>
                    <input
                        ref={inputRef}
                        className="rename-modal__input"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                    />
                    <div className="rename-modal__actions">
                        <button type="button" onClick={onCancel} className="rename-modal__btn rename-modal__btn--cancel">
                            Cancel
                        </button>
                        <button type="submit" className="rename-modal__btn rename-modal__btn--confirm">
                            Rename
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RenameModal;
