import React, { useState, useEffect } from "react";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { useRooms } from "../../hooks/useRooms";
import { EventModal } from "./EventModal";
import type { CalendarEvent } from "../../types/calendar";
import { format, addDays, subDays, startOfDay, endOfDay, parseISO, differenceInMinutes, startOfMinute } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DayView: React.FC = () => {
    // We force single day view
    const [currentDate, setCurrentDate] = useState(new Date());
    const { events, loading, setDateRange } = useCalendarEvents(currentDate);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const { rooms, selectedRoomIds } = useRooms();

    // Filter rooms based on selection - reusing the context logic or filtering locally
    // Since useCalendarEvents uses useRooms internally for fetching, we just need to display relevant columns

    // We want to show rooms that are NOT hidden. 
    // Usually DayView shows selected rooms? Or all visible?
    // Let's match RoomSelector logic: show 'selected' rooms if we want filtering, or just all visible.
    // The requirement says "Parallel view", implying all relevant rooms.
    // Let's use 'visible' rooms from context if we had a clean way, or just filter rooms by hidden list.
    // But wait, useCalendarEvents fetches for 'selectedRoomIds'. Ideally we show columns for 'selectedRoomIds'.

    const activeRooms = rooms.filter(r => selectedRoomIds.includes(r.id));

    useEffect(() => {
        setDateRange(startOfDay(currentDate), endOfDay(currentDate));
    }, [currentDate]);

    const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
    const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    // Time slots generation (8:00 - 20:00)
    const START_HOUR = 8;
    const END_HOUR = 20;
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

    // Calculate position for an event
    const getEventStyle = (event: CalendarEvent) => {
        const start = parseISO(event.start.dateTime);
        const end = parseISO(event.end.dateTime);

        let startMinutes = differenceInMinutes(start, startOfMinute(new Date(currentDate).setHours(START_HOUR, 0, 0, 0)));
        const durationMinutes = differenceInMinutes(end, start);

        // Clip start if before 8am
        if (startMinutes < 0) {
            // Adjust duration? Visual fix only.
            // For now assume mostly fits.
        }

        const top = Math.max(0, (startMinutes / 60) * 100); // 100px per hour
        const height = (durationMinutes / 60) * 100;

        return {
            top: `${top}px`,
            height: `${height}px`,
        };
    };

    return (
        <div className="h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col relative overflow-hidden">
            {loading && (
                <div className="absolute inset-0 z-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Header Toolbar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                        {format(currentDate, "EEEE, d MMMM yyyy", { locale: ro })}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={handleToday} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        Azi
                    </button>
                    <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Timeline Grid */}
            <div className="flex-1 overflow-auto relative">
                <div className="flex min-w-max h-[1250px]"> {/* Fixed height for 12 hours * 100px + padding */}

                    {/* Time Column */}
                    <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky left-0 z-10">
                        {hours.map(hour => (
                            <div key={hour} className="h-[100px] border-b border-gray-200 dark:border-gray-700 relative">
                                <span className="absolute -top-3 right-2 text-xs text-gray-500 font-medium">
                                    {hour}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Room Columns */}
                    {activeRooms.map(room => (
                        <div key={room.id} className="flex-1 min-w-[200px] border-r border-gray-200 dark:border-gray-700 relative">
                            {/* Room Header */}
                            <div className="h-10 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 flex items-center justify-center font-medium text-sm text-gray-700 dark:text-gray-300">
                                {room.name}
                            </div>

                            {/* Hour Lines */}
                            {hours.map(hour => (
                                <div key={hour} className="h-[100px] border-b border-gray-100 dark:border-gray-800" />
                            ))}

                            {/* Events */}
                            {events
                                .filter(e => e.roomId === room.id)
                                .map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event)}
                                        className="absolute left-1 right-1 rounded px-2 py-1 text-xs cursor-pointer hover:brightness-95 transition-all shadow-sm border-l-4 overflow-hidden"
                                        style={{
                                            ...getEventStyle(event),
                                            backgroundColor: `${room.color}20`, // low opacity bg
                                            borderLeftColor: room.color,
                                            color: room.color // text color same as border
                                        }}
                                    >
                                        <div className="font-bold truncate">{event.subject}</div>
                                        <div className="opacity-75 truncate">
                                            {format(parseISO(event.start.dateTime), "HH:mm")} - {format(parseISO(event.end.dateTime), "HH:mm")}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    ))}
                </div>
            </div>

            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    );
};
