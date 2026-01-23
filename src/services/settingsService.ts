import type { RoomId } from "../types/room";

// Settings stored on Express backend server
// This ensures settings are shared across all users

interface GlobalSettings {
    hiddenRoomIds: RoomId[];
    lastUpdated?: string;
    updatedBy?: string;
}

// API endpoint - use Docker backend API
// In production, nginx should proxy /api to the Docker backend
const getApiUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    return `${apiUrl}/api/settings`;
};

export const settingsService = {
    // Get global settings from server
    getGlobalSettings: async (): Promise<GlobalSettings | null> => {
        try {
            const response = await fetch(getApiUrl());
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error("Failed to get global settings", error);
            return null;
        }
    },

    // Save global settings to server (admin only)
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
            const response = await fetch(getApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });
            return response.ok;
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
