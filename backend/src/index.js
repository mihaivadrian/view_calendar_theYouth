import express from 'express';
import cors from 'cors';
import { initDatabase, getBookings, getBookingsForMonth, getSyncStatus, storeBookingsForMonth, getSetting, saveSetting } from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// API Routes

// Get all bookings for a date range
app.get('/api/bookings', (req, res) => {
    try {
        const { start, end } = req.query;

        if (!start || !end) {
            return res.status(400).json({ error: 'start and end parameters required' });
        }

        const bookings = getBookings(start, end);
        console.log(`[API] Returning ${bookings.length} bookings for ${start} to ${end}`);
        res.json(bookings);
    } catch (error) {
        console.error('[API] Error getting bookings:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Get bookings for a specific month
app.get('/api/bookings/month/:monthKey', (req, res) => {
    try {
        const { monthKey } = req.params;
        const bookings = getBookingsForMonth(monthKey);
        console.log(`[API] Returning ${bookings.length} bookings for month ${monthKey}`);
        res.json(bookings);
    } catch (error) {
        console.error('[API] Error getting month bookings:', error);
        res.status(500).json({ error: 'Failed to get bookings' });
    }
});

// Get sync status
app.get('/api/sync/status', (req, res) => {
    try {
        const status = getSyncStatus();
        res.json(status);
    } catch (error) {
        console.error('[API] Error getting sync status:', error);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});

// Receive bookings from frontend (hybrid sync)
app.post('/api/bookings/sync', (req, res) => {
    try {
        const { monthKey, bookings } = req.body;

        if (!monthKey || !Array.isArray(bookings)) {
            return res.status(400).json({ error: 'monthKey and bookings array required' });
        }

        console.log(`[API] Receiving ${bookings.length} bookings for month ${monthKey} from frontend`);
        storeBookingsForMonth(monthKey, bookings);

        res.json({ success: true, stored: bookings.length, monthKey });
    } catch (error) {
        console.error('[API] Error storing bookings:', error);
        res.status(500).json({ error: 'Failed to store bookings' });
    }
});

// Batch sync multiple months at once
app.post('/api/bookings/sync-batch', (req, res) => {
    try {
        const { months } = req.body;

        if (!Array.isArray(months)) {
            return res.status(400).json({ error: 'months array required' });
        }

        let totalStored = 0;
        for (const { monthKey, bookings } of months) {
            if (monthKey && Array.isArray(bookings)) {
                storeBookingsForMonth(monthKey, bookings);
                totalStored += bookings.length;
                console.log(`[API] Stored ${bookings.length} bookings for ${monthKey}`);
            }
        }

        console.log(`[API] Batch sync complete: ${totalStored} bookings across ${months.length} months`);
        res.json({ success: true, totalStored, monthsProcessed: months.length });
    } catch (error) {
        console.error('[API] Error in batch sync:', error);
        res.status(500).json({ error: 'Failed to batch sync' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get global settings (hidden room IDs)
app.get('/api/settings', (req, res) => {
    try {
        const setting = getSetting('globalSettings');
        if (setting) {
            res.json(setting.value);
        } else {
            res.json({ hiddenRoomIds: [] });
        }
    } catch (error) {
        console.error('[API] Error getting settings:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});

// Save global settings (hidden room IDs)
app.post('/api/settings', (req, res) => {
    try {
        const { hiddenRoomIds, updatedBy } = req.body;

        if (!Array.isArray(hiddenRoomIds)) {
            return res.status(400).json({ error: 'hiddenRoomIds array required' });
        }

        const settings = {
            hiddenRoomIds,
            lastUpdated: new Date().toISOString(),
            updatedBy: updatedBy || 'unknown'
        };

        saveSetting('globalSettings', settings, updatedBy);
        console.log(`[API] Saved settings: ${hiddenRoomIds.length} hidden rooms`);
        res.json({ success: true, ...settings });
    } catch (error) {
        console.error('[API] Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

console.log('[Server] Hybrid mode - frontend syncs, server stores');

// Start server
app.listen(PORT, () => {
    console.log(`[Server] Youth Calendar Backend running on port ${PORT}`);
    console.log(`[Server] Sync scheduled every 5 minutes`);
});
