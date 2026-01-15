import React from "react";
import { useRooms } from "../../hooks/useRooms";

export const RoomLegend: React.FC = () => {
    const { hiddenRoomIds, rooms } = useRooms();
    const visibleRooms = rooms.filter(r => !hiddenRoomIds.includes(r.id));

    if (visibleRooms.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-4 items-center p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Legendă:</span>
            {visibleRooms.map(room => (
                <div key={room.id} className="flex items-center gap-2">
                    <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: room.color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                        {room.name}
                    </span>
                </div>
            ))}
        </div>
    );
};
