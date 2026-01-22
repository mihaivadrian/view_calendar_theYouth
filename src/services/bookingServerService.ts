// Booking Server Service - fetches data from the Docker backend
// This replaces local IndexedDB with server-side database

import type { BookingAppointment } from './graphService';

// Backend API URL - change this to your production URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SyncStatus {
    totalBookings: number;
    lastFullSync: number | null;
    months: {
        monthKey: string;
        lastSync: string;
        bookingCount: number;
    }[];
}

class BookingServerService {
    // Get bookings for a date range from the server
    async getBookings(startDate: Date, endDate: Date): Promise<BookingAppointment[]> {
        const start = startDate.toISOString();
        const end = endDate.toISOString();

        console.log(`[ServerService] Fetching bookings from ${start} to ${end}`);

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/bookings?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
            );

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const bookings = await response.json();
            console.log(`[ServerService] Got ${bookings.length} bookings from server`);
            return bookings;
        } catch (error) {
            console.error('[ServerService] Failed to fetch bookings:', error);
            throw error;
        }
    }

    // Get bookings for a specific month
    async getBookingsForMonth(monthKey: string): Promise<BookingAppointment[]> {
        console.log(`[ServerService] Fetching bookings for month ${monthKey}`);

        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/month/${monthKey}`);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const bookings = await response.json();
            console.log(`[ServerService] Got ${bookings.length} bookings for ${monthKey}`);
            return bookings;
        } catch (error) {
            console.error('[ServerService] Failed to fetch month bookings:', error);
            throw error;
        }
    }

    // Get sync status from server
    async getSyncStatus(): Promise<SyncStatus> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/sync/status`);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[ServerService] Failed to get sync status:', error);
            throw error;
        }
    }

    // Trigger manual sync on server
    async triggerSync(): Promise<{ success: boolean; monthsSynced?: number; totalBookings?: number; error?: string }> {
        console.log('[ServerService] Triggering server sync...');

        try {
            const response = await fetch(`${API_BASE_URL}/api/sync/trigger`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log('[ServerService] Server sync result:', result);
            return result;
        } catch (error) {
            console.error('[ServerService] Failed to trigger sync:', error);
            return { success: false, error: String(error) };
        }
    }

    // Health check
    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/health`);
            return response.ok;
        } catch {
            return false;
        }
    }

    // Send bookings for a month to server (hybrid sync)
    async sendBookingsForMonth(monthKey: string, bookings: BookingAppointment[]): Promise<{ success: boolean; stored?: number }> {
        console.log(`[ServerService] Sending ${bookings.length} bookings for ${monthKey} to server`);

        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ monthKey, bookings })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log(`[ServerService] Server stored ${result.stored} bookings for ${monthKey}`);
            return result;
        } catch (error) {
            console.error('[ServerService] Failed to send bookings:', error);
            return { success: false };
        }
    }

    // Send multiple months at once (batch sync)
    async sendBookingsBatch(months: { monthKey: string; bookings: BookingAppointment[] }[]): Promise<{ success: boolean; totalStored?: number }> {
        console.log(`[ServerService] Batch sending ${months.length} months to server`);

        try {
            const response = await fetch(`${API_BASE_URL}/api/bookings/sync-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ months })
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            console.log(`[ServerService] Server stored ${result.totalStored} bookings in batch`);
            return result;
        } catch (error) {
            console.error('[ServerService] Failed to batch send bookings:', error);
            return { success: false };
        }
    }
}

export const bookingServerService = new BookingServerService();
