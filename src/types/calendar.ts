export interface Attendee {
    type: "required" | "optional" | "resource";
    status: {
        response: "none" | "organizer" | "tentativelyAccepted" | "accepted" | "declined" | "notResponded";
        time?: string;
    };
    emailAddress: {
        name: string;
        address: string;
    };
}

export interface CalendarEvent {
    id: string;
    subject: string;
    bodyPreview?: string;
    body?: {
        contentType: string;
        content: string;
    };
    start: {
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
    };
    location?: {
        displayName: string;
    };
    organizer?: {
        emailAddress: {
            name: string;
            address: string;
        };
    };
    attendees?: Attendee[];
    showAs?: string; // free, tentative, busy, oof, workingElsewhere, unknown
    isAllDay?: boolean;
    webLink?: string;
    reminderMinutesBeforeStart?: number;
    categories?: string[];
    importance?: "low" | "normal" | "high";
    sensitivity?: "normal" | "personal" | "private" | "confidential";
    isCancelled?: boolean;

    // Custom props for UI
    roomId?: string;
    color?: string;

    // Booking enrichment data (from Microsoft Bookings API)
    bookingCustomerName?: string;
    bookingCustomerEmail?: string;
    bookingCustomerPhone?: string;
    bookingCustomQuestions?: {
        question: string;
        answer: string;
    }[];
    bookingServiceNotes?: string;
}
