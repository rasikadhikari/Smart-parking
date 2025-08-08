import React, { useEffect, useState } from "react";
import { socket } from "../../hooks/useSocketListeners";
import api from "../../services/api";
import { CheckCircle2, Lock, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AdminSidebar from "../../components/AdminSidebar";

const SlotWatchlist = () => {
  const [user, setUser] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [parkingSpaceId, setParkingSpaceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser({
          _id: parsedUser.id || parsedUser._id,
          fullName: parsedUser.fullName,
          role: parsedUser.role,
        });
      } catch (err) {
        console.error("Error parsing user from localStorage", err);
        setError("Invalid user data in localStorage");
        setLoading(false);
      }
    } else {
      setError("No user found in localStorage");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchParkingSpaces = async () => {
      setLoading(true);
      setError("");
      try {
        let response;
        if (user.role === "admin") {
          response = await api.get(`/parking-spaces/assigned/${user._id}`);
        } else {
          response = await api.get("/parking-spaces/formatted/all");
        }

        const spaces = response.data || [];
        setParkingSpaces(spaces);
        if (spaces.length > 0) {
          setParkingSpaceId(spaces[0]._id);
        } else {
          setError("No parking spaces found.");
        }
      } catch (err) {
        setError(
          "Error fetching parking spaces: " +
            (err.response?.data?.message || err.message)
        );
      } finally {
        setLoading(false);
      }
    };

    fetchParkingSpaces();
  }, [user]);

  useEffect(() => {
    if (!parkingSpaceId) return;

    const fetchSlotsAndBookings = async () => {
      try {
        const [slotsRes, bookingsRes] = await Promise.all([
          api.get(`/slots?parkingSpaceId=${parkingSpaceId}`),
          api.get(`/bookings/admin?parkingSpaceId=${parkingSpaceId}`),
        ]);
        setSlots(slotsRes.data);
        setBookings(
          bookingsRes.data.filter((booking) => {
            const now = new Date();
            return booking.endTime > now || booking.paymentStatus === "success";
          })
        );
      } catch (err) {
        console.error("Error fetching slots or bookings", err);
        setError("Error fetching slots or bookings: " + err.message);
      }
    };

    fetchSlotsAndBookings();
  }, [parkingSpaceId]);

  useEffect(() => {
    const onSlotsUpdate = (data) => {
      if (data.parkingSpaceId === parkingSpaceId) {
        setSlots(data.slots);
        setBookings((prevBookings) =>
          prevBookings.filter((booking) => {
            const slot = data.slots.find((s) => s._id === booking.slotId?._id);
            return (
              slot && (slot.isLocked || booking.paymentStatus === "success")
            );
          })
        );
      }
    };
    const onBookingsUpdate = (data) => {
      if (data.parkingSpaceId === parkingSpaceId) {
        setBookings(
          data.bookings.filter((booking) => {
            const now = new Date();
            return booking.endTime > now || booking.paymentStatus === "success";
          })
        );
      }
    };

    socket.on("slotsUpdate", onSlotsUpdate);
    socket.on("bookingsUpdate", onBookingsUpdate);

    return () => {
      socket.off("slotsUpdate", onSlotsUpdate);
      socket.off("bookingsUpdate", onBookingsUpdate);
    };
  }, [parkingSpaceId]);

  const getSlotStatus = (slot) => {
    const now = new Date();

    if (slot.isAvailable && !slot.isLocked) {
      return { status: "Available", user: null };
    }

    const booking = bookings.find(
      (b) =>
        b.slotId?._id === slot._id &&
        b.paymentStatus === "success" &&
        b.endTime > now
    );
    if (booking) {
      return {
        status: "Booked",
        user: booking.userId?.fullName || booking.guestName || "Unknown",
      };
    }

    if (slot.isLocked && slot.bookingExpiresAt && slot.bookingExpiresAt > now) {
      const pendingBooking = bookings.find(
        (b) => b.slotId?._id === slot._id && b.paymentStatus === "pending"
      );
      return {
        status: "Locked",
        user:
          pendingBooking?.userId?.fullName ||
          pendingBooking?.guestName ||
          "Unknown",
      };
    }

    if (
      slot.isLocked &&
      slot.bookingExpiresAt &&
      slot.bookingExpiresAt <= now
    ) {
      return { status: "Available", user: null };
    }

    if (slot.isLocked) {
      return { status: "Locked", user: "Unknown" };
    }

    return { status: "Available", user: null };
  };

  const renderSlot = (slot) => {
    const { status, user } = getSlotStatus(slot);
    const icon =
      status === "Available" ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : status === "Booked" ? (
        <XCircle className="h-5 w-5 text-red-500" />
      ) : (
        <Lock className="h-5 w-5 text-yellow-500" />
      );

    return (
      <motion.div
        key={slot._id}
        style={{
          position: "absolute",
          left: `${slot.x}px`,
          top: `${slot.y}px`,
          width: 110,
          height: 90,
        }}
        className={`p-2 border-l-4 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg ${
          status === "Available"
            ? "bg-green-50 border-green-500"
            : status === "Booked"
            ? "bg-red-50 border-red-500"
            : "bg-yellow-50 border-yellow-500"
        }`}
        initial={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs">Slot {slot.slotNumber}</h3>
          {icon}
        </div>
        <p className="text-xs">Status: {status}</p>
        {user && <p className="text-xs">By: {user}</p>}
        {slot.isAdminOnly && (
          <span className="text-xs text-blue-500">(Admin Only)</span>
        )}
        {slot.bookingExpiresAt && status !== "Available" && (
          <p className="text-xs">
            Expires: {new Date(slot.bookingExpiresAt).toLocaleTimeString()}
          </p>
        )}
      </motion.div>
    );
  };

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

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="w-64 bg-white border-r">
        <AdminSidebar />
      </div>
      <div className="flex-1 p-6 max-w-7xl mx-auto">
        <motion.h2
          className="text-3xl font-bold text-gray-800 mb-8"
          variants={sectionVariants}
        >
          <Lock className="inline mr-2 h-8 w-8 text-gray-600" />
          Visual Slot Watchlist
        </motion.h2>

        <AnimatePresence>
          {loading ? (
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            </motion.div>
          ) : error ? (
            <motion.p
              className="text-red-600 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <XCircle className="inline mr-2 h-5 w-5" />
              {error}
            </motion.p>
          ) : (
            <>
              <motion.div className="mb-6" variants={sectionVariants}>
                <label
                  htmlFor="parkingSpaceSelect"
                  className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2"
                >
                  <Lock className="h-5 w-5" />
                  Select Parking Space:
                </label>
                <select
                  id="parkingSpaceSelect"
                  value={parkingSpaceId}
                  onChange={(e) => setParkingSpaceId(e.target.value)}
                  className="p-3 border border-gray-300 rounded-lg w-full max-w-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  disabled={parkingSpaces.length === 0}
                  aria-label="Select parking space"
                >
                  {parkingSpaces.map((space) => (
                    <option key={space._id} value={space._id}>
                      {space.name} ({space.latitude.toFixed(3)},{" "}
                      {space.longitude.toFixed(3)})
                    </option>
                  ))}
                </select>
              </motion.div>

              <motion.div
                className="bg-gray-100 border rounded-xl p-6 shadow-inner relative overflow-hidden w-full h-[600px] min-h-[600px]"
                variants={sectionVariants}
              >
                <AnimatePresence>
                  {slots.length > 0 ? (
                    slots.map(renderSlot)
                  ) : (
                    <motion.p
                      className="text-center text-gray-500 p-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <XCircle className="inline mr-2 h-5 w-5" />
                      No slots available for this parking space.
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default SlotWatchlist;
