use serde::Serialize;
use std::path::{Path, PathBuf};

/// Where installers put Diablo II inside a Wine/Proton prefix's `drive_c`.
const PREFIX_INSTALL_DIRS: [&[&str]; 3] = [
    &["Program Files (x86)", "Diablo II"],
    &["Program Files", "Diablo II"],
    &["Diablo II"],
];

/// A Diablo II install: the folder holding `ProjectD2` (PD2's files) or the game executable.
pub fn is_diablo2_install(dir: &Path) -> bool {
    dir.join("ProjectD2").is_dir()
        || dir.join("Game.exe").is_file()
        || dir.join("Diablo II.exe").is_file()
}

/// The Diablo II install inside a Wine prefix (the folder holding `drive_c`), if there is one.
pub fn install_in_wine_prefix(prefix: &Path) -> Option<PathBuf> {
    let drive_c = prefix.join("drive_c");
    if !drive_c.is_dir() {
        return None;
    }
    PREFIX_INSTALL_DIRS
        .iter()
        .map(|parts| {
            parts
                .iter()
                .fold(drive_c.clone(), |dir, part| dir.join(part))
        })
        .find(|dir| is_diablo2_install(dir))
}

/// The install a chosen folder stands for: the folder itself, or the install inside it when it is a Wine prefix
/// (Lutris' PD2 script makes `~/Games/project-diablo-2` the prefix, the game lives in its `drive_c`).
pub fn resolve(dir: &Path) -> PathBuf {
    if is_diablo2_install(dir) {
        return dir.to_path_buf();
    }
    install_in_wine_prefix(dir).unwrap_or_else(|| dir.to_path_buf())
}

/// First candidate that is (or, as a Wine prefix, holds) a Diablo II install.
pub fn first_install(candidates: impl IntoIterator<Item = PathBuf>) -> Option<PathBuf> {
    candidates.into_iter().find_map(|dir| {
        if is_diablo2_install(&dir) {
            Some(dir)
        } else {
            install_in_wine_prefix(&dir)
        }
    })
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DirectoryStatus {
    /// A Diablo II install.
    Valid,
    /// A Wine prefix holding the install at `resolved`.
    WinePrefix,
    /// Exists but holds neither `ProjectD2` nor the game.
    NotInstall,
    /// No such folder.
    Missing,
}

#[derive(Serialize, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryCheck {
    pub status: DirectoryStatus,
    /// The install to use instead (set for `WinePrefix`).
    pub resolved: Option<String>,
}

/// What the settings field shows under a typed or picked Diablo II directory.
pub fn check(path: &str) -> DirectoryCheck {
    let dir = Path::new(path.trim());
    let (status, resolved) = if !dir.is_dir() {
        (DirectoryStatus::Missing, None)
    } else if is_diablo2_install(dir) {
        (DirectoryStatus::Valid, None)
    } else if let Some(install) = install_in_wine_prefix(dir) {
        (
            DirectoryStatus::WinePrefix,
            Some(install.to_string_lossy().into_owned()),
        )
    } else {
        (DirectoryStatus::NotInstall, None)
    };
    DirectoryCheck { status, resolved }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    struct TempDir(PathBuf);

    impl TempDir {
        fn new(name: &str) -> Self {
            let dir = std::env::temp_dir()
                .join(format!("pd2-trader-d2dir-{}-{name}", std::process::id()));
            let _ = fs::remove_dir_all(&dir);
            fs::create_dir_all(&dir).unwrap();
            TempDir(dir)
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    /// `<root>/drive_c/Program Files (x86)/Diablo II/ProjectD2`, the Lutris layout from issue #260.
    fn lutris_prefix(root: &Path) -> PathBuf {
        let install = root
            .join("drive_c")
            .join("Program Files (x86)")
            .join("Diablo II");
        fs::create_dir_all(install.join("ProjectD2")).unwrap();
        install
    }

    #[test]
    fn install_folder_resolves_to_itself() {
        let tmp = TempDir::new("install");
        fs::create_dir_all(tmp.0.join("ProjectD2")).unwrap();
        assert!(is_diablo2_install(&tmp.0));
        assert_eq!(resolve(&tmp.0), tmp.0);
        assert_eq!(
            check(tmp.0.to_str().unwrap()),
            DirectoryCheck {
                status: DirectoryStatus::Valid,
                resolved: None
            }
        );
    }

    #[test]
    fn game_exe_marks_an_install() {
        let tmp = TempDir::new("exe");
        fs::write(tmp.0.join("Game.exe"), b"").unwrap();
        assert!(is_diablo2_install(&tmp.0));
    }

    #[test]
    fn wine_prefix_resolves_to_the_install_inside() {
        let tmp = TempDir::new("prefix");
        let install = lutris_prefix(&tmp.0);
        assert!(!is_diablo2_install(&tmp.0));
        assert_eq!(install_in_wine_prefix(&tmp.0), Some(install.clone()));
        assert_eq!(resolve(&tmp.0), install);
        assert_eq!(
            check(tmp.0.to_str().unwrap()),
            DirectoryCheck {
                status: DirectoryStatus::WinePrefix,
                resolved: Some(install.to_string_lossy().into_owned()),
            }
        );
    }

    #[test]
    fn wine_prefix_without_diablo_is_not_an_install() {
        let tmp = TempDir::new("empty-prefix");
        fs::create_dir_all(tmp.0.join("drive_c").join("Program Files (x86)")).unwrap();
        assert_eq!(install_in_wine_prefix(&tmp.0), None);
        assert_eq!(resolve(&tmp.0), tmp.0);
        assert_eq!(
            check(tmp.0.to_str().unwrap()).status,
            DirectoryStatus::NotInstall
        );
    }

    #[test]
    fn missing_folder() {
        let tmp = TempDir::new("missing");
        let missing = tmp.0.join("nope");
        assert_eq!(
            check(missing.to_str().unwrap()).status,
            DirectoryStatus::Missing
        );
        assert_eq!(check("").status, DirectoryStatus::Missing);
    }

    #[test]
    fn detection_skips_folders_without_an_install_and_prefers_the_prefix_install() {
        let tmp = TempDir::new("detect");
        let not_install = tmp.0.join("Diablo II");
        fs::create_dir_all(&not_install).unwrap();
        let prefix = tmp.0.join("project-diablo-2");
        let install = lutris_prefix(&prefix);
        assert_eq!(
            first_install([tmp.0.join("absent"), not_install, prefix]),
            Some(install)
        );
        assert_eq!(first_install([tmp.0.join("absent")]), None);
    }
}
