import Toast from 'react-native-toast-message';

export const toast = {
  success: (message: string, description?: string) => {
    Toast.show({
      type: 'success',
      text1: message,
      text2: description,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  error: (message: string, description?: string) => {
    Toast.show({
      type: 'error',
      text1: message,
      text2: description,
      position: 'top',
      visibilityTime: 4000,
    });
  },

  info: (message: string, description?: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: description,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  warning: (message: string, description?: string) => {
    Toast.show({
      type: 'info',
      text1: message,
      text2: description,
      position: 'top',
      visibilityTime: 3500,
    });
  },

  show: (options: {
    type?: 'success' | 'error' | 'info' | 'warning';
    message: string;
    description?: string;
    position?: 'top' | 'bottom';
    duration?: number;
  }) => {
    Toast.show({
      type: options.type || 'info',
      text1: options.message,
      text2: options.description,
      position: options.position || 'top',
      visibilityTime: options.duration || 3000,
    });
  },
};
