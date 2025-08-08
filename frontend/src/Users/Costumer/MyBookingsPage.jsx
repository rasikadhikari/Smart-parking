import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import api from "../../services/api";
import io from "socket.io-client";

const socket = io("http://localhost:5002", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
});

const MyBookingsPage = ({ user, bookings: initialBookings }) => {
  const [bookings, setBookings] = useState(initialBookings || []);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.role) {
      console.log("No user or invalid user, redirecting to login");
      navigate("/login", {
        state: { message: "Please log in to view your bookings." },
      });
      return;
    }

    const fetchParkingSpaces = async () => {
      try {
        const response = await api.get("/parking-spaces");
        const transformedSpaces = response.data.map((space) => ({
          ...space,
          latitude:
            space.location?.type === "Point" &&
            Array.isArray(space.location.coordinates)
              ? space.location.coordinates[1]
              : null,
          longitude:
            space.location?.type === "Point" &&
            Array.isArray(space.location.coordinates)
              ? space.location.coordinates[0]
              : null,
        }));
        setParkingSpaces(transformedSpaces);
        console.log("Fetched parking spaces:", transformedSpaces);
      } catch (err) {
        console.error("Error fetching parking spaces:", err.message);
        setError(
          err.response?.data?.message || "Error fetching parking spaces"
        );
      }
    };

    const fetchBookings = async () => {
      try {
        const response = await api.get("/bookings/my-bookings");
        if (!Array.isArray(response.data)) {
          throw new Error("Invalid response format");
        }
        setBookings(response.data);
        console.log("Fetched user bookings:", response.data);
      } catch (err) {
        console.error("Error fetching bookings:", {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
        });
        setError(
          err.response?.status === 401
            ? "Session expired. Please log in again."
            : err.response?.data?.message || "Error fetching bookings"
        );
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          navigate("/login", {
            state: { message: "Session expired. Please log in again." },
          });
        }
      }
    };

    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchParkingSpaces(), fetchBookings()]);
      setLoading(false);
    };
    fetchData();

    socket.on("bookingsUpdate", (data) => {
      console.log("Received bookings update:", data);
      if (data && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      } else {
        fetchBookings();
      }
    });

    return () => {
      socket.off("bookingsUpdate");
    };
  }, [user, navigate, initialBookings]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?"))
      return;

    try {
      await api.post(`/bookings/cancel/${bookingId}`);
      // Update bookings state to reflect the cancelled status
      setBookings((prevBookings) =>
        prevBookings.map((booking) =>
          booking._id === bookingId
            ? { ...booking, paymentStatus: "cancelled" }
            : booking
        )
      );
      console.log(`Booking ${bookingId} cancelled successfully`);
    } catch (err) {
      console.error("Error cancelling booking:", err.message);
      setError(err.response?.data?.message || "Error cancelling booking");
    }
  };

  const statusColors = {
    success: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const getParkingSpace = (parkingSpaceId) => {
    if (!parkingSpaceId)
      return { name: "Default Parking Lot", latitude: null, longitude: null };
    const space = parkingSpaces.find(
      (space) => space._id.toString() === parkingSpaceId.toString()
    );
    return space || { name: "Unknown", latitude: null, longitude: null };
  };

  const getLocationString = (space) => {
    if (space.latitude != null && space.longitude != null) {
      return `(${space.latitude.toFixed(3)}, ${space.longitude.toFixed(3)})`;
    }
    return "N/A";
  };

  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const parkingSpace = getParkingSpace(booking.parkingSpaceId);
    return (
      booking._id.toLowerCase().includes(searchLower) ||
      parkingSpace.name.toLowerCase().includes(searchLower) ||
      getLocationString(parkingSpace).toLowerCase().includes(searchLower) ||
      (booking.userId?.fullName || "You").toLowerCase().includes(searchLower) ||
      (booking.slotId?.slotNumber || "N/A")
        .toLowerCase()
        .includes(searchLower) ||
      booking.vehicleNumber?.toLowerCase().includes(searchLower) ||
      booking.vehicleType?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return <div className="text-center mt-12">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded mb-6 text-center mt-12">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">📋 My Bookings</h2>
        <Link
          to="/parking-spaces"
          className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
        >
          <ArrowLeft size={18} />
          Back to Parking Spaces
        </Link>
      </div>
      <div className="mb-6">
        <label
          htmlFor="searchQuery"
          className="block text-gray-700 font-semibold mb-2"
        >
          Search Bookings
        </label>
        <div className="relative">
          <input
            id="searchQuery"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Booking ID, Location, Name, Slot, or Vehicle..."
            className="w-full sm:w-96 p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search
            size={20}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>
      {filteredBookings.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-xl">
            No bookings found matching your search criteria.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow-2xl rounded-xl border border-gray-200 max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw]">
          <table className="min-w-full bg-white divide-y divide-gray-200 text-sm">
            <thead className="bg-blue-50 text-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">
                  Booking ID
                </th>
                <th className="px-6 py-4 text-left font-semibold">
                  Booked For
                </th>
                <th className="px-6 py-4 text-left font-semibold">
                  Parking Space
                </th>
                <th className="px-6 py-4 text-left font-semibold">Location</th>
                <th className="px-6 py-4 text-left font-semibold">
                  Slot Number
                </th>
                <th className="px-6 py-4 text-left font-semibold">
                  Start Time
                </th>
                <th className="px-6 py-4 text-left font-semibold">End Time</th>
                <th className="px-6 py-4 text-left font-semibold">Duration</th>
                <th className="px-6 py-4 text-left font-semibold">
                  Amount (NPR)
                </th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">
                  Booking Type
                </th>
                <th className="px-6 py-4 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBookings.map((booking) => {
                const parkingSpace = getParkingSpace(booking.parkingSpaceId);
                return (
                  <tr key={booking._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{booking._id}</td>
                    <td className="px-6 py-4">
                      {booking.userId?.fullName || "You"}
                    </td>
                    <td className="px-6 py-4">{parkingSpace.name}</td>
                    <td className="px-6 py-4">
                      {getLocationString(parkingSpace)}
                    </td>
                    <td className="px-6 py-4">
                      {booking.slotId?.slotNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(booking.startTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(booking.endTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">{booking.duration} minutes</td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {(booking.amount || booking.duration * 10).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusColors[booking.paymentStatus?.toLowerCase()] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {booking.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {booking.bookingType
                        ? booking.bookingType.charAt(0).toUpperCase() +
                          booking.bookingType.slice(1)
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() =>
                          navigate(`/booking-details/${booking._id}`)
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleCancelBooking(booking._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition"
                        disabled={
                          booking.paymentStatus?.toLowerCase() ===
                            "cancelled" ||
                          booking.paymentStatus?.toLowerCase() === "failed" ||
                          new Date(booking.endTime) < new Date()
                        }
                      >
                        Cancel Booking
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyBookingsPage;
