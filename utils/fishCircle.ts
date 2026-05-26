/** 从评论正文中解析 [img:url] 标记（与 Web/utools 鱼小圈一致） */
export function extractCommentImages(content?: string | null): string[] {
  return Array.from(String(content || '').matchAll(/\[img:([^\]]+)\]/g)).map(m => m[1]);
}

/** 去掉评论正文中的图片标记，仅保留文字 */
export function stripCommentImageMarkers(content?: string | null): string {
  return String(content || '')
    .replace(/\[img:[^\]]+\]/g, '')
    .trim();
}
