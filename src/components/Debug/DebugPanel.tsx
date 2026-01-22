import React, { useState, useEffect } from "react";
import { Bug, X, ChevronDown, ChevronUp, RefreshCw, Database } from "lucide-react";
import { useBookings } from "../../context/BookingContext";

interface LogEntry {
    timestamp: Date;
    level: 'log' | 'warn' | 'error';
    message: string;
    data?: unknown;
}

// Global store for logs
const logStore: LogEntry[] = [];
const listeners = new Set<() => void>();

// Override console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args: unknown[]) => {
    originalLog(...args);
    const message = args[0] as string;
    if (typeof message === 'string' && message.startsWith('[')) {
        logStore.push({
            timestamp: new Date(),
            level: 'log',
            message: message,
            data: args.slice(1)
        });
        listeners.forEach(fn => fn());
    }
};

console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    const message = args[0] as string;
    if (typeof message === 'string' && message.startsWith('[')) {
        logStore.push({
            timestamp: new Date(),
            level: 'warn',
            message: message,
            data: args.slice(1)
        });
        listeners.forEach(fn => fn());
    }
};

console.error = (...args: unknown[]) => {
    originalError(...args);
    const message = args[0] as string;
    if (typeof message === 'string' && message.startsWith('[')) {
        logStore.push({
            timestamp: new Date(),
            level: 'error',
            message: message,
            data: args.slice(1)
        });
        listeners.forEach(fn => fn());
    }
};

export const DebugPanel: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>(logStore);
    const { isSyncing, syncProgress, totalBookings, forceSyncAll } = useBookings();

    useEffect(() => {
        const updateLogs = () => {
            setLogs([...logStore]);
        };
        listeners.add(updateLogs);
        return () => {
            listeners.delete(updateLogs);
        };
    }, []);

    const handleForceResync = async () => {
        try {
            console.log('[DebugPanel] Starting force resync...');
            await forceSyncAll();
            alert(`Resync complet! Reîncarcă pagina pentru a vedea datele actualizate.`);
        } catch (err) {
            console.error('[DebugPanel] Resync error:', err);
            alert('Eroare la resync: ' + String(err));
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-50 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors"
                aria-label="Open debug panel"
            >
                <Bug className="w-6 h-6" />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-4 right-4 z-50 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 ${isExpanded ? 'w-[800px] h-[600px]' : 'w-[400px] h-[300px]'} flex flex-col`}>
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <Bug className="w-5 h-5 text-purple-400" />
                    <h3 className="font-semibold text-sm">Debug Panel</h3>
                    <span className="text-xs text-gray-400">({logs.length} logs)</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Database status */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-xs">
                        <Database className="w-3 h-3 text-blue-400" />
                        <span>{totalBookings} booking-uri</span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-gray-800 rounded"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleForceResync}
                        disabled={isSyncing}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded flex items-center gap-1"
                        title="Forțează resincronizarea completă (12 luni)"
                    >
                        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? (syncProgress ? `${syncProgress.current}/${syncProgress.total}` : 'Sync...') : 'Full Resync'}
                    </button>
                    <button
                        onClick={() => {
                            const logText = logs.map(log => {
                                const time = log.timestamp.toLocaleTimeString();
                                const dataStr = log.data && (log.data as unknown[]).length > 0
                                    ? '\n' + JSON.stringify(log.data, null, 2)
                                    : '';
                                return `[${time}] ${log.message}${dataStr}`;
                            }).join('\n\n');
                            navigator.clipboard.writeText(logText);
                            alert('Logs copied to clipboard!');
                        }}
                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
                    >
                        Copy All
                    </button>
                    <button
                        onClick={() => {
                            logStore.length = 0;
                            setLogs([]);
                        }}
                        className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1 hover:bg-gray-800 rounded"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Sync progress bar */}
            {isSyncing && syncProgress && (
                <div className="px-3 py-2 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center justify-between text-xs mb-1">
                        <span>Sincronizare: {syncProgress.monthKey}</span>
                        <span>{syncProgress.current}/{syncProgress.total} luni</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto p-3 space-y-2 font-mono text-xs">
                {logs.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">No logs yet. Navigate in the app to see debug info.</div>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className={`p-2 rounded ${
                            log.level === 'error' ? 'bg-red-900/30 border border-red-700' :
                            log.level === 'warn' ? 'bg-yellow-900/30 border border-yellow-700' :
                            'bg-gray-800 border border-gray-700'
                        }`}>
                            <div className="flex items-start gap-2">
                                <span className="text-gray-500 flex-shrink-0">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className={`font-medium ${
                                        log.level === 'error' ? 'text-red-400' :
                                        log.level === 'warn' ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                        {log.message}
                                    </div>
                                    {log.data && (log.data as unknown[]).length > 0 && (
                                        <pre className="mt-1 text-gray-300 overflow-x-auto text-[10px]">
                                            {JSON.stringify(log.data, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
