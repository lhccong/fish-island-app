// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'bubble.right.fill': 'chat-bubble',
  'person.fill': 'person',
  'person.text.rectangle': 'badge',
  'gift.fill': 'card-giftcard',
  'person.2.fill': 'people',
  'tag.fill': 'local-offer',
  'arrow.up': 'arrow-upward',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'camera': 'photo-camera',
  'photo': 'photo-library',
  'photo.fill': 'photo',
  'xmark': 'close',
  'arrow.right': 'logout',
  'face.smiling': 'emoji-emotions',
  'heart.slash': 'heart-broken',
  'plus': 'add',
  'magnifyingglass': 'search',
  'ellipsis': 'more-horiz',
  'quote.bubble.fill': 'format-quote',
  'at': 'alternate-email',
  'doc.on.doc': 'content-copy',
  'arrow.clockwise': 'replay',
  'arrow.uturn.backward': 'undo',
  'pencil': 'edit',
  'person.slash.fill': 'person-off',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'bubble.left': 'chat-bubble-outline',
  'trophy.fill': 'emoji-events',
  'pin.fill': 'push-pin',
  'trash': 'delete',
  'bell.fill': 'notifications',
  'leaf.fill': 'eco',
  'star.fill': 'star',
  'envelope.fill': 'mail',
  'person.3.fill': 'groups',
  'lock.fill': 'lock',
  'arrow.clockwise.circle': 'refresh',
  'square.grid.2x2': 'apps',
  'clock.fill': 'schedule',
  'bag.fill': 'shopping-bag',
  'checklist': 'assignment',
  'briefcase.fill': 'work',
  'pencil': 'edit',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
