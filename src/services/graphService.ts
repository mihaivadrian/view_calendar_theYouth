import type { CalendarEvent } from "../types/calendar";
import type { Room } from "../types/room";

// Graph API Room Response Type
interface GraphRoomResponse {
    emailAddress: string;
    displayName: string;
    capacity?: number;
    floorLabel?: string;
}

export async function getRoomCalendarEvents(
    accessToken: string,
    roomEmail: string,
    startDateTime: string,
    endDateTime: string
): Promise<CalendarEvent[]> {
    // Include attendees and all useful fields to show complete event information
    const endpoint = `https://graph.microsoft.com/v1.0/users/${roomEmail}/calendar/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=subject,start,end,organizer,bodyPreview,body,showAs,location,isAllDay,webLink,attendees,categories,importance,sensitivity,isCancelled&$orderby=start/dateTime&$top=100`;

    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            // Add Prefer header to get time zones in a consistent format if needed, 
            // though default is usually UTC or calendar's time zone depending on the call.
            // "Prefer": 'outlook.timezone="E. Europe Standard Time"' 
        },
    });

    if (!response.ok) {
        if (response.status === 429) {
            // Basic handling for rate limiting could be added here
            console.warn(`Rate limit hit for ${roomEmail}.`);
        }
        throw new Error(`Failed to fetch calendar for ${roomEmail}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.value;
}

export async function getAllRooms(accessToken: string): Promise<Room[]> {
    const response = await fetch("https://graph.microsoft.com/v1.0/places/microsoft.graph.room", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch rooms: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Graph API room data to our Room interface
    return (data.value as GraphRoomResponse[]).map((room) => ({
        id: room.emailAddress, // Use email as stable ID
        name: room.displayName,
        email: room.emailAddress,
        capacity: room.capacity || 0,
        color: "#3B82F6", // Default color, will be assigned dynamically in Context
        floor: room.floorLabel || "N/A",
        amenities: [] // Graph doesn't always return amenities easily without more calls
    }));
}

// Bookings API types
export interface BookingBusiness {
    id: string;
    displayName: string;
    email: string;
}

export interface BookingCustomQuestionAnswer {
    questionId: string;
    question: string;
    answer: string;
    answerInputType: string;
    answerOptions: string[];
    selectedOptions: string[];
    isRequired: boolean;
}

export interface BookingCustomer {
    customerId: string;
    name: string;
    emailAddress: string;
    phone: string;
    notes: string | null;
    customQuestionAnswers: BookingCustomQuestionAnswer[];
}

export interface BookingAppointment {
    id: string;
    serviceId: string;
    serviceName: string;
    customerName: string;
    customerEmailAddress: string;
    customerPhone: string;
    customerNotes: string | null;
    serviceNotes: string | null;
    startDateTime: { dateTime: string; timeZone: string };
    endDateTime: { dateTime: string; timeZone: string };
    customers: BookingCustomer[];
    serviceLocation?: {
        displayName: string;
        locationEmailAddress?: string;
        locationUri?: string;
    };
}

// Get all booking businesses (to find the booking page ID)
export async function getBookingBusinesses(accessToken: string): Promise<BookingBusiness[]> {
    const response = await fetch("https://graph.microsoft.com/v1.0/solutions/bookingBusinesses", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    return data.value;
}

// Get appointments from a booking business (uses user token - only works for admins)
// Handles pagination to fetch ALL bookings
export async function getBookingAppointments(
    accessToken: string,
    bookingBusinessId: string,
    startDateTime: string,
    endDateTime: string
): Promise<BookingAppointment[]> {
    // Use calendarView for date range filtering
    // Request all important fields including customers and their custom question answers
    // Add $top=999 to get more results per page
    const baseEndpoint = `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${encodeURIComponent(bookingBusinessId)}/calendarView?start=${startDateTime}&end=${endDateTime}&$select=id,serviceId,serviceName,customerName,customerEmailAddress,customerPhone,customerNotes,serviceNotes,startDateTime,endDateTime,customers,serviceLocation&$top=999`;

    console.log('[getBookingAppointments] Fetching from:', baseEndpoint);

    const allAppointments: BookingAppointment[] = [];
    let nextLink: string | null = baseEndpoint;
    let pageCount = 0;

    while (nextLink) {
        pageCount++;
        console.log(`[getBookingAppointments] Fetching page ${pageCount}...`);

        const response = await fetch(nextLink, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[getBookingAppointments] Error:', response.status, errorText);
            return allAppointments; // Return what we have so far
        }

        const data = await response.json();
        const appointments = data.value || [];
        allAppointments.push(...appointments);

        console.log(`[getBookingAppointments] Page ${pageCount}: got ${appointments.length} appointments (total: ${allAppointments.length})`);

        // Check for next page
        nextLink = data['@odata.nextLink'] || null;
        if (nextLink) {
            console.log('[getBookingAppointments] More pages available, continuing...');
        }
    }

    console.log(`[getBookingAppointments] Finished: ${allAppointments.length} total appointments from ${pageCount} page(s)`);

    if (allAppointments.length > 0) {
        // Log date range of fetched appointments
        const dates = allAppointments.map(a => a.startDateTime.dateTime).sort();
        console.log(`[getBookingAppointments] Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
    }

    return allAppointments;
}

// Get booking appointments via server-side PHP API (works for ALL users)
// This uses application credentials instead of user tokens
export async function getBookingAppointmentsViaServer(
    startDateTime: string,
    endDateTime: string
): Promise<BookingAppointment[]> {
    const apiUrl = '/api/bookings.php';

    try {
        const response = await fetch(
            `${apiUrl}?start=${encodeURIComponent(startDateTime)}&end=${encodeURIComponent(endDateTime)}`
        );

        if (!response.ok) {
            console.error('Server bookings API failed:', response.status);
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Failed to fetch bookings from server:', error);
        return [];
    }
}
