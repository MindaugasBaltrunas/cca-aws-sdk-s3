import { ImageSize } from '../types/ImageSize';
import { IImageUrls } from './IImageUrls';

export interface IImageStorage {
  uploadImage(file: Express.Multer.File): Promise<UploadResult>;
  uploadMultipleImages(files: Express.Multer.File[]): Promise<UploadResult[]>;
  getImageUrl(imageId: string, size: ImageSize): Promise<string>;
  getImageUrls(imageId: string): Promise<IImageUrls>;
  deleteImage(imageId: string): Promise<void>;
  deleteMultipleImages(imageIds: string[]): Promise<void>;
  getImagesList(page?: number, limit?: number): Promise<{
    images: UploadResult[];
    total: number;
    page: number;
    limit: number;
  }>;
}

export interface UploadResult {
  id: string;
  key: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  urls: IImageUrls;
}
