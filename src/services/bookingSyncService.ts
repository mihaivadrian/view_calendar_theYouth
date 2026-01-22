// Booking Sync Service - syncs booking data from API to local cache
// Fetches 12 months of booking data and stores locally

import { getBookingBusinesses, getBookingAppointments, type BookingAppointment } from './graphService';
import { bookingCacheService } from './bookingCacheService';
import { addMonths, startOfDay, endOfDay } from 'date-fns';

class BookingSyncService {
    private isSyncing = false;
    private lastSyncPromise: Promise<void> | null = null;

    // Sync bookings for the next 12 months
    async syncBookings(accessToken: string): Promise<{ success: boolean; count: number; error?: string }> {
        // Prevent concurrent syncs
        if (this.isSyncing) {
            console.log('[BookingSync] Sync already in progress, waiting...');
            if (this.lastSyncPromise) {
                await this.lastSyncPromise;
            }
            return { success: true, count: 0 };
        }

        this.isSyncing = true;
        console.log('%c[BookingSync] Starting full sync...', 'background: purple; color: white; font-size: 14px;');

        const syncPromise = this.performSync(accessToken);
        this.lastSyncPromise = syncPromise.then(() => {});

        try {
            const result = await syncPromise;
            return result;
        } finally {
            this.isSyncing = false;
        }
    }

    private async performSync(accessToken: string): Promise<{ success: boolean; count: number; error?: string }> {
        const now = new Date();
        const startDate = startOfDay(now);
        const endDate = endOfDay(addMonths(now, 12)); // 12 months ahead

        const startStr = startDate.toISOString();
        const endStr = endDate.toISOString();

        console.log(`[BookingSync] Fetching bookings from ${startStr} to ${endStr}`);

        let allBookings: BookingAppointment[] = [];

        // Try Graph API directly (user needs Bookings.Read.All permission)
        try {
            console.log('[BookingSync] Fetching booking businesses via Graph API...');
            const businesses = await getBookingBusinesses(accessToken);
            console.log(`%c[BookingSync] Found ${businesses.length} booking businesses`, 'background: blue; color: white;');

            if (businesses.length > 0) {
                console.log('[BookingSync] Businesses:', businesses.map(b => ({ id: b.id, name: b.displayName })));

                // Fetch from all businesses
                for (const business of businesses) {
                    try {
                        console.log(`[BookingSync] Fetching appointments from: ${business.displayName} (${business.id})`);
                        const appointments = await getBookingAppointments(
                            accessToken,
                            business.id,
                            startStr,
                            endStr
                        );
                        console.log(`%c[BookingSync] Got ${appointments.length} appointments from ${business.displayName}`, 'background: green; color: white;');

                        if (appointments.length > 0) {
                            console.log('[BookingSync] Sample appointment:', JSON.stringify(appointments[0], null, 2));
                        }

                        allBookings = [...allBookings, ...appointments];
                    } catch (bizErr) {
                        console.error(`%c[BookingSync] Failed to fetch from ${business.displayName}`, 'background: red; color: white;');
                        console.error('[BookingSync] Error details:', bizErr);
                    }
                }
            } else {
                console.warn('[BookingSync] No booking businesses found. User may not have access to any booking pages.');
            }
        } catch (err) {
            console.error('%c[BookingSync] Graph API failed completely', 'background: red; color: white;');
            console.error('[BookingSync] Error:', err);
            return { success: false, count: 0, error: 'Failed to fetch bookings from API' };
        }

        // Store in cache
        if (allBookings.length > 0) {
            // Clear old bookings first (before today)
            await bookingCacheService.clearOldBookings(startDate);

            // Store new bookings
            await bookingCacheService.storeBookings(allBookings);
            await bookingCacheService.updateSyncMetadata(startStr, endStr);

            console.log(`%c[BookingSync] Sync complete! Cached ${allBookings.length} bookings`, 'background: green; color: white;');
        } else {
            console.log('[BookingSync] No bookings found to cache');
            await bookingCacheService.updateSyncMetadata(startStr, endStr);
        }

        return { success: true, count: allBookings.length };
    }

    // Check if sync is needed and perform if necessary
    async syncIfNeeded(accessToken: string): Promise<void> {
        const needsRefresh = await bookingCacheService.needsRefresh();

        if (needsRefresh) {
            console.log('[BookingSync] Cache needs refresh, syncing...');
            await this.syncBookings(accessToken);
        } else {
            console.log('[BookingSync] Cache is fresh, skipping sync');
        }
    }

    // Force a full refresh
    async forceSync(accessToken: string): Promise<{ success: boolean; count: number; error?: string }> {
        console.log('[BookingSync] Forcing full sync...');
        await bookingCacheService.clearAll();
        return this.syncBookings(accessToken);
    }

    // Get bookings from cache for a date range
    async getBookingsFromCache(startDate: Date, endDate: Date): Promise<BookingAppointment[]> {
        return bookingCacheService.getBookings(startDate, endDate);
    }

    // Get sync status
    async getSyncStatus(): Promise<{ lastSync: Date | null; bookingCount: number }> {
        const metadata = await bookingCacheService.getSyncMetadata();
        const allBookings = await bookingCacheService.getAllBookings();

        return {
            lastSync: metadata ? new Date(metadata.lastSync) : null,
            bookingCount: allBookings.length
        };
    }
}

export const bookingSyncService = new BookingSyncService();
