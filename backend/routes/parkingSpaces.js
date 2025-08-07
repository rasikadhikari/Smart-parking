const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ParkingSpace = require('../models/ParkingSpace');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Create a parking space (admin-only)
router.post('/', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
const { name, address, description, location } = req.body;
try{
if (
  !name ||
  !address ||
  !location ||
  !Array.isArray(location.coordinates) ||
  location.coordinates.length !== 2
) {
  return res.status(400).json({
    message: "Name, address, and valid location coordinates are required",
  });
}

const parkingSpace = new ParkingSpace({
  name,
  address,
  description,
  location,
  createdBy: req.user.id,
});

console.log(parkingSpace)
    await parkingSpace.save();
    console.log(`Parking space created: ${parkingSpace._id}`);
    res.status(201).json(parkingSpace);
  } catch (err) {
    console.log(err)
    console.error('Error creating parking space:', err.message);
    res.status(500).json({ message: 'Error creating parking space', error: err.message });
  }
});

// Get all parking spaces
router.get('/', async (req, res) => {
  try {
    const parkingSpaces = await ParkingSpace.find().populate('createdBy', 'fullName');
    res.json(parkingSpaces);
  } catch (err) {
    console.error('Error fetching parking spaces:', err.message);
    res.status(500).json({ message: 'Error fetching parking spaces', error: err.message });
  }
});

// Get a specific parking space with its slots
router.get('/:id', async (req, res) => {
  try {
    const parkingSpace = await ParkingSpace.findById(req.params.id).populate('createdBy', 'fullName');
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }
    const slots = await Slot.find({ parkingSpaceId: req.params.id });
    res.json({ parkingSpace, slots });
  } catch (err) {
    console.error('Error fetching parking space:', err.message);
    res.status(500).json({ message: 'Error fetching parking space', error: err.message });
  }
});

// Update a parking space (admin-only)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  const { name, location, description, latitude, longitude } = req.body;

  try {
    const parkingSpace = await ParkingSpace.findById(req.params.id);
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    parkingSpace.name = name || parkingSpace.name;
    parkingSpace.location = location || parkingSpace.location;
    parkingSpace.description = description || parkingSpace.description;
    if (latitude != null) parkingSpace.latitude = latitude;
    if (longitude != null) parkingSpace.longitude = longitude;

    await parkingSpace.save();
    console.log(`Parking space updated: ${parkingSpace._id}`);
    res.json(parkingSpace);
  } catch (err) {
    console.error('Error updating parking space:', err.message);
    res.status(500).json({ message: 'Error updating parking space', error: err.message });
  }
});

// Delete a parking space (admin-only)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const parkingSpace = await ParkingSpace.findById(req.params.id);
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    // Check for active bookings
    const activeBookings = await Booking.find({
      parkingSpaceId: req.params.id,
      paymentStatus: 'success',
      endTime: { $gt: new Date() },
    });
    if (activeBookings.length > 0) {
      return res.status(400).json({ message: 'Cannot delete parking space with active bookings' });
    }

    // Delete associated slots and bookings
    await Slot.deleteMany({ parkingSpaceId: req.params.id });
    await Booking.deleteMany({ parkingSpaceId: req.params.id });
    await ParkingSpace.deleteOne({ _id: req.params.id });

    console.log(`Parking space deleted: ${req.params.id}`);
    res.json({ message: 'Parking space and associated data deleted' });
  } catch (err) {
    console.error('Error deleting parking space:', err.message);
    res.status(500).json({ message: 'Error deleting parking space', error: err.message });
  }
});
// Utility: Format parking space to include latitude and longitude
const formatParkingSpace = (ps) => {
  const { coordinates } = ps.location;
  return {
    ...ps._doc,
    latitude: coordinates[1],
    longitude: coordinates[0],
  };
};
// GET all parking spaces with formatted location
router.get('/formatted/all', async (req, res) => {
  try {
    const parkingSpaces = await ParkingSpace.find().populate('createdBy', 'fullName');
    const formatted = parkingSpaces.map(ps => {
      const { coordinates } = ps.location;
      return {
        ...ps._doc,
        latitude: coordinates[1],
        longitude: coordinates[0],
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching formatted parking spaces:', err.message);
    res.status(500).json({ message: 'Error fetching parking spaces', error: err.message });
  }
});

// GET single parking space with slots and formatted location
router.get('/formatted/:id', async (req, res) => {
  try {
    const parkingSpace = await ParkingSpace.findById(req.params.id).populate('createdBy', 'fullName');
    if (!parkingSpace) {
      return res.status(404).json({ message: 'Parking space not found' });
    }

    const slots = await Slot.find({ parkingSpaceId: req.params.id });
    const formatted = formatParkingSpace(parkingSpace);

    res.json({ parkingSpace: formatted, slots });
  } catch (err) {
    console.error('Error fetching formatted parking space:', err.message);
    res.status(500).json({ message: 'Error fetching parking space', error: err.message });
  }
});

// Assign a parking space to an admin (Superadmin only)
router.post('/admins/:adminId/assign-space', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
  const { adminId } = req.params;
  const { spaceId } = req.body;

  console.log(`Assigning space ${spaceId} to admin ${adminId}`);


  try {
    // Ensure space exists
    const space = await ParkingSpace.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });

    // Update admin user
    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    // Prevent duplicate assignments
    if (!admin.assignedSpaces.includes(spaceId)) {
      admin.assignedSpaces.push(spaceId);
      await admin.save();
    }

    res.json({ message: 'Parking space assigned to admin successfully' });
  } catch (err) {
    console.error('Error assigning space:', err.message);
    res.status(500).json({ message: 'Error assigning space', error: err.message });
  }
});
// Get parking spaces assigned to a specific admin
router.get('/assigned/:adminId', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  const { adminId } = req.params;

  try {
    const user = await User.findById(adminId).populate('assignedSpaces');
    if (!user) return res.status(404).json({ message: 'Admin not found' });

    const formatted = user.assignedSpaces.map(space => {
      const { coordinates } = space.location;
      return {
        ...space._doc,
        latitude: coordinates[1],
        longitude: coordinates[0],
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching assigned spaces:', err.message);
    res.status(500).json({ message: 'Error fetching assigned spaces', error: err.message });
  }
});




module.exports = router;
