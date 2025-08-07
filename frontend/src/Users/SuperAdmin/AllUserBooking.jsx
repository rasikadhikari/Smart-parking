import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import io from "socket.io-client";
import { motion } from "framer-motion";
import { BadgeCheck, Loader2, XCircle } from "lucide-react";
import SuperadminSidebar from "../../components/SuperadminSidebar";

const socket = io("http://localhost:5002", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
});

const AllUserBooking = () => {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [filterParkingSpaceId, setFilterParkingSpaceId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
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

  const getParkingSpace = (id) => {
    if (!id) return { name: "Default Parking Lot" };
    return (
      parkingSpaces.find((s) => s._id.toString() === id.toString()) || {
        name: "Unknown",
      }
    );
  };

  const statusColors = {
    success: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
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

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );

  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-lg shadow-md">
          <XCircle className="inline-block mr-2" /> {error}
        </div>
      </div>
    );

  return (
    <div className="flex min-h-screen">
      <div className="w-64">
        <SuperadminSidebar />
      </div>
      <div className="flex-1 p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-2">
            📋 All Bookings
          </h2>
          <p className="text-gray-600">View and manage all user bookings</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Filter by Parking Space
            </label>
            <select
              value={filterParkingSpaceId}
              onChange={(e) => setFilterParkingSpaceId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:outline-none shadow-sm"
            >
              <option value="">All Parking Spaces</option>
              <option value="null">Default Parking Lot</option>
              {parkingSpaces.map((space) => (
                <option key={space._id} value={space._id}>
                  {space.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by Booking ID or Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-blue-500 focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center text-gray-500 py-16 text-lg">
            No bookings found.
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-gray-200 shadow bg-white">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-blue-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Booking ID</th>
                  <th className="px-4 py-3 font-medium">Booked For</th>
                  <th className="px-4 py-3 font-medium">Parking Space</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Start</th>
                  <th className="px-4 py-3 font-medium">End</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Amount (NPR)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.map((booking) => {
                  const space = getParkingSpace(booking.parkingSpaceId);
                  return (
                    <motion.tr
                      key={booking._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">{booking._id}</td>
                      <td className="px-4 py-3">
                        {booking.guestName ||
                          booking.userId?.fullName ||
                          "User"}
                      </td>
                      <td className="px-4 py-3">{space.name}</td>
                      <td className="px-4 py-3">
                        {booking.slotId?.slotNumber || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(booking.startTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(booking.endTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{booking.duration} min</td>
                      <td className="px-4 py-3 font-medium">
                        {(booking.amount || booking.duration * 10).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        {booking.bookingType?.charAt(0).toUpperCase() +
                          booking.bookingType?.slice(1) || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            navigate(`/booking-details/${booking._id}`)
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium shadow"
                        >
                          View
                        </button>
                      </td>
                    </motion.tr>
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

export default AllUserBooking;
