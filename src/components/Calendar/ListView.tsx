import React, { useState, useMemo, useEffect, useRef } from "react";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { useRooms } from "../../hooks/useRooms";
import { EventModal } from "./EventModal";
import { RoomDetailModal } from "./RoomDetailModal";
import type { CalendarEvent } from "../../types/calendar";
import type { Room } from "../../types/room";
import { format, parseISO, startOfDay, addDays, isSameDay, startOfMonth, endOfMonth, getMonth } from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Users, Clock } from "lucide-react";

export const ListView: React.FC = () => {
    const { events, loading, setDateRange } = useCalendarEvents();
    const { rooms, selectedRoomIds, filterToActiveOnly } = useRooms();
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));

    // Track current month+year and update date range when it changes
    const getMonthYearKey = (date: Date) => `${date.getFullYear()}-${getMonth(date)}`;
    const currentMonthRef = useRef<string>("");

    useEffect(() => {
        const newMonthKey = getMonthYearKey(currentDate);
        // Always set date range on mount (when ref is empty) or when month changes
        if (currentMonthRef.current !== newMonthKey) {
            console.log(`%c[ListView] Setting date range for ${newMonthKey}`, 'background: orange; color: black;');
            currentMonthRef.current = newMonthKey;
            const start = startOfMonth(currentDate);
            const end = endOfMonth(currentDate);
            console.log('[ListView] Fetching range:', start.toISOString(), 'to', end.toISOString());
            setDateRange(start, end);
        }
    }, [currentDate, setDateRange]);

    // Get rooms that are selected
    const selectedRooms = useMemo(() => {
        return rooms.filter(r => selectedRoomIds.includes(r.id));
    }, [rooms, selectedRoomIds]);

    // Filter to only rooms with events when filterToActiveOnly is true
    const activeRooms = useMemo(() => {
        if (!filterToActiveOnly) {
            return selectedRooms;
        }
        // Only show rooms that have events on current day
        return selectedRooms.filter(room => {
            return events.some(event => {
                const eventDate = parseISO(event.start.dateTime);
                return isSameDay(eventDate, currentDate) && event.roomId === room.id;
            });
        });
    }, [selectedRooms, filterToActiveOnly, events, currentDate]);

    // Group events by room for current day
    const eventsByRoom = useMemo(() => {
        const grouped: Record<string, CalendarEvent[]> = {};

        activeRooms.forEach(room => {
            grouped[room.id] = [];
        });

        events.forEach(event => {
            const eventDate = parseISO(event.start.dateTime);
            if (isSameDay(eventDate, currentDate) && event.roomId && grouped[event.roomId]) {
                grouped[event.roomId].push(event);
            }
        });

        // Sort events by start time within each room
        Object.keys(grouped).forEach(roomId => {
            grouped[roomId].sort((a, b) =>
                new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
            );
        });

        return grouped;
    }, [events, currentDate, activeRooms]);

    const goToPreviousDay = () => setCurrentDate(prev => addDays(prev, -1));
    const goToNextDay = () => setCurrentDate(prev => addDays(prev, 1));
    const goToToday = () => setCurrentDate(startOfDay(new Date()));

    const formatTime = (dateTime: string) => format(parseISO(dateTime), "HH:mm");

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header cu navigare */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPreviousDay}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={goToNextDay}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Azi
                    </button>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {format(currentDate, "EEEE, d MMMM yyyy", { locale: ro })}
                </h2>
                <div className="w-32" /> {/* Spacer for centering */}
            </div>

            {/* Loading indicator */}
            {loading && (
                <div className="absolute inset-0 z-10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Grid de săli */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <Calendar className="w-12 h-12 mb-4 opacity-50" />
                        <p>Selectează cel puțin o sală din meniul lateral</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {activeRooms.map(room => {
                            const roomEvents = eventsByRoom[room.id] || [];

                            return (
                                <div
                                    key={room.id}
                                    className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                >
                                    {/* Header sală - clickable */}
                                    <div
                                        className="px-4 py-3 border-b-2 cursor-pointer hover:opacity-80 transition-opacity"
                                        style={{
                                            borderBottomColor: room.color,
                                            backgroundColor: `${room.color}10`
                                        }}
                                        onClick={() => setSelectedRoom(room)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: room.color }}
                                            />
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {room.name}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {roomEvents.length} {roomEvents.length === 1 ? 'rezervare' : 'rezervări'}
                                        </p>
                                    </div>

                                    {/* Lista de evenimente */}
                                    <div className="p-2 space-y-2 min-h-[120px] max-h-[400px] overflow-y-auto">
                                        {roomEvents.length === 0 ? (
                                            <div className="flex items-center justify-center h-24 text-gray-400 dark:text-gray-500 text-sm">
                                                Liber toată ziua
                                            </div>
                                        ) : (
                                            roomEvents.map(event => {
                                                // Get booking customer name (who holds the activity)
                                                const customerName = event.bookingCustomerName || "";

                                                // Get activity description from custom questions
                                                const descriptionQuestion = event.bookingCustomQuestions?.find(q =>
                                                    q.question.toLowerCase().includes("descriere")
                                                );
                                                const activityDescription = descriptionQuestion?.answer || "";

                                                // Get number of participants from booking
                                                const participantsQuestion = event.bookingCustomQuestions?.find(q =>
                                                    q.question.toLowerCase().includes("participan")
                                                );
                                                const participantCount = participantsQuestion?.answer || "";

                                                return (
                                                    <div
                                                        key={event.id}
                                                        onClick={() => setSelectedEvent(event)}
                                                        className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                                                        style={{ borderLeftWidth: 3, borderLeftColor: room.color }}
                                                    >
                                                        {/* Customer name - who holds the activity */}
                                                        {customerName && (
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                                                                {customerName}
                                                            </p>
                                                        )}

                                                        {/* Activity description */}
                                                        {activityDescription && (
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                                                {activityDescription}
                                                            </p>
                                                        )}

                                                        {/* Time and participants */}
                                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                                                            </span>
                                                            {participantCount && (
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    {participantCount} pers
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Fallback: show subject if no booking data */}
                                                        {!customerName && !activityDescription && (
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                                                                {event.subject}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}

            {selectedRoom && (
                <RoomDetailModal
                    room={selectedRoom}
                    events={eventsByRoom[selectedRoom.id] || []}
                    currentDate={currentDate}
                    onClose={() => setSelectedRoom(null)}
                    onEventClick={(event) => {
                        setSelectedRoom(null);
                        setSelectedEvent(event);
                    }}
                />
            )}
        </div>
    );
};
