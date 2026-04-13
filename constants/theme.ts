/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';
import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

const tintColorLight = '#ff9900';
const tintColorDark = '#ff9900';

export const Colors = {
  light: {
    text: '#444',
    background: '#f4f4f4',
    tint: tintColorLight,
    icon: '#777',
    tabIconDefault: '#777',
    tabIconSelected: tintColorLight,
    card: '#fff',
    border: '#eee',
  },
  dark: {
    text: '#e0e0e0',
    background: '#1e1e1e',
    tint: tintColorDark,
    icon: '#b2bec3',
    tabIconDefault: '#b2bec3',
    tabIconSelected: tintColorDark,
    card: '#2a2a2d',
    border: '#404040',
  },
};

// react-native-paper 主题
export const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#ff9900',
    primaryContainer: '#FFF3E0',
    secondary: '#2ed573',
    error: '#ff4757',
    background: '#f4f4f4',
    surface: '#fff',
  },
  roundness: 12,
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#ff9900',
    secondary: '#00b894',
    error: '#ff6b6b',
    background: '#1e1e1e',
    surface: '#2a2a2d',
  },
  roundness: 12,
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
