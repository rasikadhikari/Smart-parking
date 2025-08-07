import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../../hooks/useSocketListeners";
import api from "../../services/api";
import { FaCarSide, FaTimes, FaLock } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ParkingCircle, AlertCircle, Settings } from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar";

const CreateSlotPage = ({ user }) => {
  const [slots, setSlots] = useState([]);
  const [parkingSpaceId, setParkingSpaceId] = useState("");
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      navigate("/slots", { state: { message: "Access denied. Admins only." } });
      return;
    }

    const fetchParkingSpaces = async () => {
      try {
        setLoading(true);
        const endpoint =
          user.role === "admin"
            ? `/parking-spaces/assigned/${user._id}`
            : "/parking-spaces/formatted/all";
        const { data } = await api.get(endpoint);
        setParkingSpaces(data);
        if (data.length > 0 && !parkingSpaceId) setParkingSpaceId(data[0]._id);
      } catch (err) {
        setError(
          `Error fetching parking spaces: ${
            err.response?.data?.message || err.message
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    fetchParkingSpaces();
  }, [user, navigate]);

  useEffect(() => {
    if (!parkingSpaceId) return;

    const handleSlotsUpdate = ({
      parkingSpaceId: updatedId,
      slots: updatedSlots,
    }) => {
      if (updatedId === parkingSpaceId) {
        setSlots(updatedSlots);
      }
    };

    socket.on("slotsUpdate", handleSlotsUpdate);
    return () => socket.off("slotsUpdate", handleSlotsUpdate);
  }, [parkingSpaceId]);

  useEffect(() => {
    if (!parkingSpaceId) {
      setSlots([]);
      return;
    }

    const fetchExistingSlots = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/slots", {
          params: { parkingSpaceId },
        });
        setSlots(data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Error fetching existing slots"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchExistingSlots();
  }, [parkingSpaceId]);

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

  const slotVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <AdminSidebar />
      <div className="flex-1 flex flex-col ml-64 p-4 md:p-6 lg:p-8">
        <header className="bg-white shadow-lg px-4 py-3 mb-6 rounded-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.h1
              className="text-xl md:text-2xl font-bold text-blue-600 flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ParkingCircle size={24} />
              View Parking Slots
            </motion.h1>
          </div>
        </header>

        <main className="flex-1">
          <AnimatePresence>
            {error && (
              <motion.div
                className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                      <AlertCircle size={20} />
                      Error
                    </h3>
                    <button
                      onClick={() => setError("")}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </button>
                  </div>
                  <p className="text-red-600">{error}</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {loading && (
            <motion.div
              className="flex justify-center items-center h-64"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}

          {!loading && parkingSpaces.length === 0 ? (
            <motion.div
              className="text-center text-gray-600 bg-white p-6 rounded-lg shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              No parking spaces assigned. Please contact a superadmin to assign
              a parking space.
            </motion.div>
          ) : (
            <motion.div
              className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 animate__animated animate__fadeInUp border-l-4 border-blue-500"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6 lg:mb-8">
                <label
                  htmlFor="parkingSpaceId"
                  className="block text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2"
                >
                  <ParkingCircle size={20} />
                  Select Parking Space
                </label>
                <select
                  id="parkingSpaceId"
                  value={parkingSpaceId}
                  onChange={(e) => setParkingSpaceId(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="">Select a parking space</option>
                  {parkingSpaces.map((space) => (
                    <option key={space._id} value={space._id}>
                      {space.name} ({space.latitude}, {space.longitude})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6 lg:mb-10">
                <div className="flex justify-between items-center mb-4 lg:mb-6">
                  <h3 className="text-xl lg:text-2xl font-semibold text-gray-800 flex items-center gap-2">
                    <FaCarSide size={24} />
                    Existing Slots
                  </h3>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/slots/customize")}
                    className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    <Settings size={18} />
                    Customize Slot
                  </motion.button>
                </div>
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: { staggerChildren: 0.1 },
                    },
                  }}
                >
                  {slots.map((slot) => (
                    <motion.div
                      key={slot._id}
                      className={`rounded-xl p-4 border text-center shadow-sm transition-all duration-200 hover:shadow-md
                        ${
                          slot.isAdminOnly
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : slot.isLocked
                            ? "bg-red-100 text-red-800 border-red-300"
                            : slot.isAvailable
                            ? "bg-gray-50 text-gray-800 border-gray-200"
                            : "bg-gray-200 text-gray-600 border-gray-300"
                        }`}
                      variants={slotVariants}
                    >
                      <div className="flex justify-center items-center mb-2">
                        <FaCarSide className="text-2xl lg:text-3xl" />
                        {slot.isAdminOnly && (
                          <FaLock className="text-lg lg:text-xl ml-2" />
                        )}
                      </div>
                      <p className="font-semibold text-base lg:text-lg">
                        Slot {slot.slotNumber}
                      </p>
                      {slot.isAdminOnly && (
                        <p className="text-xs font-medium">Admin Only</p>
                      )}
                      {slot.isLocked && !slot.isAdminOnly && (
                        <p className="text-xs font-medium">Locked</p>
                      )}
                      {!slot.isAvailable && !slot.isAdminOnly && (
                        <p className="text-xs font-medium">Occupied</p>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </motion.div>
  );
};

export default CreateSlotPage;
