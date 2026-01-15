import React from "react";
import type { CalendarEvent, Attendee } from "../../types/calendar";
import { X, Calendar as CalendarIcon, MapPin, User, Users, AlignLeft, ExternalLink, Check, HelpCircle, XCircle } from "lucide-react";
import { useRooms } from "../../hooks/useRooms";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";

const getAttendeeStatusIcon = (status: Attendee["status"]["response"]) => {
    switch (status) {
        case "accepted":
        case "organizer":
            return <Check className="w-3 h-3 text-green-500" />;
        case "tentativelyAccepted":
            return <HelpCircle className="w-3 h-3 text-yellow-500" />;
        case "declined":
            return <XCircle className="w-3 h-3 text-red-500" />;
        default:
            return <HelpCircle className="w-3 h-3 text-gray-400" />;
    }
};

const getAttendeeStatusText = (status: Attendee["status"]["response"]) => {
    switch (status) {
        case "accepted": return "Acceptat";
        case "organizer": return "Organizator";
        case "tentativelyAccepted": return "Provizoriu";
        case "declined": return "Refuzat";
        case "notResponded": return "Fără răspuns";
        default: return "Necunoscut";
    }
};

interface EventModalProps {
    event: CalendarEvent | null;
    onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
    const { rooms } = useRooms();

    if (!event) return null;

    const room = rooms.find(r => r.id === event.roomId);
    const startDate = parseISO(event.start.dateTime);
    const endDate = parseISO(event.end.dateTime);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative h-24 sm:h-32">
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{ backgroundColor: event.color || room?.color || "#3B82F6" }}
                    />
                    <div
                        className="absolute bottom-0 left-0 w-full h-1"
                        style={{ backgroundColor: event.color || room?.color || "#3B82F6" }}
                    />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-black/5 rounded-full backdrop-blur-md transition-colors text-gray-700 dark:text-gray-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-4 left-6 right-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white line-clamp-2">
                            {event.subject}
                        </h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {format(startDate, "EEEE, d MMMM yyyy", { locale: ro })}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {format(startDate, "HH:mm")} - {format(endDate, "HH:mm")}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {room?.name || event.location?.displayName || "Locație necunoscută"}
                            </p>
                            {room && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {room.floor} • Capacitate: {room.capacity} pers • {room.amenities.join(", ")}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Booking Customer Info (if available from Bookings API) */}
                    {event.bookingCustomerName && (
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Rezervat de
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 font-medium">
                                    {event.bookingCustomerName}
                                </p>
                                {event.bookingCustomerEmail && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {event.bookingCustomerEmail}
                                    </p>
                                )}
                                {event.bookingCustomerPhone && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Tel: {event.bookingCustomerPhone}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Booking Custom Questions */}
                    {event.bookingCustomQuestions && event.bookingCustomQuestions.length > 0 && (
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600 dark:text-teal-400">
                                <AlignLeft className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    Detalii Rezervare
                                </p>
                                <div className="space-y-2">
                                    {event.bookingCustomQuestions.map((qa, idx) => (
                                        <div key={idx} className="text-sm">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{qa.question}</p>
                                            <p className="text-gray-700 dark:text-gray-300">{qa.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Fallback to organizer if no booking data */}
                    {!event.bookingCustomerName && event.organizer && (
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Organizat de
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {event.organizer.emailAddress.name} ({event.organizer.emailAddress.address})
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Participanți */}
                    {event.attendees && event.attendees.filter(a => a.type !== "resource").length > 0 && (
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    Participanți ({event.attendees.filter(a => a.type !== "resource").length})
                                </p>
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                    {event.attendees
                                        .filter(a => a.type !== "resource")
                                        .map((attendee, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                {getAttendeeStatusIcon(attendee.status.response)}
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {attendee.emailAddress.name || attendee.emailAddress.address}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    ({getAttendeeStatusText(attendee.status.response)})
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {event.bodyPreview && (
                        <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                                <AlignLeft className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    Descriere
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-h-40 overflow-y-auto">
                                    {event.bodyPreview}
                                </p>
                            </div>
                        </div>
                    )}

                    {event.webLink && (
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <a
                                href={event.webLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm font-medium"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Deschide în Outlook
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
