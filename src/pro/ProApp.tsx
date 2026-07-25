import { Routes, Route, Navigate } from 'react-router-dom';
import { ProAuthProvider, useProAuth } from '@/pro/lib/auth';
import { ProPortalShell } from '@/pro/components/ProPortalShell';
import ProSignupPage from '@/pro/pages/ProSignupPage';
import ProLoginPage from '@/pro/pages/ProLoginPage';
import { ProPendingPage, ProSuspendedPage } from '@/pro/pages/ProStatusPages';

// Label/Sync pages
import LabelOverview from '@/pro/pages/label/LabelOverview';
import LabelCatalog from '@/pro/pages/label/LabelCatalog';
import LabelRequests from '@/pro/pages/label/LabelRequests';
import LabelDeals from '@/pro/pages/label/LabelDeals';
import LabelCustomWrite from '@/pro/pages/label/LabelCustomWrite';
import LabelMessages from '@/pro/pages/label/LabelMessages';
import LabelDocuments from '@/pro/pages/label/LabelDocuments';

// Booking pages
import BookingOverview from '@/pro/pages/booking/BookingOverview';
import BookingEPK from '@/pro/pages/booking/BookingEPK';
import BookingCalendar from '@/pro/pages/booking/BookingCalendar';
import BookingRequest from '@/pro/pages/booking/BookingRequest';
import BookingMyBookings from '@/pro/pages/booking/BookingMyBookings';
import BookingMessages from '@/pro/pages/booking/BookingMessages';
import BookingDocuments from '@/pro/pages/booking/BookingDocuments';

// Writer pages
import WriterOverview from '@/pro/pages/writer/WriterOverview';
import WriterCollabCalls from '@/pro/pages/writer/WriterCollabCalls';
import WriterSubmit from '@/pro/pages/writer/WriterSubmit';
import WriterBuy from '@/pro/pages/writer/WriterBuy';
import WriterSubmissions from '@/pro/pages/writer/WriterSubmissions';
import WriterMessages from '@/pro/pages/writer/WriterMessages';

// Admin pages
import AdminDashboard from '@/pro/pages/admin/AdminDashboard';
import AdminUsers from '@/pro/pages/admin/AdminUsers';
import AdminRequests from '@/pro/pages/admin/AdminRequests';
import AdminCatalog from '@/pro/pages/admin/AdminCatalog';
import AdminSpend from '@/pro/pages/admin/AdminSpend';

function RoleRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const { portalUser, loading } = useProAuth();
  if (loading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" /></div>;
  if (!portalUser) return <Navigate to="/pro/login" />;
  if (portalUser.role !== role && !portalUser.secondary_roles.includes(role)) {
    return <Navigate to={`/pro/dashboard/${portalUser.role}`} />;
  }
  return <ProPortalShell role={role}>{children}</ProPortalShell>;
}

export default function ProApp() {
  return (
    <ProAuthProvider>
      <Routes>
        <Route path="/signup" element={<ProSignupPage />} />
        <Route path="/login" element={<ProLoginPage />} />
        <Route path="/pending" element={<ProPendingPage />} />
        <Route path="/suspended" element={<ProSuspendedPage />} />

        {/* Label / Sync */}
        <Route path="/dashboard/label" element={<RoleRoute role="label"><LabelOverview /></RoleRoute>} />
        <Route path="/dashboard/label/catalog" element={<RoleRoute role="label"><LabelCatalog /></RoleRoute>} />
        <Route path="/dashboard/label/requests" element={<RoleRoute role="label"><LabelRequests /></RoleRoute>} />
        <Route path="/dashboard/label/deals" element={<RoleRoute role="label"><LabelDeals /></RoleRoute>} />
        <Route path="/dashboard/label/custom" element={<RoleRoute role="label"><LabelCustomWrite /></RoleRoute>} />
        <Route path="/dashboard/label/messages" element={<RoleRoute role="label"><LabelMessages /></RoleRoute>} />
        <Route path="/dashboard/label/documents" element={<RoleRoute role="label"><LabelDocuments /></RoleRoute>} />

        {/* Booking */}
        <Route path="/dashboard/booking" element={<RoleRoute role="booking"><BookingOverview /></RoleRoute>} />
        <Route path="/dashboard/booking/epk" element={<RoleRoute role="booking"><BookingEPK /></RoleRoute>} />
        <Route path="/dashboard/booking/calendar" element={<RoleRoute role="booking"><BookingCalendar /></RoleRoute>} />
        <Route path="/dashboard/booking/request" element={<RoleRoute role="booking"><BookingRequest /></RoleRoute>} />
        <Route path="/dashboard/booking/my-bookings" element={<RoleRoute role="booking"><BookingMyBookings /></RoleRoute>} />
        <Route path="/dashboard/booking/messages" element={<RoleRoute role="booking"><BookingMessages /></RoleRoute>} />
        <Route path="/dashboard/booking/documents" element={<RoleRoute role="booking"><BookingDocuments /></RoleRoute>} />

        {/* Writer */}
        <Route path="/dashboard/writer" element={<RoleRoute role="writer"><WriterOverview /></RoleRoute>} />
        <Route path="/dashboard/writer/collab-calls" element={<RoleRoute role="writer"><WriterCollabCalls /></RoleRoute>} />
        <Route path="/dashboard/writer/submit" element={<RoleRoute role="writer"><WriterSubmit /></RoleRoute>} />
        <Route path="/dashboard/writer/buy" element={<RoleRoute role="writer"><WriterBuy /></RoleRoute>} />
        <Route path="/dashboard/writer/submissions" element={<RoleRoute role="writer"><WriterSubmissions /></RoleRoute>} />
        <Route path="/dashboard/writer/messages" element={<RoleRoute role="writer"><WriterMessages /></RoleRoute>} />

        {/* Admin */}
        <Route path="/dashboard/admin" element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>} />
        <Route path="/dashboard/admin/users" element={<RoleRoute role="admin"><AdminUsers /></RoleRoute>} />
        <Route path="/dashboard/admin/requests" element={<RoleRoute role="admin"><AdminRequests /></RoleRoute>} />
        <Route path="/dashboard/admin/catalog" element={<RoleRoute role="admin"><AdminCatalog /></RoleRoute>} />
        <Route path="/dashboard/admin/spend" element={<RoleRoute role="admin"><AdminSpend /></RoleRoute>} />

        <Route path="*" element={<Navigate to="/pro/login" />} />
      </Routes>
    </ProAuthProvider>
  );
}
