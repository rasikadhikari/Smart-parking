import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faWarehouse,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";
import { Line } from "react-chartjs-2";
import api from "../../services/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register required chart elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SuperAdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    if (!user || !user.role || user.role !== "superadmin") {
      navigate("/login", {
        state: { message: "Access restricted to superadmins only." },
      });
    } else {
      fetchData();
    }
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const [userRes, spaceRes, bookingRes] = await Promise.all([
        api.get("/users"),
        api.get("/parking-spaces"),
        api.get("/bookings/admin"),
      ]);
      setUsers(userRes.data);
      setSpaces(spaceRes.data);
      setBookings(bookingRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const generateMonthlyData = () => {
    const monthlyCounts = Array(12).fill(0);
    bookings.forEach((b) => {
      if (b.startTime) {
        const date = new Date(b.startTime);
        if (!isNaN(date.getTime())) {
          const month = date.getMonth();
          monthlyCounts[month]++;
        }
      }
    });
    return monthlyCounts;
  };

  const monthlyData = generateMonthlyData();

  const lineData = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets:
      bookings.length > 0
        ? [
            {
              label: "Monthly Bookings",
              data: monthlyData,
              fill: true,
              backgroundColor: "rgba(37, 99, 235, 0.1)",
              borderColor: "#2563EB",
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ]
        : [],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Bookings Over the Year",
      },
    },
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg fixed h-full z-10">
        <SuperadminSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex justify-between items-center"
        >
          <input
            type="text"
            placeholder="Search or type command..."
            className="p-3 w-80 border rounded-xl shadow-sm"
          />
        </motion.div>

        {/* Dashboard Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300">
            <div className="flex justify-between items-center">
              <FontAwesomeIcon
                icon={faUsers}
                className="text-blue-500 text-2xl"
              />
              <span className="text-gray-500">Users</span>
            </div>
            <h3 className="text-3xl font-semibold mt-4">{users.length}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300">
            <div className="flex justify-between items-center">
              <FontAwesomeIcon
                icon={faWarehouse}
                className="text-purple-500 text-2xl"
              />
              <span className="text-gray-500">Spaces Created</span>
            </div>
            <h3 className="text-3xl font-semibold mt-4">{spaces.length}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300">
            <div className="flex justify-between items-center">
              <FontAwesomeIcon
                icon={faClipboardList}
                className="text-yellow-500 text-2xl"
              />
              <span className="text-gray-500">All Bookings</span>
            </div>
            <h3 className="text-3xl font-semibold mt-4">{bookings.length}</h3>
          </div>
        </motion.div>

        {/* Chart Section */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {bookings.length === 0 ? (
            <div className="text-center text-gray-400 pt-10">
              No booking data to visualize yet.
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300 h-[400px]">
              <Line data={lineData} options={lineOptions} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
