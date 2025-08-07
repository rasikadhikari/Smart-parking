import React, { useEffect, useState } from "react";
import api from "../services/api";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

const socket = io("http://localhost:5002"); // replace with your backend URL

const AdminBookingForm = ({ user }) => {
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [parkingSpaceId, setParkingSpaceId] = useState("");
  const [slots, setSlots] = useState([]);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    slotId: "",
    duration: 30,
    userId: "",
    guestName: "",
    vehicleNumber: "",
    vehicleType: "Car",
    startTime: "",
    endTime: "",
  });

  // Fetch parking spaces on load
  useEffect(() => {
    const fetchParkingSpaces = async () => {
      try {
        const endpoint =
          user.role === "admin"
            ? `/parking-spaces/assigned/${user._id}`
            : "/parking-spaces/formatted/all";
        const { data } = await api.get(endpoint);
        setParkingSpaces(data);
        if (data.length > 0) {
          setParkingSpaceId(data[0]._id);
        }
      } catch (err) {
        console.error("Error fetching parking spaces:", err.message);
      }
    };
    fetchParkingSpaces();
  }, [user]);

  // Fetch slots & users when parkingSpaceId changes
  useEffect(() => {
    const fetchData = async () => {
      if (!parkingSpaceId) return;
      try {
        const slotsRes = await api.get(
          `/slots?parkingSpaceId=${parkingSpaceId}`
        );
        const usersRes = await api.get("/bookings/users");
        setSlots(slotsRes.data.filter((s) => s.isAvailable));
        setUsers(usersRes.data);
      } catch (err) {
        console.error("Error fetching data:", err.message);
      }
    };
    fetchData();

    socket.on(
      "slotsUpdate",
      ({ parkingSpaceId: updatedId, slots: updatedSlots }) => {
        if (updatedId === parkingSpaceId) {
          setSlots(updatedSlots.filter((s) => s.isAvailable));
        }
      }
    );

    return () => socket.off("slotsUpdate");
  }, [parkingSpaceId]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/bookings/offline", formData);
      setMessage("Booking created: " + response.data.bookingId);
    } catch (error) {
      setMessage(
        "Booking failed: " + (error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl"
    >
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Admin Slot Booking
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Parking Space
        </label>
        <motion.select
          value={parkingSpaceId}
          onChange={(e) => setParkingSpaceId(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
          required
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <option value="">Select a Parking Space</option>
          {parkingSpaces.map((space) => (
            <option key={space._id} value={space._id}>
              {space.name} - {space.location?.coordinates?.join(", ")}
            </option>
          ))}
        </motion.select>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slot
          </label>
          <motion.select
            name="slotId"
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            required
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <option value="">Select Slot</option>
            {slots.map((slot) => (
              <option key={slot._id} value={slot._id}>
                {slot.slotNumber}
              </option>
            ))}
          </motion.select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (minutes)
          </label>
          <motion.input
            type="number"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            placeholder="Duration (mins)"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            required
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User (or leave empty for guest)
          </label>
          <motion.select
            name="userId"
            value={formData.userId}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <option value="">-- Guest Booking --</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullName}
              </option>
            ))}
          </motion.select>
        </div>

        <AnimatePresence>
          {!formData.userId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest Name
              </label>
              <motion.input
                type="text"
                name="guestName"
                value={formData.guestName}
                onChange={handleChange}
                placeholder="Guest Name"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                required
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vehicle Number
          </label>
          <motion.input
            type="text"
            name="vehicleNumber"
            value={formData.vehicleNumber}
            onChange={handleChange}
            placeholder="Vehicle Number"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            required
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vehicle Type
          </label>
          <motion.input
            type="text"
            name="vehicleType"
            value={formData.vehicleType}
            onChange={handleChange}
            placeholder="Vehicle Type"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            required
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Time
          </label>
          <motion.input
            type="datetime-local"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            required
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Time
          </label>
          <motion.input
            type="datetime-local"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            required
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          />
        </div>

        <motion.button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Book Slot
        </motion.button>
      </form>

      <AnimatePresence>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`mt-4 text-center ${
              message.includes("failed") ? "text-red-500" : "text-green-500"
            }`}
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminBookingForm;
