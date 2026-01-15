import React from "react";
import type { CalendarEvent } from "../../types/calendar";
import type { Room } from "../../types/room";
import { X, Clock, Users, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

interface RoomDetailModalProps {
    room: Room;
    events: CalendarEvent[];
    currentDate: Date;
    onClose: () => void;
    onEventClick: (event: CalendarEvent) => void;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
    room,
    events,
    currentDate,
    onClose,
    onEventClick
}) => {
    const formatTime = (dateTime: string) => format(parseISO(dateTime), "HH:mm");

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="relative px-6 py-4 border-b-2"
                    style={{
                        borderBottomColor: room.color,
                        backgroundColor: `${room.color}15`
                    }}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors text-gray-700 dark:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3">
                        <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: room.color }}
                        />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {room.name}
                        </h2>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {format(currentDate, "EEEE, d MMMM yyyy", { locale: ro })}
                    </p>

                    {room.capacity > 0 && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {room.floor}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Capacitate: {room.capacity} pers
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {events.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                            <Clock className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">Liber toată ziua</p>
                            <p className="text-sm mt-1">Nu există rezervări pentru această sală</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {events.length} {events.length === 1 ? 'rezervare' : 'rezervări'} programate
                            </p>

                            {events.map(event => {
                                const customerName = event.bookingCustomerName || "";
                                const descriptionQuestion = event.bookingCustomQuestions?.find(q =>
                                    q.question.toLowerCase().includes("descriere")
                                );
                                const activityDescription = descriptionQuestion?.answer || "";
                                const participantsQuestion = event.bookingCustomQuestions?.find(q =>
                                    q.question.toLowerCase().includes("participan")
                                );
                                const participantCount = participantsQuestion?.answer || "";

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                                        style={{ borderLeftWidth: 4, borderLeftColor: room.color }}
                                    >
                                        {/* Time - prominent */}
                                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            <Clock className="w-5 h-5" style={{ color: room.color }} />
                                            {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                                        </div>

                                        {/* Customer name */}
                                        {customerName && (
                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                {customerName}
                                            </p>
                                        )}

                                        {/* Activity description */}
                                        {activityDescription && (
                                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                                                {activityDescription}
                                            </p>
                                        )}

                                        {/* Participants */}
                                        {participantCount && (
                                            <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                <Users className="w-4 h-4" />
                                                {participantCount} participanți
                                            </div>
                                        )}

                                        {/* Fallback: show subject if no booking data */}
                                        {!customerName && !activityDescription && (
                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                {event.subject}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
