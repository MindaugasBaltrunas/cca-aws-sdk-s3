import {
  S3Client,
  GetObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  ObjectIdentifier
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { IImageStorage, UploadResult } from '../domain/interfaces/IImageStorage';
import { IImageUrls } from '../domain/interfaces/IImageUrls';
import { ImageSize } from '../domain/types/ImageSize';
import { ImageUrlDTO } from '../application/dto/ImageUrlDTO';
import { STORAGE_CONSTANTS } from '../constants/storageConstants';
import { StorageError } from '../utils/Errors';

import { validateFile } from './helpers/validateFile';
import { uploadToS3 } from './helpers/uploadToS3';
import { resizeAndUpload } from './helpers/resizeAndUpload';
import { getImageExtension } from './helpers/getImageExtension';

export interface S3ImageConfig {
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  folderPath?: string;
  urlExpirationSeconds?: number;
}

export class S3ImageStorage implements IImageStorage {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly folderPath: string;
  private readonly urlExpirationSeconds: number;

  constructor(config: S3ImageConfig) {
    if (!config.region) throw new StorageError(STORAGE_CONSTANTS.ERRORS.REGION_REQUIRED);
    if (!config.bucketName) throw new StorageError(STORAGE_CONSTANTS.ERRORS.BUCKET_REQUIRED);
    if (!config.accessKeyId) throw new StorageError(STORAGE_CONSTANTS.ERRORS.ACCESS_KEY_REQUIRED);
    if (!config.secretAccessKey) throw new StorageError(STORAGE_CONSTANTS.ERRORS.SECRET_KEY_REQUIRED);

    this.bucketName = config.bucketName;
    this.folderPath = config.folderPath?.replace(/^\/+|\/+$/g, '') || '';
    this.urlExpirationSeconds = config.urlExpirationSeconds || STORAGE_CONSTANTS.DEFAULT_URL_EXPIRATION_SECONDS;

    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      endpoint: config.endpoint
    });
  }

  public async uploadImage(file: Express.Multer.File): Promise<UploadResult> {
    validateFile(file);

    const imageId = uuidv4();
    const ext = path.extname(file.originalname).toLowerCase();
    const baseKey = this.folderPath ? `${this.folderPath}/${imageId}` : imageId;
    const originalKey = `${baseKey}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.ORIGINAL}/${imageId}${ext}`;

    await uploadToS3(this.bucketName, this.s3Client, originalKey, file.buffer, file.mimetype);

    const thumbKey = await resizeAndUpload(this.bucketName, this.s3Client, file.buffer, baseKey, imageId, ext, ImageSize.THUMB);
    const smKey = await resizeAndUpload(this.bucketName, this.s3Client, file.buffer, baseKey, imageId, ext, ImageSize.SM);
    const mdKey = await resizeAndUpload(this.bucketName, this.s3Client, file.buffer, baseKey, imageId, ext, ImageSize.MD);
    const lgKey = await resizeAndUpload(this.bucketName, this.s3Client, file.buffer, baseKey, imageId, ext, ImageSize.LG);
    const xlKey = await resizeAndUpload(this.bucketName, this.s3Client, file.buffer, baseKey, imageId, ext, ImageSize.XL);

    const urls = new ImageUrlDTO();
    urls.original = await this.getSignedUrl(originalKey);
    urls.thumb = await this.getSignedUrl(thumbKey);
    urls.sm = await this.getSignedUrl(smKey);
    urls.md = await this.getSignedUrl(mdKey);
    urls.lg = await this.getSignedUrl(lgKey);
    urls.xl = await this.getSignedUrl(xlKey);

    return {
      id: imageId,
      key: baseKey,
      originalFilename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      urls
    };
  }

  public async uploadMultipleImages(files: Express.Multer.File[]): Promise<UploadResult[]> {
    return Promise.all(files.map(file => this.uploadImage(file)));
  }

  public async getImageUrl(imageId: string, size: ImageSize): Promise<string> {
    if (!Object.values(ImageSize).includes(size)) {
      throw new StorageError(STORAGE_CONSTANTS.ERRORS.INVALID_IMAGE_SIZE);
    }

    const ext = await getImageExtension(this.folderPath, this.bucketName, this.s3Client, imageId);
    if (!ext) {
      throw new StorageError(STORAGE_CONSTANTS.ERRORS.NOT_FOUND);
    }

    const folder =
      size === ImageSize.ORIGINAL
        ? STORAGE_CONSTANTS.FOLDER_STRUCTURE.ORIGINAL
        : STORAGE_CONSTANTS.FOLDER_STRUCTURE[size.toUpperCase() as keyof typeof STORAGE_CONSTANTS.FOLDER_STRUCTURE];

    const key = this.folderPath
      ? `${this.folderPath}/${imageId}/${folder}/${imageId}${ext}`
      : `${imageId}/${folder}/${imageId}${ext}`;

    return this.getSignedUrl(key);
  }

  public async getImageUrls(imageId: string): Promise<IImageUrls> {
    const ext = await getImageExtension(this.folderPath, this.bucketName, this.s3Client, imageId);
    if (!ext) {
      throw new StorageError(STORAGE_CONSTANTS.ERRORS.NOT_FOUND);
    }

    const baseKey = this.folderPath ? `${this.folderPath}/${imageId}` : imageId;

    const urls = new ImageUrlDTO();
    urls.original = await this.getSignedUrl(
      `${baseKey}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.ORIGINAL}/${imageId}${ext}`
    );
    urls.thumb = await this.getSignedUrl(
      `${baseKey}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.THUMB}/${imageId}${ext}`
    );
    urls.sm = await this.getSignedUrl(
      `${baseKey}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.SM}/${imageId}${ext}`
    );
    urls.md = await this.getSignedUrl(
      `${baseKey}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.MD}/${imageId}${ext}`
    );
    urls.lg = await this.getSignedUrl(
      `${baseKey}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.LG}/${imageId}${ext}`
    );
    urls.xl = await this.getSignedUrl(
      `${baseKey}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.XL}/${imageId}${ext}`
    );

    return urls;
  }

  public async deleteImage(imageId: string): Promise<void> {
    const prefix = this.folderPath ? `${this.folderPath}/${imageId}/` : `${imageId}/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix
    });
    const response = await this.s3Client.send(listCommand);

    if (!response.Contents || response.Contents.length === 0) {
      throw new StorageError(STORAGE_CONSTANTS.ERRORS.NOT_FOUND);
    }

    const objects: ObjectIdentifier[] = response.Contents.map(item => ({
      Key: item.Key!
    }));

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: this.bucketName,
      Delete: { Objects: objects, Quiet: false }
    });

    await this.s3Client.send(deleteCommand);
  }

  public async deleteMultipleImages(imageIds: string[]): Promise<void> {
    await Promise.all(imageIds.map(id => this.deleteImage(id)));
  }

  public async getImagesList(
    page: number = 1,
    limit: number = 10
  ): Promise<{ images: UploadResult[]; total: number; page: number; limit: number }> {
    const prefix = this.folderPath ? `${this.folderPath}/` : '';
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
      Delimiter: '/'
    });
    const response = await this.s3Client.send(command);

    if (!response.CommonPrefixes || response.CommonPrefixes.length === 0) {
      return { images: [], total: 0, page, limit };
    }

    const total = response.CommonPrefixes.length;
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);
    const relevantPrefixes = response.CommonPrefixes.slice(startIndex, endIndex);

    const imagePromises = relevantPrefixes.map(async prefixObj => {
      const prefixStr = prefixObj.Prefix!;
      const segments = prefixStr.split('/').filter(Boolean);
      const imageId = segments[segments.length - 1];
      const urls = await this.getImageUrls(imageId);
      const ext = await getImageExtension(this.folderPath, this.bucketName, this.s3Client, imageId);
      const originalKey = this.folderPath
        ? `${this.folderPath}/${imageId}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.ORIGINAL}/${imageId}${ext}`
        : `${imageId}/${STORAGE_CONSTANTS.FOLDER_STRUCTURE.ORIGINAL}/${imageId}${ext}`;

      try {
        const headCommand = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: originalKey
        });
        const headResponse = await this.s3Client.send(headCommand);
        return {
          id: imageId,
          key: prefixStr,
          originalFilename: imageId + ext,
          mimetype: headResponse.ContentType || 'application/octet-stream',
          size: headResponse.ContentLength || 0,
          urls
        };
      } catch {
        return {
          id: imageId,
          key: prefixStr,
          originalFilename: imageId + (ext || ''),
          mimetype: 'application/octet-stream',
          size: 0,
          urls
        };
      }
    });

    const images = await Promise.all(imagePromises);

    return { images, total, page, limit };
  }

  private async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key
    });
    return getSignedUrl(this.s3Client, command, { expiresIn: this.urlExpirationSeconds });
  }
}
