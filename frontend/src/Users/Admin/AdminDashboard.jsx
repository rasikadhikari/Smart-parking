import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";
import io from "socket.io-client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import AdminSidebar from "../../components/AdminSidebar";
import {
  Users,
  ParkingCircle,
  DollarSign,
  Activity,
  AlertCircle,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const socket = io("http://localhost:5002", {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  withCredentials: true,
});

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalBookings: 0,
    activeSlots: 0,
    offlineBookings: 0,
    totalRevenue: 0,
    totalParkingSpaces: 0,
  });

  const [chartData, setChartData] = useState({ labels: [], data: [] });
  const [paymentDistribution, setPaymentDistribution] = useState({
    paid: 0,
    pending: 0,
    failed: 0,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    if (!storedUser || !"admin".includes(storedUser.role)) {
      navigate("/login", {
        state: { message: "Unauthorized access. Please log in as an admin." },
      });
      return;
    }

    const fetchStats = async () => {
      try {
        const userId = storedUser?._id || storedUser?.id;

        const spaceResponse = await api.get(
          `/parking-spaces/assigned/${userId}`
        );
        const mySpaces = spaceResponse.data;

        if (mySpaces.length === 0) {
          setError(
            "No parking space assigned to this admin. Please Contact the Superadmin"
          );
          setLoading(false);
          return;
        }

        const selectedSpace = mySpaces[0];
        const parkingSpaceId = selectedSpace._id;

        if (!parkingSpaceId) {
          setError("Missing parkingSpaceId.");
          setLoading(false);
          return;
        }

        const slotsResponse = await api.get(
          `/slots?parkingSpaceId=${parkingSpaceId}`
        );
        const slots = slotsResponse.data;
        const totalBookings = slots.length;
        const activeSlots = slots.filter((s) => s.isAvailable).length;
        const offlineBookings = slots.filter((s) => s.isLocked).length;
        const totalRevenue = slots.reduce(
          (sum, s) => sum + (s.payment?.amount || 0),
          0
        );

        setStats({
          totalBookings,
          activeSlots,
          offlineBookings,
          totalRevenue,
          totalParkingSpaces: 1,
        });

        setLoading(false);
      } catch (error) {
        console.log("Error fetching admin stats:", error);
        setError("Failed to load admin stats.");
        setLoading(false);
      }
    };

    fetchStats();

    socket.on("bookingsUpdate", fetchStats);
    socket.on("parkingSpacesUpdate", fetchStats);

    return () => {
      socket.off("bookingsUpdate");
      socket.off("parkingSpacesUpdate");
    };
  }, [navigate]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
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

  if (loading) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 text-gray-600">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Activity size={24} />
          </motion.div>
          <span className="text-lg font-medium">Loading Dashboard...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
          <AlertCircle size={24} />
          <span className="text-lg">{error}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <AdminSidebar />
      <div className="flex flex-1 flex-col w-full">
        <header className="bg-white shadow-lg px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <motion.h1
              className="text-2xl md:text-3xl font-bold text-blue-600 flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Users size={28} />
              Admin Dashboard
            </motion.h1>
          </div>
        </header>

        <main className="flex-1 lg:pl-64 pt-6 px-4 md:px-6">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8 md:mb-12"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            <Card
              title="Total Bookings"
              value={stats.totalBookings}
              icon={<Users size={24} />}
              color="bg-blue-100 text-blue-600"
              variants={cardVariants}
            />
            <Card
              title="Active Slots"
              value={stats.activeSlots}
              icon={<ParkingCircle size={24} />}
              color="bg-green-100 text-green-600"
              variants={cardVariants}
            />
            <Card
              title="Offline Bookings"
              value={stats.offlineBookings}
              icon={<Activity size={24} />}
              color="bg-yellow-100 text-yellow-600"
              variants={cardVariants}
            />
            <Card
              title="Revenue (NPR)"
              value={stats.totalRevenue.toFixed(2)}
              icon={<DollarSign size={24} />}
              color="bg-red-100 text-red-600"
              variants={cardVariants}
            />
            <Card
              title="Parking Spaces"
              value={stats.totalParkingSpaces}
              icon={<ParkingCircle size={24} />}
              color="bg-purple-100 text-purple-600"
              variants={cardVariants}
            />
          </motion.div>

          <motion.div
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 px-4 md:px-0 pb-6"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.2 },
              },
            }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6"
              variants={cardVariants}
            >
              <Line
                data={{
                  labels: chartData.labels,
                  datasets: [
                    {
                      label: "Bookings Per Month",
                      data: chartData.data,
                      borderColor: "rgba(59, 130, 246, 1)",
                      backgroundColor: "rgba(59, 130, 246, 0.2)",
                      tension: 0.3,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    title: {
                      display: true,
                      text: "Monthly Bookings Trend",
                      font: { size: 16, weight: "bold" },
                      padding: { top: 10, bottom: 30 },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: "rgba(0, 0, 0, 0.05)" },
                    },
                    x: {
                      grid: { display: false },
                    },
                  },
                }}
              />
            </motion.div>
            <motion.div
              className="bg-white rounded-xl shadow-lg p-6"
              variants={cardVariants}
            >
              <Pie
                data={{
                  labels: ["Paid", "Pending", "Failed"],
                  datasets: [
                    {
                      data: [
                        paymentDistribution.paid,
                        paymentDistribution.pending,
                        paymentDistribution.failed,
                      ],
                      backgroundColor: ["#22c55e88", "#eab30888", "#ef444488"],
                      borderColor: ["#22c55e", "#eab308", "#ef4444"],
                      borderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: "top",
                      labels: { font: { size: 14 } },
                    },
                    title: {
                      display: true,
                      text: "Payment Status Distribution",
                      font: { size: 16, weight: "bold" },
                      padding: { top: 10, bottom: 30 },
                    },
                  },
                }}
              />
            </motion.div>
          </motion.div>
        </main>
      </div>
    </motion.div>
  );
};

const Card = ({ title, value, icon, color, variants }) => (
  <motion.div
    className={`p-6 rounded-xl shadow-lg ${color} transform hover:scale-105 transition-transform duration-300`}
    variants={variants}
  >
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </motion.div>
);

export default AdminDashboard;
