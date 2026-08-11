import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from './env.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploads.dir),
  filename: (req, file, cb) => {
    const unique = uuidv4();
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

function zipFileFilter(req, file, cb) {
  const isZipMime = file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed';
  const isZipExt = path.extname(file.originalname).toLowerCase() === '.zip';
  if (isZipMime && isZipExt) {
    return cb(null, true);
  }
  cb(new Error('Only .zip files are allowed'));
}

export const zipUpload = multer({
  storage,
  fileFilter: zipFileFilter,
  limits: {
    fileSize: config.uploads.maxSizeMb * 1024 * 1024
  }
});

export default zipUpload;
