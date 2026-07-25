import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ToastContainer } from '@/components/ui/Toast';
import GatePage from '@/pages/GatePage';
import DashboardPage from '@/pages/DashboardPage';
import ReleasesPage from '@/pages/catalog/ReleasesPage';
import ReleaseDetailPage from '@/pages/catalog/ReleaseDetailPage';
import TracksPage from '@/pages/catalog/TracksPage';
import OrdersPage from '@/pages/commerce/OrdersPage';
import BookingsPipelinePage from '@/pages/bookings/BookingsPipelinePage';
import BookingsCalendarPage from '@/pages/bookings/BookingsCalendarPage';
import InquiriesPage from '@/pages/bookings/InquiriesPage';
import BookingDetailPage from '@/pages/bookings/BookingDetailPage';
import ContactsPage from '@/pages/crm/ContactsPage';
import ContactDetailPage from '@/pages/crm/ContactDetailPage';
import CsvImportPage from '@/pages/crm/CsvImportPage';
import CampaignsPage from '@/pages/comms/CampaignsPage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import AutomationPage from '@/pages/AutomationPage';
import ExportsPage from '@/pages/ExportsPage';
import SettingsPage from '@/pages/SettingsPage';
import GalleriesPage from '@/pages/cms/GalleriesPage';
import VideosPage from '@/pages/cms/VideosPage';
import BannersPage from '@/pages/cms/BannersPage';
import TicketEventsPage from '@/pages/tickets/TicketEventsPage';
import TicketSalesPage from '@/pages/tickets/TicketSalesPage';
import FansPage from '@/pages/fans/FansPage';
import PortalApp from '@/portal/PortalApp';
import ProApp from '@/pro/ProApp';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Gate — intent router */}
        <Route path="/" element={<GatePage />} />

        {/* Fan Portal */}
        <Route path="/portal/*" element={<PortalApp />} />

        {/* B2B Portal (Sync / Booking / Writer / B2B Admin) */}
        <Route path="/pro/*" element={<ProApp />} />

        {/* Global Admin */}
        <Route
          path="/admin/*"
          element={
            <AdminLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/catalog/releases" element={<ReleasesPage />} />
                <Route path="/catalog/releases/:id" element={<ReleaseDetailPage />} />
                <Route path="/catalog/tracks" element={<TracksPage />} />
                <Route path="/commerce/orders" element={<OrdersPage />} />
                <Route path="/cms/galleries" element={<GalleriesPage />} />
                <Route path="/cms/videos" element={<VideosPage />} />
                <Route path="/cms/banners" element={<BannersPage />} />
                <Route path="/tickets/events" element={<TicketEventsPage />} />
                <Route path="/tickets/sales" element={<TicketSalesPage />} />
                <Route path="/bookings/pipeline" element={<BookingsPipelinePage />} />
                <Route path="/bookings/calendar" element={<BookingsCalendarPage />} />
                <Route path="/bookings/inquiries" element={<InquiriesPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />
                <Route path="/crm/contacts" element={<ContactsPage />} />
                <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
                <Route path="/crm/import" element={<CsvImportPage />} />
                <Route path="/fans" element={<FansPage />} />
                <Route path="/comms/campaigns" element={<CampaignsPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/automation" element={<AutomationPage />} />
                <Route path="/exports" element={<ExportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </AdminLayout>
          }
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
