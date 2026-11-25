use std::path::PathBuf;

pub fn is_elevated() -> bool {
    // On Linux, we generally don't want to force root for a GUI app.
    // Returning true bypasses the restart_as_admin check.
    true
}

/// Not tracked off Windows: unknown.
pub fn input_idle_ms() -> Option<u64> {
    None
}

pub fn restart_as_admin() {
    // No-op or log warning
    eprintln!("Elevation requested but not implemented for Linux");
}

/// Common Linux install spots: plain folders or Wine prefixes (Lutris' PD2 script makes `~/Games/project-diablo-2`
/// the prefix); a prefix stands for the Diablo II install inside its `drive_c`, never for itself.
pub fn find_diablo2_install_path() -> Option<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_default();
    let home_path = PathBuf::from(home);
    crate::modules::d2_directory::first_install([
        home_path.join("Games/Diablo II"),
        home_path.join("Games/project-diablo-2"),
        home_path.join(".wine"),
    ])
}
