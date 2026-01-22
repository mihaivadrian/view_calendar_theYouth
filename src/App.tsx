import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { ListView } from "./components/Calendar/ListView";
import { AdminPanel } from "./components/Admin/AdminPanel";
import { AuthGuard } from "./components/Auth/AuthGuard";
import { AuthProvider } from "./context/AuthContext";
import { RoomsProvider } from "./context/RoomsContext";
import { BookingProvider } from "./context/BookingContext";
import { DebugPanel } from "./components/Debug/DebugPanel";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoomsProvider>
          <BookingProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={
                <AuthGuard>
                  <ListView />
                </AuthGuard>
              } />
              <Route path="admin" element={
                <AuthGuard>
                  <AdminPanel />
                </AuthGuard>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <DebugPanel />
          </BookingProvider>
        </RoomsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
