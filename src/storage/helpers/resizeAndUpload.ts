import sharp from "sharp";
import { S3Client } from "@aws-sdk/client-s3";

import { STORAGE_CONSTANTS } from "../../constants/storageConstants";
import { ImageSize } from "../../domain/types/ImageSize";
import { StorageError } from "../../utils/Errors";

import { uploadToS3 } from "./uploadToS3";
import { getFormatFromExtension } from "./getFormatFromExtension";



export const resizeAndUpload = async (
    bucketName: string,
    s3Client: S3Client,
    originalBuffer: Buffer,
    baseKey: string,
    filename: string,
    ext: string,
    size: ImageSize
): Promise<string> => {
    if (size === ImageSize.ORIGINAL) {
        throw new Error('Cannot resize original image');
    }

    const sizeConfig = STORAGE_CONSTANTS.IMAGE_SIZES[size.toUpperCase() as keyof typeof STORAGE_CONSTANTS.IMAGE_SIZES];
    const folder = STORAGE_CONSTANTS.FOLDER_STRUCTURE[size.toUpperCase() as keyof typeof STORAGE_CONSTANTS.FOLDER_STRUCTURE];
    const key = `${baseKey}/${folder}/${filename}${ext}`;

    try {
        const format = getFormatFromExtension(ext);
        const resizedBuffer = await sharp(originalBuffer)
            .resize({
                width: sizeConfig.width,
                height: sizeConfig.height,
                fit: 'inside',
                withoutEnlargement: true
            })
            .toFormat(format as keyof sharp.FormatEnum, { quality: sizeConfig.quality })
            .toBuffer();

        await uploadToS3(bucketName, s3Client, key, resizedBuffer, `image/${format}`);
        return key;
    } catch (error: any) {
        throw new StorageError(`${STORAGE_CONSTANTS.ERRORS.PROCESSING_FAILED}: ${error.message}`);
    }
}