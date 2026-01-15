import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout/Layout";
import { ListView } from "./components/Calendar/ListView";
import { AdminPanel } from "./components/Admin/AdminPanel";
import { AuthGuard } from "./components/Auth/AuthGuard";
import { AuthProvider } from "./context/AuthContext";
import { RoomsProvider } from "./context/RoomsContext";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoomsProvider>
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
        </RoomsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
