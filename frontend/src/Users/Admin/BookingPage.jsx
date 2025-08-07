import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ParkingCircle,
  AlertCircle,
  User,
  CarFront,
  Clock,
  DollarSign,
  Lock,
  ArrowLeft,
} from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";

const BookingPage = ({ user, slots, parkingSpaceId }) => {
  const [slotId, setSlotId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [userId, setUserId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isGuestBooking, setIsGuestBooking] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [duration, setDuration] = useState(null);
  const [amount, setAmount] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [parkingSpace, setParkingSpace] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const effectiveParkingSpaceId =
    location.state?.parkingSpaceId || parkingSpaceId;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!user || !token) {
      navigate("/login", { state: { message: "Please log in to continue." } });
      return;
    }

    let isMounted = true;
    if (effectiveParkingSpaceId) {
      const fetchParkingSpace = async () => {
        setLoading(true);
        try {
          const response = await api.get(
            `/parking-spaces/${effectiveParkingSpaceId}`
          );
          if (isMounted) {
            setParkingSpace(response.data);
          }
        } catch (err) {
          if (isMounted) {
            setError(
              err.response?.data?.message || "Error fetching parking space"
            );
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };
      fetchParkingSpace();
    }

    if (location.state?.slotId) {
      setSlotId(location.state.slotId);
      releasePreviousLocks(location.state.slotId);
    }

    if (slots.length === 0) {
      navigate("/parking-spaces", {
        state: {
          message: "Please select a parking space with available slots",
        },
      });
    }

    return () => {
      isMounted = false;
      if (slotId) {
        releasePreviousLocks(slotId);
      }
    };
  }, [user, navigate, location, effectiveParkingSpaceId, slots]);

  const releasePreviousLocks = async (slotIdToRelease) => {
    if (!user || !slotIdToRelease) return;
    try {
      await api.post(`/slots/unlock/${slotIdToRelease}`);
    } catch (err) {
      console.error(
        "Error releasing slot lock:",
        err.response?.data?.message || err.message
      );
    }
  };

  useEffect(() => {
    if (slotId && location.state?.slotId && slotId !== location.state.slotId) {
      releasePreviousLocks(location.state.slotId);
    }
  }, [slotId, location.state?.slotId]);

  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const calculatedDuration = Math.round((end - start) / (1000 * 60));
        setDuration(calculatedDuration);
        setAmount(calculatedDuration * 10);
      } else {
        setDuration(null);
        setAmount(null);
      }
    } else {
      setDuration(null);
      setAmount(null);
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (isAdmin) {
      const fetchUsers = async () => {
        try {
          const response = await api.get("/bookings/users");
          setRegisteredUsers(response.data);
        } catch (err) {
          console.error(
            "Error fetching users:",
            err.response?.data || err.message
          );
          setError("Error fetching registered users");
        }
      };
      fetchUsers();
    }
  }, [isAdmin]);

  const handleSlotChange = async (e) => {
    const newSlotId = e.target.value;

    if (slotId && newSlotId !== slotId) {
      await releasePreviousLocks(slotId);
    }

    setSlotId(newSlotId);

    if (newSlotId && user) {
      try {
        await api.post(`/slots/lock/${newSlotId}`);
      } catch (err) {
        console.error(
          "Error creating slot lock:",
          err.response?.data?.message || err.message
        );
        if (err.response?.data?.message?.includes("locked")) {
          setError(err.response.data.message);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!slotId) throw new Error("Please select a parking slot");
      if (!startTime || !endTime)
        throw new Error("Please select both start and end times");
      if (!vehicleNumber) throw new Error("Please enter the vehicle number");
      if (!/^[A-Z]{2}-\d{4}$/.test(vehicleNumber))
        throw new Error(
          "Vehicle number must be in the format XX-1234 (e.g., AB-1234)"
        );
      if (!vehicleType) throw new Error("Please select the vehicle type");

      const selectedSlot = slots.find((slot) => slot._id === slotId);
      if (
        selectedSlot &&
        effectiveParkingSpaceId &&
        selectedSlot.parkingSpaceId?.toString() !== effectiveParkingSpaceId
      ) {
        throw new Error(
          "Selected slot does not belong to the chosen parking space"
        );
      }

      if (isAdmin) {
        if (!isGuestBooking && !userId)
          throw new Error("Please select a registered user");
        if (isGuestBooking && !guestName)
          throw new Error("Please enter the guest's full name");
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      const now = new Date();
      if (isNaN(start.getTime()) || isNaN(end.getTime()))
        throw new Error("Invalid date/time selected");
      if (start < now) throw new Error("Start time cannot be in the past");
      if (end <= start) throw new Error("End time must be after start time");

      const duration = Math.round((end - start) / (1000 * 60));
      if (duration <= 0)
        throw new Error("Duration must be greater than 0 minutes");

      const bookingPayload = {
        slotId,
        startTime,
        endTime,
        duration,
        vehicleNumber,
        vehicleType,
        parkingSpaceId: effectiveParkingSpaceId || null,
      };

      if (isAdmin) {
        if (isGuestBooking) {
          bookingPayload.guestName = guestName;
        } else {
          bookingPayload.userId = userId;
        }
      } else {
        if (user && user._id) bookingPayload.userId = user._id;
        else if (user && user.id) bookingPayload.userId = user.id;
        else if (user && user.userId) bookingPayload.userId = user.userId;
        else
          throw new Error(
            "User ID not found. Please log out and log in again."
          );
      }

      const response = await api.post(
        isAdmin ? "/bookings/offline" : "/bookings",
        bookingPayload
      );

      if (isAdmin) {
        if (response.data?.bookingId) {
          navigate(`/confirmation/${response.data.bookingId}`);
        } else throw new Error("Failed to retrieve booking ID from server");
      } else {
        if (response.data?.paymentUrl) {
          window.location.href = response.data.paymentUrl;
        } else throw new Error("Invalid payment URL received");
      }
    } catch (err) {
      console.error("Booking error:", err.response?.data || err.message);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login", {
          state: { message: "Session expired. Please log in again." },
        });
      } else if (err.response?.status === 403) {
        setError("You cannot book this slot as it is reserved for admins only");
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Error processing booking"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredSlots = slots.filter(
    (slot) =>
      slot.isAvailable &&
      (!effectiveParkingSpaceId ||
        slot.parkingSpaceId?.toString() === effectiveParkingSpaceId)
  );

  const slotsWithLockStatus = filteredSlots.map((slot) => ({
    ...slot,
    isLockedByCurrentUser:
      slot.lockedBy === (user?._id || user?.id || user?.userId),
    isLockedByOtherUser:
      slot.lockedBy &&
      slot.lockedBy !== (user?._id || user?.id || user?.userId),
  }));

  const pageVariants = {
    initial: { opacity: 0, x: 100 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      x: -100,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  };

  const fieldVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  if (loading && !parkingSpace) {
    return (
      <motion.div
        className="text-center mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Loading...
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <AdminSidebar />
      <div className="flex-1 flex items-center justify-center ml-64 p-4 md:p-6 lg:p-8">
        <motion.div
          className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg mt-12"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.h2
            className="text-3xl font-bold text-blue-600 mb-6 text-center"
            variants={fieldVariants}
          >
            <ParkingCircle size={28} className="inline mr-2" />
            Book a Parking Slot{" "}
            {parkingSpace
              ? `- ${parkingSpace.name}`
              : effectiveParkingSpaceId
              ? " - Loading..."
              : " - Default"}
          </motion.h2>
          {parkingSpace && (
            <motion.p
              className="text-center text-gray-600 mb-4"
              variants={fieldVariants}
            >
              <Clock size={18} className="inline mr-2" />
              Location: {parkingSpace.location}
            </motion.p>
          )}
          {effectiveParkingSpaceId && !parkingSpace && error && (
            <motion.p
              className="text-center text-red-600 mb-4"
              variants={fieldVariants}
            >
              <AlertCircle size={18} className="inline mr-2" />
              {error}
            </motion.p>
          )}
          {effectiveParkingSpaceId && (
            <motion.div className="text-center mb-6" variants={fieldVariants}>
              <Link
                to="/parking-spaces"
                className="inline-block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Back to Parking Spaces
              </Link>
            </motion.div>
          )}
          {error && (
            <motion.div
              className="text-red-600 text-center mb-4"
              variants={fieldVariants}
            >
              <AlertCircle size={18} className="inline mr-2" />
              {error}
            </motion.div>
          )}
          {filteredSlots.length === 0 && (
            <motion.div
              className="text-red-600 text-center mb-4"
              variants={fieldVariants}
            >
              <AlertCircle size={18} className="inline mr-2" />
              No available slots for this parking space
            </motion.div>
          )}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            {isAdmin && (
              <motion.div variants={fieldVariants}>
                <label className="block text-gray-700 font-semibold mb-2 flex items-center gap-2">
                  <User size={18} />
                  Booking For
                </label>
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="bookingType"
                      checked={!isGuestBooking}
                      onChange={() => setIsGuestBooking(false)}
                      className="mr-2"
                    />
                    Registered User
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="bookingType"
                      checked={isGuestBooking}
                      onChange={() => setIsGuestBooking(true)}
                      className="mr-2"
                    />
                    Guest
                  </label>
                </div>
                {!isGuestBooking ? (
                  <motion.div variants={fieldVariants}>
                    <label
                      htmlFor="userId"
                      className="block text-gray-700 font-semibold mb-2"
                    >
                      Select Registered User
                    </label>
                    <select
                      id="userId"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a user</option>
                      {registeredUsers.map((registeredUser) => (
                        <option
                          key={registeredUser._id}
                          value={registeredUser._id}
                        >
                          {registeredUser.fullName}
                        </option>
                      ))}
                    </select>
                  </motion.div>
                ) : (
                  <motion.div variants={fieldVariants}>
                    <label
                      htmlFor="guestName"
                      className="block text-gray-700 font-semibold mb-2"
                    >
                      Guest Full Name
                    </label>
                    <input
                      type="text"
                      id="guestName"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter guest's full name"
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
            <motion.div variants={fieldVariants}>
              <label
                htmlFor="slotId"
                className=" text-gray-700 font-semibold mb-2 flex items-center gap-2"
              >
                <ParkingCircle size={18} />
                Select Slot
              </label>
              <select
                id="slotId"
                value={slotId}
                onChange={handleSlotChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a slot</option>
                {slotsWithLockStatus.map((slot) => (
                  <option
                    key={slot._id}
                    value={slot._id}
                    disabled={slot.isLockedByOtherUser}
                  >
                    Slot {slot.slotNumber}
                    {slot.isAdminOnly ? " (Admin Only)" : ""}
                    {slot.isLockedByCurrentUser ? " (Your session)" : ""}
                    {slot.isLockedByOtherUser
                      ? " (Locked by another user)"
                      : ""}
                  </option>
                ))}
              </select>
            </motion.div>
            <motion.div variants={fieldVariants}>
              <label
                htmlFor="vehicleNumber"
                className="text-gray-700 font-semibold mb-2 flex items-center gap-2"
              >
                <CarFront size={18} />
                Vehicle Number
              </label>
              <input
                type="text"
                id="vehicleNumber"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., AB-1234"
                pattern="[A-Z]{2}-\d{4}"
                title="Vehicle number must be in the format XX-1234 (e.g., AB-1234)"
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <label
                htmlFor="vehicleType"
                className="block text-gray-700 font-semibold mb-2 flex items-center gap-2"
              >
                <CarFront size={18} />
                Vehicle Type
              </label>
              <select
                id="vehicleType"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select vehicle type</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Truck">Truck</option>
                <option value="Motorcycle">Motorcycle</option>
              </select>
            </motion.div>
            <motion.div variants={fieldVariants}>
              <label
                htmlFor="startTime"
                className="block text-gray-700 font-semibold mb-2 flex items-center gap-2"
              >
                <Clock size={18} />
                Start Time
              </label>
              <input
                type="datetime-local"
                id="startTime"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <label
                htmlFor="endTime"
                className="block text-gray-700 font-semibold mb-2 flex items-center gap-2"
              >
                <Clock size={18} />
                End Time
              </label>
              <input
                type="datetime-local"
                id="endTime"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                min={startTime || new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </motion.div>
            {amount !== null && (
              <motion.div
                className="text-center text-gray-700 font-semibold"
                variants={fieldVariants}
              >
                <DollarSign size={18} className="inline mr-2" />
                Total Amount: NPR {amount.toFixed(2)} (for {duration} minutes)
              </motion.div>
            )}
            <motion.button
              type="submit"
              disabled={loading}
              className={`w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              variants={fieldVariants}
            >
              {loading ? (
                <motion.div
                  className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              ) : isAdmin ? (
                <>
                  <Lock size={18} /> Complete Booking
                </>
              ) : (
                <>
                  <DollarSign size={18} /> Pay with Stripe
                </>
              )}
            </motion.button>
          </motion.form>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default BookingPage;
