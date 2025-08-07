import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const BookingFailedPage = ({ user }) => {
  const [parkingSpace, setParkingSpace] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const errorMessage = location.state?.error || 'Payment failed. Please try again.';
  const parkingSpaceId = location.state?.parkingSpaceId;

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { message: 'Please log in to continue.' } });
      return;
    }

    if (parkingSpaceId) {
      const fetchParkingSpace = async () => {
        setLoading(true);
        try {
          const response = await api.get(`/parking-spaces/${parkingSpaceId}`);
          setParkingSpace(response.data);
          console.log('Fetched parking space:', response.data);
        } catch (err) {
          console.error('Error fetching parking space:', err.message);
          setError('Error fetching parking space details');
        } finally {
          setLoading(false);
        }
      };
      fetchParkingSpace();
    }
  }, [user, navigate, parkingSpaceId]);

  if (loading) {
    return <div className="text-center mt-12">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg mt-12 text-center">
      <h2 className="text-3xl font-bold text-red-600 mb-6">Booking Failed</h2>
      <div className="text-red-600 mb-4">{error || errorMessage}</div>
      <div className="space-y-4 mb-6">
        <p><strong>Parking Space:</strong> {parkingSpace ? parkingSpace.name : 'Default Parking Lot'}</p>
        <p><strong>Location:</strong> {parkingSpace ? parkingSpace.location : 'N/A'}</p>
      </div>
      <div className="space-y-4">
        <button
          onClick={() =>
            navigate('/book', { state: { parkingSpaceId } })
          }
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Try Again
        </button>
        <Link
          to="/parking-spaces"
          className="inline-block w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700"
        >
          Back to Parking Spaces
        </Link>
      </div>
    </div>
  );
};

export default BookingFailedPage;