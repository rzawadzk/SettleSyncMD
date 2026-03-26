import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, useAuthState } from './hooks/useAuth';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import LoginVerify from './pages/LoginVerify';
import Dashboard from './pages/Dashboard';
import CreateCase from './pages/CreateCase';
import CaseDetail from './pages/CaseDetail';
import PartyLanding from './pages/PartyLanding';
import Layout from './components/Layout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('settlesync_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const auth = useAuthState();

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/auth/verify" element={<LoginVerify />} />
        <Route path="/party/:token" element={<PartyLanding />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cases/new" element={<ProtectedRoute><CreateCase /></ProtectedRoute>} />
          <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
