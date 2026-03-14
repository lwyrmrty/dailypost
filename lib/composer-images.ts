export const COMPOSER_IMAGE_MAX_COUNT = 20;
export const COMPOSER_IMAGE_MAX_FILE_SIZE = 20 * 1024 * 1024;
export const COMPOSER_IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
] as const;

export type ComposerImageMimeType = typeof COMPOSER_IMAGE_ALLOWED_MIME_TYPES[number];

export interface ComposerImageDto {
  id: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  linkedinImageUrn: string | null;
  createdAt: string;
}

export function isComposerImageMimeType(value: string): value is ComposerImageMimeType {
  return COMPOSER_IMAGE_ALLOWED_MIME_TYPES.includes(value as ComposerImageMimeType);
}

export function getComposerImageValidationMessage(
  mimeType: string,
  fileSize: number
) {
  if (!isComposerImageMimeType(mimeType)) {
    return 'Images must be JPG, PNG, or GIF.';
  }

  if (fileSize > COMPOSER_IMAGE_MAX_FILE_SIZE) {
    return 'Each image must be 20 MB or smaller.';
  }

  return null;
}
