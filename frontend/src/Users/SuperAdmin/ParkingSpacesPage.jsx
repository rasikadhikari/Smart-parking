import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import api from "../../services/api";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import { motion } from "framer-motion";

const socket = io("http://localhost:5002");

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ParkingSpaceForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    coordinates: {
      lat: "",
      lng: "",
    },
  });
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const fetchParkingSpaces = async () => {
    try {
      const response = await api.get("/parking-spaces");
      setParkingSpaces(response.data);
    } catch {
      toast.error("Failed to load parking spaces");
    }
  };

  useEffect(() => {
    fetchParkingSpaces();
    socket.on("parkingSpacesUpdate", (data) => {
      if (data.newSpace) {
        setParkingSpaces((prev) => [...prev, data.newSpace]);
      } else if (data.deletedId) {
        setParkingSpaces((prev) =>
          prev.filter((space) => space._id !== data.deletedId)
        );
      }
    });
    return () => socket.off("parkingSpacesUpdate");
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "lat" || name === "lng") {
      setFormData((prev) => ({
        ...prev,
        coordinates: { ...prev.coordinates, [name]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/parking-spaces", {
        ...formData,
        location: {
          type: "Point",
          coordinates: [
            parseFloat(formData.coordinates.lng),
            parseFloat(formData.coordinates.lat),
          ],
        },
      });
      toast.success("Parking space added successfully!");
      setFormData({
        name: "",
        address: "",
        description: "",
        coordinates: { lat: "", lng: "" },
      });
    } catch {
      toast.error("Failed to add parking space");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/parking-spaces/${id}`);
      toast.success("Parking space deleted");
    } catch {
      toast.error("Failed to delete parking space");
    }
  };

  return (
    <div className="flex min-h-screen">
      <SuperadminSidebar />
      <main className="flex-1 px-6 py-10 bg-gray-50 min-h-screen">
        <motion.h1
          className="text-3xl font-bold mb-6 text-blue-900"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Add Parking Space
        </motion.h1>

        <motion.form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {[
            { name: "name", label: "Name", placeholder: "Enter name" },
            { name: "address", label: "Address", placeholder: "Enter address" },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-gray-700 font-semibold mb-2">
                {label}
              </label>
              <input
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder={placeholder}
                required
                disabled={loading}
              />
            </div>
          ))}

          <div className="md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-2">
              Description
            </label>
            <input
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Enter description"
              disabled={loading}
            />
          </div>

          {[
            { name: "lat", label: "Latitude", placeholder: "Latitude" },
            { name: "lng", label: "Longitude", placeholder: "Longitude" },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-gray-700 font-semibold mb-2">
                {label}
              </label>
              <input
                type="number"
                step="any"
                name={name}
                value={formData.coordinates[name]}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder={placeholder}
                required
                disabled={loading}
              />
            </div>
          ))}

          <div className="md:col-span-2 text-right">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all"
            >
              {loading ? "Saving..." : "Add Parking Space"}
            </button>
          </div>
        </motion.form>

        <div className="mt-10">
          <motion.h2
            className="text-2xl font-bold mb-4 text-blue-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Parking Spaces
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-4">
            {parkingSpaces.map((space) => (
              <motion.div
                key={space._id}
                className="bg-white p-4 rounded-lg shadow border relative hover:shadow-md transition-all"
                whileHover={{ scale: 1.02 }}
              >
                <h3 className="text-xl font-semibold text-blue-800">
                  {space.name}
                </h3>
                <p className="text-gray-700">Address: {space.address}</p>
                {space.description && (
                  <p className="text-gray-600 mt-1">
                    Description: {space.description}
                  </p>
                )}
                {space.location?.coordinates?.length ? (
                  <p className="text-gray-600 mt-1">
                    Coordinates: {space.location.coordinates[1]},{" "}
                    {space.location.coordinates[0]}
                  </p>
                ) : (
                  <p className="text-gray-600 mt-1">
                    Coordinates: Not available
                  </p>
                )}

                <div className="mt-3 flex gap-4">
                  <button
                    onClick={() => handleDelete(space._id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      if (space.location?.coordinates?.length) {
                        setSelectedLocation(space);
                        setIsMapOpen(true);
                      } else {
                        toast.error(
                          "No coordinates available for this location"
                        );
                      }
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    View on Map
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {isMapOpen && selectedLocation?.location?.coordinates?.length && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-xl relative">
              <button
                onClick={() => setIsMapOpen(false)}
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
              <h2 className="text-xl font-bold mb-2">Parking Space Location</h2>
              <MapContainer
                center={[
                  selectedLocation.location.coordinates[1],
                  selectedLocation.location.coordinates[0],
                ]}
                zoom={16}
                style={{ height: "400px", width: "100%" }}
              >
                <TileLayer
                  attribution='© <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  position={[
                    selectedLocation.location.coordinates[1],
                    selectedLocation.location.coordinates[0],
                  ]}
                  icon={markerIcon}
                >
                  <Popup>Parking Space Location</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ParkingSpaceForm;
