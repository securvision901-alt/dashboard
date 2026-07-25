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
import TicketEventsPage from '@/pages/tickets/TicketEventsPage';
import TicketSalesPage from '@/pages/tickets/TicketSalesPage';
import FansPage from '@/pages/fans/FansPage';
import ShopProductsPage from '@/pages/shop/ShopProductsPage';
import TourDatesPage from '@/pages/events/TourDatesPage';
import CmsPage from '@/pages/content/CmsPage';
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

                {/* Music */}
                <Route path="music/albums" element={<ReleasesPage />} />
                <Route path="music/albums/:id" element={<ReleaseDetailPage />} />
                <Route path="music/tracks" element={<TracksPage />} />
                <Route path="music/distribution" element={<div className="p-8 text-center text-neutral-400">Distribution settings coming soon</div>} />

                {/* Shop */}
                <Route path="shop/products" element={<ShopProductsPage />} />
                <Route path="shop/orders" element={<OrdersPage />} />

                {/* Events */}
                <Route path="events/tickets" element={<TicketEventsPage />} />
                <Route path="events/ticket-sales" element={<TicketSalesPage />} />
                <Route path="events/tours" element={<TourDatesPage />} />

                {/* Bookings */}
                <Route path="bookings/pipeline" element={<BookingsPipelinePage />} />
                <Route path="bookings/calendar" element={<BookingsCalendarPage />} />
                <Route path="bookings/inquiries" element={<InquiriesPage />} />
                <Route path="bookings/:id" element={<BookingDetailPage />} />

                {/* Audience */}
                <Route path="audience/contacts" element={<ContactsPage />} />
                <Route path="audience/contacts/:id" element={<ContactDetailPage />} />
                <Route path="audience/import" element={<CsvImportPage />} />
                <Route path="audience/fans" element={<FansPage />} />
                <Route path="audience/campaigns" element={<CampaignsPage />} />

                {/* Content */}
                <Route path="content" element={<CmsPage />} />

                {/* System */}
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="automation" element={<AutomationPage />} />
                <Route path="exports" element={<ExportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Routes>
            </AdminLayout>
          }
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}
