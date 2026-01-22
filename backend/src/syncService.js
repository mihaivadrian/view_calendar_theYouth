import { storeBookingsForMonth } from './database.js';

// Microsoft Graph API configuration
// These should be set in environment variables
const TENANT_ID = process.env.MS_TENANT_ID;
const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const BOOKING_BUSINESS_ID = process.env.MS_BOOKING_BUSINESS_ID;

// Get access token using client credentials flow (app-only)
async function getAccessToken() {
    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get token: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.access_token;
}

// Get booking businesses
async function getBookingBusinesses(accessToken) {
    const response = await fetch('https://graph.microsoft.com/v1.0/solutions/bookingBusinesses', {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        console.error('[Sync] Failed to get booking businesses:', response.status);
        return [];
    }

    const data = await response.json();
    return data.value || [];
}

// Get appointments for a date range with pagination
async function getBookingAppointments(accessToken, businessId, startDate, endDate) {
    const allAppointments = [];
    const url = `https://graph.microsoft.com/v1.0/solutions/bookingBusinesses/${encodeURIComponent(businessId)}/calendarView?start=${startDate}&end=${endDate}&$select=id,serviceId,serviceName,customerName,customerEmailAddress,customerPhone,customerNotes,serviceNotes,startDateTime,endDateTime,customers,serviceLocation&$top=999`;

    console.log(`[Sync] Fetching appointments from: ${url}`);
    let nextLink = url;

    let pageCount = 0;

    while (nextLink) {
        pageCount++;

        const response = await fetch(nextLink, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[Sync] API error: ${response.status} ${error}`);
            break;
        }

        const data = await response.json();
        console.log(`[Sync] API response page ${pageCount}: ${JSON.stringify(data).substring(0, 500)}`);
        const appointments = data.value || [];
        allAppointments.push(...appointments);

        nextLink = data['@odata.nextLink'] || null;

        if (nextLink) {
            console.log(`[Sync] Fetching page ${pageCount + 1}...`);
        }
    }

    console.log(`[Sync] Total appointments fetched: ${allAppointments.length}`);
    return allAppointments;
}

// Get month key from date string
function getMonthKey(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Sync a single month
export async function syncMonth(accessToken, monthKey) {
    const [year, month] = monthKey.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // Last day of month

    console.log(`[Sync] Syncing month ${monthKey}: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
        // Get all booking businesses
        const businesses = await getBookingBusinesses(accessToken);

        if (businesses.length === 0) {
            console.warn('[Sync] No booking businesses found');
            storeBookingsForMonth(monthKey, []);
            return { success: true, count: 0 };
        }

        // Use specific business ID if configured, otherwise use first one
        const businessId = BOOKING_BUSINESS_ID || businesses[0].id;
        console.log(`[Sync] Using business: ${businessId}`);

        // Fetch appointments
        const appointments = await getBookingAppointments(
            accessToken,
            businessId,
            startDate.toISOString(),
            endDate.toISOString()
        );

        // Filter to only this month (API might return edge cases)
        const monthAppointments = appointments.filter(apt => {
            const aptMonth = getMonthKey(apt.startDateTime.dateTime);
            return aptMonth === monthKey;
        });

        // Store in database
        storeBookingsForMonth(monthKey, monthAppointments);

        console.log(`[Sync] Month ${monthKey}: stored ${monthAppointments.length} bookings`);
        return { success: true, count: monthAppointments.length };

    } catch (error) {
        console.error(`[Sync] Failed to sync month ${monthKey}:`, error);
        return { success: false, count: 0, error: error.message };
    }
}

// Sync all months (6 behind + current + 12 ahead)
export async function syncAllBookings() {
    console.log('[Sync] Starting full sync...');

    // Validate configuration
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        console.error('[Sync] Missing Microsoft Graph credentials. Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET');
        return { success: false, error: 'Missing credentials' };
    }

    try {
        // Get access token
        const accessToken = await getAccessToken();
        console.log('[Sync] Got access token');

        // Generate months to sync
        const now = new Date();
        const monthsToSync = [];

        for (let i = -6; i <= 12; i++) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthKey = getMonthKey(targetDate.toISOString());
            monthsToSync.push(monthKey);
        }

        console.log(`[Sync] Will sync ${monthsToSync.length} months: ${monthsToSync[0]} to ${monthsToSync[monthsToSync.length - 1]}`);

        let totalCount = 0;
        let successCount = 0;

        for (const monthKey of monthsToSync) {
            const result = await syncMonth(accessToken, monthKey);
            if (result.success) {
                totalCount += result.count;
                successCount++;
            }
        }

        console.log(`[Sync] Full sync complete! ${successCount}/${monthsToSync.length} months, ${totalCount} total bookings`);
        return { success: true, monthsSynced: successCount, totalBookings: totalCount };

    } catch (error) {
        console.error('[Sync] Full sync failed:', error);
        return { success: false, error: error.message };
    }
}
