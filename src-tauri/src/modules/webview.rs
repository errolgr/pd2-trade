use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn open_project_diablo2_webview(app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_handle_clone = app_handle.clone();
    let webview_window = WebviewWindowBuilder::new(
        &app_handle,
        "project-diablo2",
        WebviewUrl::External("https://projectdiablo2.com/login".parse().unwrap())
    )
    .title("Project Diablo 2 Website")
    .inner_size(1200.0, 800.0)
    .decorations(true)
    .transparent(false)
    .visible(true)
    .shadow(true)
    .always_on_top(false)
    .skip_taskbar(false)
    .devtools(true)
    .on_navigation(move |url| {
        let url_str = url.to_string();
        if let Some(stripped) = url_str.strip_prefix("tauri://pd2-token-found?token=") {
            let token: &str = stripped;
            let _ = app_handle_clone.emit("pd2-token-found", token);
            false
        } else {
            // Allow normal navigation
            true
        }
    })
    .build()
    .map_err(|e| format!("Failed to create webview: {}", e))?;

    webview_window.center().map_err(|e| format!("Failed to center window: {}", e))?;

    // Inject JS to poll for pd2-token in localStorage and send via custom URL
    let js = r#"
        const interval = setInterval(() => {
            const token = localStorage.getItem('pd2-token');
            if (token) {
                window.location = 'tauri://pd2-token-found?token=' + encodeURIComponent(token);
                clearInterval(interval);
            }
        }, 500);
    "#;
    let _ = webview_window.eval(js);

    Ok(())
} 