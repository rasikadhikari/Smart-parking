const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  slotNumber: {
    type: String,
    required: true,
    trim: true,
  },
  parkingSpaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSpace',
    required: false,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  lockedAt: {
    type: Date,
    default: null,
  },
  isAdminOnly: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  x: { type: Number, default: 0 }, // ✅ coordinates
  y: { type: Number, default: 0 },
  bookingExpiresAt: { type: Date, default: null },
});
// Compound index to ensure slotNumber is unique per parkingSpaceId
slotSchema.index({ parkingSpaceId: 1, slotNumber: 1 }, { unique: true });

slotSchema.methods.isLockExpired = function () {
  if (!this.bookingExpiresAt) return false;
  return new Date() > new Date(this.bookingExpiresAt);
};

module.exports = mongoose.model('Slot', slotSchema);