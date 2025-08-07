import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import { FiLogOut } from "react-icons/fi";
import api from "../services/api";
import io from "socket.io-client";
import defaultImage from "../assests/Default.jpg";

const Navbar = ({ handleLogout }) => {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(defaultImage);

  // Click outside to close notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize socket and user with token validation
  useEffect(() => {
    const validateAndSetUser = async () => {
      const userData = localStorage.getItem("user");
      console.log("userData", userData);
      const token = localStorage.getItem("token");
      console.log("token", token);
      if (userData && token) {
        try {
          // Validate token with backend
          const response = await api.get("/auth/validate-token");
          console.log("user response--->", response.data);
          if (!response.data.valid) {
            // Invalid token, clear storage and user
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            setUser(null);
            setImageSrc(defaultImage);
            return;
          }
          // Token valid, set user
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setImageSrc(parsedUser.image || defaultImage);

          const socket = io("http://localhost:5002", {
            auth: {
              token: localStorage.getItem("token"),
            },
          });

          socket.emit("join", parsedUser._id);

          const fetchNotifications = async () => {
            try {
              const response = await api.get("/notifications/received", {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              });
              setNotifications(response.data);
            } catch (error) {
              console.error("Error fetching notifications:", error);
            }
          };

          fetchNotifications();

          socket.on("newNotification", (newNotif) => {
            setNotifications((prev) => [newNotif, ...prev]);
          });

          return () => {
            socket.disconnect();
          };
        } catch (error) {
          // Network or other error, treat as invalid
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setUser(null);
          setImageSrc(defaultImage);
        }
      } else {
        setUser(null);
        setImageSrc(defaultImage);
      }
    };
    validateAndSetUser();
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(
        (n) => !n.readBy.includes(user._id)
      );
      await Promise.all(
        unreadNotifications.map((notif) =>
          api.put(
            `/notifications/read/${notif._id}`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          )
        )
      );
      setNotifications((prev) =>
        prev.map((notif) =>
          unreadNotifications.some((u) => u._id === notif._id)
            ? { ...notif, readBy: [...notif.readBy, user._id] }
            : notif
        )
      );
      setNotifOpen(true);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

  const unreadCount = notifications.filter(
    (n) => !n.readBy.includes(user?._id)
  ).length;

  const profilePath = user?.role === "admin" ? "/admin-profile" : "/profile";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-6 py-4 flex justify-between items-center shadow-md">
      <div>
        <Link to="/" className="text-2xl font-bold">
          Smart Parking
        </Link>
      </div>
      <div className="flex items-center space-x-4 relative">
        {user ? (
          <>
            {/* Notification Icon */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (unreadCount > 0) handleMarkAllAsRead();
                }}
                className="relative"
              >
                <FaBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white text-black rounded shadow-lg z-20 p-4">
                  <h3 className="font-semibold mb-2">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-sm">No notifications</p>
                  ) : (
                    notifications.map((notif) => (
                      <div key={notif._id} className="border-b py-2">
                        <div className="text-sm font-bold">
                          {notif.emote} {notif.title}
                        </div>
                        <div className="text-sm">{notif.message}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(notif.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)}>
                <img
                  src={imageSrc}
                  alt="User"
                  className="w-8 h-8 rounded-full"
                  onError={() => setImageSrc(defaultImage)}
                />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded shadow-md z-10 py-2">
                  {user && (
                    <Link
                      to={
                        user.role === "superadmin"
                          ? "/superadmin"
                          : user.role === "admin"
                          ? "/admin"
                          : "/dashboard"
                      }
                      className="block px-4 py-2 hover:bg-gray-200"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                  )}

                  {/* Conditionally Render Profile Settings */}
                  {user.role !== "superadmin" && (
                    <Link
                      to={profilePath}
                      className="block px-4 py-2 hover:bg-gray-200"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile Settings
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 hover:bg-red-100 text-red-600"
                  >
                    <FiLogOut /> Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:underline">
              Login
            </Link>
            <Link to="/register" className="hover:underline">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
