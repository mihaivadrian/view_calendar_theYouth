// Booking Database Service - persistent storage with smart sync
// Uses IndexedDB as a proper database, not just a cache

import type { BookingAppointment } from './graphService';
import { format, startOfMonth, endOfMonth, addMonths, differenceInHours } from 'date-fns';

const DB_NAME = 'BookingDatabase';
const DB_VERSION = 2;
const BOOKINGS_STORE = 'bookings';
const SYNC_META_STORE = 'syncMetadata';

export interface StoredBooking extends BookingAppointment {
    dbKey: string; // Unique key: `${bookingId}`
    monthKey: string; // YYYY-MM format for indexing
    storedAt: number; // Timestamp when stored
}

interface MonthSyncMetadata {
    monthKey: string; // YYYY-MM format
    lastSync: number; // Timestamp of last sync
    bookingCount: number; // Number of bookings for this month
}

class BookingDatabaseService {
    private db: IDBDatabase | null = null;
    private dbReady: Promise<IDBDatabase>;

    constructor() {
        this.dbReady = this.initDB();
    }

    private initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[BookingDB] Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[BookingDB] Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Delete old stores if upgrading
                if (db.objectStoreNames.contains('bookings')) {
                    db.deleteObjectStore('bookings');
                }
                if (db.objectStoreNames.contains('metadata')) {
                    db.deleteObjectStore('metadata');
                }

                // Create bookings store with indexes
                const bookingsStore = db.createObjectStore(BOOKINGS_STORE, { keyPath: 'dbKey' });
                bookingsStore.createIndex('monthKey', 'monthKey', { unique: false });
                bookingsStore.createIndex('startDateTime', 'startDateTime.dateTime', { unique: false });
                console.log('[BookingDB] Created bookings store with indexes');

                // Create sync metadata store (tracks when each month was last synced)
                db.createObjectStore(SYNC_META_STORE, { keyPath: 'monthKey' });
                console.log('[BookingDB] Created sync metadata store');
            };
        });
    }

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        return this.dbReady;
    }

    // Get month key from date (YYYY-MM format)
    private getMonthKey(date: Date): string {
        return format(date, 'yyyy-MM');
    }

    // Store bookings for a specific month
    async storeBookingsForMonth(monthKey: string, bookings: BookingAppointment[]): Promise<void> {
        const db = await this.getDB();
        const now = Date.now();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([BOOKINGS_STORE, SYNC_META_STORE], 'readwrite');
            const bookingsStore = transaction.objectStore(BOOKINGS_STORE);
            const metaStore = transaction.objectStore(SYNC_META_STORE);

            // First, delete existing bookings for this month
            const monthIndex = bookingsStore.index('monthKey');
            const deleteRequest = monthIndex.openCursor(IDBKeyRange.only(monthKey));

            deleteRequest.onsuccess = () => {
                const cursor = deleteRequest.result;
                if (cursor) {
                    bookingsStore.delete(cursor.primaryKey);
                    cursor.continue();
                }
            };

            // Then store new bookings
            bookings.forEach(booking => {
                const storedBooking: StoredBooking = {
                    ...booking,
                    dbKey: booking.id,
                    monthKey: monthKey,
                    storedAt: now
                };
                bookingsStore.put(storedBooking);
            });

            // Update sync metadata for this month
            const syncMeta: MonthSyncMetadata = {
                monthKey: monthKey,
                lastSync: now,
                bookingCount: bookings.length
            };
            metaStore.put(syncMeta);

            transaction.oncomplete = () => {
                console.log(`[BookingDB] Stored ${bookings.length} bookings for ${monthKey}`);
                resolve();
            };

            transaction.onerror = () => {
                console.error('[BookingDB] Failed to store bookings:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    // Get bookings for a date range
    async getBookings(startDate: Date, endDate: Date): Promise<StoredBooking[]> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(BOOKINGS_STORE, 'readonly');
            const store = transaction.objectStore(BOOKINGS_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                const allBookings = request.result as StoredBooking[];

                // Filter by date range
                const filtered = allBookings.filter(booking => {
                    let dateStr = booking.startDateTime.dateTime;
                    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
                        dateStr = dateStr + 'Z';
                    }
                    const bookingStart = new Date(dateStr);
                    return bookingStart >= startDate && bookingStart <= endDate;
                });

                console.log(`[BookingDB] Retrieved ${filtered.length} bookings for range`);
                resolve(filtered);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Get bookings for a specific month
    async getBookingsForMonth(monthKey: string): Promise<StoredBooking[]> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(BOOKINGS_STORE, 'readonly');
            const store = transaction.objectStore(BOOKINGS_STORE);
            const index = store.index('monthKey');
            const request = index.getAll(IDBKeyRange.only(monthKey));

            request.onsuccess = () => {
                resolve(request.result as StoredBooking[]);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Check if a month needs syncing
    async monthNeedsSync(monthKey: string): Promise<boolean> {
        const db = await this.getDB();
        const now = new Date();
        const targetMonth = new Date(monthKey + '-01');

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SYNC_META_STORE, 'readonly');
            const store = transaction.objectStore(SYNC_META_STORE);
            const request = store.get(monthKey);

            request.onsuccess = () => {
                const meta = request.result as MonthSyncMetadata | undefined;

                if (!meta) {
                    // Never synced
                    console.log(`[BookingDB] Month ${monthKey} never synced`);
                    resolve(true);
                    return;
                }

                const hoursSinceSync = differenceInHours(now, new Date(meta.lastSync));

                // Current month: sync if older than 1 hour
                // Future months: sync if older than 6 hours
                // Past months: sync if older than 24 hours
                const currentMonthKey = this.getMonthKey(now);
                let maxAge: number;

                if (monthKey === currentMonthKey) {
                    maxAge = 1; // 1 hour for current month
                } else if (targetMonth > now) {
                    maxAge = 6; // 6 hours for future months
                } else {
                    maxAge = 24; // 24 hours for past months
                }

                const needsSync = hoursSinceSync > maxAge;
                if (needsSync) {
                    console.log(`[BookingDB] Month ${monthKey} needs sync (${hoursSinceSync}h old, max ${maxAge}h)`);
                }
                resolve(needsSync);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Get sync status for all months
    async getSyncStatus(): Promise<Map<string, MonthSyncMetadata>> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(SYNC_META_STORE, 'readonly');
            const store = transaction.objectStore(SYNC_META_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                const status = new Map<string, MonthSyncMetadata>();
                for (const meta of request.result as MonthSyncMetadata[]) {
                    status.set(meta.monthKey, meta);
                }
                resolve(status);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Get list of months that need syncing (for initial/background sync)
    async getMonthsNeedingSync(monthsAhead: number = 12, monthsBehind: number = 6): Promise<string[]> {
        const now = new Date();
        const monthsToCheck: string[] = [];

        // Generate list of months to check (past + current + future months)
        // Start from monthsBehind in the past
        for (let i = -monthsBehind; i <= monthsAhead; i++) {
            const targetDate = addMonths(now, i);
            monthsToCheck.push(this.getMonthKey(targetDate));
        }

        const monthsNeedingSync: string[] = [];
        for (const monthKey of monthsToCheck) {
            if (await this.monthNeedsSync(monthKey)) {
                monthsNeedingSync.push(monthKey);
            }
        }

        return monthsNeedingSync;
    }

    // Get total booking count
    async getTotalBookingCount(): Promise<number> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(BOOKINGS_STORE, 'readonly');
            const store = transaction.objectStore(BOOKINGS_STORE);
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Clear all data (for debugging/reset)
    async clearAll(): Promise<void> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([BOOKINGS_STORE, SYNC_META_STORE], 'readwrite');
            transaction.objectStore(BOOKINGS_STORE).clear();
            transaction.objectStore(SYNC_META_STORE).clear();

            transaction.oncomplete = () => {
                console.log('[BookingDB] Cleared all data');
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    // Get date range for a month key
    getMonthDateRange(monthKey: string): { start: Date; end: Date } {
        const date = new Date(monthKey + '-01');
        return {
            start: startOfMonth(date),
            end: endOfMonth(date)
        };
    }
}

export const bookingDatabaseService = new BookingDatabaseService();
