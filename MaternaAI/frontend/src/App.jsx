import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Chat from './pages/Chat';
import HealthTracker from './pages/HealthTracker';
import PPD from './pages/PPD';
import Community from './pages/Community';
import Nutrition from './pages/Nutrition';
import BirthPlan from './pages/BirthPlan';
import Clinician from './pages/Clinician';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-rose-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-12 h-12 animate-spin text-primary-mauve" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
          </svg>
          <span className="font-sans font-bold text-sm text-text-muted animate-pulse">Initializing MaternaAI...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Layout Sub-pages */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Home />} />
        <Route path="chat" element={<Chat />} />
        <Route path="health" element={<HealthTracker />} />
        <Route path="ppd" element={<PPD />} />
        <Route path="community" element={<Community />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="birth-plan" element={<BirthPlan />} />
        <Route path="clinician" element={<Clinician />} />
      </Route>

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
