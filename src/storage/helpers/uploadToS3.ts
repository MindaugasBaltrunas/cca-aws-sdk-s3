import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const uploadToS3 = async (bucketName: string, s3Client: S3Client, key: string, buffer: Buffer, contentType: string): Promise<void> => {
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType
    });
    await s3Client.send(command);
}