// lib.rs — Tauri application entry point.
// Commands live in commands.rs. They are imported into this module's scope
// via `use` so that generate_handler![] can find the associated __cmd__ macros
// without re-declaring them (which would cause E0255 "defined multiple times").

mod commands;
use commands::{
    delete_file, get_asset_url, get_folder_tree, get_pictures_folder, get_startup_path,
    list_directory, read_app_config, read_viewer_config, register_context_menu, rename_file,
    show_in_explorer, toggle_fullscreen, unregister_context_menu, write_app_config,
    write_viewer_config, StartupPath,
};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Single-instance guard: if a second process is launched (e.g. from the
        // Windows context menu while the app is already open), the second process
        // exits immediately and its arguments are forwarded here via the callback.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            // Find the first non-flag argument = the file/folder path
            if let Some(path) = argv.iter().skip(1).find(|a| !a.starts_with('-')) {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("open-path", path.as_str());
                }
            }
            // Bring the existing window to the foreground
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Capture any file/folder path passed as a CLI argument (e.g. from the
            // Windows context menu "Open in Imageviewer") and store it in managed
            // state so the frontend can read it once on startup via get_startup_path.
            let startup_path: Option<String> = std::env::args()
                .skip(1) // skip the exe name
                .find(|arg| !arg.starts_with('-'));
            app.manage(StartupPath(std::sync::Mutex::new(startup_path)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_directory,
            get_folder_tree,
            read_viewer_config,
            write_viewer_config,
            get_pictures_folder,
            get_asset_url,
            delete_file,
            rename_file,
            show_in_explorer,
            read_app_config,
            write_app_config,
            get_startup_path,
            toggle_fullscreen,
            register_context_menu,
            unregister_context_menu,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
