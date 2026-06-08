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
import Landing from './pages/Landing';
import Logo from './components/assets/Logo.png';
import ClinicianAssistant from './pages/ClinicianAssistant';
import Profile from './pages/Profile';
import SavedBirthPlans from './pages/SavedBirthPlans';
import Features from './pages/Features';
import PagesOverview from './pages/PagesOverview';
import Blogs from './pages/Blogs';
import Contact from './pages/Contact';
import LearnMore from './pages/LearnMore';
import DiscoverMore from './pages/DiscoverMore';
import BengaliSupport from './pages/BengaliSupport';
import SmsService from './pages/SmsService';
import AdminDashboard from './pages/AdminDashboard';
import ClinicianVerificationPending from './pages/ClinicianVerificationPending';

const PrivateRoute = ({ children }) => {
  const constAuth = useAuth();
  const { isAuthenticated, loading } = constAuth;

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

const ClinicianRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-rose-white">
        <div className="flex flex-col items-center gap-3">
          <img  className="block -mr-2" src={Logo}  style={{width:"50px", height:"40px",paddingRight:"0px",margin:"-12px"}}/>
          <span className="font-sans font-bold text-sm text-text-muted animate-pulse">Verifying Clinician Status...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  if (user?.role !== 'clinician' && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (user?.role === 'clinician' && user?.status !== 'approved') {
    return <Navigate to="/clinician/verification-pending" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-rose-white">
        <div className="flex flex-col items-center gap-3">
          <img  className="block -mr-2" src={Logo}  style={{width:"50px", height:"40px",paddingRight:"0px",margin:"-12px"}}/>
          <span className="font-sans font-bold text-sm text-text-muted animate-pulse">Verifying Admin Access...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/landing" element={<Landing/>}/>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pages" element={<PagesOverview />} />
      <Route path="/blogs" element={<Blogs />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/learn-more" element={<LearnMore />} />
      <Route path="/discover-more" element={<DiscoverMore />} />
      <Route path="/bengali-support" element={<BengaliSupport />} />
      <Route path="/sms-service" element={<SmsService />} />

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
        <Route path="saved-birthplan" element={<SavedBirthPlans />} />
        <Route path="profile" element={<Profile />} />
        <Route path="clinician/verification-pending" element={<ClinicianVerificationPending />} />
        <Route path="clinician" element={
          <ClinicianRoute>
            <ClinicianDashboard />
          </ClinicianRoute>
        } />
        <Route path="clinician/assistant" element={
          <ClinicianRoute>
            <ClinicianAssistant />
          </ClinicianRoute>
        } />
        <Route path="clinician/vitals" element={
          <ClinicianRoute>
            <ClinicianVitals />
          </ClinicianRoute>
        } />
        <Route path="clinician/ppd" element={
          <ClinicianRoute>
            <ClinicianPPD />
          </ClinicianRoute>
        } />
        <Route path="clinician/community" element={
          <ClinicianRoute>
            <ClinicianCommunity />
          </ClinicianRoute>
        } />
        <Route path="clinician/sos" element={
          <ClinicianRoute>
            <ClinicianSOS />
          </ClinicianRoute>
        } />
        <Route path="clinician/follow-ups" element={
          <ClinicianRoute>
            <ClinicianFollowUps />
          </ClinicianRoute>
        } />
        <Route path="clinician/profile" element={
          <ClinicianRoute>
            <ClinicianProfile />
          </ClinicianRoute>
        } />
        <Route path="admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />
      </Route>

      {/* Catch-all Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
