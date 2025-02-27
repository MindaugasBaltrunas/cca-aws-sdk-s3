import { STORAGE_CONSTANTS } from "../../constants/storageConstants";
import { StorageError } from "../../utils/Errors";

export const validateFile = (file: Express.Multer.File): void => {
      if (!STORAGE_CONSTANTS.ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw new StorageError(
          `${STORAGE_CONSTANTS.ERRORS.UNSUPPORTED_FILE_TYPE}: ${file.mimetype}`
        );
      }
      if (file.size > STORAGE_CONSTANTS.MAX_FILE_SIZE_BYTES) {
        throw new StorageError(STORAGE_CONSTANTS.ERRORS.FILE_SIZE_EXCEEDED);
      }
    }