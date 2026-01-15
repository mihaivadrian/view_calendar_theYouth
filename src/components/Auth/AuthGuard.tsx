import React from "react";
import { useAuth } from "../../hooks/useAuth";

interface AuthGuardProps {
    children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isAuthenticated, isLoading, login } = useAuth();

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Se încarcă...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <h1 className="text-2xl font-bold mb-4 dark:text-white">Acces Restricționat</h1>
                <p className="mb-6 text-gray-600 dark:text-gray-300">Trebuie să fii autentificat pentru a accesa această pagină.</p>
                <button
                    onClick={login}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Conectare cu Microsoft
                </button>
            </div>
        );
    }

    return <>{children}</>;
};
