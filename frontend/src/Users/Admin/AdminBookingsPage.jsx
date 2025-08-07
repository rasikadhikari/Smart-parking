import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";
import api from "../../services/api";
import io from "socket.io-client";
import AdminSidebar from "../../components/AdminSidebar";

const socket = io("http://localhost:5002", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
});

const AdminBookingsPage = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [filterParkingSpaceId, setFilterParkingSpaceId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null); // Track deleting booking
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      navigate("/login", { state: { message: "Access denied. Admins only." } });
      return;
    }

    const fetchParkingSpaces = async () => {
      try {
        const response = await api.get("/parking-spaces");
        setParkingSpaces(response.data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Error fetching parking spaces"
        );
      }
    };

    const fetchBookings = async () => {
      try {
        const response = await api.get("/bookings/admin");
        if (!Array.isArray(response.data))
          throw new Error("Invalid response format");
        setBookings(response.data);
      } catch (err) {
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

    socket.on("bookingsUpdate", fetchBookings);
    return () => socket.off("bookingsUpdate");
  }, [user, navigate]);

  const handleDelete = async (bookingId) => {
    console.log("Deleting booking:", bookingId);
    setDeletingId(bookingId);
    try {
      await api.delete(`/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setBookings((prev) => prev.filter((b) => b._id !== bookingId));
    } catch (err) {
      setError(err.response?.data?.message || "Error deleting booking");
    } finally {
      setDeletingId(null);
    }
  };

  const statusColors = {
    success: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
  };

  const getParkingSpace = (id) => {
    if (!id)
      return { name: "Default Parking Lot", location: { coordinates: [] } };
    return (
      parkingSpaces.find((s) => s._id.toString() === id.toString()) || {
        name: "Unknown",
        location: { coordinates: [] },
      }
    );
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSpace = filterParkingSpaceId
      ? (booking.parkingSpaceId?.toString() || null) === filterParkingSpaceId
      : true;
    const matchesSearch =
      searchTerm.trim() === "" ||
      booking._id.includes(searchTerm) ||
      (booking.userId?.fullName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (booking.guestName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesSpace && matchesSearch;
  });

  if (loading) return <div className="text-center mt-12">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded mb-6 text-center mt-12">
        {error}
      </div>
    );

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-white border-r">
        <AdminSidebar />
      </div>

      <div className="flex-1 px-6 py-12 bg-gray-50 overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-3xl font-bold text-gray-800">📋 All Bookings</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Parking Space
            </label>
            <select
              value={filterParkingSpaceId}
              onChange={(e) => setFilterParkingSpaceId(e.target.value)}
              className="w-full border rounded-md p-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">All Parking Spaces</option>
              <option value="null">Default Parking Lot</option>
              {parkingSpaces.map((space) => (
                <option key={space._id} value={space._id}>
                  {space.name} ({space.location?.coordinates?.join(", ")})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by Booking ID or Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded-md p-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-xl">
            No bookings found.
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow">
            <table className="min-w-[1100px] w-full text-sm text-left text-gray-600">
              <thead className="bg-blue-100 text-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 font-semibold">Booking ID</th>
                  <th className="px-4 py-2 font-semibold">Booked For</th>
                  <th className="px-4 py-2 font-semibold">Parking Space</th>
                  <th className="px-4 py-2 font-semibold">Location</th>
                  <th className="px-4 py-2 font-semibold">Slot</th>
                  <th className="px-4 py-2 font-semibold">Start</th>
                  <th className="px-4 py-2 font-semibold">End</th>
                  <th className="px-4 py-2 font-semibold">Duration</th>
                  <th className="px-4 py-2 font-semibold">Amount (NPR)</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const space = getParkingSpace(booking.parkingSpaceId);
                  const coords = space.location?.coordinates || [];
                  return (
                    <tr key={booking._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{booking._id}</td>
                      <td className="px-4 py-2">
                        {booking.guestName ||
                          booking.userId?.fullName ||
                          "Registered User"}
                      </td>
                      <td className="px-4 py-2">{space.name}</td>
                      <td className="px-4 py-2">
                        {coords.length === 2
                          ? `Lat: ${coords[1]}, Lng: ${coords[0]}`
                          : "N/A"}
                      </td>
                      <td className="px-4 py-2">
                        {booking.slotId?.slotNumber || "N/A"}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(booking.startTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        {new Date(booking.endTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{booking.duration} min</td>
                      <td className="px-4 py-2 font-medium">
                        {(booking.amount || booking.duration * 10).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            statusColors[
                              booking.paymentStatus?.toLowerCase()
                            ] || "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {booking.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {booking.bookingType?.charAt(0).toUpperCase() +
                          booking.bookingType?.slice(1) || "N/A"}
                      </td>
                      <td className="px-4 py-2 flex space-x-2">
                        <button
                          onClick={() =>
                            navigate(`/booking-details/${booking._id}`)
                          }
                          className="text-blue-600 hover:text-blue-800"
                          title="View Booking"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(booking._id)}
                          className={`text-red-600 hover:text-red-800 ${
                            deletingId === booking._id
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }`}
                          title="Delete Booking"
                          disabled={deletingId === booking._id}
                        >
                          <Trash2 size={18} />
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
    </div>
  );
};

export default AdminBookingsPage;
