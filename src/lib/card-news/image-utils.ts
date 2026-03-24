/**
 * Image utilities for client-side image processing
 */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ImageValidationError {
  type: 'size' | 'format';
  message: string;
}

/**
 * Validate image file format and size
 */
export function validateImageFile(file: File): ImageValidationError | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      type: 'format',
      message: 'jpg, png, webp 형식만 지원합니다.',
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      type: 'size',
      message: `파일 크기는 5MB 이하여야 합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }
  return null;
}

/**
 * Resize image to maxSize (longest side) using Canvas API and return data URL
 */
export async function resizeImage(file: File, maxSize: number = 1920): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const { width, height } = img;
        let targetWidth = width;
        let targetHeight = height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            targetWidth = maxSize;
            targetHeight = Math.round((height / width) * maxSize);
          } else {
            targetHeight = maxSize;
            targetWidth = Math.round((width / height) * maxSize);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context 생성 실패'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const quality = outputType === 'image/jpeg' ? 0.85 : undefined;
        const resizedDataUrl = canvas.toDataURL(outputType, quality);
        resolve(resizedDataUrl);
      };

      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
}
