import { lazy, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './cart'
import { TICKETS_ENABLED } from './lib/flags'
import { SoundProvider } from './sound'
import Layout from './components/Layout'
import Home from './pages/Home'
// Home ships in the main bundle; everything else loads on first visit.
const About = lazy(() => import('./pages/About'))
const Artists = lazy(() => import('./pages/Artists'))
const ArtistDetail = lazy(() => import('./pages/ArtistDetail'))
const VenueDetail = lazy(() => import('./pages/VenueDetail'))
const ComingSoon = lazy(() => import('./pages/ComingSoon'))
const EventDetail = lazy(() => import('./pages/EventDetail'))
const Bag = lazy(() => import('./pages/Bag'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Order = lazy(() => import('./pages/Order'))
const MyTickets = lazy(() => import('./pages/MyTickets'))
const AdminOrders = lazy(() => import('./pages/AdminOrders'))
const AdminScan = lazy(() => import('./pages/AdminScan'))
const AdminSales = lazy(() => import('./pages/AdminSales'))
const Legal = lazy(() => import('./pages/Legal'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Buying (event pages, bag, checkout) opens in `npm run dev`, or in a build with
// VITE_TICKETS_LIVE=true. Order links, ticket lookup and admin always work, so
// tickets can be issued and scanned before public sales open.
const soon = <ComingSoon label="Tickets" tickets />
const live = (page: ReactNode) => (TICKETS_ENABLED ? page : soon)

export default function App() {
  return (
    <SoundProvider>
      <CartProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Navigate to="/" replace />} />
            <Route path="/events/:id" element={live(<EventDetail />)} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/checkout" element={live(<Checkout />)} />
            <Route path="/order/:token" element={<Order />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/scan" element={<AdminScan />} />
            <Route path="/admin/sales" element={<AdminSales />} />
            <Route path="/venues" element={<Navigate to="/" replace />} />
            <Route path="/venues/:id" element={<VenueDetail />} />
            <Route path="/shop" element={<ComingSoon label="Shop" />} />
            <Route path="/shop/:id" element={<ComingSoon label="Shop" />} />
            <Route path="/about" element={<About />} />
            <Route path="/legal" element={<Navigate to="/legal/terms" replace />} />
            <Route path="/legal/:slug" element={<Legal />} />
            <Route path="/bag" element={TICKETS_ENABLED ? <Bag /> : <ComingSoon label="Bag" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </CartProvider>
    </SoundProvider>
  )
}
