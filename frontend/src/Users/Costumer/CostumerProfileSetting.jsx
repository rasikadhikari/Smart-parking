import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaInstagram,
  FaEdit,
} from "react-icons/fa";
import axios from "axios";
import api from "../../services/api";

const CustomerProfileSettings = () => {
  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    profileImage: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    vehicleInfo: { plateNumber: "" },
  });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isEditing, setIsEditing] = useState({
    personal: false,
    address: false,
    vehicle: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await api.get("/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserData(response.data);
      } catch (err) {
        setError("Failed to fetch profile data");
      }
    };
    fetchUserData();
  }, []);

  // Handle image upload to Cloudinary
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "your_cloudinary_upload_preset"); // Replace with your Cloudinary upload preset

      try {
        const response = await axios.post(
          "https://api.cloudinary.com/v1_1/deoxwu2pj/image/upload", // Replace with your Cloudinary cloud name
          formData
        );
        const newProfileImage = response.data.secure_url;
        setUserData({ ...userData, profileImage: newProfileImage });

        // Update profile image on the server
        const token = localStorage.getItem("token");
        await api.put(
          "/users/profile",
          { profileImage: newProfileImage },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("Profile image updated successfully");
      } catch (err) {
        setError("Failed to upload image");
      }
    }
  };

  // Handle form submission
  const handleSave = async (section) => {
    try {
      const token = localStorage.getItem("token");
      const updateData = {};
      if (section === "personal") {
        updateData.fullName = userData.fullName;
        updateData.email = userData.email;
        updateData.phone = userData.phone;
      } else if (section === "address") {
        updateData.address = userData.address;
      } else if (section === "vehicle") {
        updateData.vehicleInfo = {
          plateNumber: userData.vehicleInfo.plateNumber,
        };
      }

      await api.put("/users/profile", updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsEditing({ ...isEditing, [section]: false });
      setSuccess(
        `${
          section.charAt(0).toUpperCase() + section.slice(1)
        } information updated successfully`
      );
    } catch (err) {
      setError("Failed to update profile");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-6 space-y-6"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex justify-between items-center border-b pb-4"
        >
          <h1 className="text-2xl font-semibold text-gray-700">Profile</h1>
          <nav className="text-sm text-gray-500">
            <span>Home</span> <span className="text-gray-300"></span>{" "}
            <span>Profile</span>
          </nav>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="w-20 h-20 rounded-full overflow-hidden border-4 border-blue-200"
              >
                <img
                  src={previewUrl || userData.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {userData.fullName}
                </h2>
                <p className="text-gray-600">
                  User | {userData.address || "Location not set"}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <motion.a
                whileHover={{ scale: 1.2 }}
                href="#"
                className="text-blue-600"
              >
                <FaFacebookF />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.2 }}
                href="#"
                className="text-blue-400"
              >
                <FaTwitter />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.2 }}
                href="#"
                className="text-blue-700"
              >
                <FaLinkedinIn />
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.2 }}
                href="#"
                className="text-pink-600"
              >
                <FaInstagram />
              </motion.a>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => document.getElementById("imageInput").click()}
                className="text-gray-600 hover:text-gray-800"
              >
                <FaEdit />
              </motion.button>
              <input
                id="imageInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>
        </motion.div>

        {/* Personal Information Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Personal Information
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() =>
                setIsEditing({ ...isEditing, personal: !isEditing.personal })
              }
              className="text-gray-600 hover:text-gray-800"
            >
              <FaEdit />
            </motion.button>
          </div>
          <AnimatePresence>
            {isEditing.personal ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-gray-600">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={userData.fullName}
                    onChange={(e) =>
                      setUserData({ ...userData, fullName: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    onChange={(e) =>
                      setUserData({ ...userData, email: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Phone</label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) =>
                      setUserData({ ...userData, phone: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleSave("personal")}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Save
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-gray-800">{userData.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email address</p>
                  <p className="text-gray-800">{userData.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-gray-800">
                    {userData.phone || "Not provided"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Address Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Address</h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() =>
                setIsEditing({ ...isEditing, address: !isEditing.address })
              }
              className="text-gray-600 hover:text-gray-800"
            >
              <FaEdit />
            </motion.button>
          </div>
          <AnimatePresence>
            {isEditing.address ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-gray-600">Address</label>
                  <input
                    type="text"
                    value={userData.address}
                    onChange={(e) =>
                      setUserData({ ...userData, address: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleSave("address")}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Save
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-gray-800">
                    {userData.address || "Not provided"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Vehicle Information Section */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Vehicle Information
            </h3>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() =>
                setIsEditing({ ...isEditing, vehicle: !isEditing.vehicle })
              }
              className="text-gray-600 hover:text-gray-800"
            >
              <FaEdit />
            </motion.button>
          </div>
          <AnimatePresence>
            {isEditing.vehicle ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm text-gray-600">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={userData.vehicleInfo.plateNumber}
                    onChange={(e) =>
                      setUserData({
                        ...userData,
                        vehicleInfo: {
                          ...userData.vehicleInfo,
                          plateNumber: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleSave("vehicle")}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Save
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div>
                  <p className="text-sm text-gray-600">Plate Number</p>
                  <p className="text-gray-800">
                    {userData.vehicleInfo.plateNumber || "Not provided"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 text-center"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-green-600 text-center"
          >
            {success}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CustomerProfileSettings;
