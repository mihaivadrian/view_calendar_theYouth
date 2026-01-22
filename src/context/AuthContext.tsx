import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { loginRequest } from "../services/authConfig";
import type { User } from "../types/user";
import { Client } from "@microsoft/microsoft-graph-client";

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: () => void;
    logout: () => void;
    getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { instance, accounts, inProgress } = useMsal();
    const isAuthenticated = useIsAuthenticated();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const getAccessToken = async (): Promise<string | null> => {
        if (!accounts[0]) return null;

        try {
            const response = await instance.acquireTokenSilent({
                ...loginRequest,
                account: accounts[0],
            });
            return response.accessToken;
        } catch (err) {
            if (err instanceof InteractionRequiredAuthError) {
                try {
                    const response = await instance.acquireTokenPopup(loginRequest);
                    return response.accessToken;
                } catch (popupErr) {
                    console.error("Popup auth failed", popupErr);
                    setError("Popup auth failed");
                    return null;
                }
            } else {
                console.error("Token acquisition failed", err);
                setError("Token acquisition failed");
                return null;
            }
        }
    };

    const login = () => {
        instance.loginRedirect(loginRequest).catch((e) => {
            console.error(e);
            setError(e.message);
        });
    };

    const logout = () => {
        instance.logoutRedirect({
            postLogoutRedirectUri: "/",
        });
    };

    useEffect(() => {
        if (isAuthenticated && accounts[0]) {
            // Fetch user profile from Graph
            const fetchProfile = async () => {
                setIsLoading(true);
                try {
                    const token = await getAccessToken();
                    if (token) {
                        const client = Client.init({
                            authProvider: (done) => {
                                done(null, token);
                            }
                        });
                        const graphUser = await client.api("/me").get();
                        // Optional: Get photo
                        // const photo = await client.api("/me/photo/$value").get();
                        setUser({
                            displayName: graphUser.displayName,
                            email: graphUser.mail || graphUser.userPrincipalName,
                            id: graphUser.id,
                            jobTitle: graphUser.jobTitle,
                            mobilePhone: graphUser.mobilePhone,
                            officeLocation: graphUser.officeLocation,
                        });
                    }
                } catch (err) {
                    console.error("Profile fetch failed", err);
                    const errorMessage = err instanceof Error ? err.message : "Failed to fetch profile";
                    setError(errorMessage);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProfile();
        } else {
            setUser(null);
        }
    }, [isAuthenticated, accounts]);

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            isLoading: inProgress !== "none" || isLoading,
            error,
            login,
            logout,
            getAccessToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
