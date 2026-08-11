import { zipUpload } from '../config/multer.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Wraps multer's single-file ZIP upload so failures (wrong type, too large)
 * surface as a normal ApiError instead of an unhandled multer error.
 */
export function uploadZip(req, res, next) {
  const handler = zipUpload.single('file');
  handler(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest('ZIP file exceeds the maximum allowed size'));
    }
    return next(ApiError.badRequest(err.message || 'File upload failed'));
  });
}

export default uploadZip;
