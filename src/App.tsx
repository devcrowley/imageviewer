import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Layout from "./components/Layout/Layout";
import FolderTree from "./components/FolderTree/FolderTree";
import Breadcrumb from "./components/Breadcrumb/Breadcrumb";
import MediaGrid from "./components/MediaGrid/MediaGrid";
import ImageViewer from "./components/ImageViewer/ImageViewer";
import StatusBar from "./components/StatusBar/StatusBar";
import OptionsModal from "./components/OptionsModal/OptionsModal";
import { useAppStore } from "./store/appStore";

/**
 * Root application component.
 *
 * On mount it:
 *  1. Loads the app config from disk (options / preferences)
 *  2. Loads the persisted last-folder from localStorage if startInLastFolder is enabled
 *  3. Falls back to the OS Pictures directory via the `get_pictures_folder` Rust command
 *  4. Registers a Tauri file-drop listener to handle drag-to-open
 */
function App() {
    const { setRootPath, openViewer, getVisibleFiles, loadAppConfig, appConfig, optionsOpen, toggleOptions } =
        useAppStore();

    useEffect(() => {
        /** Bootstrap: load config then pick the initial root folder */
        const bootstrap = async () => {
            // Always load app config first so all settings are available
            await loadAppConfig();

            // Re-read appConfig after loading (store is updated synchronously)
            const { appConfig: cfg } = useAppStore.getState();

            if (cfg.startInLastFolder) {
                const remembered = localStorage.getItem("lastRootPath");
                if (remembered) {
                    setRootPath(remembered);
                    return;
                }
            }

            // Fall back to OS Pictures folder
            try {
                const picturesPath = await invoke<string>("get_pictures_folder");
                setRootPath(picturesPath);
            } catch {
                // Nothing to open — user will click "Open Folder"
            }
        };

        bootstrap();

        // ── Drag-to-open support ──────────────────────────────────────────────
        // Tauri emits 'tauri://file-drop' on the window when files / folders
        // are dragged onto the app executable or the window surface.
        let unlisten: (() => void) | null = null;

        getCurrentWindow()
            .listen<string[]>("tauri://file-drop", async (event) => {
                const paths = event.payload;
                if (!paths || paths.length === 0) return;

                const firstPath = paths[0];

                // Try to detect whether the path is a file or a directory.
                // We'll attempt list_directory; if it succeeds it's a folder.
                try {
                    await invoke("list_directory", { path: firstPath });
                    // It's a directory → set as root and navigate
                    await setRootPath(firstPath);
                } catch {
                    // It's a file → navigate to its parent, then open viewer
                    const parent = firstPath.replace(/[\\/][^\\/]+$/, "") || firstPath;
                    await setRootPath(parent);
                    // Wait a tick for the store to populate the files list
                    setTimeout(() => {
                        const files = getVisibleFiles();
                        const idx = files.findIndex((f) => f.path === firstPath);
                        if (idx >= 0) openViewer(idx);
                    }, 100);
                }
            })
            .then((fn) => {
                unlisten = fn;
            });

        // ── Alt+Enter: toggle fullscreen ──────────────────────────────────────
        const handleFullscreenToggle = async (e: KeyboardEvent) => {
            if (e.altKey && e.code === "Enter") {
                e.preventDefault();
                const win = getCurrentWindow();
                const isFullscreen = await win.isFullscreen();
                await win.setFullscreen(!isFullscreen);
            }
        };

        window.addEventListener("keydown", handleFullscreenToggle);

        return () => {
            unlisten?.();
            window.removeEventListener("keydown", handleFullscreenToggle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist the current root path whenever it changes
    const rootPath = useAppStore((s) => s.rootPath);
    useEffect(() => {
        if (rootPath && appConfig.startInLastFolder) {
            localStorage.setItem("lastRootPath", rootPath);
        }
    }, [rootPath, appConfig.startInLastFolder]);

    return (
        <>
            <Layout
                sidebar={<FolderTree />}
                breadcrumb={<Breadcrumb />}
                content={<MediaGrid />}
                statusBar={<StatusBar onOptionsClick={toggleOptions} />}
            />

            {/* Full-screen viewer rendered outside the layout so it can use position:fixed */}
            <ImageViewer />

            {/* Options modal */}
            {optionsOpen && <OptionsModal />}
        </>
    );
}

export default App;
