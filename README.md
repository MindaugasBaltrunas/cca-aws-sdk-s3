# cca-aws-sdk-s3

A TypeScript library for managing images in AWS S3 with automatic resizing and optimization.

## Features

- Upload single or multiple images to AWS S3 with automatic resizing
- Generate signed URLs for stored images
- Delete images and their associated resources
- Retrieve paginated lists of stored images
- Track complete image metadata

## Installation

```bash
npm install cca-aws-sdk-s3
```

## Usage

### Initialization

```typescript
import { S3ImageStorage, S3Config } from 'cca-aws-sdk-s3';

const imageStorage = new S3ImageStorage({
  region: 'us-east-1',
  bucket: 'my-images-bucket',
  accessKeyId: 'YOUR_AWS_ACCESS_KEY',
  secretAccessKey: 'YOUR_AWS_SECRET_KEY'
});
```

### Basic Operations

```typescript
// Upload an image
const metadata = await imageStorage.uploadImage(req.file);

// Upload multiple images
const metadataArray = await imageStorage.uploadMultipleImages(req.files);

// Get all image URLs
const urls = await imageStorage.getImageUrls(imageId);

// Get specific size URL
const url = await imageStorage.getImageUrl(imageId, ImageSize.MD);

// Delete an image
await imageStorage.deleteImage(imageId);

// Delete multiple images
await imageStorage.deleteMultipleImages([id1, id2, id3]);

// Get paginated image list
const result = await imageStorage.getImagesList(page, limit);
```

## API Reference

### S3ImageStorage

**Constructor:**
- `constructor(config: S3Config)` - Initialize with AWS S3 configuration

**Methods:**
- `uploadImage(file: Express.Multer.File): Promise<ImageMetadata>` - Upload and resize a single image
- `uploadMultipleImages(files: Express.Multer.File[]): Promise<ImageMetadata[]>` - Upload multiple images
- `getImageUrl(id: string, size: ImageSize): Promise<string>` - Get URL for specific image size
- `getImageUrls(id: string): Promise<Record<ImageSize, string>>` - Get URLs for all sizes
- `deleteImage(id: string): Promise<void>` - Delete an image and all its sizes
- `deleteMultipleImages(ids: string[]): Promise<void>` - Delete multiple images
- `getImagesList(page: number = 1, limit: number = 10): Promise<PaginatedResult<ImageMetadata>>` - Get paginated image list

### Interfaces

**S3Config:**
```typescript
interface S3Config {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}
```

**ImageMetadata:**
```typescript
interface ImageMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  ORIGINAL_size_kb: number;
  THUMB_size_kb: number;
  SM_size_kb: number;
  MD_size_kb: number;
  LG_size_kb: number;
  XL_size_kb: number;
  createdAt: Date;
  urls: Record<ImageSize, string>;
}
```

### Enums

**ImageSize:**
```typescript
enum ImageSize {
  ORIGINAL = "original",
  THUMB = "thumb",
  SM = "sm",
  MD = "md",
  LG = "lg",
  XL = "xl"
}
```

## Example with Express

```typescript
import express from 'express';
import multer from 'multer';
import { S3ImageStorage } from 'cca-aws-sdk-s3';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const imageStorage = new S3ImageStorage({/* config */});

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const metadata = await imageStorage.uploadImage(req.file);
    res.status(200).json({ success: true, metadata });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/images', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await imageStorage.getImagesList(page, limit);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## License

MIT