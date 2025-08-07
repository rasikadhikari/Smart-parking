import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../services/api";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";
import SuperadminSidebar from "../../components/SuperadminSidebar"; // Adjust path as needed

interface ParkingSpace {
  _id?: string;
  name: string;
  address: string;
  description?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
}

const MarkerForm = ({
  position,
  onSave,
}: {
  position: [number, number];
  onSave: (ps: ParkingSpace) => void;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        location: {
          type: "Point",
          coordinates: [position[1], position[0]], // [lng, lat]
        },
      };
      const res = await api.post("/parking-spaces", payload);
      onSave(res.data);
    } catch (err: any) {
      alert(
        "Error creating marker: " + (err.response?.data?.message || err.message)
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 shadow-lg rounded space-y-2 max-w-sm"
    >
      <h2 className="font-bold">
        Add Marker at ({position[0].toFixed(5)}, {position[1].toFixed(5)})
      </h2>
      <input
        name="name"
        placeholder="Name"
        required
        className="w-full p-2 border rounded"
        onChange={handleChange}
      />
      <input
        name="address"
        placeholder="Address"
        required
        className="w-full p-2 border rounded"
        onChange={handleChange}
      />
      <textarea
        name="description"
        placeholder="Description"
        className="w-full p-2 border rounded"
        onChange={handleChange}
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white p-2 rounded"
      >
        Save
      </button>
    </form>
  );
};

const LocationMarker = ({
  onClick,
}: {
  onClick: (latlng: [number, number]) => void;
}) => {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const SearchBox = () => {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    const provider = new (OpenStreetMapProvider as any)();

    const searchControl = GeoSearchControl({
      provider,
      style: "bar",
      autoComplete: true,
      autoCompleteDelay: 250,
      showMarker: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
    });

    controlRef.current = searchControl;
    map.addControl(searchControl);

    return () => {
      map.removeControl(searchControl);
    };
  }, [map]);

  return null;
};

const SuperadminMarkerManager = () => {
  const [selectedLatLng, setSelectedLatLng] = useState<[number, number] | null>(
    null
  );
  const [markers, setMarkers] = useState<ParkingSpace[]>([]);
  const [activeDescription, setActiveDescription] = useState<string | null>(
    null
  );

  useEffect(() => {
    api
      .get("/parking-spaces")
      .then((res) => setMarkers(res.data))
      .catch((err) =>
        console.error("Error loading parking spaces:", err.message)
      );
  }, []);

  const handleNewMarker = (latlng: [number, number]) => {
    setSelectedLatLng(latlng);
    setActiveDescription(null); // Clear description when adding a new marker
  };

  const handleSave = (newMarker: ParkingSpace) => {
    setMarkers((prev) => [...prev, newMarker]);
    setSelectedLatLng(null);
  };

  // Add a handleLogout function
  const handleLogout = () => {
    // Implement your logout logic here, e.g., clearing tokens, redirecting, etc.
    console.log("Logout clicked");
  };

  return (
    <div className="flex h-screen w-full relative">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md z-[1000]">
        <SuperadminSidebar />
      </div>

      {/* Map Section */}
      <div className="flex-1 relative">
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          className="h-full w-full z-0"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <SearchBox />
          {markers.map((marker, index) => {
            const coords = marker.location?.coordinates;
            if (!coords || coords.length < 2) return null;
            const lat = coords[1];
            const lng = coords[0];
            return (
              <Marker
                key={index}
                position={{ lat, lng }}
                icon={L.icon({
                  iconUrl:
                    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
                })}
                eventHandlers={{
                  click: () => {
                    setActiveDescription(
                      `${marker.name} — ${
                        marker.description || "No description"
                      }`
                    );
                  },
                }}
              >
                <Popup>
                  <div className="text-center">
                    <h3 className="font-bold">{marker.name}</h3>
                    <p>{marker.address}</p>
                    {marker.description && (
                      <p className="text-gray-600">{marker.description}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
          <LocationMarker onClick={handleNewMarker} />
        </MapContainer>

        {/* Form Overlay */}
        {selectedLatLng && (
          <div className="absolute top-4 left-4 z-[1000]">
            <MarkerForm position={selectedLatLng} onSave={handleSave} />
          </div>
        )}

        {/* Description Box */}
        {activeDescription && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded p-4 z-[1000] max-w-md text-center">
            <p className="text-gray-700">{activeDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperadminMarkerManager;
