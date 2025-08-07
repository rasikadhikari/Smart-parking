import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

export const useAuth = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [slots, setSlots] = useState({});
  const [bookings, setBookings] = useState({});
  const [bookedSlotIds, setBookedSlotIds] = useState(new Set());
  const [selectedParkingSpaceId, setSelectedParkingSpaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token ? token.slice(0, 20) + '...' : 'None');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // 🔹 1. Fetch user
        const response = await api.get('/auth/me');
        const userData = {
          ...response.data,
          role: response.data.role || localStorage.getItem('role') || 'user',
        };
        setUser(userData);
        localStorage.setItem('role', userData.role);

        // 🔹 2. Fetch parking spaces based on role
        let parkingResponse;
        if (userData.role === 'admin' || userData.role === 'superadmin') {
          parkingResponse = await api.get(
            userData.role === 'admin'
              ? `/parking-spaces/assigned/${userData._id}`
              : '/parking-spaces/formatted/all'
          );
        } else {
          parkingResponse = await api.get('/parking-spaces/formatted/all');
        }

        setParkingSpaces(parkingResponse.data);
        if (parkingResponse.data.length > 0 && !selectedParkingSpaceId) {
          const defaultId = parkingResponse.data[0]._id;
          setSelectedParkingSpaceId(defaultId);
        }

        // 🔹 3. Fetch slots
        let allSlots = [];
        for (const space of parkingResponse.data) {
          try {
            const res = await api.get(`/slots?parkingSpaceId=${space._id}`);
            allSlots = allSlots.concat(res.data);
          } catch (slotErr) {
            console.warn(`Failed to load slots for space ${space._id}:`, slotErr.message);
          }
        }

        const slotsBySpace = allSlots.reduce((acc, slot) => {
          const spaceId = slot.parkingSpaceId || 'null';
          acc[spaceId] = acc[spaceId] || [];
          acc[spaceId].push(slot);
          return acc;
        }, {});
        setSlots(slotsBySpace);

        // 🔹 4. Fetch active bookings (from all users)
        let allActiveBookings = [];
        for (const space of parkingResponse.data) {
          try {
            const activeResponse = await api.get(`/bookings/active?parkingSpaceId=${space._id}`);
            allActiveBookings = allActiveBookings.concat(activeResponse.data);
          } catch (err) {
            console.warn(`Failed to load active bookings for space ${space._id}:`, err.message);
          }
        }

        const bookedSlotIdSet = new Set(
          allActiveBookings.map((booking) => booking.slotId?.toString())
        );
        setBookedSlotIds(bookedSlotIdSet);

        // 🔹 5. Fetch current user's own bookings
        const myBookingsResponse = await api.get('/bookings/my-bookings');
        const bookingsBySpace = myBookingsResponse.data.reduce((acc, booking) => {
          const spaceId = booking.parkingSpaceId || 'null';
          acc[spaceId] = acc[spaceId] || [];
          acc[spaceId].push(booking);
          return acc;
        }, {});
        setBookings(bookingsBySpace);
      } catch (err) {
        console.error('Auth data fetch error:', err.message);
        setError(err.response?.data?.message || 'Failed to load authentication data');
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('refreshToken');
          setUser(null);
          navigate('/login', { state: { message: 'Session expired. Please log in again.' } });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (selectedParkingSpaceId) {
      console.log("✅ Selected Parking Space ID is now:", selectedParkingSpaceId);
    }
  }, [selectedParkingSpaceId]);

  useEffect(() => {
    if (loading) return;

    const publicRoutes = ['/', '/login', '/register', '/parking-spaces'];
    const protectedRoutesRequiringSpace = ['/slots', '/book'];

    if (!user && !publicRoutes.includes(location.pathname)) {
      navigate('/login', { state: { message: 'Please log in to continue.' } });
    } else if (
      user &&
      protectedRoutesRequiringSpace.includes(location.pathname) &&
      !selectedParkingSpaceId &&
      !slots[selectedParkingSpaceId || 'null']?.length
    ) {
      navigate('/parking-spaces', {
        state: { message: 'Please select a parking space first.' },
      });
    }
  }, [loading, user, location.pathname, selectedParkingSpaceId, slots, navigate]);

  const getSlotsForSelectedSpace = () => {
    return selectedParkingSpaceId ? slots[selectedParkingSpaceId] || [] : [];
  };

  return {
    user,
    setUser,
    parkingSpaces,
    slots,
    setSlots,
    bookings,
    setBookings,
    bookedSlotIds, // <- 🔥 use this in UI to determine global slot booking
    selectedParkingSpaceId,
    setSelectedParkingSpaceId,
    loading,
    error,
    getSlotsForSelectedSpace,
  };
};

export default useAuth;
