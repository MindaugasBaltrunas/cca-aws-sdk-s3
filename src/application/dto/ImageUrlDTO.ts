import { IImageUrls } from '../../domain/interfaces/IImageUrls';

export class ImageUrlDTO implements IImageUrls {
  original!: string;
  thumb!: string;
  sm!: string;
  md!: string;
  lg!: string;
  xl!: string;
}
