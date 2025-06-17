import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';
import { useState, useCallback } from "react";

export function useClipboard() {
  const [text, setText] = useState<string>("");

  // Read
  const read = useCallback(async () => {
    try {
      const t = await readText();
      if (t !== null) setText(t);
      return t;
    } catch (err) {
      console.error("Clipboard read failed:", err);
    }
  }, []);

  // Write
  const copy = useCallback(async (value: string) => {
    try {
      await writeText(value);
      setText(value);
    } catch (err) {
      console.error("Clipboard write failed:", err);
    }
  }, []);

  return { text, read, copy };
}