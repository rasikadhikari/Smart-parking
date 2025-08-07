const mongoose = require('mongoose');

const ParkingSpaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function (v) {
          return v.length === 2 &&
            typeof v[0] === 'number' &&
            typeof v[1] === 'number';
        },
        message: 'Coordinates must be an array of two numbers: [lng, lat]',
      },
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Geospatial index
ParkingSpaceSchema.index({ location: '2dsphere' });

// Update `updatedAt` before each save
ParkingSpaceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Update `updatedAt` before each findOneAndUpdate/update
ParkingSpaceSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('ParkingSpace', ParkingSpaceSchema);
