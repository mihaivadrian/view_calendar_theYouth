import type { RoomId } from "../types/room";

const STORAGE_KEYS = {
    HIDDEN_ROOMS: "the_youth_calendar_hidden_rooms",
    ROOM_ORDER: "the_youth_calendar_room_order",
};

export const storageService = {
    getHiddenRooms: (): RoomId[] => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.HIDDEN_ROOMS);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("Failed to parse hidden rooms from storage", error);
            return [];
        }
    },

    setHiddenRooms: (roomIds: RoomId[]) => {
        localStorage.setItem(STORAGE_KEYS.HIDDEN_ROOMS, JSON.stringify(roomIds));
    },

    toggleRoomVisibility: (roomId: RoomId) => {
        const hidden = storageService.getHiddenRooms();
        const newHidden = hidden.includes(roomId)
            ? hidden.filter((id) => id !== roomId)
            : [...hidden, roomId];
        storageService.setHiddenRooms(newHidden);
        return newHidden;
    },

    getRoomOrder: (): RoomId[] | null => {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.ROOM_ORDER);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error("Failed to parse room order", error);
            return null;
        }
    },

    setRoomOrder: (roomIds: RoomId[]) => {
        localStorage.setItem(STORAGE_KEYS.ROOM_ORDER, JSON.stringify(roomIds));
    },
};
