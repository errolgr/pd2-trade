use std::path::PathBuf;

pub fn is_elevated() -> bool {
    // On Linux, we generally don't want to force root for a GUI app.
    // Returning true bypasses the restart_as_admin check.
    true
}

pub fn restart_as_admin() {
    // No-op or log warning
    eprintln!("Elevation requested but not implemented for Linux");
}

pub fn find_diablo2_install_path() -> Option<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_default();
    let home_path = PathBuf::from(home);
    #[allow(unused_mut)]
    let mut common_paths = vec![
        home_path.join("Games/Diablo II"),
        home_path.join("Games/project-diablo-2"),
        home_path.join(".wine/drive_c/Program Files (x86)/Diablo II"),
    ];
    #[cfg(target_os = "macos")]
    common_paths.extend(macos_wine_bottle_paths(&home_path));

    for path in common_paths {
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// Diablo II folders inside the Windows prefixes of macOS Wine wrappers (CrossOver, Whisky).
#[cfg(target_os = "macos")]
fn macos_wine_bottle_paths(home: &std::path::Path) -> Vec<PathBuf> {
    let bottle_roots = [
        home.join("Library/Application Support/CrossOver/Bottles"),
        home.join("Library/Containers/com.isaacmarovitz.Whisky/Bottles"),
    ];
    bottle_roots
        .iter()
        .filter_map(|root| std::fs::read_dir(root).ok())
        .flatten()
        .flatten()
        .flat_map(|bottle| {
            let drive_c = bottle.path().join("drive_c");
            [
                drive_c.join("Program Files (x86)/Diablo II"),
                drive_c.join("Program Files/Diablo II"),
            ]
        })
        .collect()
}
