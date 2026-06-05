import { chatApi } from '@/api/chat';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { redPacketTypeToApi } from '@/utils/redPacket';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface RedPacketType {
  name: string;
  value: string;
  icon: string;
  desc: string;
  defaultMsg: string;
}

const redPacketTypes: RedPacketType[] = [
  {
    name: '拼手气红包',
    value: 'random',
    icon: 'gift.fill',
    desc: '摸鱼者，事竟成！',
    defaultMsg: '摸鱼者，事竟成！',
  },
  {
    name: '平分红包',
    value: 'average',
    icon: 'share',
    desc: '平分红包，人人有份！',
    defaultMsg: '平分红包，人人有份！',
  },
  {
    name: '答题红包',
    value: 'quiz',
    icon: 'pencil',
    desc: '答对题目才能抢！',
    defaultMsg: '',
  },
];

interface RedPacketDialogProps {
  visible: boolean;
  onClose: () => void;
  onSend: (result: any) => void;
}

export default function RedPacketDialog({
  visible,
  onClose,
  onSend,
}: RedPacketDialogProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [selectedType, setSelectedType] = useState('random');
  const [msg, setMsg] = useState('摸鱼者，事竟成！');
  const [answer, setAnswer] = useState('');
  const [money, setMoney] = useState('100');
  const [count, setCount] = useState('10');
  const [isSending, setIsSending] = useState(false);

  // 重置表单
  useEffect(() => {
    if (visible) {
      setSelectedType('random');
      setMsg('摸鱼者，事竟成！');
      setAnswer('');
      setMoney('100');
      setCount('10');
    }
  }, [visible]);

  // 切换红包类型时更新祝福语
  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const selected = redPacketTypes.find((t) => t.value === type);
    if (selected) {
      setMsg(selected.defaultMsg);
      if (type === 'quiz') {
        setAnswer('');
      }
    }
  };

  const handleSend = async () => {
    if (isSending) return;

    const moneyNum = parseInt(money, 10);
    const countNum = parseInt(count, 10);

    if (!moneyNum || moneyNum < 1) {
      Alert.alert('提示', '积分必须大于0');
      return;
    }

    if (!countNum || countNum < 1) {
      Alert.alert('提示', '个数必须大于0');
      return;
    }

    if (moneyNum < countNum) {
      Alert.alert('提示', '积分不能小于个数');
      return;
    }

    if (selectedType === 'quiz') {
      if (!msg.trim()) {
        Alert.alert('提示', '请输入题目');
        return;
      }
      if (!answer.trim()) {
        Alert.alert('提示', '请输入正确答案');
        return;
      }
    }

    setIsSending(true);
    try {
      const packetType = redPacketTypeToApi(selectedType);
      const body: {
        name: string;
        totalAmount: number;
        count: number;
        type: number;
        answer?: string;
      } = {
        name: msg,
        totalAmount: moneyNum,
        count: countNum,
        type: packetType,
      };

      if (packetType === 3 && answer.trim()) {
        body.answer = answer.trim();
      }

      const response = await chatApi.createRedPacket(body);

      if (response.code === 0 && response.data) {
        onSend(response.data);
        onClose();
      } else {
        Alert.alert('发送失败', response.message || response.msg || '红包创建失败');
      }
    } catch (error) {
      console.error('发送红包失败:', error);
      Alert.alert('发送失败', '红包创建失败，请重试');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.card },
          ]}
        >
          {/* 头部 */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <IconSymbol name="gift.fill" size={24} color="#fff" />
              <Text style={styles.headerTitle}>发红包</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <IconSymbol name="xmark" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 红包类型选择 */}
            <View style={styles.typeSelector}>
              {redPacketTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    selectedType === type.value && styles.typeCardActive,
                  ]}
                  onPress={() => handleTypeChange(type.value)}
                >
                  <IconSymbol
                    name={type.icon as any}
                    size={24}
                    color={selectedType === type.value ? '#FF6B6B' : theme.icon}
                  />
                  <Text
                    style={[
                      styles.typeName,
                      { color: theme.text },
                      selectedType === type.value && styles.typeNameActive,
                    ]}
                  >
                    {type.name}
                  </Text>
                  <Text style={[styles.typeDesc, { color: theme.icon }]}>
                    {type.desc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 祝福语 / 题目 */}
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.icon }]}>
                {selectedType === 'quiz' ? '题目' : '祝福语'}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: theme.text, backgroundColor: theme.background },
                ]}
                value={msg}
                onChangeText={setMsg}
                maxLength={20}
                placeholder={selectedType === 'quiz' ? '请输入题目' : '摸鱼者，事竟成！'}
                placeholderTextColor={theme.icon}
              />
            </View>

            {selectedType === 'quiz' && (
              <View style={styles.formItem}>
                <Text style={[styles.label, { color: theme.icon }]}>答案</Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: theme.text, backgroundColor: theme.background },
                  ]}
                  value={answer}
                  onChangeText={setAnswer}
                  maxLength={50}
                  placeholder="请输入正确答案"
                  placeholderTextColor={theme.icon}
                />
              </View>
            )}

            {/* 积分 */}
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.icon }]}>积分</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { color: theme.text, backgroundColor: theme.background },
                ]}
                value={money}
                onChangeText={setMoney}
                keyboardType="numeric"
                maxLength={9}
                placeholder="100"
                placeholderTextColor={theme.icon}
              />
            </View>

            {/* 个数 */}
            <View style={styles.formItem}>
              <Text style={[styles.label, { color: theme.icon }]}>个数</Text>
              <TextInput
                style={[
                  styles.numberInput,
                  { color: theme.text, backgroundColor: theme.background },
                ]}
                value={count}
                onChangeText={setCount}
                keyboardType="numeric"
                maxLength={7}
                placeholder="10"
                placeholderTextColor={theme.icon}
              />
            </View>
          </ScrollView>

          {/* 底部按钮 */}
          <View style={[styles.footer, { backgroundColor: theme.background }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={[styles.cancelBtnText, { color: theme.icon }]}>
                取消
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                isSending && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={isSending}
            >
              <Text style={styles.sendBtnText}>
                {isSending ? '发送中...' : '发送红包'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  header: {
    backgroundColor: '#FF6B6B',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 16,
    maxHeight: 400,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  typeCard: {
    width: '47%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  typeCardActive: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  typeName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 6,
  },
  typeNameActive: {
    color: '#FF6B6B',
  },
  typeDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  formItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  label: {
    width: 60,
    fontSize: 14,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  numberInput: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sendBtn: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
