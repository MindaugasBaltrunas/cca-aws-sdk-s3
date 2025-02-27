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
  
    DEFAULT_URL_EXPIRATION_SECONDS: 3600 * 24 * 7,
    DEFAULT_MAX_LIST_ITEMS: 1000,
  
    IMAGE_SIZES: {
      THUMB: { width: 100, height: 100, quality: 80 },
      SM: { width: 300, height: 300, quality: 80 },
      MD: { width: 600, height: 600, quality: 85 },
      LG: { width: 900, height: 900, quality: 85 },
      XL: { width: 1200, height: 1200, quality: 90 }
    },
  
    FOLDER_STRUCTURE: {
      ORIGINAL: 'original',
      THUMB: 'thumb',
      SM: 'sm',
      MD: 'md',
      LG: 'lg',
      XL: 'xl'
    },
  
    ERRORS: {
      REGION_REQUIRED: 'S3 region is required',
      BUCKET_REQUIRED: 'S3 bucket name is required',
      ACCESS_KEY_REQUIRED: 'AWS access key ID is required',
      SECRET_KEY_REQUIRED: 'AWS secret access key is required',
      UPLOAD_FAILED: 'Failed to upload image',
      PROCESSING_FAILED: 'Failed to process image',
      DOWNLOAD_FAILED: 'Failed to retrieve image',
      DELETE_FAILED: 'Failed to delete image',
      LIST_FAILED: 'Failed to list images',
      UNSUPPORTED_FILE_TYPE: 'Unsupported image type',
      FILE_SIZE_EXCEEDED: 'File size exceeds limit',
      NOT_FOUND: 'Image not found',
      EMPTY_RESPONSE: 'Empty response body',
      INVALID_IMAGE_SIZE: 'Invalid image size'
    }
  };
  
  export const IMAGE_DIMENSIONS = {
    thumb: { width: 100, height: 100 },
    sm: { width: 300, height: 300 },
    md: { width: 600, height: 600 },
    lg: { width: 900, height: 900 },
    xl: { width: 1200, height: 1200 }
  };
  