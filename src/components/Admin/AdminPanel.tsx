import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useRooms } from "../../hooks/useRooms";
import { ADMIN_EMAILS } from "../../services/roomsConfig";
import { settingsService } from "../../services/settingsService";
import { getBookingBusinesses, getBookingAppointments } from "../../services/graphService";
import { Eye, EyeOff, ShieldAlert, Save, CheckCircle, Bug } from "lucide-react";
import clsx from "clsx";
import type { RoomId } from "../../types/room";

export const AdminPanel: React.FC = () => {
    const { user, isAuthenticated, getAccessToken } = useAuth();
    const { hiddenRoomIds, refreshHiddenRooms, rooms, isLoadingRooms } = useRooms();
    const [localHidden, setLocalHidden] = useState<RoomId[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [debugData, setDebugData] = useState<string>("");
    const [loadingDebug, setLoadingDebug] = useState(false);

    useEffect(() => {
        setLocalHidden(hiddenRoomIds);
    }, [hiddenRoomIds]);

    const testBookingsAPI = async () => {
        setLoadingDebug(true);
        setDebugData("Se încarcă...");
        try {
            const token = await getAccessToken();
            if (!token) {
                setDebugData("Eroare: Nu s-a putut obține token-ul de acces");
                return;
            }

            // Step 1: Get booking businesses
            const businesses = await getBookingBusinesses(token);
            let result = `=== BOOKING BUSINESSES ===\n${JSON.stringify(businesses, null, 2)}\n\n`;

            // Step 2: For each business, get appointments
            if (businesses.length > 0) {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                for (const business of businesses) {
                    result += `=== APPOINTMENTS FOR: ${business.displayName} ===\n`;
                    const appointments = await getBookingAppointments(
                        token,
                        business.id,
                        startOfMonth.toISOString(),
                        endOfMonth.toISOString()
                    );
                    result += JSON.stringify(appointments, null, 2) + "\n\n";
                }
            } else {
                result += "Nu s-au găsit booking businesses.\n";
                result += "Posibile cauze:\n";
                result += "1. Nu există pagini de Bookings create\n";
                result += "2. Lipsește permisiunea Bookings.Read.All în Azure AD\n";
            }

            setDebugData(result);
        } catch (error: any) {
            setDebugData(`Eroare: ${error.message}\n\nStack: ${error.stack}`);
        } finally {
            setLoadingDebug(false);
        }
    };

    if (!isAuthenticated || !user || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Acces Interzis</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    Nu ai permisiuni de administrator pentru a accesa această pagină.
                </p>
                <div className="mt-6 text-xs text-gray-400">
                    Cont curent: {user?.email}
                </div>
            </div>
        );
    }

    const toggleLocalVisibility = (roomId: RoomId) => {
        setLocalHidden(prev => {
            if (prev.includes(roomId)) {
                return prev.filter(id => id !== roomId);
            } else {
                return [...prev, roomId];
            }
        });
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const success = await settingsService.saveGlobalSettings(localHidden, user.email);
        if (success) {
            refreshHiddenRooms();
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } else {
            alert("Eroare la salvare. Încearcă din nou.");
        }
        setSaving(false);
    };

    const visibleCount = rooms.length - localHidden.length;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Administrare Săli</h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Alege ce săli vor fi vizibile pentru toți utilizatorii.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Vizibilitate Săli
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {visibleCount} din {rooms.length} săli vizibile
                            {isLoadingRooms && " (Se încarcă...)"}
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                            saved
                                ? "bg-green-600 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white",
                            saving && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {saved ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Salvat!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {saving ? "Se salvează..." : "Salvează"}
                            </>
                        )}
                    </button>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {rooms.map((room) => {
                        const isHidden = localHidden.includes(room.id);
                        return (
                            <div
                                key={room.id}
                                className={clsx(
                                    "p-4 flex items-center justify-between transition-colors",
                                    isHidden
                                        ? "bg-gray-50 dark:bg-gray-900/50"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-750"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={clsx(
                                            "w-10 h-10 rounded-lg flex items-center justify-center font-bold shadow-sm transition-opacity",
                                            isHidden ? "opacity-40" : ""
                                        )}
                                        style={{ backgroundColor: room.color, color: "white" }}
                                    >
                                        {room.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className={clsx(
                                            "font-medium",
                                            isHidden
                                                ? "text-gray-400 dark:text-gray-500"
                                                : "text-gray-900 dark:text-white"
                                        )}>
                                            {room.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {room.email}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleLocalVisibility(room.id)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
                                        isHidden
                                            ? "bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
                                            : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                    )}
                                >
                                    {isHidden ? (
                                        <>
                                            <EyeOff className="w-4 h-4" />
                                            Ascuns
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-4 h-4" />
                                            Vizibil
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Notă:</strong> Setările de vizibilitate se aplică pentru toți utilizatorii care folosesc acest dispozitiv/browser.
                </p>
            </div>

            {/* Debug: Test Bookings API */}
            <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bug className="w-5 h-5" />
                        Debug: Microsoft Bookings API
                    </h3>
                    <button
                        onClick={testBookingsAPI}
                        disabled={loadingDebug}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                        {loadingDebug ? "Se încarcă..." : "Test Bookings API"}
                    </button>
                </div>
                {debugData && (
                    <pre className="p-4 bg-gray-800 text-green-400 rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                        {debugData}
                    </pre>
                )}
                <p className="mt-2 text-xs text-gray-500">
                    Acest test verifică dacă aplicația are acces la Microsoft Bookings API pentru a extrage informațiile custom din rezervări.
                </p>
            </div>
        </div>
    );
};
