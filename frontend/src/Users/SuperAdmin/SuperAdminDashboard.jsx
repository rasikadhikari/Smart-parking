import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faShoppingCart,
  faBullseye,
 
} from "@fortawesome/free-solid-svg-icons";
import { Bar, Line } from "react-chartjs-2";
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
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const SuperAdminDashboard = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !user.role || user.role !== "superadmin") {
      navigate("/login", {
        state: { message: "Access restricted to superadmins only." },
      });
    }
  }, [user, navigate]);

  const barData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Sales",
        data: [12000, 19000, 3000, 5000, 2000, 3000, 9000],
        backgroundColor: "#2563EB",
        borderRadius: 8,
      },
    ],
  };

  const lineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Revenue",
        data: [400, 800, 1000, 1200, 1800, 2200, 1700],
        borderColor: "#10B981",
        backgroundColor: "#D1FAE5",
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg fixed h-full z-10">
        <SuperadminSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        {/* Search Bar */}
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
            <h3 className="text-3xl font-semibold mt-4">3,782</h3>
            
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300">
            <div className="flex justify-between items-center">
              <FontAwesomeIcon
                icon={faShoppingCart}
                className="text-purple-500 text-2xl"
              />
              <span className="text-gray-500">Orders</span>
            </div>
            <h3 className="text-3xl font-semibold mt-4">5,359</h3>
           
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300">
            <div className="flex justify-between items-center">
              <FontAwesomeIcon
                icon={faBullseye}
                className="text-yellow-500 text-2xl"
              />
              <span className="text-gray-500">Target</span>
            </div>
            <h3 className="text-3xl font-semibold mt-4">Rs 20K</h3>
          
          </div>
        </motion.div>

        {/* Charts */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300">
            <h4 className="text-lg font-semibold mb-4">Monthly Sales</h4>
            <Bar data={barData} />
          </div>

          <div className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300">
            <h4 className="text-lg font-semibold mb-4">Weekly Revenue</h4>
            <Line data={lineData} />
          </div>
        </motion.div>

        {/* Revenue Overview */}
        <motion.div
          className="bg-white p-6 rounded-xl shadow hover:shadow-xl transition duration-300 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <h4 className="text-lg text-gray-600">Target</h4>
              <p className="text-2xl font-bold text-red-500">$20K</p>
            </div>
            <div>
              <h4 className="text-lg text-gray-600">Revenue</h4>
              <p className="text-2xl font-bold text-green-500">$20K</p>
            </div>
            <div>
              <h4 className="text-lg text-gray-600">Today</h4>
              <p className="text-2xl font-bold text-green-500">$20K</p>
            </div>
          </div>
          <div className="flex justify-center mt-4 space-x-2">
            <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded">
              Monthly
            </button>
            <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded">
              Quarterly
            </button>
            <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded">
              Annually
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
