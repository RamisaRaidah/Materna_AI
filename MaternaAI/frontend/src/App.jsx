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
import ClinicianChat from './pages/ClinicianChat';
import Nutrition from './pages/Nutrition';
import BirthPlan from './pages/BirthPlan';
import ClinicianDashboard from './pages/ClinicianDashboard';
import ClinicianVitals from './pages/ClinicianVitals';
import ClinicianPPD from './pages/ClinicianPPD';
import ClinicianCommunity from './pages/ClinicianCommunity';
import ClinicianSOS from './pages/ClinicianSOS';
import ClinicianFollowUps from './pages/ClinicianFollowUps';
import ClinicianProfile from './pages/ClinicianProfile';
import Landing from './pages/Landing'
import Logo from './components/assets/Logo.png'
import ClinicianAssistant from './pages/ClinicianAssistant';
import Profile from './pages/Profile';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-rose-white">
        <div className="flex flex-col items-center gap-3">
          <img  className="block -mr-2" src={Logo}  style={{width:"50px", height:"40px",paddingRight:"0px",margin:"-12px"}}/>
          <span className="font-sans font-bold text-sm text-text-muted animate-pulse">Initializing MaternaAI...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/landing" replace />;
};

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/landing" element={<Landing/>}/>
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
        <Route path="clinician-chat" element={<ClinicianChat />} />
        <Route path="nutrition" element={<Nutrition />} />
        <Route path="birth-plan" element={<BirthPlan />} />
        <Route path="profile" element={<Profile />} />
        <Route path="clinician" element={<ClinicianDashboard />} />
        <Route path="clinician/assistant" element={<ClinicianAssistant />} />
        <Route path="clinician/vitals" element={<ClinicianVitals />} />
        <Route path="clinician/ppd" element={<ClinicianPPD />} />
        <Route path="clinician/community" element={<ClinicianCommunity />} />
        <Route path="clinician/sos" element={<ClinicianSOS />} />
        <Route path="clinician/follow-ups" element={<ClinicianFollowUps />} />
        <Route path="clinician/profile" element={<ClinicianProfile />} />
      </Route>

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
