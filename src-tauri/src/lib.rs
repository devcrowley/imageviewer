// lib.rs — Tauri application entry point.
// Commands live in commands.rs. They are imported into this module's scope
// via `use` so that generate_handler![] can find the associated __cmd__ macros
// without re-declaring them (which would cause E0255 "defined multiple times").

mod commands;
use commands::{
    delete_file, get_asset_url, get_folder_tree, get_pictures_folder, list_directory,
    read_app_config, read_viewer_config, rename_file, show_in_explorer, write_app_config,
    write_viewer_config,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
