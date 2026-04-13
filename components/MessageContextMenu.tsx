import { ChatMessage } from '@/api/chat';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface MessageContextMenuProps {
  visible: boolean;
  message: ChatMessage | null;
  onClose: () => void;
  onQuote: (message: ChatMessage) => void;
  onAtUser: (userName: string) => void;
  onCopy: (content: string) => void;
  currentUserName?: string;
}

export default function MessageContextMenu({
  visible,
  message,
  onClose,
  onQuote,
  onAtUser,
  onCopy,
  currentUserName,
}: MessageContextMenuProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (!message) return null;

  const isSelf = message.userName === currentUserName;
  const content = message.content || message.md || '';

  // 检查是否是图片消息
  const isImage = /\[img\]\s*[\s\S]*?\s*\[\/img\]/i.test(content);

  // 处理引用
  const handleQuote = () => {
    onQuote(message);
    onClose();
  };

  // 处理 @ 用户
  const handleAtUser = () => {
    if (message.userName) {
      onAtUser(message.userName);
      onClose();
    }
  };

  // 处理复制
  const handleCopy = () => {
    if (content) {
      // 移除 [img] 标签，只保留文本
      const textContent = content.replace(/\[img\]\s*[\s\S]*?\s*\[\/img\]/gi, '[图片]').trim();
      onCopy(textContent);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.menu, { backgroundColor: theme.card }]}>
            {/* 引用 */}
            <TouchableOpacity style={styles.menuItem} onPress={handleQuote}>
              <IconSymbol name="quote.bubble.fill" size={18} color={theme.tint} />
              <Text style={[styles.menuText, { color: theme.text }]}>引用</Text>
            </TouchableOpacity>

            {/* @TA - 非自己的消息才显示 */}
            {!isSelf && message.userName && (
              <TouchableOpacity style={styles.menuItem} onPress={handleAtUser}>
                <IconSymbol name="at" size={18} color={theme.tint} />
                <Text style={[styles.menuText, { color: theme.text }]}>@TA</Text>
              </TouchableOpacity>
            )}

            {/* 复制 - 非图片消息才显示 */}
            {!isImage && (
              <TouchableOpacity style={styles.menuItem} onPress={handleCopy}>
                <IconSymbol name="doc.on.doc" size={18} color={theme.tint} />
                <Text style={[styles.menuText, { color: theme.text }]}>复制</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
