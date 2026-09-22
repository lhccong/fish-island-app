import type { AlertButton } from '@/components/AlertDialog';

export class Alert {
  static alert(
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { cancelable?: boolean }
  ): void {
    const defaultButtons: AlertButton[] = [
      {
        text: '确定',
        onPress: () => {},
        style: 'default',
      },
    ];

    const finalButtons = buttons || defaultButtons;

    // 在 Web 环境中使用浏览器原生的 confirm 对话框
    // 简化实现，确保可靠性
    if (finalButtons.length === 1) {
      // 单按钮：使用 alert
      window.alert(`${title}\n${message || ''}`);
      finalButtons[0].onPress?.();
    } else {
      // 多按钮：使用 confirm
      const confirmed = window.confirm(`${title}\n${message || ''}`);
      
      // 找到确认和取消按钮
      const confirmButton = finalButtons.find(b => b.style === 'destructive' || (b.style !== 'cancel' && b.text !== '取消'));
      const cancelButton = finalButtons.find(b => b.style === 'cancel' || b.text === '取消');
      
      if (confirmed && confirmButton) {
        confirmButton.onPress?.();
      } else if (!confirmed && cancelButton) {
        cancelButton.onPress?.();
      }
    }
  }
}
