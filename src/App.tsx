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
import ObligationsRegister from '@/pages/ObligationsRegister';
import BreachWorkflows from '@/pages/BreachWorkflows';
import DSRCases from '@/pages/DSRCases';
import ROPA from '@/pages/ROPA';
import CrossBorderTransfers from '@/pages/CrossBorderTransfers';
import EvidenceVault from '@/pages/EvidenceVault';
import AuditTrail from '@/pages/AuditTrail';
import Submissions from '@/pages/Submissions';

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
            {/* Governance */}
            <Route path="/policies" element={<Policies />} />
            <Route path="/policies/:id" element={<PolicyDetail />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/obligations" element={<ObligationsRegister />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/checklists" element={<Checklists />} />
            <Route path="/templates" element={<TaskTemplates />} />
            {/* Operations */}
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/breach-workflows" element={<BreachWorkflows />} />
            <Route path="/dsr-cases" element={<DSRCases />} />
            {/* Data Privacy */}
            <Route path="/data-management" element={<DataManagement />} />
            <Route path="/data-mapping" element={<DataMapping />} />
            <Route path="/ropa" element={<ROPA />} />
            <Route path="/transfers" element={<CrossBorderTransfers />} />
            {/* Regulatory */}
            <Route path="/updates" element={<Updates />} />
            <Route path="/submissions" element={<Submissions />} />
            {/* Reporting */}
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/evidence" element={<EvidenceVault />} />
            <Route path="/audit-trail" element={<AuditTrail />} />
            {/* Admin */}
            <Route path="/training" element={<Training />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            {/* Backward compat: redirect old monolith route */}
            <Route path="/ph-compliance" element={<Navigate to="/obligations" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
