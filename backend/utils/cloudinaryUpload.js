const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../middleware/cloudinaryConfig');   

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'profileImage', 
    allowed_formats: ['jpg', 'jpeg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

const parser = multer({ storage: storage });

module.exports = parser;    
