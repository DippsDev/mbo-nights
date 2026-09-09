import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './cart'
import { SoundProvider } from './sound'
import Layout from './components/Layout'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import Artists from './pages/Artists'
import ArtistDetail from './pages/ArtistDetail'
import VenueDetail from './pages/VenueDetail'
import Shop from './pages/Shop'
import Product from './pages/Product'
import About from './pages/About'
import Bag from './pages/Bag'
import { nextOpenNight } from './data'

function EventsIndex() {
  const next = nextOpenNight()
  return <Navigate to={next ? `/events/${next.id}` : '/'} replace />
}

export default function App() {
  return (
    <SoundProvider>
      <CartProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventsIndex />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/tickets" element={<EventsIndex />} />
            <Route path="/venues" element={<Navigate to="/" replace />} />
            <Route path="/venues/:id" element={<VenueDetail />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:id" element={<Product />} />
            <Route path="/about" element={<About />} />
            <Route path="/bag" element={<Bag />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </CartProvider>
    </SoundProvider>
  )
}
