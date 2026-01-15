import type { RoomId } from "../types/room";

// Settings stored in a public JSON endpoint
// For production, use a proper backend or Azure Blob Storage
// This uses a simple JSON file approach

interface GlobalSettings {
    hiddenRoomIds: RoomId[];
    lastUpdated: string;
    updatedBy: string;
}

const SETTINGS_KEY = "the_youth_calendar_global_settings";

// For now, we'll use localStorage but with a shared key approach
// In production, replace with an API call to your backend
export const settingsService = {
    // Get global settings (in production, this would be an API call)
    getGlobalSettings: async (): Promise<GlobalSettings | null> => {
        try {
            // Try to get from localStorage first
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
            return null;
        } catch (error) {
            console.error("Failed to get global settings", error);
            return null;
        }
    },

    // Save global settings (admin only)
    saveGlobalSettings: async (
        hiddenRoomIds: RoomId[],
        updatedBy: string
    ): Promise<boolean> => {
        try {
            const settings: GlobalSettings = {
                hiddenRoomIds,
                lastUpdated: new Date().toISOString(),
                updatedBy
            };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error("Failed to save global settings", error);
            return false;
        }
    },

    // Get hidden room IDs
    getHiddenRoomIds: async (): Promise<RoomId[]> => {
        const settings = await settingsService.getGlobalSettings();
        return settings?.hiddenRoomIds || [];
    }
};
