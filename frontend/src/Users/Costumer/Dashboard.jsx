import React, { useState, useEffect } from "react";
import SmartMap from "../../components/Map/SmartMap";
import api from "../../services/api";
import { useSocketListeners } from "../../hooks/useSocketListeners";
import "../../../src/styles/Dashboard.css";

/**
 * @typedef {Object} Booking
 * @property {string} _id
 * @property {{ _id: string, name: string, location: { coordinates: [number, number] } }} parkingSpaceId
 * @property {{ slotNumber: string }} slotId
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} paymentStatus
 * @property {string} vehicleNumber
 * @property {string} vehicleType
 */

/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} fullName
 * @property {string} email
 */

/**
 * @typedef {Object} ParkingSpace
 * @property {string} _id
 * @property {string} name
 * @property {string} address
 * @property {string} [description]
 * @property {{ type: "Point", coordinates: [number, number] }} location
 * @property {{ isAvailable: boolean, slotNumber: string, _id: string }[]=} slots
 */

const CustomerDashboard = () => {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState({});
  const [lastBooking, setLastBooking] = useState(null);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [slots, setSlots] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [sortOption, setSortOption] = useState("distance");
  const [mapCenter, setMapCenter] = useState([27.7172, 85.324]);
  // Use Socket.IO listeners
  useSocketListeners({ setSlots, setBookings, setParkingSpaces });

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log("Loaded user from localStorage:", parsedUser);
      } catch (err) {
        console.error("Failed to parse user from localStorage:", err);
      }
    }
  }, []);

  // Fetch initial parking spaces and slots
  useEffect(() => {
    const fetchParkingSpaces = async () => {
      try {
        const res = await api.get("/parking-spaces");
        const spaces = await Promise.all(
          res.data.map(async (space) => {
            try {
              const slotsRes = await api.get(
                `/slots?parkingSpaceId=${space._id}`
              );
              return { ...space, slots: slotsRes.data };
            } catch (err) {
              console.error(`Error fetching slots for ${space._id}:`, err);
              return { ...space, slots: [] };
            }
          })
        );
        setParkingSpaces(spaces);
      } catch (err) {
        console.error("Error fetching parking spaces:", err);
      }
    };
    fetchParkingSpaces();
  }, []);
  useEffect(() => {
    const fetchLastBooking = async () => {
      try {
        const res = await api.get("/bookings/my-bookings", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        console.log("booking info:", res.data);
        if (res.data?.length > 0) {
          setLastBooking(res.data[0]); // already sorted by startTime descending
        }
      } catch (err) {
        console.error("Failed to fetch user bookings:", err);
      }
    };

    fetchLastBooking();
  }, []);

  // Convert bookings object to array for display
  const bookingList = Object.values(bookings).flat();

  // Filter and sort parking spaces
  const filteredParkingSpaces = parkingSpaces
    .filter(
      (space) =>
        !showAvailableOnly || space.slots?.some((slot) => slot.isAvailable)
    )
    .sort((a, b) => {
      if (sortOption === "distance") {
        const coordsA = a?.location?.coordinates;
        const coordsB = b?.location?.coordinates;

        if (
          !Array.isArray(coordsA) ||
          coordsA.length < 2 ||
          !Array.isArray(coordsB) ||
          coordsB.length < 2
        ) {
          return 0; // fallback: do not sort if coordinates are invalid
        }

        const distA = Math.hypot(
          coordsA[1] - mapCenter[0],
          coordsA[0] - mapCenter[1]
        );
        const distB = Math.hypot(
          coordsB[1] - mapCenter[0],
          coordsB[0] - mapCenter[1]
        );
        return distA - distB;
      }

      return 0;
    });

  return (
    <div className="dashboard-container">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <h2 className="sidebar-title">Filters & Info</h2>

        <div className="account-info">
          <p>
            <strong>Your Account</strong>
          </p>
          <p>
            Username:{" "}
            <span className="username">{user?.fullName || "Loading..."}</span>
          </p>
          <div className="last-booking-box">
            <h3>Last Booking</h3>
            {lastBooking ? (
              <>
                <p>
                  <strong>Location:</strong> {lastBooking.parkingSpaceId?.name}
                </p>
                <p>
                  <strong>Slot:</strong> {lastBooking.slotId?.slotNumber}
                </p>
                <p>
                  <strong>Time:</strong>{" "}
                  {new Date(lastBooking.startTime).toLocaleString()} –{" "}
                  {new Date(lastBooking.endTime).toLocaleString()}
                </p>
                <p>
                  <strong>Status:</strong> {lastBooking.paymentStatus}
                </p>
                <p>
                  <strong>Vehicle:</strong> {lastBooking.vehicleType} (
                  {lastBooking.vehicleNumber})
                </p>
              </>
            ) : (
              <p>No recent bookings</p>
            )}
          </div>
          <button className="btn-profile">View Profile</button>
        </div>

        <div className="filters">
          <p>
            <strong>Filter Parking</strong>
          </p>
          <label>
            <input
              type="checkbox"
              checked={showAvailableOnly}
              onChange={(e) => setShowAvailableOnly(e.target.checked)}
            />
            Show Available Only
          </label>
          <select
            className="sort-dropdown"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="distance">Sort by Distance</option>
            <option value="price">Sort by Price</option>
            <option value="availability">Sort by Availability</option>
          </select>
        </div>

        <div className="bookings">
          <p>
            <strong>Recent Bookings</strong>
          </p>
          {bookingList.length > 0 ? (
            bookingList.slice(0, 3).map((booking) => (
              <div key={booking._id} className="booking-item">
                <p>
                  <strong>{booking.parkingSpaceId.name}</strong> - Slot{" "}
                  {booking.slotId.slotNumber}
                </p>
                <p>
                  {new Date(booking.startTime).toLocaleString()} -{" "}
                  {new Date(booking.endTime).toLocaleString()}
                </p>
                <p>Status: {booking.paymentStatus}</p>
              </div>
            ))
          ) : (
            <p>No recent bookings</p>
          )}
        </div>
      </aside>

      {/* Main Map Area */}
      <main className="dashboard-map">
        <div className="dashboard-header">
          <h1>Your Dashboard</h1>
        </div>
        <div className="map-wrapper">
          <SmartMap
            parkingSpaces={filteredParkingSpaces}
            onSearch={setMapCenter}
          />
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
