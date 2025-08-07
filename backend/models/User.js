const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
    required: true,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  profileImage: {
    type: String,
    default: '', // fallback handled in frontend
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  vehicleInfo: {
    plateNumber: { type: String, default: '' }, 
  }, 
  assignedSpaces: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpace',
    },
  ],
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
