import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useRooms } from "./useRooms";
import { getRoomCalendarEvents, getBookingAppointments, type BookingAppointment } from "../services/graphService";
import type { CalendarEvent } from "../types/calendar";
import { startOfMonth, endOfMonth, parseISO, isSameDay, differenceInMinutes } from "date-fns";

// The booking business ID for "Rezervare săli - The Youth"
const BOOKING_BUSINESS_ID = "RezervaresliTheYouth@rotineret.ro";

// Helper to match booking appointments with calendar events
function enrichEventsWithBookingData(
    events: CalendarEvent[],
    bookings: BookingAppointment[]
): CalendarEvent[] {
    return events.map(event => {
        // Match by start time (within 10 minutes tolerance) on the same day
        // We use a more relaxed matching because:
        // - Calendar events and bookings may have slight time differences
        // - Location names may not match exactly between systems
        const eventStart = parseISO(event.start.dateTime);
        const eventEnd = parseISO(event.end.dateTime);

        const matchingBooking = bookings.find(booking => {
            const bookingStart = parseISO(booking.startDateTime.dateTime);
            const bookingEnd = parseISO(booking.endDateTime.dateTime);

            // Must be same day
            if (!isSameDay(eventStart, bookingStart)) {
                return false;
            }

            // Check if start times are close (within 10 minutes)
            const startDiff = Math.abs(differenceInMinutes(eventStart, bookingStart));
            if (startDiff <= 10) {
                return true;
            }

            // Alternative: check if end times match too (in case of time zone issues)
            const endDiff = Math.abs(differenceInMinutes(eventEnd, bookingEnd));
            if (endDiff <= 10) {
                return true;
            }

            return false;
        });

        if (matchingBooking) {
            // Extract custom question answers
            const customQuestions = matchingBooking.customers?.[0]?.customQuestionAnswers?.map(qa => ({
                question: qa.question,
                answer: qa.answer
            })) || [];

            return {
                ...event,
                bookingCustomerName: matchingBooking.customerName,
                bookingCustomerEmail: matchingBooking.customerEmailAddress,
                bookingCustomerPhone: matchingBooking.customerPhone,
                bookingCustomQuestions: customQuestions,
                bookingServiceNotes: matchingBooking.serviceNotes || undefined
            };
        }

        return event;
    });
}

export const useCalendarEvents = (initialDate: Date = new Date()) => {
    const { isAuthenticated, getAccessToken } = useAuth();
    const { selectedRoomIds, rooms, isLoadingRooms } = useRooms();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentRange, setCurrentRange] = useState({
        start: startOfMonth(initialDate),
        end: endOfMonth(initialDate)
    });

    const fetchEvents = useCallback(async (start: Date, end: Date) => {
        if (!isAuthenticated) return;

        setLoading(true);
        setError(null);

        try {
            const token = await getAccessToken();
            if (!token) {
                setLoading(false);
                return;
            }

            const activeRooms = rooms.filter(r => selectedRoomIds.includes(r.id));

            // Fetch calendar events from all rooms
            const calendarPromises = activeRooms.map(async (room) => {
                try {
                    const roomEvents = await getRoomCalendarEvents(
                        token,
                        room.email,
                        start.toISOString(),
                        end.toISOString()
                    );
                    // Enrich events with room metadata
                    return roomEvents.map(e => ({
                        ...e,
                        roomId: room.id,
                        color: room.color,
                        location: e.location || { displayName: room.name }
                    }));
                } catch (roomErr) {
                    console.error(`Failed to fetch for ${room.name}`, roomErr);
                    return []; // Continue with other rooms even if one fails
                }
            });

            // Fetch booking appointments in parallel
            let bookingAppointments: BookingAppointment[] = [];
            try {
                bookingAppointments = await getBookingAppointments(
                    token,
                    BOOKING_BUSINESS_ID,
                    start.toISOString(),
                    end.toISOString()
                );
            } catch (bookingErr) {
                // Continue without booking data - graceful degradation
            }

            const results = await Promise.all(calendarPromises);
            const allEvents = results.flat();

            // Enrich calendar events with booking data
            let enrichedEvents: CalendarEvent[];
            if (bookingAppointments.length > 0) {
                enrichedEvents = enrichEventsWithBookingData(allEvents, bookingAppointments);
            } else {
                enrichedEvents = allEvents;
            }

            setEvents(enrichedEvents);

        } catch (err: any) {
            console.error("Global fetch error", err);
            setError("Eroare la încărcarea evenimentelor. Vă rugăm reîncercați.");
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, selectedRoomIds, rooms, getAccessToken]);

    // Initial fetch when range or rooms change
    useEffect(() => {
        // Wait for rooms to finish loading before fetching events
        if (isAuthenticated && !isLoadingRooms) {
            fetchEvents(currentRange.start, currentRange.end);
        }
    }, [fetchEvents, currentRange, isAuthenticated, isLoadingRooms]);

    const setDateRange = (start: Date, end: Date) => {
        setCurrentRange({ start, end });
    };

    return {
        events,
        loading,
        error,
        refresh: () => fetchEvents(currentRange.start, currentRange.end),
        setDateRange
    };
};
