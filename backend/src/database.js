import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/bookings.db');

let db;

export function initDatabase() {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    import('fs').then(fs => {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Create bookings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            month_key TEXT NOT NULL,
            service_id TEXT,
            service_name TEXT,
            customer_name TEXT,
            customer_email TEXT,
            customer_phone TEXT,
            customer_notes TEXT,
            service_notes TEXT,
            start_datetime TEXT NOT NULL,
            end_datetime TEXT NOT NULL,
            location_name TEXT,
            location_email TEXT,
            location_uri TEXT,
            customers_json TEXT,
            raw_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create sync metadata table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
            month_key TEXT PRIMARY KEY,
            last_sync TEXT NOT NULL,
            booking_count INTEGER DEFAULT 0
        )
    `);

    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_month ON bookings(month_key)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start_datetime)`);

    // Create settings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT
        )
    `);

    console.log('[Database] Initialized at', DB_PATH);
    return db;
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

// Store bookings for a month (replaces existing)
export function storeBookingsForMonth(monthKey, bookings) {
    const db = getDb();

    const deleteStmt = db.prepare('DELETE FROM bookings WHERE month_key = ?');
    const insertStmt = db.prepare(`
        INSERT INTO bookings (
            id, month_key, service_id, service_name, customer_name, customer_email,
            customer_phone, customer_notes, service_notes, start_datetime, end_datetime,
            location_name, location_email, location_uri, customers_json, raw_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
        // Delete existing bookings for this month
        deleteStmt.run(monthKey);

        // Insert new bookings
        for (const booking of bookings) {
            insertStmt.run(
                booking.id,
                monthKey,
                booking.serviceId || null,
                booking.serviceName || null,
                booking.customerName || null,
                booking.customerEmailAddress || null,
                booking.customerPhone || null,
                booking.customerNotes || null,
                booking.serviceNotes || null,
                booking.startDateTime?.dateTime || null,
                booking.endDateTime?.dateTime || null,
                booking.serviceLocation?.displayName || null,
                booking.serviceLocation?.locationEmailAddress || null,
                booking.serviceLocation?.locationUri || null,
                booking.customers ? JSON.stringify(booking.customers) : null,
                JSON.stringify(booking),
                new Date().toISOString()
            );
        }

        // Update sync metadata
        db.prepare(`
            INSERT OR REPLACE INTO sync_metadata (month_key, last_sync, booking_count)
            VALUES (?, ?, ?)
        `).run(monthKey, new Date().toISOString(), bookings.length);
    });

    transaction();
    console.log(`[Database] Stored ${bookings.length} bookings for ${monthKey}`);
}

// Get bookings for a date range
export function getBookings(startDate, endDate) {
    const db = getDb();

    const stmt = db.prepare(`
        SELECT * FROM bookings
        WHERE start_datetime >= ? AND start_datetime <= ?
        ORDER BY start_datetime ASC
    `);

    const rows = stmt.all(startDate, endDate);

    // Convert back to booking format
    return rows.map(row => {
        const rawBooking = JSON.parse(row.raw_json);
        return rawBooking;
    });
}

// Get bookings for a specific month
export function getBookingsForMonth(monthKey) {
    const db = getDb();

    const stmt = db.prepare(`
        SELECT * FROM bookings
        WHERE month_key = ?
        ORDER BY start_datetime ASC
    `);

    const rows = stmt.all(monthKey);

    return rows.map(row => JSON.parse(row.raw_json));
}

// Get sync status for all months
export function getSyncStatus() {
    const db = getDb();

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get();
    const monthsStmt = db.prepare('SELECT * FROM sync_metadata ORDER BY month_key ASC');
    const months = monthsStmt.all();

    return {
        totalBookings: totalCount.count,
        lastFullSync: months.length > 0 ? Math.max(...months.map(m => new Date(m.last_sync).getTime())) : null,
        months: months.map(m => ({
            monthKey: m.month_key,
            lastSync: m.last_sync,
            bookingCount: m.booking_count
        }))
    };
}

// Check if a month needs syncing (older than maxAge hours)
export function monthNeedsSync(monthKey, maxAgeHours = 1) {
    const db = getDb();

    const stmt = db.prepare('SELECT last_sync FROM sync_metadata WHERE month_key = ?');
    const row = stmt.get(monthKey);

    if (!row) {
        return true; // Never synced
    }

    const lastSync = new Date(row.last_sync);
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

    return hoursSinceSync > maxAgeHours;
}

// Get a setting value
export function getSetting(key) {
    const db = getDb();
    const stmt = db.prepare('SELECT value, updated_at, updated_by FROM settings WHERE key = ?');
    const row = stmt.get(key);

    if (!row) {
        return null;
    }

    try {
        return {
            value: JSON.parse(row.value),
            updatedAt: row.updated_at,
            updatedBy: row.updated_by
        };
    } catch {
        return {
            value: row.value,
            updatedAt: row.updated_at,
            updatedBy: row.updated_by
        };
    }
}

// Save a setting value
export function saveSetting(key, value, updatedBy = null) {
    const db = getDb();

    const stmt = db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(key, JSON.stringify(value), new Date().toISOString(), updatedBy);
    console.log(`[Database] Saved setting: ${key}`);
}
