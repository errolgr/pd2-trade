import { Event } from "@tauri-apps/api/event";

export interface EventProps {
    requestId: string;
    error?: string;
}