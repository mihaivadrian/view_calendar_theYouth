import React from "react";
import { LayoutDashboard, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { RoomSelector } from "../Rooms/RoomSelector";
import { useAuth } from "../../hooks/useAuth";
import { ADMIN_EMAILS } from "../../services/roomsConfig";

interface SidebarProps {
    isOpen: boolean;
    closeSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const isAdmin = user && ADMIN_EMAILS.includes(user.email.toLowerCase());

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        { path: "/", label: "Rezervări Săli", icon: LayoutDashboard },
    ];

    // Overlay for mobile
    const overlayClasses = clsx(
        "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    );

    const sidebarClasses = clsx(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 font-sans",
        "flex flex-col transform transition-transform duration-300 md:transform-none md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
    );

    return (
        <>
            <div className={overlayClasses} onClick={closeSidebar} />

            <aside className={sidebarClasses}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-center md:hidden bg-gray-50 dark:bg-gray-900">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Meniu Principal</span>
                </div>

                <nav className="p-4 space-y-1 overflow-y-auto flex-1">
                    <div className="mb-6">
                        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Navigare
                        </p>
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => window.innerWidth < 768 && closeSidebar()}
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1",
                                    isActive(item.path)
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="mb-6">
                        {isAuthenticated && <RoomSelector />}
                    </div>
                </nav>

                {isAdmin && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <Link
                            to="/admin"
                            onClick={() => window.innerWidth < 768 && closeSidebar()}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                isActive("/admin")
                                    ? "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            )}
                        >
                            <Settings className="w-4 h-4" />
                            Administrare
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
};
