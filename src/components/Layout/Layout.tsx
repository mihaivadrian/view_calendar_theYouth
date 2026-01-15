import React, { useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Outlet } from "react-router-dom";

export const Layout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("theme") === "dark" ||
                (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    }, [darkMode]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200">
            <Header
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                darkMode={darkMode}
                toggleDarkMode={() => setDarkMode(!darkMode)}
            />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    isOpen={sidebarOpen}
                    closeSidebar={() => setSidebarOpen(false)}
                />

                <main className="flex-1 overflow-auto p-4 md:p-6 w-full relative">
                    <div className="max-w-7xl mx-auto h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
