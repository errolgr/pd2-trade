use enigo::{Enigo, Key, Settings, Direction, Keyboard};
use rdev::Key as RdevKey;

pub fn str_to_keys(seq: &str) -> Result<(Vec<Key>, Key), String> {
    let mut mods = Vec::<Key>::new();
    let mut main: Option<Key> = None;

    println!("[str_to_keys] Parsing sequence: {}", seq);

    for part in seq.split('+') {
        match part.to_ascii_lowercase().as_str() {
            "ctrl" | "control" => {
                println!("  -> Found modifier: Ctrl");
                mods.push(Key::Control);
            },
            "alt" => {
                println!("  -> Found modifier: Alt");
                mods.push(Key::Alt);
            },
            "shift" => {
                println!("  -> Found modifier: Shift");
                mods.push(Key::Shift);
            },
            "cmd" | "command" => {
                println!("  -> Found modifier: Meta");
                mods.push(Key::Meta);
            },
            k if k.len() == 1 => {
                let ch = k.chars().next().unwrap();
                println!("  -> Found layout key: {}", ch);
                main = Some(Key::Unicode(ch));
            },
            k if k.starts_with('f') && k.len() <= 3 => {
                if let Ok(n) = k[1..].parse::<u8>() {
                    main = Some(match n {
                        1 => Key::F1,
                        2 => Key::F2,
                        3 => Key::F3,
                        4 => Key::F4,
                        5 => Key::F5,
                        6 => Key::F6,
                        7 => Key::F7,
                        8 => Key::F8,
                        9 => Key::F9,
                        10 => Key::F10,
                        11 => Key::F11,
                        12 => Key::F12,
                        _ => {
                            let err = format!("Unsupported function key: F{}", n);
                            println!("[str_to_keys] Error: {}", err);
                            return Err(err);
                        }
                    });
                }
            },
            _ => {
                let err = format!("Unsupported fragment: {part}");
                println!("[str_to_keys] Error: {}", err);
                return Err(err);
            }
        }
    }

    let main = main.ok_or_else(|| {
        let err = "No main key found".to_string();
        println!("[str_to_keys] Error: {}", err);
        err
    })?;

    Ok((mods, main))
}

pub fn press_key(sequence: String) -> Result<(), String> {
    println!("[press_key] Received sequence: {}", sequence);

    let (mods, main) = str_to_keys(&sequence)?;
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to init Enigo: {:?}", e))?;

    println!("[press_key] Pressing modifiers...");
    for m in &mods {
        println!("  -> Down: {:?}", m);
        enigo.key(*m, Direction::Press).map_err(|e| e.to_string())?;
    }

    println!("[press_key] Pressing main key: {:?}", main);
    enigo.key(main, Direction::Click).map_err(|e| e.to_string())?;

    println!("[press_key] Releasing modifiers...");
    for m in mods.iter().rev() {
        println!("  -> Up: {:?}", m);
        enigo.key(*m, Direction::Release).map_err(|e| e.to_string())?;
    }

    println!("[press_key] Done.");
    Ok(())
}

pub fn is_modifier(key: RdevKey) -> bool {
    matches!(
        key,
        RdevKey::ControlLeft
            | RdevKey::ControlRight
            | RdevKey::ShiftLeft
            | RdevKey::ShiftRight
            | RdevKey::Alt
            | RdevKey::AltGr
    )
}

pub fn key_to_string(key: RdevKey) -> Option<&'static str> {
    use RdevKey::*;
    match key {
        KeyA => Some("a"),
        KeyB => Some("b"),
        KeyC => Some("c"),
        KeyD => Some("d"),
        KeyE => Some("e"),
        KeyF => Some("f"),
        KeyG => Some("g"),
        KeyH => Some("h"),
        KeyI => Some("i"),
        KeyJ => Some("j"),
        KeyK => Some("k"),
        KeyL => Some("l"),
        KeyM => Some("m"),
        KeyN => Some("n"),
        KeyO => Some("o"),
        KeyP => Some("p"),
        KeyQ => Some("q"),
        KeyR => Some("r"),
        KeyS => Some("s"),
        KeyT => Some("t"),
        KeyU => Some("u"),
        KeyV => Some("v"),
        KeyW => Some("w"),
        KeyX => Some("x"),
        KeyY => Some("y"),
        KeyZ => Some("z"),

        Num0 => Some("0"),
        Num1 => Some("1"),
        Num2 => Some("2"),
        Num3 => Some("3"),
        Num4 => Some("4"),
        Num5 => Some("5"),
        Num6 => Some("6"),
        Num7 => Some("7"),
        Num8 => Some("8"),
        Num9 => Some("9"),

        ControlLeft => Some("ctrl"),
        ControlRight => Some("ctrl"),
        Alt => Some("alt"),
        AltGr => Some("alt"),

        _ => None,
    }
} 