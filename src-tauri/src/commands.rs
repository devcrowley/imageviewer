use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;

// ── Shared types ─────────────────────────────────────────────────────────────

/// A single file entry returned by list_directory
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_video: bool,
}

/// A single folder entry returned by list_directory
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FolderEntry {
    pub name: String,
    pub path: String,
    pub media_count: usize,
}

/// The response from list_directory
#[derive(Serialize, Deserialize, Debug)]
pub struct DirectoryListing {
    pub folders: Vec<FolderEntry>,
    pub files: Vec<FileEntry>,
}

/// A folder node used for the recursive folder tree
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TreeNode {
    pub name: String,
    pub path: String,
    pub children: Vec<TreeNode>,
}

// ── File extension helpers ────────────────────────────────────────────────────

const IMAGE_EXTS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "avif"];
const VIDEO_EXTS: &[&str] = &["mp4", "webm", "mov"];

/// Returns true if the file extension is a supported image or video format
pub fn is_media(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    IMAGE_EXTS.contains(&ext.as_str()) || VIDEO_EXTS.contains(&ext.as_str())
}

/// Returns true if the extension is a video format
pub fn is_video_ext(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    VIDEO_EXTS.contains(&ext.as_str())
}

/// Counts all media files recursively under a directory (for folder badge counts)
pub fn count_media_recursive(dir: &Path) -> usize {
    let mut count = 0;
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                count += count_media_recursive(&path);
            } else if is_media(&path) {
                count += 1;
            }
        }
    }
    count
}

/// Internal recursive helper for get_folder_tree
pub fn build_tree(dir: &Path, depth: u32, max_depth: u32) -> Vec<TreeNode> {
    if depth >= max_depth {
        return Vec::new();
    }

    let mut nodes: Vec<TreeNode> = Vec::new();

    let mut entries: Vec<_> = match fs::read_dir(dir) {
        Ok(e) => e.flatten().collect(),
        Err(_) => return nodes,
    };

    entries.sort_by(|a, b| {
        a.file_name()
            .to_string_lossy()
            .to_lowercase()
            .cmp(&b.file_name().to_string_lossy().to_lowercase())
    });

    for entry in entries {
        let entry_path = entry.path();
        if !entry_path.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        // Skip hidden directories (dot-prefixed)
        if name.starts_with('.') {
            continue;
        }
        let full_path = entry_path.to_string_lossy().to_string();
        let children = build_tree(&entry_path, depth + 1, max_depth);

        nodes.push(TreeNode {
            name,
            path: full_path,
            children,
        });
    }

    nodes
}

// ── Tauri commands ────────────────────────────────────────────────────────────
// NOTE: These are defined in a separate file (commands.rs) and imported into
// lib.rs via `use commands::*` so that generate_handler![] can resolve the
// associated __cmd__ macros without a "defined multiple times" conflict.

    /// Lists the immediate contents of a directory.
    /// Returns separate arrays of subfolders (with media counts) and media files.
    #[tauri::command]
    pub fn list_directory(path: String) -> Result<DirectoryListing, String> {
        let dir = PathBuf::from(&path);

        if !dir.is_dir() {
            return Err(format!("Not a directory: {}", path));
        }

        let mut folders: Vec<FolderEntry> = Vec::new();
        let mut files: Vec<FileEntry> = Vec::new();

        let mut entries: Vec<_> = fs::read_dir(&dir)
            .map_err(|e| e.to_string())?
            .flatten()
            .collect();

        // Sort: folders first, then files — both alphabetically (case-insensitive)
        entries.sort_by(|a, b| {
            let a_is_dir = a.path().is_dir();
            let b_is_dir = b.path().is_dir();
            match (a_is_dir, b_is_dir) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a
                    .file_name()
                    .to_string_lossy()
                    .to_lowercase()
                    .cmp(&b.file_name().to_string_lossy().to_lowercase()),
            }
        });

        for entry in entries {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let full_path = entry_path.to_string_lossy().to_string();

            if entry_path.is_dir() {
                let media_count = count_media_recursive(&entry_path);
                folders.push(FolderEntry {
                    name,
                    path: full_path,
                    media_count,
                });
            } else if is_media(&entry_path) {
                files.push(FileEntry {
                    name,
                    is_video: is_video_ext(&entry_path),
                    path: full_path,
                });
            }
        }

        Ok(DirectoryListing { folders, files })
    }

    /// Recursively builds a folder tree for the sidebar (directories only).
    /// max_depth defaults to 3 to avoid slow scans of very deep trees.
    #[tauri::command]
    pub fn get_folder_tree(path: String, max_depth: Option<u32>) -> Result<Vec<TreeNode>, String> {
        let dir = PathBuf::from(&path);
        let depth_limit = max_depth.unwrap_or(3);

        if !dir.is_dir() {
            return Err(format!("Not a directory: {}", path));
        }

        Ok(build_tree(&dir, 0, depth_limit))
    }

    /// Reads the _viewer.cfg JSON from the given folder path.
    /// Returns an empty JSON object string ("{}") if the file doesn't exist.
    #[tauri::command]
    pub fn read_viewer_config(folder_path: String) -> Result<String, String> {
        let cfg_path = PathBuf::from(&folder_path).join("_viewer.cfg");

        if !cfg_path.exists() {
            return Ok("{}".to_string());
        }

        fs::read_to_string(&cfg_path).map_err(|e| e.to_string())
    }

    /// Writes (or overwrites) the _viewer.cfg JSON in the given folder.
    /// Validates the JSON before writing to prevent file corruption.
    #[tauri::command]
    pub fn write_viewer_config(folder_path: String, config_json: String) -> Result<(), String> {
        // Validate it's parseable JSON before writing
        let _: serde_json::Value =
            serde_json::from_str(&config_json).map_err(|e| format!("Invalid JSON: {}", e))?;

        let cfg_path = PathBuf::from(&folder_path).join("_viewer.cfg");
        fs::write(&cfg_path, config_json.as_bytes()).map_err(|e| e.to_string())
    }

    /// Returns the OS Pictures folder path (Windows/macOS/Linux).
    /// Falls back to home dir, then C:\\ if nothing is found.
    #[tauri::command]
    pub fn get_pictures_folder() -> String {
        dirs::picture_dir()
            .or_else(dirs::home_dir)
            .unwrap_or_else(|| PathBuf::from("C:\\"))
            .to_string_lossy()
            .to_string()
    }

    /// Normalises a file system path by converting backslashes to forward slashes.
    /// Used before passing paths to convertFileSrc on the frontend.
    #[tauri::command]
    pub fn get_asset_url(path: String) -> String {
        path.replace('\\', "/")
    }

    /// Permanently deletes a file from disk (does NOT move to recycle bin).
    #[tauri::command]
    pub fn delete_file(path: String) -> Result<(), String> {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }

    /// Renames a file within its current directory.
    /// `new_name` is a bare filename (no path separators).
    /// Returns the new absolute path on success.
    #[tauri::command]
    pub fn rename_file(path: String, new_name: String) -> Result<String, String> {
        // Reject any path separators in new_name to prevent directory traversal
        if new_name.contains('/') || new_name.contains('\\') {
            return Err("new_name must be a bare filename with no path separators".to_string());
        }
        let old_path = PathBuf::from(&path);
        let parent = old_path.parent().ok_or_else(|| "No parent directory".to_string())?;
        let new_path = parent.join(&new_name);
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
        Ok(new_path.to_string_lossy().to_string())
    }

    /// Opens Windows Explorer with the given file pre-selected.
    #[tauri::command]
    pub fn show_in_explorer(path: String) -> Result<(), String> {
        std::process::Command::new("explorer")
            .arg(format!("/select,{}", path))
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Reads the application config.json from the OS config directory.
    /// Returns "{}" if the file hasn't been created yet.
    #[tauri::command]
    pub fn read_app_config() -> Result<String, String> {
        let config_path = dirs::config_dir()
            .ok_or_else(|| "Could not resolve config directory".to_string())?
            .join("imageviewer")
            .join("config.json");

        if !config_path.exists() {
            return Ok("{}".to_string());
        }

        fs::read_to_string(&config_path).map_err(|e| e.to_string())
    }

    /// Writes the application config.json to the OS config directory.
    /// Validates JSON and creates the directory if it doesn't exist.
    #[tauri::command]
    pub fn write_app_config(config_json: String) -> Result<(), String> {
        // Validate before touching the file
        let _: serde_json::Value =
            serde_json::from_str(&config_json).map_err(|e| format!("Invalid JSON: {}", e))?;

        let config_dir = dirs::config_dir()
            .ok_or_else(|| "Could not resolve config directory".to_string())?
            .join("imageviewer");

        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
        fs::write(config_dir.join("config.json"), config_json.as_bytes())
            .map_err(|e| e.to_string())
    }

// ── CLI / single-instance path handling ──────────────────────────────────────

use std::sync::Mutex;

/// Managed application state holding the file/folder path passed as a CLI argument.
/// Stored once during the setup hook and consumed (cleared) on the first frontend read.
pub struct StartupPath(pub Mutex<Option<String>>);

/// Returns and clears the path that was passed as a CLI argument on startup.
/// The frontend calls this once after boot; subsequent calls return None.
#[tauri::command]
pub fn get_startup_path(state: tauri::State<'_, StartupPath>) -> Option<String> {
    let mut guard = state.0.lock().unwrap();
    guard.take()
}

/// Toggles the main window between fullscreen and windowed mode.
/// Executed server-side so it bypasses the JS capability permission system.
#[tauri::command]
pub fn toggle_fullscreen(window: tauri::WebviewWindow) -> Result<(), String> {
    let is_full = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_full).map_err(|e| e.to_string())
}

// ── Windows context menu registration ────────────────────────────────────────

/// Writes HKCU registry entries so "Open in Imageviewer" appears in the Windows
/// right-click context menu for all supported image/video extensions and folders.
/// Uses HKEY_CURRENT_USER so no admin rights are required.
#[cfg(windows)]
#[tauri::command]
pub fn register_context_menu() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let exe_path = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let cmd_value = format!("\"{}\" \"%1\"", exe_path);
    let icon_value = format!("{},0", exe_path);

    // Supported media extensions (images + videos playable by the WebView)
    let media_exts = [
        "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "avif",
        "mp4", "webm", "mov",
    ];

    for ext in &media_exts {
        let shell_path = format!(
            "Software\\Classes\\SystemFileAssociations\\.{}\\shell\\OpenInImageviewer",
            ext
        );
        let (shell_key, _) = hkcu.create_subkey(&shell_path).map_err(|e| e.to_string())?;
        shell_key
            .set_value("", &"Open in Imageviewer")
            .map_err(|e| e.to_string())?;
        shell_key
            .set_value("Icon", &icon_value)
            .map_err(|e| e.to_string())?;
        let (cmd_key, _) = shell_key.create_subkey("command").map_err(|e| e.to_string())?;
        cmd_key
            .set_value("", &cmd_value)
            .map_err(|e| e.to_string())?;
    }

    // Folders
    let (folder_key, _) = hkcu
        .create_subkey("Software\\Classes\\Directory\\shell\\OpenInImageviewer")
        .map_err(|e| e.to_string())?;
    folder_key
        .set_value("", &"Open folder in Imageviewer")
        .map_err(|e| e.to_string())?;
    folder_key
        .set_value("Icon", &icon_value)
        .map_err(|e| e.to_string())?;
    let (folder_cmd_key, _) = folder_key
        .create_subkey("command")
        .map_err(|e| e.to_string())?;
    folder_cmd_key
        .set_value("", &cmd_value)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Stub for non-Windows builds.
#[cfg(not(windows))]
#[tauri::command]
pub fn register_context_menu() -> Result<(), String> {
    Err("Context menu registration is only supported on Windows.".to_string())
}

/// Removes the "Open in Imageviewer" entries from the Windows registry.
#[cfg(windows)]
#[tauri::command]
pub fn unregister_context_menu() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    let media_exts = [
        "jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "avif",
        "mp4", "webm", "mov",
    ];

    for ext in &media_exts {
        let key_path = format!(
            "Software\\Classes\\SystemFileAssociations\\.{}\\shell\\OpenInImageviewer",
            ext
        );
        // Ignore errors — key may not exist yet
        let _ = hkcu.delete_subkey_all(&key_path);
    }

    let _ = hkcu
        .delete_subkey_all("Software\\Classes\\Directory\\shell\\OpenInImageviewer");

    Ok(())
}

/// Stub for non-Windows builds.
#[cfg(not(windows))]
#[tauri::command]
pub fn unregister_context_menu() -> Result<(), String> {
    Err("Context menu registration is only supported on Windows.".to_string())
}
