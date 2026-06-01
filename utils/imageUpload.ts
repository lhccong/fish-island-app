import * as ImageManipulator from 'expo-image-manipulator';

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

export function isRemoteImageUri(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return map[ext] || 'image/jpeg';
}

function normalizeFileName(fileName: string, fallbackExt: string): string {
  const base = fileName.trim() || `image_${Date.now()}.${fallbackExt}`;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return `${base}.${fallbackExt}`;
  const ext = base.slice(dot + 1).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return `${base.slice(0, dot)}.${fallbackExt}`;
  }
  return base;
}

/** 鱼小圈配图上传前预处理：HEIC 等格式转 JPEG，并限制尺寸（与聊天发图一致） */
export async function preparePostImageForUpload(
  uri: string,
  fileName?: string,
  mimeType?: string,
): Promise<{ uri: string; fileName: string; mimeType: string }> {
  const extFromName = fileName?.split('.').pop()?.toLowerCase() || '';
  const extFromMime = mimeType?.split('/').pop()?.toLowerCase() || '';
  const ext = ALLOWED_EXT.has(extFromName) ? extFromName : extFromMime;
  const isHeic = /heic|heif/i.test(extFromName) || /heic|heif/i.test(mimeType || '');

  if (ext === 'gif' && !isHeic) {
    const name = normalizeFileName(fileName || '', 'gif');
    return { uri, fileName: name, mimeType: 'image/gif' };
  }

  if (ALLOWED_EXT.has(ext) && !isHeic && ext !== 'heic' && ext !== 'heif') {
    const name = normalizeFileName(fileName || `image_${Date.now()}.${ext}`, ext);
    return { uri, fileName: name, mimeType: mimeType || mimeFromExt(ext) };
  }

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1920 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    return {
      uri: result.uri,
      fileName: `image_${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
    };
  } catch (e) {
    console.warn('图片预处理失败，尝试以 JPEG 元数据上传原图', e);
    return {
      uri,
      fileName: normalizeFileName(fileName || '', 'jpg'),
      mimeType: 'image/jpeg',
    };
  }
}
