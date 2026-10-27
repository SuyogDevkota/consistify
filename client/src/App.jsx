import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';
import { ToastProvider } from './hooks/useToast';
import LandingPage from './pages/LandingPage';
import JoinPage from './pages/JoinPage';
import DashboardLayout from './layouts/DashboardLayout';
import AppDashboard from './pages/AppDashboard';
import './styles/reference.css';
import './styles/app.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GroupProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/join/:token" element={<JoinPage />} />
              <Route path="/app" element={<DashboardLayout />}>
                <Route index element={<AppDashboard />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </GroupProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
