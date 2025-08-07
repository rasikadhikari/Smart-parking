import { useNavigate, useLocation } from 'react-router-dom';
import './styles/App.css';
import AppRoutes from './routes/AppRoutes';
import { useAuth } from './hooks/useAuth';
import { useSocketListeners } from './hooks/useSocketListeners';
import Layout from './components/Layout';

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Custom auth hook handles user, parkingSpaces, slots, etc.
  const {
    user,
    setUser,
    parkingSpaces,
    setParkingSpaces,
    slots,
    setSlots,
    bookings,
    setBookings,
    selectedParkingSpaceId,
    setSelectedParkingSpaceId,
    loading,
  } = useAuth();

  // Custom hook for Socket.IO event listeners
  useSocketListeners({ setSlots, setBookings, setParkingSpaces });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('refreshToken');
    setUser(null);
    setSelectedParkingSpaceId(null);
    navigate('/login');
  };

  // Avoid rendering the app until auth loading is complete
  if (loading) return <div className="loading-screen">Loading...</div>;

  // Exclude layout for these paths
  const excludedPaths = ['/login', '/register'];
  const isLayoutExcluded = excludedPaths.includes(location.pathname);

  const appContent = (
    <AppRoutes
      user={user}
      setUser={setUser}
      parkingSpaces={parkingSpaces}
      slots={slots}
      bookings={bookings}
      selectedParkingSpaceId={selectedParkingSpaceId}
      setSelectedParkingSpaceId={setSelectedParkingSpaceId}
      loading={loading}
      handleLogout={handleLogout}
    />
  );

  return isLayoutExcluded ? appContent : (
    <Layout user={user} handleLogout={handleLogout}>
      {appContent}
    </Layout>
  );
};

export default App;
