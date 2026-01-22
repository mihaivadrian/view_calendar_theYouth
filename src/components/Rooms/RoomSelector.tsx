import React from "react";
import { useRooms } from "../../hooks/useRooms";
import { Check, Info, Calendar } from "lucide-react";
import clsx from "clsx";

export const RoomSelector: React.FC = () => {
    const {
        isRoomSelected,
        toggleRoomSelection,
        hiddenRoomIds,
        selectAllRooms,
        deselectAllRooms,
        rooms,
        isLoadingRooms,
        filterToActiveOnly,
        setFilterToActiveOnly,
        activeRoomIds
    } = useRooms();

    const visibleRooms = rooms.filter(room => !hiddenRoomIds.includes(room.id));

    if (visibleRooms.length === 0) {
        return (
            <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>Nu există săli vizibile. Contactează administratorul.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="px-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Săli ({visibleRooms.length}) {isLoadingRooms && "..."}
                </span>
                <div className="flex gap-2">
                    <button onClick={selectAllRooms} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline">Toate</button>
                    <button onClick={deselectAllRooms} className="text-[10px] text-gray-500 dark:text-gray-400 hover:underline">Niciuna</button>
                </div>
            </div>

            {/* Filter toggle button */}
            <button
                onClick={() => setFilterToActiveOnly(!filterToActiveOnly)}
                className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    filterToActiveOnly
                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
            >
                <Calendar className="w-4 h-4" />
                <span className="flex-1 text-left">Doar cu evenimente azi</span>
                {filterToActiveOnly && activeRoomIds.length > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {activeRoomIds.length}
                    </span>
                )}
            </button>

            <div className="space-y-1">
                {visibleRooms.map(room => (
                    <button
                        key={room.id}
                        onClick={() => toggleRoomSelection(room.id)}
                        className={clsx(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                            isRoomSelected(room.id)
                                ? "bg-white dark:bg-gray-700 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700 opacity-70 hover:opacity-100"
                        )}
                    >
                        <div
                            className={clsx(
                                "w-4 h-4 rounded flex items-center justify-center transition-colors border",
                                isRoomSelected(room.id)
                                    ? "border-transparent text-white"
                                    : "border-gray-300 dark:border-gray-500 bg-transparent"
                            )}
                            style={{
                                backgroundColor: isRoomSelected(room.id) ? room.color : undefined,
                                borderColor: isRoomSelected(room.id) ? room.color : undefined
                            }}
                        >
                            {isRoomSelected(room.id) && <Check className="w-3 h-3" strokeWidth={3} />}
                        </div>
                        <span className="text-gray-700 dark:text-gray-200 truncate flex-1 text-left">
                            {room.name}
                        </span>
                        {activeRoomIds.includes(room.id) && (
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                                azi
                            </span>
                        )}
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: room.color }}
                            title="Culoare calendar"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
};
