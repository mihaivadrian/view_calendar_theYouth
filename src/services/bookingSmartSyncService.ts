// Smart Booking Sync Service - syncs booking data intelligently by month
// Only syncs months that need updating, works in background

import { getBookingBusinesses, getBookingAppointments, type BookingAppointment } from './graphService';
import { bookingDatabaseService } from './bookingDatabaseService';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';

type SyncProgressCallback = (progress: { current: number; total: number; monthKey: string }) => void;

class BookingSmartSyncService {
    private isSyncing = false;
    private syncPromise: Promise<void> | null = null;

    // Sync a single month
    async syncMonth(accessToken: string, monthKey: string): Promise<{ success: boolean; count: number }> {
        const { start, end } = bookingDatabaseService.getMonthDateRange(monthKey);

        console.log(`[SmartSync] Syncing month ${monthKey}: ${start.toISOString()} to ${end.toISOString()}`);

        try {
            // Get booking businesses
            const businesses = await getBookingBusinesses(accessToken);
            if (businesses.length === 0) {
                console.warn('[SmartSync] No booking businesses found');
                return { success: true, count: 0 };
            }

            // Fetch appointments from all businesses for this month
            let allBookings: BookingAppointment[] = [];

            for (const business of businesses) {
                try {
                    const appointments = await getBookingAppointments(
                        accessToken,
                        business.id,
                        start.toISOString(),
                        end.toISOString()
                    );
                    allBookings = [...allBookings, ...appointments];
                } catch (err) {
                    console.error(`[SmartSync] Failed to fetch from ${business.displayName}:`, err);
                }
            }

            // Filter to only bookings that fall within this month
            const monthBookings = allBookings.filter(booking => {
                const bookingMonth = format(new Date(booking.startDateTime.dateTime), 'yyyy-MM');
                return bookingMonth === monthKey;
            });

            // Store in database
            await bookingDatabaseService.storeBookingsForMonth(monthKey, monthBookings);

            console.log(`[SmartSync] Month ${monthKey}: stored ${monthBookings.length} bookings`);
            return { success: true, count: monthBookings.length };

        } catch (err) {
            console.error(`[SmartSync] Failed to sync month ${monthKey}:`, err);
            return { success: false, count: 0 };
        }
    }

    // Sync all months that need updating (6 months back + 12 months ahead)
    async syncAllNeededMonths(
        accessToken: string,
        onProgress?: SyncProgressCallback
    ): Promise<{ success: boolean; totalCount: number; monthsSynced: number }> {
        if (this.isSyncing) {
            console.log('[SmartSync] Sync already in progress, waiting...');
            if (this.syncPromise) {
                await this.syncPromise;
            }
            return { success: true, totalCount: 0, monthsSynced: 0 };
        }

        this.isSyncing = true;

        const syncOperation = async () => {
            const monthsNeeded = await bookingDatabaseService.getMonthsNeedingSync(12, 6);

            if (monthsNeeded.length === 0) {
                console.log('[SmartSync] All months are up to date');
                return { success: true, totalCount: 0, monthsSynced: 0 };
            }

            console.log(`%c[SmartSync] Need to sync ${monthsNeeded.length} months: ${monthsNeeded.join(', ')}`, 'background: blue; color: white;');

            let totalCount = 0;
            let monthsSynced = 0;

            for (let i = 0; i < monthsNeeded.length; i++) {
                const monthKey = monthsNeeded[i];

                if (onProgress) {
                    onProgress({ current: i + 1, total: monthsNeeded.length, monthKey });
                }

                const result = await this.syncMonth(accessToken, monthKey);
                if (result.success) {
                    totalCount += result.count;
                    monthsSynced++;
                }
            }

            console.log(`%c[SmartSync] Complete! Synced ${monthsSynced} months, ${totalCount} total bookings`, 'background: green; color: white;');
            return { success: true, totalCount, monthsSynced };
        };

        this.syncPromise = syncOperation().then(() => {});

        try {
            const result = await syncOperation();
            return result;
        } finally {
            this.isSyncing = false;
            this.syncPromise = null;
        }
    }

    // Ensure a specific month is synced (used when navigating to a month)
    async ensureMonthSynced(accessToken: string, date: Date): Promise<void> {
        const monthKey = format(date, 'yyyy-MM');
        const needsSync = await bookingDatabaseService.monthNeedsSync(monthKey);

        if (needsSync) {
            console.log(`[SmartSync] Month ${monthKey} needs sync, fetching...`);
            await this.syncMonth(accessToken, monthKey);
        } else {
            console.log(`[SmartSync] Month ${monthKey} is up to date`);
        }
    }

    // Force sync for a specific month (ignores cache age)
    async forceSyncMonth(accessToken: string, monthKey: string): Promise<{ success: boolean; count: number }> {
        console.log(`[SmartSync] Force syncing month ${monthKey}`);
        return this.syncMonth(accessToken, monthKey);
    }

    // Force sync all months (6 months back + 12 months ahead = 19 months total)
    async forceFullSync(
        accessToken: string,
        onProgress?: SyncProgressCallback
    ): Promise<{ success: boolean; totalCount: number; monthsSynced: number }> {
        // Clear database first
        await bookingDatabaseService.clearAll();
        console.log('[SmartSync] Cleared database, starting full sync...');

        // Generate all months to sync (6 back + current + 12 ahead)
        const now = new Date();
        const monthsToSync: string[] = [];
        for (let i = -6; i <= 12; i++) {
            monthsToSync.push(format(addMonths(now, i), 'yyyy-MM'));
        }

        let totalCount = 0;
        let monthsSynced = 0;

        for (let i = 0; i < monthsToSync.length; i++) {
            const monthKey = monthsToSync[i];

            if (onProgress) {
                onProgress({ current: i + 1, total: monthsToSync.length, monthKey });
            }

            const result = await this.syncMonth(accessToken, monthKey);
            if (result.success) {
                totalCount += result.count;
                monthsSynced++;
            }
        }

        console.log(`%c[SmartSync] Full sync complete! ${monthsSynced} months, ${totalCount} bookings`, 'background: green; color: white;');
        return { success: true, totalCount, monthsSynced };
    }

    // Get bookings from database for a date range
    async getBookings(startDate: Date, endDate: Date): Promise<BookingAppointment[]> {
        return bookingDatabaseService.getBookings(startDate, endDate);
    }

    // Get sync status
    async getSyncStatus(): Promise<{
        totalBookings: number;
        syncedMonths: Map<string, { lastSync: Date; count: number }>;
    }> {
        const totalBookings = await bookingDatabaseService.getTotalBookingCount();
        const syncStatus = await bookingDatabaseService.getSyncStatus();

        const formattedStatus = new Map<string, { lastSync: Date; count: number }>();
        for (const [monthKey, meta] of syncStatus) {
            formattedStatus.set(monthKey, {
                lastSync: new Date(meta.lastSync),
                count: meta.bookingCount
            });
        }

        return { totalBookings, syncedMonths: formattedStatus };
    }
}

export const bookingSmartSyncService = new BookingSmartSyncService();
