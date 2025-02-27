import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { STORAGE_CONSTANTS } from "../../constants/storageConstants";


export const getImageExtension = async (folderPath: string, bucketName: string, s3Client: S3Client, imageId: string): Promise<string | null> => {
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
  const originalFolder = STORAGE_CONSTANTS.FOLDER_STRUCTURE.ORIGINAL;

  for (const ext of extensions) {
    const key = folderPath
      ? `${folderPath}/${imageId}/${originalFolder}/${imageId}${ext}`
      : `${imageId}/${originalFolder}/${imageId}${ext}`;
    try {
      const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
      await s3Client.send(command);
      return ext;
    } catch {
      continue;
    }
  }
  return null;
}