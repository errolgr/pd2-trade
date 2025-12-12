use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub fn open_project_diablo2_webview(app_handle: tauri::AppHandle) -> Result<(), String> {
    let app_handle_clone = app_handle.clone();
    let webview_window = WebviewWindowBuilder::new(
        &app_handle,
        "project-diablo2",
        WebviewUrl::External("https://projectdiablo2.com/login".parse().unwrap()),
    )
    .title("Project Diablo 2 Website")
    .inner_size(1200.0, 800.0)
    .decorations(true)
    .transparent(false)
    .visible(true)
    .shadow(true)
    .always_on_top(true)
    .focused(true)
    .skip_taskbar(false)
    .devtools(true)
    .on_navigation(move |url| {
        let url_str = url.to_string();
        if let Some(stripped) = url_str.strip_prefix("tauri://pd2-token-found?token=") {
            let token: &str = stripped;
            let _ = app_handle_clone.emit("pd2-token-found", token);
            // Close the webview window after emitting the token
            if let Some(window) = app_handle_clone.get_webview_window("project-diablo2") {
                let _ = window.close();
            }
            false
        } else {
            // Allow normal navigation
            true
        }
    })
    .build()
    .map_err(|e| format!("Failed to create webview: {}", e))?;

    webview_window
        .center()
        .map_err(|e| format!("Failed to center window: {}", e))?;

    // Inject JS to poll for pd2-token in localStorage and send via custom URL
    let js = r#"
        const interval = setInterval(() => {
            const token = localStorage.getItem('pd2-token');
            if (token) {
                window.location = 'tauri://pd2-token-found?token=' + encodeURIComponent(token);
                localStorage.removeItem('pd2-token');
                clearInterval(interval);
            }
        }, 500);
    "#;
    let _ = webview_window.eval(js);

    Ok(())
}

pub fn open_internal_browser(
    app_handle: tauri::AppHandle,
    url: String,
    token: Option<String>,
) -> Result<(), String> {
    // If the browser window is already open, focus it and navigate to the new URL
    if let Some(window) = app_handle.get_webview_window("internal-browser") {
        let _ = window.set_focus();

        // Inject token if provided (refresh session) ONLY for trusted domains
        if let Some(t) = &token {
            let is_trusted = url.starts_with("https://projectdiablo2.com")
                || url.starts_with("https://www.projectdiablo2.com")
                || url.starts_with("https://live.projectdiablo2.com")
                || url.starts_with("https://api.projectdiablo2.com");

            if is_trusted {
                let script = format!("localStorage.setItem('pd2-token', '{}')", t);
                let _ = window.eval(&script);
            } else {
                println!(
                    "Security Warning: Refusing to inject token into untrusted domain: {}",
                    url
                );
            }
        }

        // Use eval to change location since we can't easily re-use the builder
        let script = format!("window.location.href = '{}'", url);
        let _ = window.eval(&script);
        return Ok(());
    }

    let webview_window = WebviewWindowBuilder::new(
        &app_handle,
        "internal-browser",
        WebviewUrl::External(url.parse().map_err(|e: url::ParseError| e.to_string())?),
    )
    .title("PD2 Trader Browser")
    .inner_size(1200.0, 800.0)
    .decorations(true)
    .resizable(true)
    .visible(true)
    .build()
    .map_err(|e| format!("Failed to create webview: {}", e))?;

    // Inject token if provided ONLY for trusted domains
    if let Some(t) = token {
        let is_trusted = url.starts_with("https://projectdiablo2.com")
            || url.starts_with("https://www.projectdiablo2.com")
            || url.starts_with("https://live.projectdiablo2.com")
            || url.starts_with("https://api.projectdiablo2.com");

        if is_trusted {
            let script = format!("localStorage.setItem('pd2-token', '{}')", t);
            let _ = webview_window.eval(&script);
        } else {
            println!(
                "Security Warning: Refusing to inject token into untrusted domain: {}",
                url
            );
        }
    }

    let _ = webview_window.center();

    Ok(())
}
