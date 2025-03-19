import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ImageSize, resizeImageAllSizes } from 'cca-image-resize-convert-module';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { IImageStorage } from '../domain/interfaces/IImageStorage';
import { STORAGE_CONSTANTS } from '../constants/storageConstants';
import { StorageError } from '../utils/Errors';

import { ImageMetadata } from '../domain/interfaces/ImageMetadata';
import { PaginatedResult } from '../domain/interfaces/PaginatedResult';
import { S3Config } from '../domain/interfaces/S3Config';

import { validateFile } from './helpers/validateFile';

export class S3ImageStorage implements IImageStorage {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(config: S3Config) {
    if (!config.region) throw new StorageError(STORAGE_CONSTANTS.ERRORS.REGION_REQUIRED);
    if (!config.bucket) throw new StorageError(STORAGE_CONSTANTS.ERRORS.BUCKET_REQUIRED);
    if (!config.accessKeyId) throw new StorageError(STORAGE_CONSTANTS.ERRORS.ACCESS_KEY_REQUIRED);
    if (!config.secretAccessKey) throw new StorageError(STORAGE_CONSTANTS.ERRORS.SECRET_KEY_REQUIRED);

    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    this.bucket = config.bucket;
  }

  async uploadImage(file: Express.Multer.File): Promise<ImageMetadata> {
    validateFile(file);

    const id = uuidv4();

    const processedImages = await resizeImageAllSizes(file);

    const urls: Record<ImageSize, string> = {} as Record<ImageSize, string>;

    const uploadTasks = Object.entries(processedImages).map(async ([size, buffer]) => {
      const key = `images/${id}/${size}.webp`;

      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp'
      }));

      const getCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      const signedUrl = await getSignedUrl(this.s3Client, getCommand);

      return {
        size: size as ImageSize,
        signedUrl,
        byteLength: buffer.byteLength
      };
    });

    const uploadResults = await Promise.all(uploadTasks);
    const sizeMap: Record<string, number> = {};

    uploadResults.forEach(({ size, signedUrl, byteLength }) => {
      urls[size] = signedUrl;
      sizeMap[size] = Math.round(byteLength / 1024);
    });

    const metadata: ImageMetadata = {
      id: id,
      originalName: file.originalname,
      mimeType: 'image/webp',
      ORIGINAL_size_kb: sizeMap.original,
      THUMB_size_kb: sizeMap.thumb,
      SM_size_kb: sizeMap.sm,
      MD_size_kb: sizeMap.md,
      LG_size_kb: sizeMap.lg,
      XL_size_kb: sizeMap.xl,
      createdAt: new Date(),
      urls
    };

    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: `images/${id}/metadata.json`,
      Body: JSON.stringify(metadata),
      ContentType: 'application/json'
    }));

    return metadata;
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<ImageMetadata[]> {
    const uploadPromises = files.map(file => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  async getImageUrl(id: string, size: ImageSize): Promise<string> {
    const urls = await this.getImageUrls(id);
    return urls[size];
  }


  async getImageUrls(id: string): Promise<Record<ImageSize, string>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: `images/${id}/metadata.json`
      });
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 60 });
      const response = await fetch(url);
      const metadata = await response.json() as ImageMetadata;

      if (metadata.urls && Object.keys(metadata.urls).length > 0) {
        return metadata.urls;
      }
    } catch (error) {
      throw new StorageError(STORAGE_CONSTANTS.ERRORS.DOWNLOAD_FAILED)
    }

    const urls: Record<ImageSize, string> = {} as Record<ImageSize, string>;
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: `images/${id}/`
    });
    const result = await this.s3Client.send(listCommand);

    if (!result.Contents || result.Contents.length === 0) {
      throw new StorageError(STORAGE_CONSTANTS.ERRORS.LIST_FAILED)
    }

    for (const item of result.Contents) {
      if (!item.Key || item.Key.endsWith("metadata.json")) continue;

      const fileName = path.basename(item.Key);
      const sizeKey = fileName.split('.')[0] as ImageSize;

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucket,
        Key: item.Key,
      });
      const signedUrl = await getSignedUrl(this.s3Client, getObjectCommand, { expiresIn: 60 });
      urls[sizeKey] = signedUrl;
    }
    return urls;
  }

  async deleteImage(id: string): Promise<void> {
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: `images/${id}/`
    });

    const result = await this.s3Client.send(listCommand);

    if (!result.Contents || result.Contents.length === 0) {
      throw new StorageError(STORAGE_CONSTANTS.ERRORS.DELETE_FAILED);
    }

    const deletePromises = result.Contents.map(item => {
      if (!item.Key) return Promise.resolve();

      return this.s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: item.Key
      }));
    });

    await Promise.all(deletePromises);
  }

  async deleteMultipleImages(ids: string[]): Promise<void> {
    const deletePromises = ids.map(id => this.deleteImage(id));
    await Promise.all(deletePromises);
  }

  async getImagesList(page: number = 1, limit: number = 10): Promise<PaginatedResult<ImageMetadata>> {
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: 'images/'
    });
    const result = await this.s3Client.send(listCommand);

    const metadataFiles = result.Contents?.filter(item => item.Key && item.Key.endsWith('metadata.json')) || [];

    const total = metadataFiles.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedFiles = metadataFiles.slice(startIndex, endIndex);

    const metadataPromises = paginatedFiles.map(async (item) => {
      if (!item.Key) throw new StorageError(STORAGE_CONSTANTS.ERRORS.LIST_FAILED);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: item.Key
      });
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });

      const response = await fetch(url);

      const metadata = await response.json() as ImageMetadata;

      if (!metadata.urls || Object.keys(metadata.urls).length === 0) {
        metadata.urls = await this.getImageUrls(metadata.id);
      }
      return metadata;
    });

    const items = await Promise.all(metadataPromises);

    return {
      items,
      total,
      page,
      limit,
      totalPages
    };
  }
}