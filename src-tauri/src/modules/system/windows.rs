use std::path::PathBuf;
use winreg::enums::*;
use winreg::RegKey;

pub fn is_elevated() -> bool {
    use std::mem::size_of;
    use windows_sys::Win32::{
        Foundation::CloseHandle,
        Security::{GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY},
        System::Threading::{GetCurrentProcess, OpenProcessToken},
    };

    unsafe {
        let mut token = 0;
        // OpenProcessToken is in System::Threading
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut ret_size = 0;
        // GetTokenInformation stays in Security
        let ok = GetTokenInformation(
            token,
            TokenElevation,
            &mut elevation as *mut _ as *mut _,
            size_of::<TOKEN_ELEVATION>() as u32,
            &mut ret_size,
        ) != 0;
        CloseHandle(token);
        ok && elevation.TokenIsElevated != 0
    }
}

pub fn kill_other_instances() {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
        TH32CS_SNAPPROCESS,
    };
    use windows_sys::Win32::System::Threading::{
        OpenProcess, TerminateProcess, PROCESS_TERMINATE,
    };

    let our_exe = match std::env::current_exe() {
        Ok(p) => p,
        Err(_) => return,
    };
    let our_name = match our_exe.file_name().and_then(|s| s.to_str()) {
        Some(n) => n.to_ascii_lowercase(),
        None => return,
    };
    let our_pid = std::process::id();

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE {
            return;
        }

        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let len = entry.szExeFile.iter().position(|&c| c == 0).unwrap_or(0);
                let name = OsString::from_wide(&entry.szExeFile[..len])
                    .to_string_lossy()
                    .to_ascii_lowercase();

                if name == our_name && entry.th32ProcessID != our_pid {
                    let handle = OpenProcess(PROCESS_TERMINATE, 0, entry.th32ProcessID);
                    if handle != 0 {
                        let _ = TerminateProcess(handle, 0);
                        CloseHandle(handle);
                    }
                }

                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }

        CloseHandle(snapshot);
    }
}

pub fn restart_as_admin() {
    use std::{ffi::OsStr, os::windows::ffi::OsStrExt, process::exit};
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    let exe = std::env::current_exe().unwrap();
    let args: Vec<String> = std::env::args().skip(1).collect();
    let params = args.join(" ");

    let to_wide = |s: &OsStr| {
        let mut v: Vec<u16> = s.encode_wide().collect();
        v.push(0);
        v
    };

    unsafe {
        ShellExecuteW(
            0,                                     // HWND = null
            to_wide(OsStr::new("runas")).as_ptr(), // lpOperation
            to_wide(exe.as_os_str()).as_ptr(),     // lpFile
            if params.is_empty() {
                std::ptr::null()
            } else {
                to_wide(OsStr::new(&params)).as_ptr()
            }, // lpParameters
            std::ptr::null(),                      // lpDirectory
            SW_SHOWNORMAL,                         // nShowCmd
        );
    }
    exit(0);
}

fn find_diablo2_in_registry() -> Option<PathBuf> {
    // Try HKEY_LOCAL_MACHINE\SOFTWARE\Blizzard Entertainment\Diablo II
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    if let Ok(key) = hklm.open_subkey(r"SOFTWARE\Blizzard Entertainment\Diablo II") {
        if let Ok(install_path) = key.get_value::<String, _>("InstallPath") {
            return Some(PathBuf::from(install_path));
        }
    }

    // Try HKEY_CURRENT_USER
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(key) = hkcu.open_subkey(r"SOFTWARE\Blizzard Entertainment\Diablo II") {
        if let Ok(install_path) = key.get_value::<String, _>("InstallPath") {
            return Some(PathBuf::from(install_path));
        }
    }

    None
}

pub fn find_diablo2_install_path() -> Option<PathBuf> {
    // Try registry first
    if let Some(path) = find_diablo2_in_registry() {
        if path.exists() {
            return Some(path);
        }
    }

    // Try common installation paths
    let common_paths = vec![
        PathBuf::from(r"C:\Diablo II"),
        PathBuf::from(r"D:\Diablo II"),
        PathBuf::from(r"E:\Diablo II"),
        PathBuf::from(r"C:\Program Files\Diablo II"),
        PathBuf::from(r"C:\Program Files (x86)\Diablo II"),
        PathBuf::from(r"D:\Program Files\Diablo II"),
        PathBuf::from(r"D:\Program Files (x86)\Diablo II"),
    ];

    for path in common_paths {
        if path.exists() {
            return Some(path);
        }
    }

    None
}
