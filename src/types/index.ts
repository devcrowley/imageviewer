// ── Shared TypeScript types for the Image Viewer application ─────────────────

/** A file entry returned by the Rust list_directory command */
export interface FileEntry {
    name: string;
    /** Absolute file system path */
    path: string;
    is_video: boolean;
}

/** A folder entry returned by the Rust list_directory command */
export interface FolderEntry {
    name: string;
    /** Absolute file system path */
    path: string;
    /** Total media files recursively inside this folder */
    media_count: number;
}

/** The full listing for a directory */
export interface DirectoryListing {
    folders: FolderEntry[];
    files: FileEntry[];
}

/** A node in the collapsible folder tree (sidebar) */
export interface TreeNode {
    name: string;
    path: string;
    children: TreeNode[];
}

/**
 * Per-image transform & metadata stored in _viewer.cfg.
 * Keyed by filename (not full path) so config is portable.
 */
export interface ImageSettings {
    /** CSS rotation in degrees (multiples of 5) */
    rotation: number;
    /** Panzoom transform: x/y offsets in pixels, scale multiplier */
    transform: {
        x: number;
        y: number;
        scale: number;
    };
    /** Whether the user has marked this image as a favourite */
    favorite: boolean;
}

/**
 * Top-level config file structure for _viewer.cfg.
 * Keys are filenames e.g. "photo.jpg"
 */
export type ViewerConfig = Record<string, ImageSettings>;

/** Default/empty ImageSettings for a file with no saved state */
export const defaultImageSettings = (): ImageSettings => ({
    rotation: 0,
    transform: { x: 0, y: 0, scale: 1 },
    favorite: false,
});

/**
 * Application-level settings stored in the OS config directory as config.json.
 * All fields are optional on read so defaults apply for missing keys.
 */
export interface AppConfig {
    /** Show a confirmation dialog before permanently deleting files (default: true) */
    confirmDeletion: boolean;
    /** Re-open the last browsed folder on startup (default: true) */
    startInLastFolder: boolean;
    /** Always pick images randomly when navigating next/prev in the viewer (default: false) */
    alwaysShuffle: boolean;
    /** Loop back to the first image after reaching the last one (default: true) */
    loopSlideshow: boolean;
    /** Include video files in the grid (default: true) */
    showVideos: boolean;
    /** Default thumbnail size in pixels (default: 180) */
    defaultThumbSize: number;
}

/** Sensible defaults — applied whenever a key is absent from the stored config */
export const defaultAppConfig = (): AppConfig => ({
    confirmDeletion: true,
    startInLastFolder: true,
    alwaysShuffle: false,
    loopSlideshow: true,
    showVideos: true,
    defaultThumbSize: 180,
});
