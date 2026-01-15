import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Room, RoomId } from "../types/room";
import { settingsService } from "../services/settingsService";
import { ROOMS_CONFIG } from "../services/roomsConfig";
import { useAuth } from "../hooks/useAuth";
import { getAllRooms } from "../services/graphService";

interface RoomsContextType {
    rooms: Room[]; // The active list of rooms (fetched or fallback)
    selectedRoomIds: RoomId[];
    hiddenRoomIds: RoomId[]; // Admin hidden
    toggleRoomSelection: (roomId: RoomId) => void;
    selectAllRooms: () => void;
    deselectAllRooms: () => void;
    isRoomSelected: (roomId: RoomId) => boolean;
    refreshHiddenRooms: () => void;
    isLoadingRooms: boolean;
}

const RoomsContext = createContext<RoomsContextType | undefined>(undefined);

// Palette for dynamic assignment
const COLOR_PALETTE = [
    "#3B82F6", // blue
    "#10B981", // emerald
    "#F59E0B", // amber
    "#8B5CF6", // violet
    "#EF4444", // red
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#84CC16", // lime
];

export const RoomsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, getAccessToken } = useAuth();
    const [rooms, setRooms] = useState<Room[]>(ROOMS_CONFIG);
    const [hiddenRoomIds, setHiddenRoomIds] = useState<RoomId[]>([]);
    const [selectedRoomIds, setSelectedRoomIds] = useState<RoomId[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);

    // Fetch rooms from Graph API
    useEffect(() => {
        const fetchRooms = async () => {
            if (!isAuthenticated) return;

            setIsLoadingRooms(true);
            try {
                const token = await getAccessToken();
                if (token) {
                    const fetchedRooms = await getAllRooms(token);

                    if (fetchedRooms.length > 0) {
                        // Assign colors
                        const coloredRooms = fetchedRooms.map((room, index) => ({
                            ...room,
                            color: COLOR_PALETTE[index % COLOR_PALETTE.length]
                        }));
                        setRooms(coloredRooms);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch rooms:", error);
                // Fallback to config happens automatically since we init with it
            } finally {
                setIsLoadingRooms(false);
            }
        };

        fetchRooms();
    }, [isAuthenticated, getAccessToken]);

    // Initialize selection/visibility
    useEffect(() => {
        const loadHiddenRooms = async () => {
            const hidden = await settingsService.getHiddenRoomIds();
            setHiddenRoomIds(hidden);

            // Update selection based on CURRENT rooms (whether static or fetched)
            const visibleRooms = rooms
                .filter(r => !hidden.includes(r.id))
                .map(r => r.id);

            // Only reset selection if we don't have a selection matching valid rooms
            // essentially, when rooms list changes (e.g. from static to dynamic), re-select all visible
            setSelectedRoomIds(visibleRooms);
        };

        loadHiddenRooms();
    }, [rooms]); // Dependency on 'rooms' ensures we re-calc when fetch completes

    const refreshHiddenRooms = async () => {
        const hidden = await settingsService.getHiddenRoomIds();
        setHiddenRoomIds(hidden);
        setSelectedRoomIds(prev => prev.filter(id => !hidden.includes(id)));
    };

    const toggleRoomSelection = (roomId: RoomId) => {
        setSelectedRoomIds(prev => {
            if (prev.includes(roomId)) {
                return prev.filter(id => id !== roomId);
            } else {
                return [...prev, roomId];
            }
        });
    };

    const selectAllRooms = () => {
        const visibleRooms = rooms
            .filter(r => !hiddenRoomIds.includes(r.id))
            .map(r => r.id);
        setSelectedRoomIds(visibleRooms);
    };

    const deselectAllRooms = () => {
        setSelectedRoomIds([]);
    };

    const isRoomSelected = (roomId: RoomId) => selectedRoomIds.includes(roomId);

    return (
        <RoomsContext.Provider value={{
            rooms,
            selectedRoomIds,
            hiddenRoomIds,
            toggleRoomSelection,
            selectAllRooms,
            deselectAllRooms,
            isRoomSelected,
            refreshHiddenRooms,
            isLoadingRooms
        }}>
            {children}
        </RoomsContext.Provider>
    );
};

export const useRooms = () => {
    const context = useContext(RoomsContext);
    if (context === undefined) {
        throw new Error("useRooms must be used within a RoomsProvider");
    }
    return context;
};
