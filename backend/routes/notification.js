const express = require("express");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const User = require("../models/User");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();

// 🛠️ Create Notification
router.post("/", authenticateToken, authorizeRole(["superadmin"]), async (req, res) => {
  try {
    const { title, message, roleTarget, emote } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required." });
    }

    const roleMap = {
      admin: ["admin"],
      customer: ["user"],
      all: ["superadmin", "admin", "user"],
    };

    const targetRoles = roleMap[roleTarget] || ["admin"];
    const recipients = await User.find({ role: { $in: targetRoles } });
    console.log("Recipients found:", recipients.map(u => ({ id: u._id.toString(), role: u.role })));

    const notification = await Notification.create({
      senderId: req.user._id,
      recipients: recipients.map((u) => u._id),
      title,
      message,
      emote,
      targetRoles: roleTarget,
    });

    const io = req.app.get("io");
    if (io) {
      recipients.forEach((r) => {
        io.to(r._id.toString()).emit("newNotification", notification);
      });
      io.to(req.user._id.toString()).emit("newNotification", notification);
    }

    res.status(201).json(notification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Fetch Notifications for Current User
router.get("/received", authenticateToken, authorizeRole(["superadmin", "admin", "user"]), async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    console.log("Authenticated user ID:", userId.toString());
    const notifications = await Notification.find({
      $or: [
        { recipients: userId },
        { senderId: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100);
    console.log("Found notifications:", notifications);
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Mark Notification as Read
router.put("/read/:id", authenticateToken, authorizeRole(["superadmin", "admin", "user"]), async (req, res) => {
  try {
    const notificationId = req.params.id;
    // Validate ObjectId
    if (!mongoose.isValidObjectId(notificationId)) {
      console.error("Invalid notification ID:", notificationId);
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);
    console.log("Marking notification as read:", { notificationId, userId: userId.toString() });

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        $addToSet: { readBy: userId },
      },
      { new: true } // Return updated document
    );

    if (!notification) {
      console.error("Notification not found:", notificationId);
      return res.status(404).json({ message: "Notification not found" });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error marking notification as read:", {
      message: error.message,
      stack: error.stack,
      notificationId: req.params.id,
      userId: req.user?._id?.toString(),
    });
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
