require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const slotRoutes = require('./routes/slots');
const parkingSpaceRoutes = require('./routes/parkingSpaces');
const usersRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notification');

const Slot = require('./models/Slot');

// Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);
const connectedUsers = new Map();

// Connect DB
connectDB();

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Attach io to app for route access
app.set('io', io);
app.set("connectedUsers", connectedUsers);

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/parking-spaces', parkingSpaceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationRoutes);


// Socket.IO logic
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on("register-user", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`📌 User ${userId} registered with socket ID ${socket.id}`);
  });

  socket.on('send-notification', ({ targetRoles, notification }) => {
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (targetRoles.includes(notification.role)) {
        io.to(socketId).emit('receive-notification', notification);
      }
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        break;
      }
    }
  });
});

// const unlockExpiredSlots = async (io) => {
//   try {
//     const now = new Date();
//     const expiredSlots = await Slot.find({
//       // isLocked: true,
//       isAvailable: false,
//       bookingExpiresAt: { $lte: now },
//     });

//     console.log(expiredSlots,'expiredSlots');
    

//     if (expiredSlots.length > 0) {
//       for (const slot of expiredSlots) {
//         slot.isLocked = false;
//         slot.lockedBy = null;
//         slot.lockedAt = null;
//         slot.bookingExpiresAt = null;
//         slot.isAvailable = true;
//         await slot.save();

//         const parkingSpaceId = slot.parkingSpaceId;
//         io.emit('slotsUpdate', {
//           parkingSpaceId,
//           slots: await Slot.find({ parkingSpaceId }),
//         });

//         logger.info(`Automatically unlocked expired slot: ${slot.slotNumber} from parking space: ${parkingSpaceId}`);
//       }
//     }
//   } catch (err) {
//     logger.error('Error in unlockExpiredSlots job:', err.message);
//   }
// };
// setInterval(unlockExpiredSlots, 60 * 1000);
// unlockExpiredSlots(); // Optionally run once at startup


// // Periodically unlock expired slots
// const unlockExpiredSlots = async () => {
//   try {
//     const now = new Date();
//     const expiredSlots = await Slot.find({
//       isLocked: true,
//       bookingExpiresAt: { $lte: now },
//     });

//     if (expiredSlots.length > 0) {
//       await Slot.updateMany(
//         { _id: { $in: expiredSlots.map(s => s._id) } },
//         { $set: { isAvailable: true, isLocked: false, lockedBy: null, lockedAt: null, bookingExpiresAt: null } }
//       );

//       logger.info(`Unlocked ${expiredSlots.length} expired slots`);

//       // Group expired slots by parking space and emit updates
//       const slotGroups = {};
//       for (const slot of expiredSlots) {
//         const parkingSpaceId = slot.parkingSpaceId ? slot.parkingSpaceId.toString() : 'null';
//         if (!slotGroups[parkingSpaceId]) slotGroups[parkingSpaceId] = [];
//         slotGroups[parkingSpaceId].push(slot);
//       }

//       // Emit updates for each parking space
//       for (const [parkingSpaceId, slots] of Object.entries(slotGroups)) {
//         const updatedSlots = await Slot.find({ 
//           parkingSpaceId: parkingSpaceId === 'null' ? null : parkingSpaceId 
//         });
//         io.emit('slotsUpdate', {
//           parkingSpaceId: parkingSpaceId === 'null' ? null : parkingSpaceId,
//           slots: updatedSlots
//         });
//       }
//     }
//   } catch (error) {
//     logger.error('Error unlocking expired slots:', error.message);
//   }
// };

// // Run unlock job every minute
// setInterval(unlockExpiredSlots, 60 * 1000);
// // Also run once on startup
// unlockExpiredSlots();

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Server error:', err.message);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
