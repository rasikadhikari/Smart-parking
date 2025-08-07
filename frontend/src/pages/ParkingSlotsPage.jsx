import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { socket } from "../hooks/useSocketListeners";
import {
  CheckCircleIcon,
  LockClosedIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { toast } from "react-toastify";

const ParkingSlotpage = () => {
  const {
    user,
    selectedParkingSpaceId,
    parkingSpaces,
    setSelectedParkingSpaceId,
  } = useAuth();
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [error, setError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const startTimeInputRef = useRef(null);
  console.log(selectedSlot);
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedParkingSpaceId || !user) return;
      setLoading(true);
      try {
        console.log(
          "Fetching slots for parkingSpaceId:",
          selectedParkingSpaceId
        );
        const slotsRes = await api.get(
          `/slots?parkingSpaceId=${selectedParkingSpaceId}`
        );
        setSlots(slotsRes.data);
        console.log("Slots fetched:", slotsRes.data);

        console.log("Fetching bookings for user:", user._id);
        const bookingsRes = await api.get(
          user.role === "admin" || user.role === "superadmin"
            ? `/bookings/admin?parkingSpaceId=${selectedParkingSpaceId}`
            : `/bookings/my-bookings?parkingSpaceId=${selectedParkingSpaceId}`
        );
        setBookings(
          bookingsRes.data.filter((booking) => {
            const now = new Date();
            return booking.endTime > now || booking.paymentStatus === "success";
          })
        );
      } catch (err) {
        const errorMsg = err.response?.data?.message || "Error loading data";
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedParkingSpaceId, user]);

  useEffect(() => {
    const handleSlotsUpdate = (data) => {
      console.log("Received slotsUpdate:", data);
      if (data.parkingSpaceId === selectedParkingSpaceId) {
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

    const handleBookingsUpdate = (data) => {
      console.log("Received bookingsUpdate:", data);
      if (data.parkingSpaceId === selectedParkingSpaceId) {
        setBookings(
          data.bookings.filter((booking) => {
            const now = new Date();
            return booking.endTime > now || booking.paymentStatus === "success";
          })
        );
      }
    };

    socket.on("slotsUpdate", handleSlotsUpdate);
    socket.on("bookingsUpdate", handleBookingsUpdate);

    return () => {
      socket.off("slotsUpdate", handleSlotsUpdate);
      socket.off("bookingsUpdate", handleBookingsUpdate);
    };
  }, [selectedParkingSpaceId]);

  useEffect(() => {
    if (showModal && startTimeInputRef.current) {
      startTimeInputRef.current.focus();
    }
  }, [showModal]);

  const getSlotStatus = (slot) => {
    const now = new Date();
    if (slot.isAvailable && !slot.isLocked) {
      return { status: "Available", user: null };
    }

    const booking = bookings.find(
      (b) =>
        b.slotId?._id === slot._id &&
        b.paymentStatus === "success" &&
        new Date(b.endTime) > now
    );
    if (booking) {
      return {
        status: "Booked",
        user: booking.userId?.fullName || booking.guestName || "Unknown",
      };
    }

    if (
      slot.isLocked &&
      slot.bookingExpiresAt &&
      new Date(slot.bookingExpiresAt) > now
    ) {
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
      new Date(slot.bookingExpiresAt) <= now
    ) {
      return { status: "Available", user: null };
    }

    if (slot.isLocked) {
      return { status: "Locked", user: "Unknown" };
    }

    return { status: "Available", user: null };
  };

  const handleSlotClick = async (slot) => {
    try {
      console.log("Fetching slot:", slot._id);
      const res = await api.get(`/slots/${slot._id}`);
      const freshSlot = res.data;

      if (!slot.isAvailable || slot.isLocked) {
        toast.error("This slot is no longer available.");
        return;
      }

      console.log("Locking slot:", slot._id);
      const response = await api.post(`/slots/lock/${slot._id}`, {
        bookingDuration: 15,
      });
      const updatedSlot = response.data;
      console.log(updatedSlot,'updatedSlot after lock');
      setSelectedSlot(updatedSlot);
      // setShowModal(true);
      setStartTime("");
      setEndTime("");
      setVehicleNumber("");
      setVehicleType("");
      setError("");
      // socket.emit("lockSlot", updatedSlot);
      toast.success("Slot locked successfully");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to lock slot";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setModalLoading(true);

    try {
      if (!selectedSlot?._id) {
        throw new Error("No slot selected for booking");
      }
      if (!startTime || !endTime) {
        throw new Error("Please select both start and end times");
      }
      if (!vehicleNumber) {
        throw new Error("Please enter the vehicle number");
      }
      if (!/^[A-Z]{2}-\d{4}$/.test(vehicleNumber)) {
        throw new Error(
          "Vehicle number must be in the format XX-1234 (e.g., AB-1234)"
        );
      }
      if (!vehicleType) {
        throw new Error("Please select a vehicle type");
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      const now = new Date();
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date/time selected");
      }
      if (start < now) {
        throw new Error("Start time cannot be in the past");
      }
      if (end <= start) {
        throw new Error("End time must be after start time");
      }

      const duration = Math.round((end - start) / (1000 * 60));
      if (duration <= 0) {
        throw new Error("Duration must be greater than 0 minutes");
      }

      const bookingPayload = {
        slotId: selectedSlot._id,
        startTime,
        endTime,
        duration,
        vehicleNumber,
        vehicleType,
        parkingSpaceId: selectedParkingSpaceId,
        userId: user?._id || user?.id,
        guestName: user?.fullName || null,
      };

      console.log("Booking payload:", bookingPayload);
      const response = await api.post("/bookings", bookingPayload);
      setShowModal(false);
      console.log(response.data, 'paymentUrl');

      if (response.data?.paymentUrl) {
        window.location.href = response.data.paymentUrl;
        handleSlotClick(selectedSlot);
      } else {
        toast.success("Booking initiated successfully!");
      }
      // if (response.data?.bookingId) {
      // toast.success("Booking initiated successfully!");
      // }
     
      
      
     
    } catch (err) {
      console.log(err.response?.data, 'err.response.data');
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Error processing booking";
      setError(errorMsg);
      toast.error(errorMsg);
      // if (selectedSlot?._id) {
      //   try {
      //     console.log("Unlocking slot:", selectedSlot._id);
      //     await api.post(`/slots/unlock/${selectedSlot._id}`);
      //   } catch (unlockErr) {
      //     console.error("Error unlocking slot:", unlockErr);
      //   }
      // }
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalClose = async () => {
    // if (selectedSlot?._id) {
    //   try {
    //     console.log("Unlocking slot on modal close:", selectedSlot._id);
    //     await api.post(`/slots/unlock/${selectedSlot._id}`);
    //   } catch (err) {
    //     console.error("Error unlocking slot:", err);
    //   }
    // }
    setShowModal(false);
    setError("");
    setStartTime("");
    setEndTime("");
    setVehicleNumber("");
    setVehicleType("");
    setSelectedSlot(null);
  };

  const getCoordinates = (space) => {
    if (
      space.location?.type === "Point" &&
      Array.isArray(space.location.coordinates)
    ) {
      const [longitude, latitude] = space.location.coordinates;
      return { latitude, longitude };
    }
    return { latitude: null, longitude: null };
  };

  const renderSlot = (slot) => {
    const { status, user: bookedBy } = getSlotStatus(slot);
    const icon =
      status === "Available" ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500" />
      ) : status === "Booked" ? (
        <XCircleIcon className="h-5 w-5 text-red-500" />
      ) : (
        <LockClosedIcon className="h-5 w-5 text-yellow-500" />
      );

    const isClickable = status === "Available";

    return (
      <div
        key={slot._id}
        style={{
          position: "absolute",
          left: `${slot.x}px`,
          top: `${slot.y}px`,
          width: 90,
          height: 70,
          cursor: isClickable ? "pointer" : "not-allowed",
        }}
        //&& handleSlotClick(slot)
        onClick={() =>{ 
          if(isClickable ){
            setSelectedSlot(slot);
            setShowModal(true)
          }
        
        }


        }
        className={`p-2 border-l-4 rounded-lg shadow-md transition-all duration-300 ${
          status === "Available"
            ? "bg-green-50 border-green-500 hover:bg-green-100"
            : status === "Booked"
            ? "bg-red-50 border-red-500"
            : "bg-yellow-50 border-yellow-500"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs">Slot {slot.slotNumber}</h3>
          {icon}
        </div>
        <p className="text-xs">Status: {status}</p>
        {bookedBy && <p className="text-xs">By: {bookedBy}</p>}
        {slot.isAdminOnly && (
          <span className="text-xs text-blue-500">(Admin Only)</span>
        )}
        {slot.bookingExpiresAt && status === "Locked" && (
          <p className="text-xs">
            Expires: {new Date(slot.bookingExpiresAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-blue-700">
        Select Parking Space
      </h2>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <select
        value={selectedParkingSpaceId || ""}
        onChange={(e) => setSelectedParkingSpaceId(e.target.value)}
        className="p-3 border border-gray-300 rounded-lg w-full max-w-md mb-6 focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select a parking space</option>
        {parkingSpaces.map((space) => {
          const { latitude, longitude } = getCoordinates(space);
          return (
            <option key={space._id} value={space._id}>
              {space.name}{" "}
              {latitude != null && longitude != null
                ? `(${latitude.toFixed(3)}, ${longitude.toFixed(3)})`
                : "(No coordinates)"}
            </option>
          );
        })}
      </select>

      <div className="bg-gray-100 border rounded-xl p-6 shadow-inner relative overflow-hidden w-full h-full min-h-screen">
        {loading ? (
          <p className="text-center">Loading slots...</p>
        ) : slots.length > 0 ? (
          slots.map(renderSlot)
        ) : (
          <p className="text-center text-gray-500">No slots available.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-blue-700">
                Book Slot {selectedSlot?.slotNumber}
              </h3>
              <button
                onClick={handleModalClose}
                disabled={modalLoading}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  ref={startTimeInputRef}
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setError("");
                  }}
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setError("");
                  }}
                  required
                  min={startTime || new Date().toISOString().slice(0, 16)}
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => {
                    setVehicleNumber(e.target.value.toUpperCase());
                    setError("");
                  }}
                  required
                  placeholder="e.g., AB-1234"
                  pattern="[A-Z]{2}-\d{4}"
                  title="Vehicle number must be in the format XX-1234 (e.g., AB-1234)"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => {
                    setVehicleType(e.target.value);
                    setError("");
                  }}
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select vehicle type</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="Truck">Truck</option>
                  <option value="Motorcycle">Motorcycle</option>
                </select>
              </div>
              {startTime &&
                endTime &&
                !isNaN(new Date(startTime).getTime()) &&
                !isNaN(new Date(endTime).getTime()) && (
                  <p className="text-sm text-gray-600">
                    Duration:{" "}
                    {Math.round(
                      (new Date(endTime) - new Date(startTime)) / (1000 * 60)
                    )}{" "}
                    minutes
                  </p>
                )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  disabled={modalLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
                    modalLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {modalLoading ? "Processing..." : "Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParkingSlotpage;
