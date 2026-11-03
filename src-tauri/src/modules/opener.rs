//! Opening links in the browser and folders in the file manager.
//!
//! Linux runs the desktop's launcher itself rather than through tauri-plugin-opener, which spawns `xdg-open` detached
//! and reports success as soon as it started. Inside the AppImage that finds the bundled `xdg-open` first on PATH: the
//! build machine's (Ubuntu 22.04, xdg-utils 1.1.3), which exits 0 without opening anything on KDE Plasma 6. And any
//! launcher would inherit AppRun's environment, which points library and module paths (LD_LIBRARY_PATH,
//! GIO_EXTRA_MODULES, GTK_PATH, ...) into the image, so the host's launchers and browser load the image's libraries.
//! Here: the host's launcher, in the host's environment, and its exit status.

use tauri::{AppHandle, Manager};

/// Opens an http(s) URL in the default browser. Fails when no launcher could open it.
pub fn open_url(app: &AppHandle, url: &str) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Invalid URL scheme: only HTTP(S) is allowed".to_string());
    }
    #[cfg(target_os = "linux")]
    {
        let _ = app;
        linux::open(url.as_ref())
    }
    #[cfg(not(target_os = "linux"))]
    {
        use tauri_plugin_opener::OpenerExt;
        app.opener()
            .open_url(url, None::<&str>)
            .map_err(|e| format!("Failed to open URL: {e}"))
    }
}

/// Opens the app's config folder (settings, logs) in the file manager.
pub fn open_config_dir(app: &AppHandle) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    {
        linux::open(dir.as_os_str())
    }
    #[cfg(not(target_os = "linux"))]
    {
        use tauri_plugin_opener::OpenerExt;
        app.opener()
            .open_path(dir.to_string_lossy(), None::<&str>)
            .map_err(|e| format!("Failed to open {}: {}", dir.display(), e))
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use super::host::{find_program, host_env};
    use std::ffi::{OsStr, OsString};
    use std::os::unix::process::CommandExt;
    use std::path::{Path, PathBuf};
    use std::process::{Command, Stdio};
    use std::sync::mpsc::{self, RecvTimeoutError};
    use std::time::Duration;

    /// Tried in order, as the `open` crate behind tauri-plugin-opener does.
    const LAUNCHERS: [(&str, &[&str]); 4] = [
        ("xdg-open", &[]),
        ("gio", &["open"]),
        ("kde-open", &[]),
        ("gnome-open", &[]),
    ];

    /// A launcher still running after this is running the app it opened (xdg-open waits on a browser it had to
    /// start): opened.
    const SETTLE: Duration = Duration::from_secs(3);

    /// Opens `target` (a URL or a path) with the desktop's default app.
    pub fn open(target: &OsStr) -> Result<(), String> {
        let env = host_env(std::env::vars_os(), image_dir().as_deref());
        let path = env
            .iter()
            .find(|(key, _)| key == "PATH")
            .map(|(_, value)| value.as_os_str());
        let mut failures = Vec::new();
        for (name, args) in LAUNCHERS {
            let Some(program) = find_program(name, path) else {
                continue;
            };
            match launch(&program, args, target, &env) {
                Ok(()) => return Ok(()),
                Err(e) => failures.push(e),
            }
        }
        if failures.is_empty() {
            Err("No program to open it with (install xdg-utils)".to_string())
        } else {
            Err(failures.join("; "))
        }
    }

    /// The AppImage this runs from (mounted or extracted): AppRun's APPDIR, if this executable is inside it.
    fn image_dir() -> Option<PathBuf> {
        let dir = PathBuf::from(std::env::var_os("APPDIR")?);
        let exe = std::env::current_exe().ok()?;
        exe.starts_with(&dir).then_some(dir)
    }

    /// Runs the launcher and judges it by its exit status, or as opened once it has run for SETTLE.
    fn launch(
        program: &Path,
        args: &[&str],
        target: &OsStr,
        env: &[(OsString, OsString)],
    ) -> Result<(), String> {
        let mut child = Command::new(program)
            .args(args)
            .arg(target)
            .env_clear()
            .envs(env.iter().map(|(key, value)| (key, value)))
            .stdin(Stdio::null())
            // Its own process group: a browser it starts survives a Ctrl+C in the terminal that started the app
            .process_group(0)
            .spawn()
            .map_err(|e| format!("{}: {}", program.display(), e))?;
        let (done, exited) = mpsc::channel();
        // Also reaps it when it outlives SETTLE
        std::thread::spawn(move || {
            let _ = done.send(child.wait());
        });
        match exited.recv_timeout(SETTLE) {
            Ok(Ok(status)) if status.success() => Ok(()),
            Ok(Ok(status)) => Err(format!("{} failed ({})", program.display(), status)),
            Ok(Err(e)) => Err(format!("{}: {}", program.display(), e)),
            Err(RecvTimeoutError::Timeout) => Ok(()),
            Err(RecvTimeoutError::Disconnected) => {
                Err(format!("{}: lost track of it", program.display()))
            }
        }
    }
}

/// The Linux launcher's environment and program lookup (built on any Unix for the tests).
#[cfg(any(target_os = "linux", all(test, unix)))]
mod host {
    use std::ffi::{OsStr, OsString};
    use std::os::unix::ffi::{OsStrExt, OsStringExt};
    use std::os::unix::fs::PermissionsExt;
    use std::path::{Path, PathBuf};

    /// Set by the AppImage runtime and AppRun; meaningless to (or misleading for) other apps.
    const IMAGE_VARS: [&str; 4] = ["APPDIR", "APPIMAGE", "ARGV0", "OWD"];

    /// The environment as the desktop gave it to the app: without what the AppImage added. AppRun and its hooks
    /// prepend the image to PATH, LD_LIBRARY_PATH, XDG_DATA_DIRS, ... and point GTK, GIO, GStreamer, Python and Perl
    /// into it. Outside an AppImage (`image` None), the environment as is.
    pub fn host_env(
        vars: impl IntoIterator<Item = (OsString, OsString)>,
        image: Option<&Path>,
    ) -> Vec<(OsString, OsString)> {
        let Some(image) = image else {
            return vars.into_iter().collect();
        };
        vars.into_iter()
            .filter_map(|(key, value)| {
                if IMAGE_VARS.iter().any(|var| key == *var) {
                    return None;
                }
                // The GTK hook sets it from APPIMAGE_GTK_THEME: empty unless the user set that
                if key == "GTK_THEME" && value.is_empty() {
                    return None;
                }
                let entries: Vec<&[u8]> = value.as_bytes().split(|&b| b == b':').collect();
                let kept: Vec<&[u8]> = entries
                    .iter()
                    .copied()
                    .filter(|entry| !Path::new(OsStr::from_bytes(entry)).starts_with(image))
                    .collect();
                if kept.len() == entries.len() {
                    return Some((key, value));
                }
                let kept: Vec<&[u8]> = kept.into_iter().filter(|entry| !entry.is_empty()).collect();
                (!kept.is_empty()).then(|| (key, OsString::from_vec(kept.join(&b':'))))
            })
            .collect()
    }

    /// `name` in the first absolute directory of `path` that has it as an executable file.
    pub fn find_program(name: &str, path: Option<&OsStr>) -> Option<PathBuf> {
        std::env::split_paths(path?)
            .filter(|dir| dir.is_absolute())
            .map(|dir| dir.join(name))
            .find(|program| {
                program
                    .metadata()
                    .is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
            })
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::host::{find_program, host_env};
    use std::ffi::{OsStr, OsString};
    use std::os::unix::fs::PermissionsExt;
    use std::path::Path;

    fn vars(pairs: &[(&str, &str)]) -> Vec<(OsString, OsString)> {
        pairs
            .iter()
            .map(|(key, value)| (OsString::from(key), OsString::from(value)))
            .collect()
    }

    const IMAGE: &str = "/tmp/.mount_PD2 TrAbC";

    #[test]
    fn host_env_outside_an_appimage_is_the_environment() {
        let env = vars(&[
            ("PATH", "/usr/bin"),
            ("LD_LIBRARY_PATH", "/opt/lib"),
            ("GDK_BACKEND", "x11"),
        ]);
        assert_eq!(host_env(env.clone(), None), env);
    }

    #[test]
    fn host_env_takes_the_image_out_of_path_lists_and_keeps_the_rest() {
        let env = vars(&[
            (
                "PATH",
                "/tmp/.mount_PD2 TrAbC/usr/bin/:/tmp/.mount_PD2 TrAbC/usr/sbin/:/usr/local/bin:/usr/bin",
            ),
            ("LD_LIBRARY_PATH", "/tmp/.mount_PD2 TrAbC/usr/lib/:/opt/cuda/lib64"),
            (
                "XDG_DATA_DIRS",
                "/tmp/.mount_PD2 TrAbC/usr/share:/usr/share:/usr/local/share",
            ),
            // Not the image: a sibling whose name only starts the same
            (
                "GTK_PATH",
                "/tmp/.mount_PD2 TrAbC/usr/lib/gtk-3.0:/tmp/.mount_PD2 TrAbCd/gtk",
            ),
        ]);
        assert_eq!(
            host_env(env, Some(Path::new(IMAGE))),
            vars(&[
                ("PATH", "/usr/local/bin:/usr/bin"),
                ("LD_LIBRARY_PATH", "/opt/cuda/lib64"),
                ("XDG_DATA_DIRS", "/usr/share:/usr/local/share"),
                ("GTK_PATH", "/tmp/.mount_PD2 TrAbCd/gtk"),
            ]),
        );
    }

    #[test]
    fn host_env_drops_what_only_points_into_the_image() {
        let env = vars(&[
            (
                "LD_LIBRARY_PATH",
                "/tmp/.mount_PD2 TrAbC/usr/lib/:/tmp/.mount_PD2 TrAbC/usr/lib64/:",
            ),
            (
                "GDK_PIXBUF_MODULE_FILE",
                "/tmp/.mount_PD2 TrAbC/usr/lib/gdk-pixbuf-2.0/2.10.0/loaders.cache",
            ),
            (
                "GIO_EXTRA_MODULES",
                "/tmp/.mount_PD2 TrAbC/usr/lib/x86_64-linux-gnu/gio/modules",
            ),
            ("GTK_DATA_PREFIX", IMAGE),
            ("PYTHONHOME", "/tmp/.mount_PD2 TrAbC/usr/"),
            ("APPDIR", IMAGE),
            ("APPIMAGE", "/home/me/PD2 Trader.AppImage"),
            ("ARGV0", "PD2 Trader.AppImage"),
            ("OWD", "/home/me"),
            ("GTK_THEME", ""),
            ("HOME", "/home/me"),
        ]);
        assert_eq!(
            host_env(env, Some(Path::new(IMAGE))),
            vars(&[("HOME", "/home/me")])
        );
    }

    #[test]
    fn host_env_leaves_other_values_with_colons_alone() {
        let env = vars(&[
            ("DISPLAY", ":0"),
            ("DBUS_SESSION_BUS_ADDRESS", "unix:path=/run/user/1000/bus"),
            ("GTK_THEME", "Breeze:dark"),
            ("PATH", "/usr/bin::/bin"),
        ]);
        assert_eq!(host_env(env.clone(), Some(Path::new(IMAGE))), env);
    }

    #[test]
    fn find_program_takes_the_first_executable_file_on_path() {
        let root = std::env::temp_dir().join(format!("pd2-opener-test-{}", std::process::id()));
        let (plain, exec) = (root.join("plain"), root.join("exec"));
        std::fs::create_dir_all(&plain).unwrap();
        std::fs::create_dir_all(exec.join("xdg-open-dir")).unwrap();
        std::fs::write(plain.join("xdg-open"), "").unwrap();
        std::fs::write(exec.join("xdg-open"), "#!/bin/sh\n").unwrap();
        std::fs::set_permissions(
            exec.join("xdg-open"),
            std::fs::Permissions::from_mode(0o755),
        )
        .unwrap();

        let path = std::env::join_paths([
            Path::new("relative/bin").to_path_buf(),
            plain.clone(),
            exec.clone(),
        ])
        .unwrap();
        assert_eq!(
            find_program("xdg-open", Some(path.as_os_str())),
            Some(exec.join("xdg-open"))
        );
        // A directory isn't a program
        assert_eq!(find_program("xdg-open-dir", Some(path.as_os_str())), None);
        assert_eq!(find_program("gio", Some(path.as_os_str())), None);
        assert_eq!(find_program("xdg-open", None::<&OsStr>), None);

        std::fs::remove_dir_all(&root).unwrap();
    }
}
