import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, FolderEntry, TreeNode, ImageSettings, ViewerConfig, AppConfig } from "../types";
import { defaultImageSettings, defaultAppConfig } from "../types";

// ── Store state shape ─────────────────────────────────────────────────────────

interface AppState {
    // ── Folder tree (sidebar) ──────────────────────────────────────────────────
    /** The root folder being browsed */
    rootPath: string;
    /** The tree of subfolders loaded from root */
    tree: TreeNode[];
    /** Paths of tree nodes the user has expanded */
    expandedPaths: Set<string>;

    // ── Current directory (gallery) ───────────────────────────────────────────
    /** The directory currently displayed in the grid */
    currentPath: string;
    /** Subfolders in the current directory */
    folders: FolderEntry[];
    /** Media files in the current directory */
    files: FileEntry[];
    /** Loading state for the gallery */
    isLoadingGallery: boolean;

    // ── Gallery UI ─────────────────────────────────────────────────────────────
    /** Text filter applied to the displayed filenames */
    searchFilter: string;
    /** Thumbnail width in pixels (controlled by slider) */
    thumbSize: number;
    /** Index of the currently selected (single-clicked) file in `files` */
    selectedIndex: number | null;
    /** If true, only files marked as favourite are shown */
    favoritesOnly: boolean;

    // ── Viewer (full-screen) ──────────────────────────────────────────────────
    /** Whether the full-screen viewer is open */
    viewerOpen: boolean;
    /** Index into `files` for the currently viewed image/video */
    viewerIndex: number;
    /** Whether the image info bar (D key) is visible */
    infoBarVisible: boolean;

    // ── Per-image settings (from _viewer.cfg) ─────────────────────────────────
    /** The config keyed by filename for the current directory */
    viewerConfig: ViewerConfig;

    // ── Application config (config.json) ──────────────────────────────────────
    /** Persisted application settings */
    appConfig: AppConfig;
    /** Whether the Options modal is currently visible */
    optionsOpen: boolean;

    // ── Actions ───────────────────────────────────────────────────────────────
    setRootPath: (path: string) => Promise<void>;
    navigateTo: (path: string) => Promise<void>;
    toggleExpanded: (path: string) => void;
    setSearchFilter: (filter: string) => void;
    setThumbSize: (size: number) => void;
    setSelectedIndex: (index: number | null) => void;
    toggleFavoritesOnly: () => void;

    openViewer: (index: number) => void;
    closeViewer: () => void;
    viewerNext: () => void;
    viewerPrev: () => void;
    toggleInfoBar: () => void;
    /** Pick a random file from the current visible list and open it in the viewer */
    shuffle: () => void;

    getImageSettings: (filename: string) => ImageSettings;
    updateImageSettings: (filename: string, settings: Partial<ImageSettings>) => Promise<void>;
    toggleFavorite: (filename: string) => Promise<void>;

    loadViewerConfig: (folderPath: string) => Promise<void>;

    /**
     * Permanently deletes a file from disk and removes it from the in-memory list.
     * Returns true on success, false on error.
     */
    deleteFile: (filePath: string, filename: string) => Promise<boolean>;
    /**
     * Renames a file on disk and updates the in-memory list.
     * newName should be just the filename (no directory component).
     */
    renameFile: (filePath: string, newName: string) => Promise<void>;

    /** Load app config from disk (called once on startup) */
    loadAppConfig: () => Promise<void>;
    /** Save a partial config update to disk */
    saveAppConfig: (patch: Partial<AppConfig>) => Promise<void>;
    /** Toggle the options modal */
    toggleOptions: () => void;

    /** Returns the files array filtered by favoritesOnly, searchFilter, and showVideos */
    getVisibleFiles: () => FileEntry[];
}

// ── Store implementation ──────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
    // ── Initial state ──────────────────────────────────────────────────────────
    rootPath: "",
    tree: [],
    expandedPaths: new Set(),

    currentPath: "",
    folders: [],
    files: [],
    isLoadingGallery: false,

    searchFilter: "",
    thumbSize: 180,
    selectedIndex: null,
    favoritesOnly: false,

    viewerOpen: false,
    viewerIndex: 0,
    infoBarVisible: true,

    viewerConfig: {},

    appConfig: defaultAppConfig(),
    optionsOpen: false,

    // ── Folder tree actions ────────────────────────────────────────────────────

    /**
     * Sets the root browsing path and loads the folder tree + initial gallery.
     * Called on startup or when the user picks a different root folder.
     */
    setRootPath: async (path: string) => {
        set({ rootPath: path, expandedPaths: new Set() });
        try {
            const tree = await invoke<TreeNode[]>("get_folder_tree", {
                path,
                maxDepth: 3,
            });
            set({ tree });
        } catch (err) {
            console.error("Failed to load folder tree:", err);
        }
        await get().navigateTo(path);
    },

    /**
     * Navigates the gallery to a new directory.
     * Saves the current viewer config before switching.
     */
    navigateTo: async (path: string) => {
        set({ isLoadingGallery: true, selectedIndex: null, searchFilter: "" });
        try {
            const listing = await invoke<{
                folders: FolderEntry[];
                files: FileEntry[];
            }>("list_directory", { path });

            set({
                currentPath: path,
                folders: listing.folders,
                files: listing.files,
                isLoadingGallery: false,
            });

            await get().loadViewerConfig(path);
        } catch (err) {
            console.error("Failed to navigate to directory:", err);
            set({ isLoadingGallery: false });
        }
    },

    /** Toggles a folder in the sidebar between expanded and collapsed */
    toggleExpanded: (path: string) => {
        const expanded = new Set(get().expandedPaths);
        if (expanded.has(path)) {
            expanded.delete(path);
        } else {
            expanded.add(path);
        }
        set({ expandedPaths: expanded });
    },

    // ── Gallery UI actions ─────────────────────────────────────────────────────

    setSearchFilter: (filter: string) => set({ searchFilter: filter }),
    setThumbSize: (size: number) => set({ thumbSize: size }),
    setSelectedIndex: (index: number | null) => set({ selectedIndex: index }),

    toggleFavoritesOnly: () =>
        set((s) => ({ favoritesOnly: !s.favoritesOnly, selectedIndex: null })),

    // ── Viewer actions ─────────────────────────────────────────────────────────

    /** Opens the full-screen viewer at the given file index */
    openViewer: (index: number) => set({ viewerOpen: true, viewerIndex: index }),

    /** Closes the viewer and saves any pending config changes */
    closeViewer: () => set({ viewerOpen: false }),

    /** Advances to the next image, shuffling if alwaysShuffle is enabled */
    viewerNext: () => {
        const { viewerIndex, getVisibleFiles, appConfig } = get();
        const files = getVisibleFiles();
        if (files.length === 0) return;
        if (appConfig.alwaysShuffle) {
            let next = Math.floor(Math.random() * files.length);
            // Avoid landing on the same index if there are multiple files
            if (files.length > 1 && next === viewerIndex) next = (next + 1) % files.length;
            set({ viewerIndex: next });
        } else if (appConfig.loopSlideshow) {
            set({ viewerIndex: (viewerIndex + 1) % files.length });
        } else {
            set({ viewerIndex: Math.min(viewerIndex + 1, files.length - 1) });
        }
    },

    /** Retreats to the previous image, shuffling if alwaysShuffle is enabled */
    viewerPrev: () => {
        const { viewerIndex, getVisibleFiles, appConfig } = get();
        const files = getVisibleFiles();
        if (files.length === 0) return;
        if (appConfig.alwaysShuffle) {
            let next = Math.floor(Math.random() * files.length);
            if (files.length > 1 && next === viewerIndex) next = (next + 1) % files.length;
            set({ viewerIndex: next });
        } else if (appConfig.loopSlideshow) {
            set({ viewerIndex: (viewerIndex - 1 + files.length) % files.length });
        } else {
            set({ viewerIndex: Math.max(viewerIndex - 1, 0) });
        }
    },

    /** Toggles the image info bar overlay (D key) */
    toggleInfoBar: () => set((s) => ({ infoBarVisible: !s.infoBarVisible })),

    /** Picks a random visible file and opens it in the full-screen viewer */
    shuffle: () => {
        const files = get().getVisibleFiles();
        if (files.length === 0) return;
        const idx = Math.floor(Math.random() * files.length);
        set({ viewerOpen: true, viewerIndex: idx });
    },

    // ── Per-image config actions ───────────────────────────────────────────────

    /**
     * Returns settings for a specific file.
     * Falls back to defaults if the file has no saved settings.
     */
    getImageSettings: (filename: string): ImageSettings => {
        return get().viewerConfig[filename] ?? defaultImageSettings();
    },

    /**
     * Updates (merges) the saved settings for one file and persists to disk.
     * This is called on every rotation/zoom/pan change and on favourite toggle.
     */
    updateImageSettings: async (filename: string, settings: Partial<ImageSettings>) => {
        const { viewerConfig, currentPath } = get();
        const current = viewerConfig[filename] ?? defaultImageSettings();
        const updated: ImageSettings = { ...current, ...settings };

        // Merge nested transform if provided
        if (settings.transform) {
            updated.transform = { ...current.transform, ...settings.transform };
        }

        const newConfig: ViewerConfig = { ...viewerConfig, [filename]: updated };
        set({ viewerConfig: newConfig });

        // Persist to disk asynchronously — fire and forget on changes,
        // always called on close/navigate
        try {
            await invoke("write_viewer_config", {
                folderPath: currentPath,
                configJson: JSON.stringify(newConfig),
            });
        } catch (err) {
            console.error("Failed to write viewer config:", err);
        }
    },

    /** Toggles the favourite flag for a file and saves to disk */
    toggleFavorite: async (filename: string) => {
        const settings = get().getImageSettings(filename);
        await get().updateImageSettings(filename, {
            favorite: !settings.favorite,
        });
    },

    /**
     * Loads the _viewer.cfg from a directory.
     * Replaces the entire in-memory config for that folder.
     */
    loadViewerConfig: async (folderPath: string) => {
        try {
            const raw = await invoke<string>("read_viewer_config", { folderPath });
            const config: ViewerConfig = JSON.parse(raw) ?? {};
            set({ viewerConfig: config });
        } catch (err) {
            console.error("Failed to load viewer config:", err);
            set({ viewerConfig: {} });
        }
    },

    // ── File operations ────────────────────────────────────────────────────────

    /**
     * Permanently deletes a file from disk, removes it from the in-memory files
     * list, and adjusts the viewer index if the viewer is open.
     */
    deleteFile: async (filePath: string, filename: string): Promise<boolean> => {
        try {
            await invoke("delete_file", { path: filePath });
        } catch (err) {
            console.error("Failed to delete file:", err);
            return false;
        }

        const { files, viewerOpen, viewerIndex } = get();
        const idx = files.findIndex((f) => f.path === filePath);
        if (idx === -1) return true;

        const newFiles = files.filter((f) => f.path !== filePath);

        // Remove this file's entry from the viewer config
        const newConfig = { ...get().viewerConfig };
        delete newConfig[filename];

        let newViewerIndex = viewerIndex;
        let newViewerOpen = viewerOpen;

        if (viewerOpen) {
            if (newFiles.length === 0) {
                newViewerOpen = false;
                newViewerIndex = 0;
            } else if (idx <= viewerIndex) {
                newViewerIndex = Math.max(0, viewerIndex - 1);
            }
        }

        set({
            files: newFiles,
            viewerConfig: newConfig,
            viewerIndex: newViewerIndex,
            viewerOpen: newViewerOpen,
        });

        return true;
    },

    /**
     * Renames a file on disk and updates the file entry in the in-memory list.
     * newName is just the bare filename (no directory path).
     */
    renameFile: async (filePath: string, newName: string): Promise<void> => {
        try {
            const newPath = await invoke<string>("rename_file", { path: filePath, newName });
            const { files, viewerConfig } = get();

            // Update the files list with the new name and path
            const newFiles = files.map((f) =>
                f.path === filePath ? { ...f, name: newName, path: newPath } : f,
            );

            // Migrate the config entry to the new filename key
            const oldName = filePath.replace(/.*[\\/]/, "");
            const newConfig = { ...viewerConfig };
            if (newConfig[oldName]) {
                newConfig[newName] = newConfig[oldName];
                delete newConfig[oldName];
            }

            set({ files: newFiles, viewerConfig: newConfig });
        } catch (err) {
            console.error("Failed to rename file:", err);
            throw err;
        }
    },

    // ── App config actions ─────────────────────────────────────────────────────

    /** Load app config from the OS config directory on startup */
    loadAppConfig: async () => {
        try {
            const raw = await invoke<string>("read_app_config");
            const partial = JSON.parse(raw) as Partial<AppConfig>;
            const merged: AppConfig = { ...defaultAppConfig(), ...partial };
            set({ appConfig: merged, thumbSize: merged.defaultThumbSize });
        } catch {
            // File missing or unreadable — defaults are already in state
        }
    },

    /** Merge a config patch into current config and persist to disk */
    saveAppConfig: async (patch: Partial<AppConfig>) => {
        const updated: AppConfig = { ...get().appConfig, ...patch };
        set({ appConfig: updated });
        // Also sync thumbSize with defaultThumbSize if that setting changed
        if (patch.defaultThumbSize !== undefined) {
            set({ thumbSize: patch.defaultThumbSize });
        }
        try {
            await invoke("write_app_config", { configJson: JSON.stringify(updated) });
        } catch (err) {
            console.error("Failed to save app config:", err);
        }
    },

    /** Toggle the options modal open/closed */
    toggleOptions: () => set((s) => ({ optionsOpen: !s.optionsOpen })),

    // ── Derived / computed ─────────────────────────────────────────────────────

    /**
     * Returns the files array filtered by the current search term,
     * favoritesOnly flag, and the showVideos config setting.
     */
    getVisibleFiles: (): FileEntry[] => {
        const { files, searchFilter, favoritesOnly, viewerConfig, appConfig } = get();
        let result = files;

        if (!appConfig.showVideos) {
            result = result.filter((f) => !f.is_video);
        }
        if (favoritesOnly) {
            result = result.filter((f) => viewerConfig[f.name]?.favorite === true);
        }
        if (searchFilter.trim()) {
            const q = searchFilter.toLowerCase();
            result = result.filter((f) => f.name.toLowerCase().includes(q));
        }
        return result;
    },
}));
