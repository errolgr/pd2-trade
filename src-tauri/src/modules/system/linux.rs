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
    let common_paths = vec![
        home_path.join("Games/Diablo II"),
        home_path.join("Games/project-diablo-2"),
        home_path.join(".wine/drive_c/Program Files (x86)/Diablo II"),
    ];

    for path in common_paths {
        if path.exists() {
            return Some(path);
        }
    }
    None
}
