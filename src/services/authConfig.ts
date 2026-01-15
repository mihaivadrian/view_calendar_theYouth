import { type Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: import.meta.env.VITE_REDIRECT_URI,
        postLogoutRedirectUri: import.meta.env.VITE_REDIRECT_URI,
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        break;
                    case LogLevel.Warning:
                        console.warn(message);
                        break;
                }
            },
        },
    },
};

export const loginRequest = {
    scopes: ["User.Read", "Calendars.Read", "Calendars.Read.Shared", "Place.Read.All", "Bookings.Read.All"],
};

export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphCalendarEndpoint: "https://graph.microsoft.com/v1.0/users/{email}/calendar/calendarView",
};
