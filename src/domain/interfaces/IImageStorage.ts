import { ImageSize } from 'cca-image-resize-convert-module';
import { ImageMetadata } from './ImageMetadata';
import { PaginatedResult } from './PaginatedResult';

export interface IImageStorage {
  uploadImage(file: Express.Multer.File): Promise<ImageMetadata>;
  uploadMultipleImages(files: Express.Multer.File[]): Promise<ImageMetadata[]>
  getImageUrl(imageId: string, size: ImageSize): Promise<string>;
  getImageUrls(id: string): Promise<Record<ImageSize, string>>;
  deleteImage(imageId: string): Promise<void>;
  deleteMultipleImages(imageIds: string[]): Promise<void>;
  getImagesList(page: number, limit: number): Promise<PaginatedResult<ImageMetadata>>
}


