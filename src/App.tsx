import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CartProvider } from './cart'
import { SoundProvider } from './sound'
import Layout from './components/Layout'
import Home from './pages/Home'
import VenueDetail from './pages/VenueDetail'
import ComingSoon from './pages/ComingSoon'

export default function App() {
  return (
    <SoundProvider>
      <CartProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<ComingSoon label="Tickets" tickets />} />
            <Route path="/events/:id" element={<ComingSoon label="Tickets" tickets />} />
            <Route path="/artists" element={<ComingSoon label="Artists" />} />
            <Route path="/artists/:id" element={<ComingSoon label="Artists" />} />
            <Route path="/tickets" element={<ComingSoon label="Tickets" tickets />} />
            <Route path="/venues" element={<Navigate to="/" replace />} />
            <Route path="/venues/:id" element={<VenueDetail />} />
            <Route path="/shop" element={<ComingSoon label="Shop" />} />
            <Route path="/shop/:id" element={<ComingSoon label="Shop" />} />
            <Route path="/about" element={<ComingSoon label="About" />} />
            <Route path="/bag" element={<ComingSoon label="Bag" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </BrowserRouter>
      </CartProvider>
    </SoundProvider>
  )
}
