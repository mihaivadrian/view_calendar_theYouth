// Booking Cache Service - stores booking data locally for fast access
// Uses IndexedDB to store 12 months of booking data

import type { BookingAppointment } from './graphService';

const DB_NAME = 'BookingCache';
const DB_VERSION = 1;
const STORE_NAME = 'bookings';
const META_STORE = 'metadata';

export interface CachedBooking extends BookingAppointment {
    cacheKey: string; // Unique key: `${bookingId}_${startDateTime}`
    cachedAt: number; // Timestamp when cached
}

interface CacheMetadata {
    key: string;
    lastSync: number;
    lastSyncRange: {
        start: string;
        end: string;
    };
}

class BookingCacheService {
    private db: IDBDatabase | null = null;
    private dbReady: Promise<IDBDatabase>;

    constructor() {
        this.dbReady = this.initDB();
    }

    private initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[BookingCache] Failed to open database:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[BookingCache] Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create bookings store
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
                    store.createIndex('startDateTime', 'startDateTime.dateTime', { unique: false });
                    store.createIndex('cachedAt', 'cachedAt', { unique: false });
                    console.log('[BookingCache] Created bookings store');
                }

                // Create metadata store
                if (!db.objectStoreNames.contains(META_STORE)) {
                    db.createObjectStore(META_STORE, { keyPath: 'key' });
                    console.log('[BookingCache] Created metadata store');
                }
            };
        });
    }

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        return this.dbReady;
    }

    // Store multiple bookings
    async storeBookings(bookings: BookingAppointment[]): Promise<void> {
        const db = await this.getDB();
        const now = Date.now();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            bookings.forEach(booking => {
                const cachedBooking: CachedBooking = {
                    ...booking,
                    cacheKey: `${booking.id}_${booking.startDateTime.dateTime}`,
                    cachedAt: now
                };
                store.put(cachedBooking);
            });

            transaction.oncomplete = () => {
                console.log(`[BookingCache] Stored ${bookings.length} bookings`);
                resolve();
            };

            transaction.onerror = () => {
                console.error('[BookingCache] Failed to store bookings:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    // Get bookings for a date range
    async getBookings(startDate: Date, endDate: Date): Promise<CachedBooking[]> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const allBookings = request.result as CachedBooking[];

                console.log(`[BookingCache] Total bookings in cache: ${allBookings.length}`);
                console.log(`[BookingCache] Filtering for range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

                // Filter by date range - handle timezone properly
                const filtered = allBookings.filter(booking => {
                    let dateStr = booking.startDateTime.dateTime;
                    // Add 'Z' if no timezone indicator (same as parseBookingDate)
                    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
                        dateStr = dateStr + 'Z';
                    }
                    const bookingStart = new Date(dateStr);
                    return bookingStart >= startDate && bookingStart <= endDate;
                });

                console.log(`[BookingCache] Retrieved ${filtered.length} bookings for range`);
                if (filtered.length > 0) {
                    console.log('[BookingCache] Sample booking dates:', filtered.slice(0, 3).map(b => b.startDateTime.dateTime));
                }
                resolve(filtered);
            };

            request.onerror = () => {
                console.error('[BookingCache] Failed to get bookings:', request.error);
                reject(request.error);
            };
        });
    }

    // Get all cached bookings
    async getAllBookings(): Promise<CachedBooking[]> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result as CachedBooking[]);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Clear old bookings (older than specified date)
    async clearOldBookings(beforeDate: Date): Promise<void> {
        const db = await this.getDB();
        const allBookings = await this.getAllBookings();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            let deleted = 0;
            allBookings.forEach(booking => {
                const bookingEnd = new Date(booking.endDateTime.dateTime);
                if (bookingEnd < beforeDate) {
                    store.delete(booking.cacheKey);
                    deleted++;
                }
            });

            transaction.oncomplete = () => {
                console.log(`[BookingCache] Cleared ${deleted} old bookings`);
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    // Clear all bookings
    async clearAll(): Promise<void> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                console.log('[BookingCache] Cleared all bookings');
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Update sync metadata
    async updateSyncMetadata(start: string, end: string): Promise<void> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(META_STORE, 'readwrite');
            const store = transaction.objectStore(META_STORE);

            const metadata: CacheMetadata = {
                key: 'lastSync',
                lastSync: Date.now(),
                lastSyncRange: { start, end }
            };

            store.put(metadata);

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Get sync metadata
    async getSyncMetadata(): Promise<CacheMetadata | null> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(META_STORE, 'readonly');
            const store = transaction.objectStore(META_STORE);
            const request = store.get('lastSync');

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Check if cache needs refresh (older than 5 minutes)
    async needsRefresh(): Promise<boolean> {
        const metadata = await this.getSyncMetadata();
        if (!metadata) return true;

        const fiveMinutes = 5 * 60 * 1000;
        return Date.now() - metadata.lastSync > fiveMinutes;
    }
}

export const bookingCacheService = new BookingCacheService();
