//! WebKitGTK rendering defaults, set before GTK starts.
//!
//! With NVIDIA's driver, WebKitGTK's DMA-BUF renderer can't allocate its GPU buffers ("Failed to create GBM buffer")
//! and windows stay black or blank. WEBKIT_DMABUF_RENDERER_FORCE_SHM (WebKitGTK 2.44+) keeps that renderer but hands
//! its frames over in shared memory. Not WEBKIT_DISABLE_DMABUF_RENDERER: since WebKitGTK 2.46 that renderer is the
//! only accelerated compositing path, so disabling it leaves pages partially drawn or crashes them (WebKit bug
//! 324730). Any of these variables set by the user wins.

/// The variables that choose how WebKitGTK composites.
const RENDERING_VARS: [&str; 3] = [
    "WEBKIT_DISABLE_DMABUF_RENDERER",
    "WEBKIT_DMABUF_RENDERER_FORCE_SHM",
    "WEBKIT_DISABLE_COMPOSITING_MODE",
];

/// Call first thing, before any window (or thread) exists.
pub fn apply_defaults() {
    let nvidia = std::path::Path::new("/sys/module/nvidia").exists();
    if let Some((key, value)) = rendering_default(nvidia, |key| std::env::var_os(key).is_some()) {
        std::env::set_var(key, value);
    }
}

/// The variable to set, if any: only with the NVIDIA driver loaded, and only when the user chose none.
fn rendering_default(
    nvidia: bool,
    is_set: impl Fn(&str) -> bool,
) -> Option<(&'static str, &'static str)> {
    if !nvidia || RENDERING_VARS.iter().any(|key| is_set(key)) {
        return None;
    }
    Some(("WEBKIT_DMABUF_RENDERER_FORCE_SHM", "1"))
}

#[cfg(test)]
mod tests {
    use super::rendering_default;

    #[test]
    fn nvidia_gets_shared_memory_buffers() {
        assert_eq!(
            rendering_default(true, |_| false),
            Some(("WEBKIT_DMABUF_RENDERER_FORCE_SHM", "1"))
        );
    }

    #[test]
    fn other_drivers_keep_webkits_defaults() {
        assert_eq!(rendering_default(false, |_| false), None);
    }

    #[test]
    fn a_users_own_choice_wins() {
        for var in [
            "WEBKIT_DISABLE_DMABUF_RENDERER",
            "WEBKIT_DMABUF_RENDERER_FORCE_SHM",
            "WEBKIT_DISABLE_COMPOSITING_MODE",
        ] {
            assert_eq!(rendering_default(true, |key| key == var), None, "{var}");
        }
    }
}
