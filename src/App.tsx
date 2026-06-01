import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Policies from '@/pages/Policies';
import PolicyDetail from '@/pages/PolicyDetail';
import Tasks from '@/pages/Tasks';
import Updates from '@/pages/Updates';
import Assessments from '@/pages/Assessments';
import AssessmentDetail from '@/pages/AssessmentDetail';
import Settings from '@/pages/Settings';
import TaskTemplates from '@/pages/TaskTemplates';
import Checklists from '@/pages/Checklists';
import Training from '@/pages/Training';
import Incidents from '@/pages/Incidents';
import Reports from '@/pages/Reports';
import Analytics from '@/pages/Analytics';
import Vendors from '@/pages/Vendors';
import DataManagement from '@/pages/DataManagement';
import DataMapping from '@/pages/DataMapping';
import Profile from '@/pages/Profile';
import Reminders from '@/pages/Reminders';
import PHCompliance from '@/pages/PHCompliance';

function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboard" element={<ProtectedRoute />}>
          <Route index element={<Onboarding />} />
        </Route>

        {/* Protected app routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/policies/:id" element={<PolicyDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/templates" element={<TaskTemplates />} />
            <Route path="/checklists" element={<Checklists />} />
            <Route path="/training" element={<Training />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/data-mapping" element={<DataMapping />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/ph-compliance" element={<PHCompliance />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
