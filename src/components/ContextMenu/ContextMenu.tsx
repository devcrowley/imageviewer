import React, { useEffect, useRef } from "react";
import "./ContextMenu.css";

export interface ContextMenuItem {
    label: string;
    icon?: string;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}

interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

/**
 * A positioned right-click context menu.
 * Closes when the user clicks outside, presses Escape, or a menu item is selected.
 * Adjusts position to stay within the viewport.
 */
const ContextMenu: React.FC<Props> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLUListElement>(null);

    // Adjust position so the menu doesn't overflow the viewport
    const menuStyle: React.CSSProperties = {
        position: "fixed",
        top: y,
        left: x,
    };

    // Close on outside click or Escape
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        // Use capture phase so we intercept before any other handler
        document.addEventListener("mousedown", handleClick, true);
        document.addEventListener("keydown", handleKey, true);
        return () => {
            document.removeEventListener("mousedown", handleClick, true);
            document.removeEventListener("keydown", handleKey, true);
        };
    }, [onClose]);

    // Nudge menu inside viewport after it renders and we know its dimensions
    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menuRef.current.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menuRef.current.style.top = `${y - rect.height}px`;
        }
    }, [x, y]);

    const handleItemClick = (item: ContextMenuItem) => {
        if (item.disabled) return;
        item.onClick();
        onClose();
    };

    return (
        <ul className="context-menu" style={menuStyle} ref={menuRef} role="menu">
            {items.map((item, i) => (
                <li
                    key={i}
                    className={[
                        "context-menu__item",
                        item.danger ? "context-menu__item--danger" : "",
                        item.disabled ? "context-menu__item--disabled" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    role="menuitem"
                    onClick={() => handleItemClick(item)}
                >
                    {item.icon && <span className="context-menu__icon">{item.icon}</span>}
                    {item.label}
                </li>
            ))}
        </ul>
    );
};

export default ContextMenu;
