const cloudinary = require('cloudinary').v2;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

let isConfigured = false;
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  try {
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET
    });
    isConfigured = true;
    console.log('Cloudinary service configured.');
  } catch (err) {
    console.error('Failed to configure Cloudinary:', err.message);
  }
}

// Upload file helper (supports live Cloudinary or mock fallback)
async function uploadFile(fileBuffer, folder = 'attendance_erp') {
  if (isConfigured && fileBuffer) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      ).end(fileBuffer);
    });
  }

  // High fidelity Mock URL fallback
  console.log(`[Cloudinary Mock]: File upload triggered for folder "${folder}".`);
  const randomId = Math.floor(Math.random() * 1000000);
  return `https://res.cloudinary.com/demo/image/upload/v1234567/attendance_erp/${folder}_${randomId}.jpg`;
}

module.exports = {
  uploadFile
};
