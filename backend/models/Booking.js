const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  guestName: {
    type: String,
    trim: true,
    default: null,
  },
  parkingSpaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpace',
    required: false, // Temporary to support existing bookings; will be required after migration
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed','cancelled'],
    default: 'pending',
  },
  vehicleNumber: {
    type: String,
    required: true,
    trim: true,
  },
  vehicleType: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    default: 0,
  },
  paymentId: {
    type: String,
    default: null,
  },
  qrCodeData: {
    type: String,
    default: null,
  },
  fineAmount: {
    type: Number,
    default: 0,
  },
  bookingType: {
    type: String,
    enum: ['online', 'offline'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Booking', bookingSchema);