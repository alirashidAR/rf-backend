import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Configure Cloudinary with credentials from environment variables
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

console.log('Cloudinary configured!');

/**
 * Upload a file to Cloudinary
 * @param {Object} file - The file object from multer
 * @param {String} folder - The folder to upload to
 * @returns {Promise<String>} - The secure URL of the uploaded file
 */
export const uploadFile = (file, folder) => {
  return new Promise((resolve, reject) => {
    // Create upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder,
        resource_type: 'auto' // Auto-detect file type
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );
    
    // Convert buffer to stream and pipe to upload stream
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary
 * @param {String} url - The URL of the file to delete
 */
export const deleteFile = async (url) => {
  try {
    // Extract public ID from URL
    const splitUrl = url.split('/');
    const publicIdWithExtension = splitUrl.slice(-2).join('/');
    const publicId = publicIdWithExtension.substring(0, publicIdWithExtension.lastIndexOf('.'));
    
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
};

export default { uploadFile, deleteFile };