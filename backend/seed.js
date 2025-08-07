const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/smart-parking')
  .then(async () => {
    await User.deleteMany({}); // Optional: Clear existing users

    await User.create({
      fullName: 'Super Admin User',
      email: 'superadmin@gmail.com',
      password: 'admin123', // let the User model hash it
      role: 'superadmin',
      assignedSpaces: []
    });

    console.log('Superadmin seeded successfully');
    process.exit();
  })
  .catch(err => console.error('Seeding error:', err));
