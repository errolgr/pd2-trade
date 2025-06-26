#[cfg(target_os = "windows")]
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

#[cfg(target_os = "windows")]
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
