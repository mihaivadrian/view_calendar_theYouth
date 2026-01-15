import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { User, LogOut, Moon, Sun, Menu } from "lucide-react";

interface HeaderProps {
    toggleSidebar: () => void;
    darkMode: boolean;
    toggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, darkMode, toggleDarkMode }) => {
    const { user, logout, isAuthenticated } = useAuth();

    return (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg md:hidden"
                >
                    <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    The Youth Calendar
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={toggleDarkMode}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="Toggle dark mode"
                >
                    {darkMode ? (
                        <Sun className="w-5 h-5 text-yellow-500" />
                    ) : (
                        <Moon className="w-5 h-5 text-gray-600" />
                    )}
                </button>

                {isAuthenticated && user && (
                    <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">
                                {user.displayName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {user.email}
                            </p>
                        </div>
                        <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm">
                            {user.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <button
                            onClick={logout}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-red-500 transition-colors"
                            title="Deconectare"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
