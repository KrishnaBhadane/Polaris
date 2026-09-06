import multer from 'multer';

// Use memory storage for direct Cloudinary stream uploading
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB overall ceiling
  },
});
