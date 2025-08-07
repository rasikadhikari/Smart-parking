import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const BookingConfirmationPage = ({ user }) => {
  const { bookingId: bookingIdFromParams } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const bookingIdFromQuery = queryParams.get('bookingId');
  const bookingId = bookingIdFromParams || bookingIdFromQuery;

  const [booking, setBooking] = useState(null);
  const [parkingSpace, setParkingSpace] = useState(null);
  const [slot, setSlot] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { message: 'Please log in to view your booking confirmation.' } });
      return;
    }

    if (!bookingId) {
      setError('Booking ID is missing.');
      setLoading(false);
      return;
    }

    const fetchBookingDetails = async () => {
      setLoading(true);
      try {
        const bookingResponse = await api.get(`/bookings/${bookingId}`);
        const bookingData = bookingResponse.data;
        setBooking(bookingData);

        if (bookingData.parkingSpaceId) {
          const parkingSpaceResponse = await api.get(`/parking-spaces/${bookingData.parkingSpaceId}`);
          setParkingSpace(parkingSpaceResponse.data);
        }

        const slotResponse = await api.get(`/slots/${bookingData.slotId}`);
        setSlot(slotResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, user, navigate]);

  if (loading) {
    return <div className="text-center mt-12">Loading...</div>;
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg mt-12">
        <h2 className="text-3xl font-bold text-red-600 mb-6 text-center">Error</h2>
        <p className="text-center text-red-600 mb-4">{error || 'Booking not found.'}</p>
        <div className="text-center">
          <Link
            to="/my-bookings"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg mt-12">
      <h2 className="text-3xl font-bold text-blue-600 mb-6 text-center">Booking Confirmation</h2>
      <div className="space-y-4">
        <p className="text-center text-gray-700">
          <span className="font-semibold">Booking ID:</span> {booking._id}
        </p>
        {parkingSpace && (
          <>
            <p className="text-center text-gray-700">
              <span className="font-semibold">Parking Space:</span> {parkingSpace.name}
            </p>
            <p className="text-center text-gray-700">
              <span className="font-semibold">Location:</span> {parkingSpace.location}
            </p>
          </>
        )}
        {slot && (
          <p className="text-center text-gray-700">
            <span className="font-semibold">Slot Number:</span> {slot.slotNumber}
          </p>
        )}
        <p className="text-center text-gray-700">
          <span className="font-semibold">Vehicle Number:</span> {booking.vehicleNumber}
        </p>
        <p className="text-center text-gray-700">
          <span className="font-semibold">Vehicle Type:</span> {booking.vehicleType}
        </p>
        <p className="text-center text-gray-700">
          <span className="font-semibold">Start Time:</span>{' '}
          {new Date(booking.startTime).toLocaleString()}
        </p>
        <p className="text-center text-gray-700">
          <span className="font-semibold">End Time:</span>{' '}
          {new Date(booking.endTime).toLocaleString()}
        </p>
        <p className="text-center text-gray-700">
          <span className="font-semibold">Duration:</span> {booking.duration} minutes
        </p>
        <p className="text-center text-gray-700">
          <span className="font-semibold">Total Amount:</span> NPR {(booking.duration * 10).toFixed(2)}
        </p>
        <p className="text-center text-gray-700">
          <span className="font-semibold">Status:</span> {booking.status || 'Confirmed'}
        </p>
      </div>
      <div className="text-center mt-6">
        <Link
          to="/my-bookings"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          View All Bookings
        </Link>
      </div>
    </div>
  );
};

export default BookingConfirmationPage;