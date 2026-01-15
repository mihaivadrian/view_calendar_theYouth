import React, { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useCalendarEvents } from "../../hooks/useCalendarEvents";
import { useRooms } from "../../hooks/useRooms";
import { EventModal } from "./EventModal";
import type { CalendarEvent } from "../../types/calendar";

export const CalendarView: React.FC = () => {
    const calendarRef = useRef<FullCalendar>(null);
    const { events, loading, setDateRange } = useCalendarEvents();
    const { rooms } = useRooms();
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // Helper to get room name by ID
    const getRoomName = (roomId?: string) => {
        if (!roomId) return "";
        const room = rooms.find(r => r.id === roomId);
        return room ? room.name : "";
    };

    // FullCalendar events - include room name in title for clarity
    const calendarEvents = events.map(e => {
        const roomName = getRoomName(e.roomId);
        return {
            id: e.id,
            title: roomName ? `[${roomName}] ${e.subject}` : e.subject,
            start: e.start.dateTime,
            end: e.end.dateTime,
            backgroundColor: e.color,
            borderColor: e.color,
            extendedProps: { ...e, roomName }
        };
    });

    const handleDatesSet = (arg: any) => {
        setDateRange(arg.start, arg.end);
    };

    const handleEventClick = (arg: any) => {
        setSelectedEvent(arg.event.extendedProps);
    };

    // Get selected rooms for legend
    const selectedRooms = rooms.filter(r =>
        events.some(e => e.roomId === r.id)
    );

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 relative">
            {loading && (
                <div className="absolute inset-0 z-10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Room Legend */}
            {selectedRooms.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">
                        Săli:
                    </span>
                    {selectedRooms.map(room => (
                        <div
                            key={room.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                            style={{ backgroundColor: `${room.color}20` }}
                        >
                            <span
                                className="w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-800"
                                style={{ backgroundColor: room.color }}
                            />
                            <span
                                className="text-sm font-medium"
                                style={{ color: room.color }}
                            >
                                {room.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 600 !important; }
                .fc-button-primary { background-color: #3B82F6 !important; border-color: #3B82F6 !important; }
                .fc-button-primary:hover { background-color: #2563EB !important; border-color: #2563EB !important; }
                .fc-button-active { background-color: #1D4ED8 !important; border-color: #1D4ED8 !important; }
                .fc-theme-standard td, .fc-theme-standard th { border-color: #E5E7EB !important; }
                .dark .fc-theme-standard td, .dark .fc-theme-standard th { border-color: #374151 !important; }
                .dark .fc-scrollgrid { border-color: #374151 !important; }
                .dark .fc-col-header-cell-cushion, .dark .fc-daygrid-day-number { color: #E5E7EB !important; }
                .dark .fc-list-day-cushion { background-color: #1F2937 !important; }
                .dark .fc-list-event:hover td { background-color: #374151 !important; }
                /* Event styling improvements */
                .fc-event {
                    border-left-width: 4px !important;
                    font-weight: 500 !important;
                    padding: 2px 4px !important;
                }
                .fc-daygrid-event {
                    white-space: normal !important;
                    overflow: visible !important;
                }
                .fc-event-title {
                    font-weight: 600 !important;
                }
            `}</style>

            <div className="flex-1 min-h-0">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    locale="ro"
                    firstDay={1}
                    buttonText={{
                        today: 'Azi',
                        month: 'Lună',
                        week: 'Săptămână',
                        day: 'Zi',
                        list: 'Listă'
                    }}
                    events={calendarEvents}
                    datesSet={handleDatesSet}
                    eventClick={handleEventClick}
                    height="100%"
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    allDaySlot={false}
                    slotDuration="00:30:00"
                    eventTimeFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        meridiem: false
                    }}
                />
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
