const express = require('express');
const router = express.Router();
const Slot = require('../models/Slot');
const User = require('../models/User');
const ParkingSpace = require('../models/ParkingSpace');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const winston = require('winston');
const schedule = require('node-schedule');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Schedule job to unlock expired slots every minute
// const unlockExpiredSlots = async (io) => {
//   try {
//     const now = new Date();
//     const expiredSlots = await Slot.find({
//       isLocked: true,
//       isAvailable: false,
//       bookingExpiresAt: { $lte: now },
//     });

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

// Initialize the scheduled job when the server starts
// router.use((req, res, next) => {
//   const io = req.app.get('io');
//   schedule.scheduleJob('*/1 * * * *', () => unlockExpiredSlots(io));
//   next();
// });

// GET a single slot by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log("Fetching slot backend:", req.params.id);
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    const parkingSpaceId = slot.parkingSpaceId;
    const parkingSpace = await ParkingSpace.findById(parkingSpaceId);
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    const userRole = req.user.role;

    if (userRole === 'admin') {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'Admin user not found' });
      }

      const isAssigned = user.assignedSpaces.some(
        (spaceId) => spaceId.toString() === parkingSpaceId.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'Not authorized to view this parking space (admin)' });
      }
    } else if (userRole === 'superadmin' || userRole === 'user') {
      // OK
    } else {
      logger.error('Blocked unknown role:', userRole);
      return res.status(403).json({ message: 'Not authorized (unknown role)' });
    }

    res.json(slot);
  } catch (err) {
    logger.error('Error fetching slot:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all slots for a parking space
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { parkingSpaceId } = req.query;
    if (!parkingSpaceId) {
      return res.status(400).json({ message: 'parkingSpaceId is required' });
    }

    const parkingSpace = await ParkingSpace.findById(parkingSpaceId);
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    const userRole = req.user.role;

    if (userRole === 'admin') {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'Admin user not found' });
      }

      const isAssigned = user.assignedSpaces.some(
        (spaceId) => spaceId.toString() === parkingSpaceId.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'Not authorized to view this parking space (admin)' });
      }
    } else if (userRole === 'superadmin' || userRole === 'user') {
      // OK
    } else {
      logger.error('Blocked unknown role:', userRole);
      return res.status(403).json({ message: 'Not authorized (unknown role)' });
    }

    const slots = await Slot.find({ parkingSpaceId });
    res.json(slots);
  } catch (err) {
    logger.error('Error fetching slots:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create slots for a parking space with layout positions
router.post('/', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { slotNumbers, location, isAdminOnly, parkingSpaceId, layout = [] } = req.body;

    if (!slotNumbers || !location || !parkingSpaceId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const parkingSpace = await ParkingSpace.findById(parkingSpaceId);
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    if (req.user.role === 'admin') {
      const user = await User.findById(req.user.id);
      const isAssigned = user?.assignedSpaces?.some(
        (spaceId) => spaceId.toString() === parkingSpaceId.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'Not authorized to modify this parking space' });
      }
    }

    const layoutMap = {};
    layout.forEach(({ slotNumber, x, y, isAdminOnly: slotAdminOnly }) => {
      layoutMap[slotNumber] = { x, y, isAdminOnly: slotAdminOnly || isAdminOnly };
    });

    await Slot.deleteMany({ parkingSpaceId });

    const createdSlots = await Promise.all(
      slotNumbers.map((slotNumber) => {
        return new Slot({
          slotNumber,
          location,
          isAdminOnly: layoutMap[slotNumber]?.isAdminOnly || isAdminOnly,
          parkingSpaceId,
          x: layoutMap[slotNumber]?.x || 0,
          y: layoutMap[slotNumber]?.y || 0,
          isAvailable: true,
          isLocked: layoutMap[slotNumber]?.isAdminOnly || isAdminOnly,
        }).save();
      })
    );

    const io = req.app.get('io');
    io.emit('slotsUpdate', {
      parkingSpaceId,
      slots: await Slot.find({ parkingSpaceId }),
    });

    res.status(201).json({
      message: 'Slots created successfully',
      slots: createdSlots,
    });
  } catch (err) {
    logger.error('Error creating slots:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE multiple slots by IDs (admin & superadmin only)
router.delete('/bulk', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { slotIds } = req.body;

    if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
      return res.status(400).json({ message: 'Missing or invalid slotIds' });
    }

    const slots = await Slot.find({ _id: { $in: slotIds } });
    if (slots.length === 0) {
      return res.status(404).json({ message: 'No slots found for the provided IDs' });
    }

    const occupiedSlots = slots.filter((slot) => !slot.isAvailable);
    if (occupiedSlots.length > 0) {
      return res.status(400).json({ message: 'Cannot delete occupied slots' });
    }

    const parkingSpaceId = slots[0].parkingSpaceId;

    if (req.user.role === 'admin') {
      const user = await User.findById(req.user.id);
      const isAssigned = user?.assignedSpaces?.some(
        (spaceId) => spaceId.toString() === parkingSpaceId.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({ message: 'Not authorized to modify this parking space' });
      }
    }

    await Slot.deleteMany({ _id: { $in: slotIds } });

    logger.info(`Deleted slots: ${slotIds.join(', ')} from parking space: ${parkingSpaceId || 'unknown'}`);

    const io = req.app.get('io');
    io.emit('slotsUpdate', { parkingSpaceId, slots: await Slot.find({ parkingSpaceId }) });

    res.json({ message: 'Slots deleted successfully' });
  } catch (err) {
    logger.error('Error deleting slots:', err.message);
    res.status(500).json({ message: 'Error deleting slots', error: err.message });
  }
});

// DELETE a slot by ID (admin & superadmin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    if (!slot.isAvailable) {
      return res.status(400).json({ message: 'Cannot delete an occupied slot' });
    }

    const parkingSpaceId = slot.parkingSpaceId || null;
    await slot.deleteOne();

    logger.info(`Deleted slot: ${slot.slotNumber} from parking space: ${parkingSpaceId || 'unknown'}`);

    const io = req.app.get('io');
    io.emit('slotsUpdate', { parkingSpaceId, slots: await Slot.find({ parkingSpaceId }) });

    res.json({ message: 'Slot deleted successfully' });
  } catch (err) {
    logger.error('Error deleting slot:', err.message);
    res.status(500).json({ message: 'Error deleting slot', error: err.message });
  }
});

// POST lock a slot by ID (authenticated users)
router.post('/lock/:id', authenticateToken, async (req, res) => {
  try {
    const { bookingDuration } = req.body;
    if (!bookingDuration || typeof bookingDuration !== 'number' || bookingDuration <= 0) {
      return res.status(400).json({ message: 'Valid bookingDuration (in minutes) is required' });
    }

    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (!slot.isAvailable) return res.status(400).json({ message: 'Slot is not available' });
    if (slot.isLocked) return res.status(400).json({ message: 'Slot is already locked' });

    if (slot.isAdminOnly && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to lock admin-only slot' });
    }

    slot.isLocked = true;
    slot.lockedBy = req.user.id;
    slot.lockedAt = new Date();
    slot.bookingExpiresAt = new Date(Date.now() + bookingDuration* 60 * 1000);
    slot.isAvailable = false;
    await slot.save();

    console.log(slot,'slot from lock');
    console.log('Saved slot:', await Slot.findById(slot._id))

    const parkingSpaceId = slot.parkingSpaceId || null;
    const io = req.app.get('io');

    io.emit('slotsUpdate', { parkingSpaceId, slots: await Slot.find({ parkingSpaceId }) });

    res.json({ message: 'Slot locked successfully', data: await Slot.findById(slot._id) });
  } catch (err) {
    logger.error('Error locking slot:', err.message);
    res.status(500).json({ message: 'Error locking slot', error: err.message });
  }
});

// POST unlock a slot by ID (authenticated users, owners/admins only)
router.post('/unlock/:id', authenticateToken, async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (!slot.isLocked) return res.status(400).json({ message: 'Slot is not locked' });

    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    if (!isAdmin && slot.lockedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to unlock this slot' });
    }

    slot.isLocked = false;
    slot.lockedBy = null;
    slot.lockedAt = null;
    slot.bookingExpiresAt = null;
    slot.isAvailable = true;
    await slot.save();

    const parkingSpaceId = slot.parkingSpaceId || null;
    const io = req.app.get('io');
    io.emit('slotsUpdate', { parkingSpaceId, slots: await Slot.find({ parkingSpaceId }) });

    res.json({ message: 'Slot unlocked successfully' });
  } catch (err) {
    logger.error('Error unlocking slot:', err.message);
    res.status(500).json({ message: 'Error unlocking slot', error: err.message });
  }
});

module.exports = router;