import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

// Marker icon definition
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// SearchBox component
const SearchBox = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [debounceTimeout, setDebounceTimeout] = useState(null);

  const fetchSuggestions = async (text) => {
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${text}`
      );
      setSuggestions(res.data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimeout) clearTimeout(debounceTimeout);
    const timeout = setTimeout(() => {
      if (value.trim() !== "") fetchSuggestions(value);
      else setSuggestions([]);
    }, 500);
    setDebounceTimeout(timeout);
  };

  const handleSuggestionClick = (lat, lon, displayName) => {
    setQuery(displayName);
    setSuggestions([]);
    onSearch([parseFloat(lat), parseFloat(lon)]);
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        width: "400px",
      }}
    >
      <input
        type="text"
        placeholder="Search for parking nearby"
        value={query}
        onChange={handleInputChange}
        style={{
          width: "100%",
          padding: "8px",
          borderRadius: suggestions.length > 0 ? "8px 8px 0 0" : "8px",
          border: "1px solid #ccc",
        }}
      />
      {suggestions.length > 0 && (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            border: "1px solid #ccc",
            borderTop: "none",
            maxHeight: "150px",
            overflowY: "auto",
            backgroundColor: "white",
            borderRadius: "0 0 8px 8px",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() =>
                handleSuggestionClick(s.lat, s.lon, s.display_name)
              }
              style={{
                padding: "8px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {s.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Helper to update map center
const MapUpdater = ({ center }) => {
  const map = useMap();
  map.setView(center, 13);
  return null;
};

// Main component
const SmartMap = () => {
  const [mapCenter, setMapCenter] = useState([27.7172, 85.324]); // Default: Kathmandu
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParkingSpaces = async () => {
      try {
        const res = await api.get("/parking-spaces");
        setParkingSpaces(res.data);
      } catch (error) {
        console.error("Error fetching parking spaces:", error);
        alert("Failed to load parking spaces.");
      }
    };
    fetchParkingSpaces();
  }, []);

  const handleCheckSlots = async (parkingSpaceId) => {
    try {
      // Fetch slots for this parking space
      const res = await api.get(`/slots?parkingSpaceId=${parkingSpaceId}`);

      if (!res.data || res.data.length === 0) {
        // No slots — show under construction message
        alert("🚧 This parking space is under construction.");
        return;
      }

      // Slots exist — navigate to slots page
      navigate(`/slots/${parkingSpaceId}`, { state: { parkingSpaceId } });
    } catch (err) {
      console.error("Error checking slots:", err);
      alert("❌ Failed to check slots. Please try again.");
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "500px",
        zIndex: 0,
      }}
    >
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={mapCenter} />

        {parkingSpaces.map((space) => {
          const coords = space.location?.coordinates;
          if (!coords || coords.length < 2) return null;
          const lat = coords[1];
          const lng = coords[0];

          return (
            <Marker key={space._id} position={[lat, lng]} icon={markerIcon}>
              <Popup>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontWeight: "bold" }}>{space.name}</h3>
                  <p>{space.address}</p>
                  {space.description && (
                    <p style={{ color: "#555" }}>{space.description}</p>
                  )}
                  <button
                    style={{
                      marginTop: "8px",
                      padding: "6px 12px",
                      backgroundColor: "#2563EB",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCheckSlots(space._id)}
                  >
                    Check Available Slots
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <SearchBox onSearch={setMapCenter} />
    </div>
  );
};

export default SmartMap;
