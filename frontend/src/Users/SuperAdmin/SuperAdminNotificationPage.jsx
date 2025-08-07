// src/pages/SuperAdminNotificationPage.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { Textarea } from "../../components/ui/textarea.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Button } from "../../components/ui/button.tsx";
import EmojiPicker from "emoji-picker-react";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import { motion } from "framer-motion";

const SuperAdminNotificationPage = ({ user }) => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [roleTarget, setRoleTarget] = useState("all");
  const [emote, setEmote] = useState("📣");
  const [sentNotifications, setSentNotifications] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "superadmin") {
      navigate("/login");
    } else {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications/received");
      console.log("Fetched notifications----->:", res.data);
      setSentNotifications(res.data);
    } catch (err) {
      toast.error("Failed to fetch notifications");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      return toast.error("All fields are required");
    }

    try {
      await api.post("/notifications", {
        title,
        message,
        roleTarget,
        emote,
      });
      toast.success("Notification sent!");
      setTitle("");
      setMessage("");
      setRoleTarget("all");
      setEmote("📣");
      setShowEmojiPicker(false);
      fetchNotifications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send notification");
    }
  };

  return (
    <div className="min-h-full bg-gray-50 flex">
      <SuperadminSidebar />
      <div className="flex-1 py-10 px-6">
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold mb-6">📨 Send Notification</h1>

          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow-md space-y-4 max-w-2xl"
          >
            <div>
              <label className="font-semibold">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
              />
            </div>

            <div>
              <label className="font-semibold">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
              />
            </div>

            <div>
              <label className="font-semibold">Send To</label>
              <select
                value={roleTarget}
                onChange={(e) => setRoleTarget(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">All (Admins & Customers)</option>
                <option value="admin">Admins Only</option>
                <option value="customer">Customers Only</option>
              </select>
            </div>

            <div>
              <label className="font-semibold">Emote</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={emote}
                  onChange={(e) => setEmote(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="📣, 🚨, 🔔, etc."
                  maxLength={2}
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="p-2 text-lg bg-gray-200 rounded-md"
                >
                  😊
                </button>
              </div>
              {showEmojiPicker && (
                <div className="mt-2">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setEmote(emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                    height={350}
                  />
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Send Notification
            </Button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-12 max-w-3xl"
        >
          <h2 className="text-xl font-semibold mb-4">📬 Sent Notifications</h2>
          {sentNotifications.length === 0 ? (
            <p className="text-gray-500">No notifications sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {sentNotifications.map((n) => (
                <motion.li
                  key={n._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 border rounded-lg bg-white shadow flex items-start gap-3"
                >
                  <span className="text-2xl">{n.emote || "📣"}</span>
                  <div>
                    <h3 className="font-bold text-lg">{n.title}</h3>
                    <p className="text-sm text-gray-600">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      To: {n.roleTarget?.toUpperCase()} •{" "}
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SuperAdminNotificationPage;
