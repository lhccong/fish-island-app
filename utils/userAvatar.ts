const DEFAULT_AVATAR = 'https://api.yucoder.cn/images/default-avatar.png';

export function resolveAvatarUrl(avatar?: string | null): string {
  if (!avatar) return DEFAULT_AVATAR;
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:')) {
    return avatar;
  }
  if (avatar.startsWith('/')) {
    return `https://api.yucoder.cn${avatar}`;
  }
  return `https://api.yucoder.cn/${avatar}`;
}

export function pickUserAvatar(user?: Record<string, any> | null): string {
  if (!user) return DEFAULT_AVATAR;
  return resolveAvatarUrl(
    user.userAvatarURL48 ||
      user.userAvatarURL ||
      user.userAvatar ||
      user.avatar,
  );
}

/** 鱼小圈背景与头像相同时不当作宽幅背景展示 */
export function shouldShowMomentsBg(
  momentsBgUrl?: string | null,
  avatarUrl?: string | null,
): boolean {
  if (!momentsBgUrl?.trim()) return false;
  const bg = resolveAvatarUrl(momentsBgUrl).split('?')[0];
  const avatar = resolveAvatarUrl(avatarUrl).split('?')[0];
  return bg !== avatar;
}
