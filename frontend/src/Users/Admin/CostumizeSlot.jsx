import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaCarSide, FaTrash, FaLock, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { ParkingCircle, AlertCircle, Save, Settings } from "lucide-react";
import api from "../../services/api";
import AdminSidebar from "../../components/AdminSidebar";

const CustomizeSlotsPage = ({ user }) => {
  const navigate = useNavigate();
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [parkingSpaceId, setParkingSpaceId] = useState("");
  const [layout, setLayout] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [slotCounter, setSlotCounter] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const slotRefs = useRef({});

  useEffect(() => {
    if (!user) return;

    const fetchParkingSpaces = async () => {
      try {
        setLoading(true);
        let response;
        if (user.role === "admin") {
          response = await api.get(`/parking-spaces/assigned/${user._id}`);
        } else {
          response = await api.get("/parking-spaces/formatted/all");
        }

        setParkingSpaces(response.data || []);
        if (response.data.length > 0) {
          setParkingSpaceId(response.data[0]._id);
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

    const fetchSlots = async () => {
      try {
        const response = await api.get(
          `/slots?parkingSpaceId=${parkingSpaceId}`
        );
        const fetchedSlots = response.data.map((slot) => ({
          id: slot._id,
          slotNumber: slot.slotNumber,
          x: slot.x || 0,
          y: slot.y || 0,
          position: "left",
          isAdminOnly: slot.isAdminOnly || false,
          isSaved: true,
        }));
        setLayout(fetchedSlots);
        setSlotCounter(fetchedSlots.length + 1);
      } catch (err) {
        console.error("Failed to fetch slots:", err);
      }
    };

    fetchSlots();
  }, [parkingSpaceId]);

  const handleDragStart = (e, slot) => {
    setDragging(slot);
    setSelectedSlotId(slot.id);
    e.dataTransfer.setData("text/plain", slot.id);
    const rect = e.target.getBoundingClientRect();
    e.dataTransfer.setDragImage(e.target, rect.width / 2, rect.height / 2);
  };

  const handleDrag = (e, slot) => {
    if (!dragging || dragging.id !== slot.id) return;
    if (e.clientX === 0 && e.clientY === 0) return;
    const container = e.target.parentElement.getBoundingClientRect();
    const newX = e.clientX - container.left - 40;
    const newY = e.clientY - container.top - 40;
    setLayout((prev) =>
      prev.map((s) =>
        s.id === slot.id
          ? {
              ...s,
              x: Math.max(0, Math.min(newX, container.width - 80)),
              y: Math.max(0, Math.min(newY, container.height - 80)),
            }
          : s
      )
    );
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  const handleKeyDown = (e, slot) => {
    if (selectedSlotId !== slot.id) return;
    const step = 10;
    setLayout((prev) =>
      prev.map((s) => {
        if (s.id !== slot.id) return s;
        let newX = s.x;
        let newY = s.y;
        switch (e.key) {
          case "ArrowUp":
            newY = Math.max(0, s.y - step);
            break;
          case "ArrowDown":
            newY = Math.min(420, s.y + step);
            break;
          case "ArrowLeft":
            newX = Math.max(0, s.x - step);
            break;
          case "ArrowRight":
            newX = Math.min(720, s.x + step);
            break;
          default:
            return s;
        }
        return { ...s, x: newX, y: newY };
      })
    );
  };

  const toggleAdminOnly = (slotId) => {
    setLayout((prev) =>
      prev.map((slot) =>
        slot.id === slotId ? { ...slot, isAdminOnly: !slot.isAdminOnly } : slot
      )
    );
  };

  const addSlot = (position) => {
    const newSlot = {
      id: `temp-${Date.now()}`,
      slotNumber: slotCounter,
      x: Math.random() * 400,
      y: Math.random() * 200,
      position,
      isAdminOnly: false,
      isSaved: false,
    };
    setLayout((prev) => [...prev, newSlot]);
    setSlotCounter((prev) => prev + 1);
    setSelectedSlotId(newSlot.id);
  };

  const removeSlot = async () => {
    if (!selectedSlotId) return alert("Please select a slot to remove.");

    const slotToRemove = layout.find((slot) => slot.id === selectedSlotId);
    if (!slotToRemove) return alert("Selected slot not found.");

    if (!slotToRemove.isSaved) {
      setLayout((prev) => prev.filter((slot) => slot.id !== selectedSlotId));
      setSelectedSlotId(null);
      alert("Slot removed successfully!");
      return;
    }

    try {
      await api.delete(`/slots/bulk`, {
        data: { slotIds: [slotToRemove.id] },
      });
      setLayout((prev) => prev.filter((slot) => slot.id !== selectedSlotId));
      setSelectedSlotId(null);
      alert("Slot removed successfully!");
    } catch (err) {
      console.error("Error removing slot:", err);
      alert(
        "Failed to remove slot: " + (err.response?.data?.message || err.message)
      );
    }
  };

  const handleSave = async () => {
    if (!parkingSpaceId) return alert("No parking space selected!");

    const slotNumbers = layout.map((s) => String(s.slotNumber));
    const selectedSpace = parkingSpaces.find(
      (space) => space._id === parkingSpaceId
    );
    const locationName = selectedSpace ? selectedSpace.address : "";

    const layoutData = layout.map((s) => ({
      slotNumber: String(s.slotNumber),
      x: s.x,
      y: s.y,
      isAdminOnly: s.isAdminOnly,
    }));

    try {
      const response = await api.post("/slots", {
        slotNumbers,
        location: locationName,
        parkingSpaceId,
        layout: layoutData,
      });
      const updatedSlots = response.data.slots.map((slot) => ({
        id: slot._id,
        slotNumber: slot.slotNumber,
        x: slot.x,
        y: slot.y,
        position: "left",
        isAdminOnly: slot.isAdminOnly,
        isSaved: true,
      }));
      setLayout(updatedSlots);
      alert("Custom slots created!");
      navigate("/create-slot");
    } catch (err) {
      console.error("Error saving custom slots:", err);
      alert(
        "Failed to create slots: " +
          (err.response?.data?.message || err.message)
      );
    }
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

  const slotVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
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
              <Settings size={24} />
              Customize Slots Layout
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

          {loading ? (
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
          ) : error ? null : (
            <>
              <div className="mb-6">
                <label
                  htmlFor="parkingSpaceId"
                  className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2"
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

              <div className="mb-6 space-x-2 flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addSlot("left")}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <FaCarSide size={16} />
                  Add Left Slot
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addSlot("right")}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <FaCarSide size={16} />
                  Add Right Slot
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addSlot("center")}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <FaCarSide size={16} />
                  Add Center Slot
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={removeSlot}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2"
                  disabled={!selectedSlotId}
                >
                  <FaTrash size={16} />
                  Remove Slot
                </motion.button>
              </div>

              <div
                className="relative bg-gray-100 border h-[500px] rounded-lg overflow-hidden shadow-inner"
                style={{ width: "800px" }}
              >
                <AnimatePresence>
                  {layout.map((slot) => (
                    <motion.div
                      key={slot.id}
                      ref={(el) => (slotRefs.current[slot.id] = el)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, slot)}
                      onDrag={(e) => handleDrag(e, slot)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedSlotId(slot.id)}
                      onKeyDown={(e) => handleKeyDown(e, slot)}
                      tabIndex={0}
                      style={{
                        position: "absolute",
                        left: `${slot.x}px`,
                        top: `${slot.y}px`,
                        width: "80px",
                        height: "80px",
                        cursor: "move",
                        outline:
                          selectedSlotId === slot.id
                            ? "2px solid blue"
                            : "none",
                      }}
                      className={`border rounded-lg shadow-md flex items-center justify-center text-center text-sm font-bold focus:outline-none transition-all duration-200 ${
                        slot.isAdminOnly
                          ? "bg-purple-100 text-purple-800 border-purple-300"
                          : "bg-white border-gray-300"
                      } hover:shadow-lg`}
                      variants={slotVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <FaCarSide className="mr-1 text-lg" /> Slot{" "}
                      {slot.slotNumber}
                      {slot.isAdminOnly && <FaLock className="ml-1 text-sm" />}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAdminOnly(slot.id);
                        }}
                        className="ml-2 text-xs bg-gray-200 hover:bg-gray-300 rounded p-1"
                      >
                        Toggle Admin
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2 transition-all duration-200"
                >
                  <Save size={18} />
                  Save Layout
                </motion.button>
              </div>
            </>
          )}
        </main>
      </div>
    </motion.div>
  );
};

export default CustomizeSlotsPage;
