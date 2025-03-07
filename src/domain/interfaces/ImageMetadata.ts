import { ImageSize } from "cca-image-resize-convert-module";

export interface ImageMetadata {
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