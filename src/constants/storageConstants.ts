export const STORAGE_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,

  ALLOWED_MIME_TYPES: new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff'
  ]),

  ERRORS: {
    REGION_REQUIRED: 'S3 region is required',
    BUCKET_REQUIRED: 'S3 bucket name is required',
    ACCESS_KEY_REQUIRED: 'AWS access key ID is required',
    SECRET_KEY_REQUIRED: 'AWS secret access key is required',
    DOWNLOAD_FAILED: 'Failed to retrieve image',
    DELETE_FAILED: 'Failed to delete image',
    LIST_FAILED: 'Failed to list images',
    UNSUPPORTED_FILE_TYPE: 'Unsupported image type',
    FILE_SIZE_EXCEEDED: 'File size exceeds limit'
  }
};


