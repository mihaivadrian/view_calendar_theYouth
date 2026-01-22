import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useRooms } from "./useRooms";
import { getRoomCalendarEvents, type BookingAppointment } from "../services/graphService";
import { bookingSmartSyncService } from "../services/bookingSmartSyncService";
import type { CalendarEvent } from "../types/calendar";
import { startOfMonth, endOfMonth, parseISO, isSameDay, differenceInMinutes } from "date-fns";

// Helper to parse date that might be in different formats
function parseBookingDate(dateObj: { dateTime: string; timeZone: string }): Date {
    let dateStr = dateObj.dateTime;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
    }
    return parseISO(dateStr);
}

// Helper to normalize room names for comparison
function normalizeRoomName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
        .trim();
}

// Helper to check if booking location matches event room
function locationMatchesRoom(booking: BookingAppointment, event: CalendarEvent): boolean {
    if (!booking.serviceLocation) return false;

    const bookingLocation = booking.serviceLocation.displayName || '';
    const bookingEmail = booking.serviceLocation.locationEmailAddress || '';
    // IMPORTANT: locationUri contains the actual room email (e.g., "TheWay@rotineret.ro")
    const bookingUri = (booking.serviceLocation as { locationUri?: string }).locationUri || '';

    // Get event's room info
    const eventLocation = event.location?.displayName || '';
    const eventRoomId = event.roomId || '';

    // Normalize all names for comparison
    const normalizedBookingLoc = normalizeRoomName(bookingLocation);
    const normalizedEventLoc = normalizeRoomName(eventLocation);
    const normalizedRoomId = normalizeRoomName(eventRoomId.split('@')[0]); // Extract name from email

    // Check if locationUri matches room ID exactly (most reliable match!)
    if (bookingUri && eventRoomId && bookingUri.toLowerCase() === eventRoomId.toLowerCase()) {
        return true;
    }

    // Check if location email matches room ID exactly
    if (bookingEmail && eventRoomId && bookingEmail.toLowerCase() === eventRoomId.toLowerCase()) {
        return true;
    }

    // Check normalized names match
    if (normalizedBookingLoc && normalizedEventLoc) {
        if (normalizedBookingLoc === normalizedEventLoc) return true;
        if (normalizedBookingLoc.includes(normalizedEventLoc) || normalizedEventLoc.includes(normalizedBookingLoc)) return true;
    }

    // Check booking location against room ID name part
    if (normalizedBookingLoc && normalizedRoomId) {
        if (normalizedBookingLoc === normalizedRoomId) return true;
        if (normalizedBookingLoc.includes(normalizedRoomId) || normalizedRoomId.includes(normalizedBookingLoc)) return true;
    }

    // Try matching key words (e.g., "the way" should match "theway" or "the.way")
    const bookingWords = bookingLocation.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const eventWords = eventLocation.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const roomIdWords = eventRoomId.split('@')[0].toLowerCase().split(/[.\-_]/).filter(w => w.length > 2);

    // Check if all booking words appear in event location or room ID
    if (bookingWords.length > 0) {
        const allWordsMatch = bookingWords.every(bw =>
            eventWords.some(ew => ew.includes(bw) || bw.includes(ew)) ||
            roomIdWords.some(rw => rw.includes(bw) || bw.includes(rw))
        );
        if (allWordsMatch) return true;
    }

    return false;
}

// Helper to match booking appointments with calendar events
function enrichEventsWithBookingData(
    events: CalendarEvent[],
    bookings: BookingAppointment[]
): CalendarEvent[] {
    if (bookings.length === 0) {
        console.log('[Enrich] No bookings to match');
        return events;
    }

    console.log(`%c[Enrich] Matching ${events.length} events with ${bookings.length} bookings`, 'background: purple; color: white;');
    console.log('[Enrich] All booking locations:', bookings.map(b => ({
        customer: b.customerName,
        location: b.serviceLocation?.displayName || 'NO LOCATION',
        locationUri: (b.serviceLocation as { locationUri?: string })?.locationUri || 'NO URI',
        date: b.startDateTime.dateTime.split('T')[0],
        time: b.startDateTime.dateTime.split('T')[1]?.substring(0, 5)
    })));
    console.log('[Enrich] Sample event rooms:', events.slice(0, 5).map(e => ({
        subject: e.subject,
        roomId: e.roomId,
        location: e.location?.displayName
    })));

    let matchCount = 0;

    // Debug: Log first few events to see their datetime format
    console.log('[Enrich] Event datetime formats:', events.slice(0, 3).map(e => ({
        subject: e.subject,
        startDateTime: e.start.dateTime,
        startTimeZone: e.start.timeZone,
        roomId: e.roomId
    })));

    const enrichedEvents = events.map(event => {
        // Parse event time - handle timezone properly
        // Graph API returns times with timeZone property but often WITHOUT 'Z' suffix
        // If timeZone is "UTC", we must add 'Z' to parse correctly
        let eventStart: Date;
        let eventEnd: Date;

        let eventStartStr = event.start.dateTime;
        let eventEndStr = event.end.dateTime;

        // If the event's timeZone is UTC but the string doesn't have 'Z', add it
        if (event.start.timeZone === 'UTC' || event.start.timeZone === 'Etc/UTC') {
            if (!eventStartStr.endsWith('Z') && !eventStartStr.includes('+') && !eventStartStr.match(/-\d{2}:\d{2}$/)) {
                eventStartStr = eventStartStr + 'Z';
            }
            if (!eventEndStr.endsWith('Z') && !eventEndStr.includes('+') && !eventEndStr.match(/-\d{2}:\d{2}$/)) {
                eventEndStr = eventEndStr + 'Z';
            }
        }

        eventStart = parseISO(eventStartStr);
        eventEnd = parseISO(eventEndStr);

        // Find ALL potential matching bookings, then pick the BEST one (closest start time)
        const potentialMatches = bookings
            .map(booking => {
                const bookingStart = parseBookingDate(booking.startDateTime);
                const bookingEnd = parseBookingDate(booking.endDateTime);

                // Check if same day (using local date comparison)
                const sameDay = isSameDay(eventStart, bookingStart);
                if (!sameDay) return null;

                // Check if location/room matches
                const roomMatches = locationMatchesRoom(booking, event);
                if (!roomMatches) return null;

                // Calculate time difference (how close the start times are)
                const startDiff = Math.abs(differenceInMinutes(eventStart, bookingStart));

                // Debug: log potential matches for investigation
                if (event.roomId?.includes('TheAction') || event.roomId?.includes('TheTeam')) {
                    console.log(`[Enrich Debug] Comparing:`, {
                        event: { subject: event.subject, start: eventStartStr, parsed: eventStart.toISOString() },
                        booking: { customer: booking.customerName, start: booking.startDateTime.dateTime, parsed: bookingStart.toISOString() },
                        startDiff,
                        roomMatches
                    });
                }

                // Check if times overlap
                const timesOverlap = eventStart < bookingEnd && eventEnd > bookingStart;

                // Only consider if times are close (within 30 min) OR overlap
                if (startDiff <= 30 || timesOverlap) {
                    return { booking, startDiff };
                }

                return null;
            })
            .filter((match): match is { booking: BookingAppointment; startDiff: number } => match !== null);

        // Sort by start time difference (closest first) and pick the best match
        potentialMatches.sort((a, b) => a.startDiff - b.startDiff);
        const matchingBooking = potentialMatches.length > 0 ? potentialMatches[0].booking : null;

        if (matchingBooking) {
            matchCount++;
            const customQuestions: { question: string; answer: string }[] = [];

            if (matchingBooking.customers && matchingBooking.customers.length > 0) {
                for (const customer of matchingBooking.customers) {
                    if (customer.customQuestionAnswers) {
                        for (const qa of customer.customQuestionAnswers) {
                            if (qa.answer && qa.answer.trim()) {
                                customQuestions.push({
                                    question: qa.question,
                                    answer: qa.answer
                                });
                            }
                        }
                    }
                }
            }

            return {
                ...event,
                bookingCustomerName: matchingBooking.customerName,
                bookingCustomerEmail: matchingBooking.customerEmailAddress,
                bookingCustomerPhone: matchingBooking.customerPhone,
                bookingCustomQuestions: customQuestions.length > 0 ? customQuestions : undefined,
                bookingServiceNotes: matchingBooking.serviceNotes || matchingBooking.customerNotes || undefined
            };
        } else {
            // Log unmatched events to investigate
            console.log(`[Enrich] NO MATCH for event:`, {
                subject: event.subject,
                roomId: event.roomId,
                startRaw: event.start.dateTime,
                startTZ: event.start.timeZone,
                startParsed: eventStart.toISOString(),
                potentialMatchesCount: potentialMatches.length
            });
        }

        return event;
    });

    console.log(`%c[Enrich] Matched ${matchCount}/${events.length} events with booking data`, matchCount > 0 ? 'background: green; color: white;' : 'background: orange; color: black;');
    return enrichedEvents;
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

    // Refs to avoid stale closures
    const dataRef = useRef({ rooms, selectedRoomIds });
    dataRef.current = { rooms, selectedRoomIds };

    const fetchEvents = useCallback(async (start: Date, end: Date) => {
        if (!isAuthenticated) {
            console.log('[Calendar] Not authenticated');
            return;
        }

        const { rooms: currentRooms, selectedRoomIds: currentSelectedRoomIds } = dataRef.current;

        console.log('%c[Calendar] Fetching events', 'background: blue; color: white;');
        console.log('Range:', start.toISOString(), 'to', end.toISOString());
        console.log('Rooms:', currentRooms.map(r => r.id));
        console.log('Selected:', currentSelectedRoomIds);

        setLoading(true);
        setError(null);

        try {
            const token = await getAccessToken();
            if (!token) {
                setLoading(false);
                return;
            }

            const activeRooms = currentRooms.filter(r => currentSelectedRoomIds.includes(r.id));
            console.log('Active rooms:', activeRooms.length);

            if (activeRooms.length === 0) {
                console.log('%c[Calendar] No active rooms!', 'background: red; color: white;');
                setEvents([]);
                setLoading(false);
                return;
            }

            // 1. Fetch calendar events from rooms
            const calendarPromises = activeRooms.map(async (room) => {
                try {
                    const roomEvents = await getRoomCalendarEvents(
                        token,
                        room.email,
                        start.toISOString(),
                        end.toISOString()
                    );
                    console.log(`[Calendar] ${room.name}: ${roomEvents.length} events`);
                    return roomEvents.map(e => ({
                        ...e,
                        roomId: room.id,
                        color: room.color,
                        location: e.location || { displayName: room.name }
                    }));
                } catch (roomErr) {
                    console.error(`[Calendar] Failed for ${room.name}:`, roomErr);
                    return [];
                }
            });

            // 2. Get bookings from local IndexedDB
            let bookingAppointments: BookingAppointment[] = [];
            try {
                bookingAppointments = await bookingSmartSyncService.getBookings(start, end);
                console.log(`[Calendar] Got ${bookingAppointments.length} bookings from local DB`);
            } catch (dbErr) {
                console.warn('[Calendar] Database error:', dbErr);
            }

            // 3. Process results
            const results = await Promise.all(calendarPromises);
            const allEvents = results.flat();
            console.log(`%c[Calendar] Total events: ${allEvents.length}`, 'background: green; color: white;');

            // 4. Enrich with booking data
            const enrichedEvents = enrichEventsWithBookingData(allEvents, bookingAppointments);
            setEvents(enrichedEvents);

        } catch (err) {
            console.error("[Calendar] Error:", err);
            setError("Eroare la încărcarea evenimentelor.");
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, getAccessToken]);

    // Fetch when conditions are met
    useEffect(() => {
        console.log('%c[Calendar] Effect triggered', 'background: purple; color: white;');
        console.log('Auth:', isAuthenticated, 'Loading:', isLoadingRooms, 'Rooms:', rooms.length, 'Selected:', selectedRoomIds.length);

        if (isAuthenticated && !isLoadingRooms && rooms.length > 0 && selectedRoomIds.length > 0) {
            console.log('%c[Calendar] Fetching!', 'background: green; color: white;');
            fetchEvents(currentRange.start, currentRange.end);
        }
    }, [fetchEvents, currentRange, isAuthenticated, isLoadingRooms, rooms.length, selectedRoomIds]);

    const setDateRange = useCallback((start: Date, end: Date) => {
        console.log('%c[Calendar] Date range changed', 'background: orange; color: black;');
        console.log('New:', start.toISOString(), 'to', end.toISOString());
        setCurrentRange({ start, end });
    }, []);

    const refresh = useCallback(() => {
        fetchEvents(currentRange.start, currentRange.end);
    }, [fetchEvents, currentRange]);

    return {
        events,
        loading,
        error,
        refresh,
        setDateRange
    };
};
