import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  ListChecks,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const links = [
    { to: "/admin", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { to: "/create-slot", label: "Add Slots", icon: <Settings size={20} /> },
    { to: "/AllBookings", label: "Bookings", icon: <ListChecks size={20} /> },
    {
      to: "/Slot-Watchlist",
      label: "Slot Watchlist",
      icon: <ListChecks size={20} />,
    },
    {
      to: "/admin-booking",
      label: "User Booking",
      icon: <ListChecks size={20} />,
    },
  ];

  const sidebarVariants = {
    open: { x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    closed: { x: "-100%", transition: { duration: 0.3, ease: "easeIn" } },
  };

  const linkVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  };

  return (
    <>
      <motion.button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </motion.button>

      <motion.aside
        className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-xl border-r z-40 flex flex-col lg:translate-x-0"
        initial={false}
        animate={isOpen || window.innerWidth >= 1024 ? "open" : "closed"}
        variants={sidebarVariants}
      >
        <span className="text-xl font-semibold text-gray-800">
          Parking Superadmin
        </span>
        <div className="text-xs text-gray-500 font-semibold px-10 py-3 uppercase tracking-wider">
          Menu
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          <motion.ul
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
          >
            {links.map(({ to, label, icon }) => (
              <motion.li key={to} variants={linkVariants}>
                <Link
                  to={to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location.pathname === to
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {icon}
                  <span>{label}</span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </nav>

        <div className="mt-auto px-3 pb-5">
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 w-full"
            onClick={() => {
              setIsOpen(false);
              handleLogout();
            }}
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </motion.aside>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminSidebar;
