const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const ParkingSpace = require('../models/ParkingSpace');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const QRCode = require('qrcode');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const path = require('path');
const PDFDocument = require('pdfkit');

// Fetch all bookings for admin view
router.get('/admin', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { parkingSpaceId } = req.query;
    const query = {};
    if (parkingSpaceId) {
      const parkingSpace = await ParkingSpace.findById(parkingSpaceId);
      if (!parkingSpace) {
        return res.status(404).json({ message: 'Parking space not found' });
      }
      query.parkingSpaceId = parkingSpaceId;
    }

    const bookings = await Booking.find(query)
      .populate({
        path: 'slotId',
        select: 'slotNumber location parkingSpaceId',
        populate: { path: 'parkingSpaceId', select: 'name location' },
      })
      .populate('userId', 'fullName email')
      .sort({ startTime: -1 });
    console.log(`Fetched admin bookings: ${bookings.length}${parkingSpaceId ? ` for parkingSpaceId: ${parkingSpaceId}` : ''}`);
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings for admin:', err.message);
    res.status(500).json({ message: 'Error fetching bookings', error: err.message });
  }
});

// Fetch active bookings
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const { parkingSpaceId } = req.query;

    if (!parkingSpaceId) {
      return res.status(400).json({ message: 'parkingSpaceId is required' });
    }

    const query = {
      parkingSpaceId,
      endTime: { $gte: new Date() },
      status: 'confirmed',
    };

    if (req.user.role === 'user') {
      query.userId = req.user.id;
    }

    const activeBookings = await Booking.find(query)
      .populate({
        path: 'slotId',
        select: 'slotNumber location parkingSpaceId',
        populate: { path: 'parkingSpaceId', select: 'name location' },
      })
      .populate('userId', 'fullName email')
      .sort({ startTime: -1 });

    res.json(activeBookings);
  } catch (error) {
    console.error('Error fetching active bookings:', error.message);
    res.status(500).json({ message: 'Server error while fetching active bookings', error: error.message });
  }
});

// Fetch all users (for admin dropdown)
router.get('/users', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const users = await User.find({}, 'fullName _id').sort({ fullName: 1 });
    console.log('Fetched users:', users.length);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
});

// Fetch user-specific bookings
router.get('/my-bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId || typeof userId !== 'string' || userId.length !== 24) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    const bookings = await Booking.find({ userId })
      .populate({
        path: 'slotId',
        select: 'slotNumber location parkingSpaceId',
        populate: { path: 'parkingSpaceId', select: 'name location' },
      })
      .populate('userId', 'fullName email')
      .sort({ startTime: -1 });
    console.log('Fetched user bookings:', bookings.length);
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching user bookings:', err.message);
    res.status(500).json({ message: 'Error fetching user bookings', error: err.message });
  }
});

// Check for expired locks
router.get('/check-lock', async (req, res) => {
  try {
    const slots = await Slot.find({ isLocked: true });
    const updatedSlots = [];
    const updatedBookings = [];

    for (const slot of slots) {
      console.log(`[DEBUG] Checking slot before unlock:`, {
        slotId: slot._id,
        isLocked: slot.isLocked,
        isAvailable: slot.isAvailable,
        bookingExpiresAt: slot.bookingExpiresAt,
      });
      if (slot.isLockExpired()) {
        slot.isLocked = false;
        slot.lockedBy = null;
        slot.lockedAt = null;
        slot.bookingExpiresAt = null;
        slot.isAvailable = true;
        console.log(`[DEBUG] Unlocking slot:`, {
          slotId: slot._id,
          isLocked: slot.isLocked,
          isAvailable: slot.isAvailable,
          bookingExpiresAt: slot.bookingExpiresAt,
        });
        await slot.save();

        const pendingBooking = await Booking.findOne({
          slotId: slot._id,
          paymentStatus: 'pending',
        });
        if (pendingBooking) {
          pendingBooking.paymentStatus = 'failed';
          slot.isAvailable = true;
          console.log(`[DEBUG] Marking pending booking as failed and setting slot available:`, {
            slotId: slot._id,
            isLocked: slot.isLocked,
            isAvailable: slot.isAvailable,
            bookingExpiresAt: slot.bookingExpiresAt,
            bookingId: pendingBooking._id,
          });
          await pendingBooking.save();
          updatedBookings.push(pendingBooking);
        }

        updatedSlots.push(slot);
      }
    }

    if (updatedSlots.length > 0) {
      const io = req.app.get('io');
      const slotGroups = {};
      for (const slot of updatedSlots) {
        const parkingSpaceId = slot.parkingSpaceId ? slot.parkingSpaceId.toString() : 'null';
        if (!slotGroups[parkingSpaceId]) slotGroups[parkingSpaceId] = [];
        slotGroups[parkingSpaceId].push(slot);
      }
      for (const [parkingSpaceId, slots] of Object.entries(slotGroups)) {
        io.emit('slotsUpdate', {
          parkingSpaceId: parkingSpaceId === 'null' ? null : parkingSpaceId,
          slots,
        });
      }

      const bookingGroups = {};
      for (const booking of updatedBookings) {
        const parkingSpaceId = booking.parkingSpaceId ? booking.parkingSpaceId.toString() : 'null';
        if (!bookingGroups[parkingSpaceId]) bookingGroups[parkingSpaceId] = [];
        bookingGroups[parkingSpaceId].push(booking);
      }
      for (const [parkingSpaceId, bookings] of Object.entries(bookingGroups)) {
        io.emit('bookingsUpdate', {
          parkingSpaceId: parkingSpaceId === 'null' ? null : parkingSpaceId,
          bookings: await Booking.find({ _id: { $in: bookings.map((b) => b._id) } }).populate('slotId userId'),
        });
      }
    }

    console.log(`Checked expired locks, updated: ${updatedSlots.length}`);
    res.json({ message: 'Checked for expired locks', updated: updatedSlots.length });
  } catch (err) {
    console.error('Error checking locks:', err.message);
    res.status(500).json({ message: 'Error checking locks', error: err.message });
  }
});

// Verify payment
router.get('/verify-payment', async (req, res) => {
  const { bookingId, sessionId } = req.query;
  try {
    const booking = await Booking.findById(bookingId).populate('slotId');
    if (!booking || booking.paymentStatus !== 'pending') {
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }

    const slot = await Slot.findById(booking.slotId);
    if (!slot || !slot.isLocked || (slot.lockedBy && booking.userId && slot.lockedBy.toString() !== booking.userId.toString())) {
      return res.status(400).json({ message: 'Slot is no longer available or locked by another user' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      booking.paymentStatus = 'success';
      booking.paymentId = session.payment_intent;
      booking.amount = booking.duration * 10;
      const qrCodeData = await QRCode.toDataURL(`booking:${booking._id}`);
      booking.qrCodeData = qrCodeData;
      await booking.save();

      slot.isAvailable = false;
      slot.isLocked = false;
      slot.lockedBy = null;
      slot.lockedAt = null;
      slot.bookingExpiresAt = null;
      await slot.save();

      const io = req.app.get('io');
      const parkingSpaceId = slot.parkingSpaceId ? slot.parkingSpaceId.toString() : null;
      io.emit('slotsUpdate', {
        parkingSpaceId,
        slots: await Slot.find({ parkingSpaceId: slot.parkingSpaceId }),
      });
      io.emit('bookingsUpdate', {
        parkingSpaceId,
        bookings: await Booking.find({ parkingSpaceId: booking.parkingSpaceId }).populate('slotId userId'),
      });

      console.log(`Payment verified for booking: ${bookingId}`);
      res.redirect(`http://localhost:3000/my-bookings`);
    } else {
      slot.isLocked = false;
      slot.lockedBy = null;
      slot.lockedAt = null;
      slot.isAvailable = true;
      slot.bookingExpiresAt = null;
      await slot.save();

      booking.paymentStatus = 'failed';
      await booking.save();

      const io = req.app.get('io');
      const parkingSpaceId = slot.parkingSpaceId ? slot.parkingSpaceId.toString() : null;
      io.emit('slotsUpdate', {
        parkingSpaceId,
        slots: await Slot.find({ parkingSpaceId: slot.parkingSpaceId }),
      });
      io.emit('bookingsUpdate', {
        parkingSpaceId,
        bookings: await Booking.find({ parkingSpaceId: booking.parkingSpaceId }).populate('slotId userId'),
      });

      console.log(`Payment failed for booking: ${bookingId}`);
      res.redirect('http://localhost:3000/booking-failed');
    }
  } catch (err) {
    console.error('Error verifying payment:', err.message);
    res.status(500).json({ message: 'Error verifying payment', error: err.message });
  }
});

// Handle payment failure
router.get('/payment-failed', async (req, res) => {
  const { bookingId } = req.query;
  try {
    const booking = await Booking.findById(bookingId).populate('slotId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const slot = await Slot.findById(booking.slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    slot.isLocked = false;
    slot.lockedBy = null;
    slot.lockedAt = null;
    slot.bookingExpiresAt = null;
    await slot.save();

    booking.paymentStatus = 'failed';
    await booking.save();

    const io = req.app.get('io');
    const parkingSpaceId = slot.parkingSpaceId ? slot.parkingSpaceId.toString() : null;
    io.emit('slotsUpdate', {
      parkingSpaceId,
      slots: await Slot.find({ parkingSpaceId: slot.parkingSpaceId }),
    });
    io.emit('bookingsUpdate', {
      parkingSpaceId,
      bookings: await Booking.find({ parkingSpaceId: booking.parkingSpaceId }).populate('slotId userId'),
    });

    console.log(`Payment failed handled for booking: ${bookingId}`);
    res.redirect('http://localhost:3000/booking-failed');
  } catch (err) {
    console.error('Error handling payment failure:', err.message);
    res.status(500).json({ message: 'Error handling payment failure', error: err.message });
  }
});

// Create a booking (for non-admins, Stripe-based)
router.post('/', authenticateToken, async (req, res) => {
  const { slotId, duration, userId, guestName, vehicleNumber, vehicleType, startTime, endTime, parkingSpaceId } = req.body;
  try {
    // Validate required fields
    if (!slotId) return res.status(400).json({ message: 'slotId is required' });
    if (!duration || isNaN(duration) || duration <= 0) {
      return res.status(400).json({ message: 'Invalid duration' });
    }
    if (!vehicleNumber) {
      return res.status(400).json({ message: 'Vehicle number is required' });
    }
    if (!vehicleType) {
      return res.status(400).json({ message: 'Vehicle type is required' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    if (!parkingSpaceId) {
      return res.status(400).json({ message: 'parkingSpaceId is required' });
    }

    // Validate slot
    const slot = await Slot.findById(slotId).populate('parkingSpaceId');
    if (!slot) return res.status(404).json({ message: 'Slot not found' });

    console.log(slot, parkingSpaceId.toString(),'parkingSpaceId is matching',"payload",req.body);

    if (slot.parkingSpaceId._id.toString() !== parkingSpaceId.toString()) {
      return res.status(400).json({ message:'parkingSpaceId does not match slot'
      });  
    }

    if (slot.isAdminOnly && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'This slot is reserved for admins only' });
    }
    // if (!slot.lockedBy || slot.lockedBy.toString() !== req.user.id) {
    //   return res.status(400).json({ message: 'Slot is not locked by you or not locked' });
    // }
    if (!slot.isAvailable) {
      return res.status(400).json({ message: 'Slot is not available' });
    }

    // Validate userId
    const requestingUserId = userId || req.user.id;
    if (!requestingUserId && !guestName) {
      return res.status(400).json({ message: 'Either userId or guestName is required' });
    }
    if (requestingUserId && requestingUserId !== req.user.id) {
      return res.status(403).json({ message: 'Cannot book for another user' });
    }

    // Create booking
    const booking = new Booking({
      userId: requestingUserId || null,
      guestName: guestName || null,
      parkingSpaceId,
      slotId,
      startTime: new Date(startTime),
      duration: Number(duration),
      endTime: new Date(endTime),
      paymentStatus: 'pending',
      vehicleNumber,
      vehicleType,
      bookingType: 'online',
    });
    await booking.save();

    // Create Stripe session
    const amount = duration * 1000 * 100;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'npr',
            product_data: {
              name: `Parking Slot ${slot.slotNumber}${slot.parkingSpaceId ? ` (${slot.parkingSpaceId.name})` : ''}`,
              description: `Booking for ${duration} minutes`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:5002/api/bookings/verify-payment?bookingId=${booking._id}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5002/api/bookings/payment-failed?bookingId=${booking._id}`,
      metadata: { bookingId: booking._id.toString() },
    });

    // console.log(`Initiated Stripe session for booking: bookingId=${booking._id}`);
    res.json({ paymentUrl: session.url });
    // res.json({ bookingId: booking._id.toString(), message: 'Booking created successfully' });
  } catch (err) {
    console.error('Error initiating payment:', err.message);
    res.status(500).json({ message: 'Error initiating payment', error: err.message });
  }
});

// Create an offline booking (for admins only)
router.post('/offline', authenticateToken, authorizeRole(['admin', 'superadmin']), async (req, res) => {
  const { slotId, duration, userId, guestName, vehicleNumber, vehicleType, startTime, endTime, parkingSpaceId } = req.body;
  try {
    // Validate required fields
    if (!slotId) return res.status(400).json({ message: 'slotId is required' });
    if (!duration || isNaN(duration) || duration <= 0) {
      return res.status(400).json({ message: 'Invalid duration' });
    }
    if (!vehicleNumber) {
      return res.status(400).json({ message: 'Vehicle number is required' });
    }
    if (!vehicleType) {
      return res.status(400).json({ message: 'Vehicle type is required' });
    }
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'Start time and end time are required' });
    }
    if (!parkingSpaceId) {
      return res.status(400).json({ message: 'parkingSpaceId is required' });
    }

    // Validate slot
    const slot = await Slot.findById(slotId).populate('parkingSpaceId');
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.parkingSpaceId.toString() !== parkingSpaceId) {
      return res.status(400).json({ message: 'parkingSpaceId does not match slot' });
    }
    if (!slot.isAvailable) return res.status(400).json({ message: 'Slot is not available' });

    // Validate userId
    if (!userId && !guestName) {
      return res.status(400).json({ message: 'Either userId or guestName is required' });
    }

    // Lock slot
    slot.isLocked = true;
    slot.lockedBy = req.user.id;
    slot.lockedAt = new Date();
    slot.bookingExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await slot.save();

    const io = req.app.get('io');
    const parkingSpaceIdStr = slot.parkingSpaceId ? slot.parkingSpaceId.toString() : null;
    io.emit('slotsUpdate', {
      parkingSpaceId: parkingSpaceIdStr,
      slots: await Slot.find({ parkingSpaceId: slot.parkingSpaceId }),
    });

    // Create booking
    const booking = new Booking({
      userId: userId || null,
      guestName: guestName || null,
      parkingSpaceId,
      slotId,
      startTime: new Date(startTime),
      duration: Number(duration),
      endTime: new Date(endTime),
      paymentStatus: 'success',
      vehicleNumber,
      vehicleType,
      bookingType: 'offline',
      amount: duration * 10,
    });
    const savedBooking = await booking.save();

    // Generate QR code
    const qrCodeData = await QRCode.toDataURL(`booking:${savedBooking._id}`);
    savedBooking.qrCodeData = qrCodeData;
    await savedBooking.save();

    // Update slot
    slot.isAvailable = false;
    slot.isLocked = false;
    slot.lockedBy = null;
    slot.lockedAt = null;
    slot.bookingExpiresAt = null;
    await slot.save();

    io.emit('slotsUpdate', {
      parkingSpaceId: parkingSpaceIdStr,
      slots: await Slot.find({ parkingSpaceId: slot.parkingSpaceId }),
    });
    io.emit('bookingsUpdate', {
      parkingSpaceId: parkingSpaceIdStr,
      bookings: await Booking.find({ parkingSpaceId: savedBooking.parkingSpaceId }).populate('slotId userId'),
    });

    console.log(`Offline booking created: bookingId=${savedBooking._id}, slotId=${slotId}`);
    res.json({ bookingId: savedBooking._id.toString(), message: 'Offline booking created successfully' });
  } catch (err) {
    console.error('Error creating offline booking:', err.message);
    res.status(500).json({ message: 'Error creating offline booking', error: err.message });
  }
});

// Stripe webhook for payment confirmation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ message: 'Webhook Error' });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const bookingId = paymentIntent.metadata.bookingId;

    try {
      const booking = await Booking.findById(bookingId).populate('slotId');
      if (!booking) {
        console.error('Booking not found for payment intent:', paymentIntent.id);
        return res.status(404).json({ message: 'Booking not found' });
      }
      if (booking.paymentStatus === 'success') {
        return res.json({ received: true });
      }

      booking.paymentStatus = 'status';
      booking.paymentId = paymentIntent.id;
      booking.amount = booking.duration * 10;
      const qrCodeData = await QRCode.toDataURL(`booking:${booking._id}`);
      booking.qrCodeData = qrCodeData;
      await booking.save();

      const slot = await Slot.findById(booking.slotId);
      if (slot) {
        slot.isAvailable = false;
        slot.isLocked = false;
        slot.lockedBy = null;
        slot.lockedAt = null;
        slot.bookingExpiresAt = null;
        await slot.save();
      }

      const io = req.app.get('io');
      const parkingSpaceId = booking.parkingSpaceId ? booking.parkingSpaceId.toString() : null;
      io.emit('slotsUpdate', {
        parkingSpaceId,
        slots: await Slot.find({ parkingSpaceId: slot.parkingSpaceId }),
      });
      io.emit('bookingsUpdate', {
        parkingSpaceId,
        bookings: await Booking.find({ parkingSpaceId: booking.parkingSpaceId }).populate('slotId userId'),
      });

      console.log(`Webhook processed payment success for booking: ${bookingId}`);
      res.json({ received: true });
    } catch (err) {
      console.error('Error processing webhook:', err.message);
      res.status(500).json({ message: 'Error processing webhook' });
    }
  } else {
    res.json({ received: true });
  }
});

// Fetch specific booking
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: 'slotId',
      select: 'slotNumber location parkingSpaceId',
      populate: { path: 'parkingSpaceId', select: 'name location' },
    }).populate('userId', 'fullName email');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && booking.userId?._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    if (req.headers.accept === 'application/pdf') {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=booking-${booking._id}.pdf`);
        res.send(pdfData);
      });

      const startTime = new Date(booking.startTime).toLocaleString();
      const endTime = new Date(booking.endTime).toLocaleString();
      const amount = (booking.amount || booking.duration * 10).toFixed(2);
      const parkingSpaceName = booking.slotId?.parkingSpaceId?.name || 'Smart Parking Lot';
      const parkingSpaceLocation = booking.slotId?.parkingSpaceId?.location || 'N/A';
      const guestName = booking.guestName || 'Registered User';
      const vehicleNumber = booking.vehicleNumber || 'N/A';
      const vehicleType = booking.vehicleType || 'N/A';
      const slotNumber = booking.slotId?.slotNumber || 'N/A';
      const bookingId = booking._id.toString();

      let qrCodeBuffer;
      try {
        qrCodeBuffer = await QRCode.toBuffer(`booking:${booking._id}`, {
          errorCorrectionLevel: 'H',
          width: 150,
        });
      } catch (err) {
        console.error('Error generating QR code:', err.message);
        return res.status(500).json({ message: 'Error generating QR code', error: err.message });
      }

      doc.fontSize(20).font('Helvetica-Bold').text('Parking Slot Booking Receipt', { align: 'center' });
      doc.fontSize(16).text(parkingSpaceName, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(14).font('Helvetica-Bold').text('Booking Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');

      const details = [
        { label: 'Booking ID:', value: bookingId },
        { label: 'Booked For:', value: guestName },
        { label: 'Parking Space:', value: parkingSpaceName },
        { label: 'Location:', value: parkingSpaceLocation },
        { label: 'Slot Number:', value: slotNumber },
        { label: 'Vehicle Number:', value: vehicleNumber },
        { label: 'Vehicle Type:', value: vehicleType },
        { label: 'Start Time:', value: startTime },
        { label: 'End Time:', value: endTime },
        { label: 'Duration:', value: `${booking.duration} minutes` },
        { label: 'Amount Paid:', value: `NPR ${amount}` },
        { label: 'Status:', value: booking.paymentStatus },
        { label: 'Booking Type:', value: booking.bookingType || 'Online' },
      ];

      details.forEach(({ label, value }) => {
        doc.text(`${label} ${value}`, { continued: false });
        doc.moveDown(0.3);
      });

      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').text('QR Code', { align: 'center' });
      doc.moveDown(0.5);
      const qrX = (doc.page.width - 150) / 2;
      doc.image(qrCodeBuffer, qrX, doc.y, { width: 150 });

      doc.end();
    } else {
      res.json(booking);
    }
  } catch (err) {
    console.error('Error fetching booking:', err.message);
    res.status(500).json({ message: 'Error fetching booking', error: err.message });
  }
});

// Update booking (e.g., fine amount)
router.patch('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: 'slotId',
      select: 'slotNumber location parkingSpaceId',
      populate: { path: 'parkingSpaceId', select: 'name location' },
    });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.body.fineAmount !== undefined) {
      booking.fineAmount = req.body.fineAmount;
    }

    await booking.save();
    console.log(`Updated booking: ${booking._id}`);
    res.json(booking);
  } catch (err) {
    console.error('Error updating booking:', err.message);
    res.status(500).json({ message: 'Error updating booking', error: err.message });
  }
});

// New endpoint for QR code scanning
router.get('/scan/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.startsWith('booking:')) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }

    const bookingId = id.replace('booking:', '');
    const booking = await Booking.findById(bookingId).populate({
      path: 'slotId',
      select: 'slotNumber location parkingSpaceId',
      populate: { path: 'parkingSpaceId', select: 'name location' },
    }).populate('userId', 'fullName email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check authorization: only the booking owner or admins can scan
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && booking.userId?._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to scan this booking' });
    }

    const response = {
      bookingId: booking._id,
      guestName: booking.guestName || 'Registered User',
      location: booking.slotId?.parkingSpaceId?.location || 'N/A',
      slotNumber: booking.slotId?.slotNumber || 'N/A',
      vehicleNumber: booking.vehicleNumber,
      vehicleType: booking.vehicleType,
      startTime: new Date(booking.startTime).toISOString(),
      endTime: new Date(booking.endTime).toISOString(),
      duration: booking.duration,
      amount: (booking.amount || booking.duration * 10).toFixed(2),
      status: booking.paymentStatus,
    };

    res.json(response);
  } catch (err) {
    console.error('Error scanning booking:', err.message);
    res.status(500).json({ message: 'Error processing QR scan', error: err.message });
  }
});

// Delete a booking
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate({
      path: 'slotId',
      select: 'slotNumber location parkingSpaceId',
      populate: { path: 'parkingSpaceId', select: 'name location' },
    });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Authorization check: only booking owner or admin/superadmin can delete
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'superadmin' &&
      booking.userId?._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this booking' });
    }

    // Update the associated slot
    const slot = await Slot.findById(booking.slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Associated slot not found' });
    }

    slot.isAvailable = true;
    slot.isLocked = false;
    slot.lockedBy = null;
    slot.lockedAt = null;
    slot.bookingExpiresAt = null;
    await slot.save();

    // Delete the booking
    await Booking.deleteOne({ _id: booking._id });

    // Emit Socket.IO updates
    const io = req.app.get('io');
    const parkingSpaceId = slot.parkingSpaceId ? slot.parkingSpaceId.toString() : null;
    io.emit('slotsUpdate', {
      parkingSpaceId,
      slots: await Slot.find({ parkingSpaceId: slot.parkingSpaceId }),
    });
    io.emit('bookingsUpdate', {
      parkingSpaceId,
      bookings: await Booking.find({ parkingSpaceId: booking.parkingSpaceId }).populate('slotId userId'),
    });

    console.log(`Deleted booking: ${booking._id}, slot ${slot._id} made available`);
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Error deleting booking:', err.message);
    res.status(500).json({ message: 'Error deleting booking', error: err.message });
  }
});

module.exports = router;
