import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  MapPin,
  Bell,
  Users,
  PlusSquare,
  BookOpen,
} from "lucide-react";
import Logout from "./Logout";

import { useNavigate } from "react-router-dom";

const SuperadminSidebar = () => {
  const navigate = useNavigate();

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const location = useLocation();

  const links = [
    {
      to: "/superadmin",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    {
      to: "/all-user-booking",
      label: "Bookings",
      icon: <BookOpen size={20} />,
    },
    {
      to: "/parking-spaces",
      label: "Parking Spaces",
      icon: <MapPin size={20} />,
    },
    {
      to: "/superadmin/notifications",
      label: "Notifications",
      icon: <Bell size={20} />,
    },
    {
      to: "/superadmin-marker-manager",
      label: "Create Parking",
      icon: <PlusSquare size={20} />,
    },
    {
      to: "/superadmin-user-management",
      label: "Manage Users",
      icon: <Users size={20} />,
    },
    {
      to: "/Create-Admin",
      label: "Create Admin",
      icon: <Users size={20} />,
    },
  ];

  return (
    <aside className="h-full w-64 bg-white border-r shadow-lg">
      <div className="flex items-center gap-3 px-6 py-5 border-b">
        <div className="bg-blue-100 p-2 rounded-lg">
          <LayoutDashboard className="text-blue-600" />
        </div>
        <span className="text-xl font-semibold text-gray-800">
          Parking Superadmin
        </span>
      </div>

      <nav className="px-4 pt-4">
        <p className="text-gray-400 uppercase text-xs mb-2 font-semibold">
          Menu
        </p>
        <ul className="space-y-1">
          {links.map(({ to, label, icon }) => (
            <li key={to}>
              <Link
                to={to}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  location.pathname === to
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg group-hover:text-blue-600">
                  {icon}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-gray-400 uppercase text-xs mt-6 mb-2 font-semibold">
          Others
        </p>
        <ul className="space-y-1">
          <li>
            <Logout onLogout={handleLogout} />
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default SuperadminSidebar;
