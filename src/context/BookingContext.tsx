import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { bookingServerService } from "../services/bookingServerService";
import { bookingSmartSyncService } from "../services/bookingSmartSyncService";
import type { BookingAppointment } from "../services/graphService";
import { format, addMonths } from "date-fns";

interface SyncProgress {
    current: number;
    total: number;
    monthKey: string;
}

interface BookingContextType {
    bookings: BookingAppointment[];
    isLoading: boolean;
    isSyncing: boolean;
    syncProgress: SyncProgress | null;
    lastSync: Date | null;
    error: string | null;
    totalBookings: number;
    syncBookings: () => Promise<void>;
    forceSyncAll: () => Promise<void>;
    getBookingsForRange: (start: Date, end: Date) => Promise<BookingAppointment[]>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated, getAccessToken } = useAuth();
    const [bookings, setBookings] = useState<BookingAppointment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [totalBookings, setTotalBookings] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Sync bookings - uses proven bookingSmartSyncService, then sends to server
    const syncBookings = useCallback(async () => {
        if (!isAuthenticated) return;

        setIsSyncing(true);
        setError(null);

        try {
            const token = await getAccessToken();
            if (!token) {
                setError('Nu s-a putut obține token-ul de acces');
                return;
            }

            console.log('%c[BookingContext] Starting hybrid sync...', 'background: purple; color: white; font-size: 14px;');

            // Use proven bookingSmartSyncService for Microsoft Graph fetch
            await bookingSmartSyncService.syncAllNeededMonths(token, (progress) => {
                setSyncProgress(progress);
            });

            // Get all bookings from local database
            const now = new Date();
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const oneYearLater = new Date(now);
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

            const localBookings = await bookingSmartSyncService.getBookings(sixMonthsAgo, oneYearLater);
            setBookings(localBookings);

            // Also send to server for other users (in background)
            const monthsData: { monthKey: string; bookings: BookingAppointment[] }[] = [];
            for (let i = -6; i <= 12; i++) {
                const monthKey = format(addMonths(now, i), 'yyyy-MM');
                const monthBookings = localBookings.filter(b => {
                    const bMonth = format(new Date(b.startDateTime.dateTime), 'yyyy-MM');
                    return bMonth === monthKey;
                });
                monthsData.push({ monthKey, bookings: monthBookings });
            }

            // Send batch to server (fire and forget)
            bookingServerService.sendBookingsBatch(monthsData).catch(err => {
                console.warn('[BookingContext] Failed to send to server:', err);
            });

            const status = await bookingSmartSyncService.getSyncStatus();
            setTotalBookings(status.totalBookings);
            setLastSync(new Date());

            console.log(`%c[BookingContext] Sync complete! ${localBookings.length} bookings`, 'background: green; color: white;');
        } catch (err) {
            console.error('[BookingContext] Sync error:', err);
            setError('Eroare la sincronizare');
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
        }
    }, [isAuthenticated, getAccessToken]);

    // Force full sync - clears local DB and re-syncs all 19 months
    const forceSyncAll = useCallback(async () => {
        if (!isAuthenticated) return;

        setIsSyncing(true);
        setError(null);

        try {
            const token = await getAccessToken();
            if (!token) {
                setError('Nu s-a putut obține token-ul de acces');
                return;
            }

            console.log('%c[BookingContext] Starting FULL sync (19 months)...', 'background: red; color: white; font-size: 14px;');

            // Use proven forceFullSync from bookingSmartSyncService
            await bookingSmartSyncService.forceFullSync(token, (progress) => {
                setSyncProgress(progress);
            });

            // Get all bookings from local database
            const now = new Date();
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const oneYearLater = new Date(now);
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

            const localBookings = await bookingSmartSyncService.getBookings(sixMonthsAgo, oneYearLater);
            setBookings(localBookings);

            // Also send to server for other users (in background)
            const monthsData: { monthKey: string; bookings: BookingAppointment[] }[] = [];
            for (let i = -6; i <= 12; i++) {
                const monthKey = format(addMonths(now, i), 'yyyy-MM');
                const monthBookings = localBookings.filter(b => {
                    const bMonth = format(new Date(b.startDateTime.dateTime), 'yyyy-MM');
                    return bMonth === monthKey;
                });
                monthsData.push({ monthKey, bookings: monthBookings });
            }

            // Send batch to server
            const serverResult = await bookingServerService.sendBookingsBatch(monthsData);
            console.log('[BookingContext] Sent to server:', serverResult);

            const status = await bookingSmartSyncService.getSyncStatus();
            setTotalBookings(status.totalBookings);
            setLastSync(new Date());

            console.log(`%c[BookingContext] Full sync complete! ${localBookings.length} bookings`, 'background: green; color: white;');
        } catch (err) {
            console.error('[BookingContext] Force sync error:', err);
            setError('Eroare la sincronizarea completă');
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
        }
    }, [isAuthenticated, getAccessToken]);

    // Get bookings for a specific date range from server
    const getBookingsForRange = useCallback(async (start: Date, end: Date): Promise<BookingAppointment[]> => {
        try {
            return await bookingServerService.getBookings(start, end);
        } catch (err) {
            console.error('[BookingContext] Error getting bookings from server:', err);
            return [];
        }
    }, []);

    // Initial load on login - try server first, fallback to local sync
    useEffect(() => {
        if (isAuthenticated) {
            console.log('[BookingContext] User authenticated, initializing...');

            const initLoad = async () => {
                setIsLoading(true);

                try {
                    const now = new Date();
                    const sixMonthsAgo = new Date(now);
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    const oneYearLater = new Date(now);
                    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

                    // Check if server has data
                    const isHealthy = await bookingServerService.checkHealth();
                    if (isHealthy) {
                        const serverStatus = await bookingServerService.getSyncStatus();
                        if (serverStatus.totalBookings > 0) {
                            // Load from server
                            const serverBookings = await bookingServerService.getBookings(sixMonthsAgo, oneYearLater);
                            setBookings(serverBookings);
                            setTotalBookings(serverStatus.totalBookings);
                            setLastSync(serverStatus.lastFullSync ? new Date(serverStatus.lastFullSync) : null);
                            console.log(`[BookingContext] Loaded ${serverBookings.length} bookings from server`);
                            setIsLoading(false);
                            return;
                        }
                    }

                    // Server empty or unavailable - use local database
                    console.log('[BookingContext] Using local database...');
                    const localStatus = await bookingSmartSyncService.getSyncStatus();
                    setTotalBookings(localStatus.totalBookings);

                    if (localStatus.totalBookings > 0) {
                        // Load from local
                        const localBookings = await bookingSmartSyncService.getBookings(sixMonthsAgo, oneYearLater);
                        setBookings(localBookings);
                        console.log(`[BookingContext] Loaded ${localBookings.length} bookings from local DB`);
                    }

                    // Sync in background
                    const token = await getAccessToken();
                    if (token) {
                        setIsLoading(false);
                        // Start background sync
                        syncBookings();
                    }

                } catch (err) {
                    console.error('[BookingContext] Init error:', err);
                    setError('Eroare la inițializare');
                } finally {
                    setIsLoading(false);
                }
            };

            initLoad();
        }
    }, [isAuthenticated, getAccessToken, syncBookings]);

    return (
        <BookingContext.Provider value={{
            bookings,
            isLoading,
            isSyncing,
            syncProgress,
            lastSync,
            error,
            totalBookings,
            syncBookings,
            forceSyncAll,
            getBookingsForRange
        }}>
            {children}
        </BookingContext.Provider>
    );
};

export const useBookings = () => {
    const context = useContext(BookingContext);
    if (context === undefined) {
        throw new Error("useBookings must be used within a BookingProvider");
    }
    return context;
};
