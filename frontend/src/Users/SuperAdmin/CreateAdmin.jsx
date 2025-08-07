import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import api from "../../services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserPlus,
  faUsers,
  faParking,
} from "@fortawesome/free-solid-svg-icons";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { motion } from "framer-motion";

Chart.register(ArcElement, Tooltip, Legend);

const AdminPlayground = () => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "admin",
  });
  const [admins, setAdmins] = useState([]);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        api.get("/users"),
        api.get("/parking-spaces"),
      ]);

      setAdmins(
        aRes.data
          .map((user) => ({
            ...user,
            assignedSpaces: Array.isArray(user.assignedSpaces)
              ? user.assignedSpaces
              : [],
          }))
          .filter((user) => user.role === "admin")
      );
      setParkingSpaces(pRes.data);
    } catch {
      setError("Error loading data. Try again.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    setError("");
    setSuccess("");
  };

  const createAdmin = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      return setError("All fields are required.");
    }
    try {
      setLoading(true);
      await api.post("/auth/register", form);
      setSuccess("Admin created successfully!");
      setForm({ fullName: "", email: "", password: "", role: "admin" });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create admin.");
    } finally {
      setLoading(false);
    }
  };

  const assignSpace = async (adminId, spaceId) => {
    if (!spaceId) return;
    try {
      await api.post(`/parking-spaces/admins/${adminId}/assign-space`, {
        spaceId,
      });
      await loadData();
    } catch {
      setError("Error assigning parking space.");
    }
  };

  const chartData = {
    labels: admins.map((a) => a.fullName),
    datasets: [
      {
        label: "Assigned Spaces",
        data: admins.map((a) =>
          Array.isArray(a.assignedSpaces) ? a.assignedSpaces.length : 0
        ),
        backgroundColor: [
          "#3B82F6",
          "#EF4444",
          "#10B981",
          "#F59E0B",
          "#8B5CF6",
          "#EC4899",
          "#14B8A6",
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          font: { size: 14 },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-white border-r">
        <SuperadminSidebar active="adminPlayground" />
      </div>

      <main className="flex-1 px-8 py-12 bg-gray-50">
        <motion.h2
          className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FontAwesomeIcon icon={faUsers} className="text-blue-600" />
          Admin Playground
        </motion.h2>

        {/* Create Admin */}
        <motion.div
          className="bg-white p-6 rounded-lg shadow mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faUserPlus} /> Create New Admin
          </h3>
          <form
            onSubmit={createAdmin}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              { key: "fullName", placeholder: "Full Name" },
              { key: "email", placeholder: "Email" },
              { key: "password", placeholder: "Password" },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                name={key}
                type={key === "password" ? "password" : "text"}
                value={form[key]}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full border p-3 rounded"
              />
            ))}
            <button
              type="submit"
              disabled={loading}
              className={`sm:col-span-1 px-6 py-3 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition ${
                loading ? "opacity-50" : ""
              }`}
            >
              {loading ? "Creating..." : "Create Admin"}
            </button>
          </form>
          {error && <p className="text-red-600 mt-2">{error}</p>}
          {success && <p className="text-green-600 mt-2">{success}</p>}
        </motion.div>

        {/* Assigned Spaces Pie Chart */}
        <motion.div
          className="bg-white rounded-lg shadow mb-10 p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold mb-4">
            Parking Spaces per Admin
          </h3>
          <div className="max-w-xs mx-auto h-64">
            {admins.length > 0 ? (
              <Pie data={chartData} options={chartOptions} />
            ) : (
              <p className="text-gray-500 text-center">
                No admin data to display.
              </p>
            )}
          </div>
        </motion.div>

        {/* Admins List */}
        <motion.div
          className="bg-white rounded-lg shadow p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faParking} /> Manage Admins
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Spaces</th>
                  <th>Assign Space</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin._id} className="border-t">
                    <td className="py-3">{admin.fullName}</td>
                    <td>{admin.email}</td>
                    <td>
                      {Array.isArray(admin.assignedSpaces) &&
                      admin.assignedSpaces.length > 0
                        ? admin.assignedSpaces
                            .map((spaceId) => {
                              const space = parkingSpaces.find(
                                (ps) => ps._id === spaceId
                              );
                              return space ? space.name : "Unknown";
                            })
                            .join(", ")
                        : "—"}
                    </td>
                    <td>
                      <select
                        onChange={(e) => assignSpace(admin._id, e.target.value)}
                        defaultValue=""
                        className="border p-2 rounded"
                      >
                        <option value="">
                          {admin.assignedSpaces?.length > 0
                            ? "Assign"
                            : "Unassigned"}
                        </option>
                        {parkingSpaces.map((ps) => {
                          const isAssignedToAnyAdmin = admins.some((a) =>
                            Array.isArray(a.assignedSpaces)
                              ? a.assignedSpaces.includes(ps._id)
                              : false
                          );
                          return (
                            <option
                              key={ps._id}
                              value={ps._id}
                              disabled={isAssignedToAnyAdmin}
                            >
                              {ps.name}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminPlayground;
