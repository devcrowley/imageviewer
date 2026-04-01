# Image Viewer

A fast, lightweight desktop image and video viewer built with **Tauri v2**, **React 18**, and **TypeScript**. Purpose-built as a modern replacement for a legacy NW.js viewer, with persistent per-image settings, favorites, and first-class Windows shell integration.

---

## Stack

| Layer            | Technology                                  |
| ---------------- | ------------------------------------------- |
| Desktop shell    | Tauri v2 (Rust backend + WebView2 frontend) |
| UI framework     | React 18 + TypeScript 5                     |
| Build tool       | Vite 5                                      |
| State management | Zustand 5                                   |
| Pan / zoom       | @panzoom/panzoom 4.6.1                      |
| Package manager  | Yarn 1.x                                    |

---

## Features

### Gallery
- Browsable folder tree (sidebar) with recursive media file counts
- Thumbnail grid with adjustable size slider
- Text filter to search files by name
- Favorites-only toggle to show starred images
- Folder navigation via double-click or the breadcrumb trail
- Status bar showing folder/file counts and active filters

### Full-screen Viewer
- Pan and zoom with mouse wheel and drag (`1` — zoom 100%, `2` — zoom to fit)
- Per-image rotation saved persistently (`W` / `Q` — 5°, `Shift+W` / `Shift+Q` — 90°, `E` — reset)
- Toggle favorite (`Space`)
- Toggle favorites-only filter without leaving the viewer (`F`)
- Jump to a random image (`S` — shuffle)
- Permanently delete the current file (`Delete`, with optional confirmation dialog)
- Image info bar overlay (`D`) showing filename, index, and path
- Keyboard hint strip at the bottom of the viewer

### Keyboard Shortcuts

| Key                 | Action                  |
| ------------------- | ----------------------- |
| `→` / `↓`           | Next image              |
| `←` / `↑`           | Previous image          |
| `W`                 | Rotate +5°              |
| `Shift+W`           | Rotate +90°             |
| `Q`                 | Rotate -5°              |
| `Shift+Q`           | Rotate -90°             |
| `E`                 | Reset rotation          |
| `Space`             | Toggle favorite         |
| `F`                 | Toggle favorites-only   |
| `S`                 | Shuffle (random image)  |
| `D`                 | Toggle info bar         |
| `Delete`            | Permanently delete file |
| `1`                 | Zoom to 100%            |
| `2`                 | Zoom to fit             |
| `Esc`               | Close viewer            |
| `F11` / `Alt+Enter` | Toggle fullscreen       |

### File Operations (right-click context menu)
- **Open** — open the file in the full-screen viewer
- **Rename** — inline rename modal, pre-selects the filename stem
- **Show in Explorer** — opens the containing folder with the file selected
- **Delete** — permanently deletes the file (optional confirmation)

### Persistent Settings
Per-image rotation, zoom/pan transform, and favorite state are saved to `_viewer.cfg` in each browsed folder. Settings survive app restarts and are keyed by filename.

### Application Options (⚙ gear button)
All options are persisted to `%APPDATA%\imageviewer\config.json`.

| Option                      | Default |
| --------------------------- | ------- |
| Confirm file deletion       | On      |
| Start in last opened folder | On      |
| Always shuffle images       | Off     |
| Loop slideshow              | On      |
| Show video files            | On      |
| Default thumbnail size      | 180 px  |

### Windows Shell Integration
- Register an **"Open in Imageviewer"** entry in the Windows right-click context menu for all supported image/video extensions and folders — no admin rights required (writes to `HKCU`)
- Unregister at any time from the same Options panel
- **Single-instance**: opening a file while the app is already running navigates the existing window instead of spawning a second one
- Supports receiving a file or folder path as a CLI argument (used by the context menu handler)

### Supported Formats
| Type   | Extensions                                      |
| ------ | ----------------------------------------------- |
| Images | jpg, jpeg, png, gif, webp, bmp, tiff, tif, avif |
| Video  | mp4, webm, mov                                  |

---

## Development

```bat
:: Start the dev server (hot-reload)
yarn tauri dev

:: Production build (also bumps the patch version automatically)
build.bat
```

The `build.bat` script at the project root runs `scripts/bump-version.ps1` to increment the patch version in both `tauri.conf.json` and `package.json`, then calls `yarn tauri build`. The output installer is placed at:

```
src-tauri\target\release\bundle\nsis\Image Viewer_<version>_x64-setup.exe
```

---

## Project Structure

```
src/
  components/
    Breadcrumb/       — path navigation strip
    ContextMenu/      — right-click popup menu
    FolderTree/       — sidebar folder tree
    ImageViewer/      — full-screen viewer overlay
    Layout/           — app shell (sidebar + main + statusbar)
    MediaGrid/        — thumbnail gallery grid
    OptionsModal/     — settings panel
    RenameModal/      — inline rename dialog
    StatusBar/        — bottom status bar + options button
  store/
    appStore.ts       — Zustand global state
  types/
    index.ts          — shared TypeScript interfaces
src-tauri/
  src/
    commands.rs       — all Tauri/Rust backend commands
    lib.rs            — app entry point, plugin registration
scripts/
  bump-version.ps1    — patch version auto-increment script
build.bat             — one-command production build
```

