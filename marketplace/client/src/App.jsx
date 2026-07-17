import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import EditListing from './pages/EditListing';
import Messages from './pages/Messages';
import Dashboard from './pages/Dashboard';
import OrderSuccess from './pages/OrderSuccess';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/listings/new" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/listings/:id/edit" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/orders/success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
          <Route path="*" element={<p className="text-center py-16">Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}
