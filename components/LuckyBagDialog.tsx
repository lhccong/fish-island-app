import { luckyBagApi } from '@/api/luckyBag';
import { LUCKY_BAG_IMAGE } from '@/utils/luckyBag';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface LuckyBagDialogProps {
  visible: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export default function LuckyBagDialog({ visible, onClose, onSent }: LuckyBagDialogProps) {
  const [type, setType] = useState<1 | 2>(1);
  const [totalAmount, setTotalAmount] = useState('50');
  const [winnerCount, setWinnerCount] = useState('5');
  const [durationSeconds, setDurationSeconds] = useState('180');
  const [name, setName] = useState('快来参与福袋吧');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(1);
      setTotalAmount('50');
      setWinnerCount('5');
      setDurationSeconds('180');
      setName('快来参与福袋吧');
    }
  }, [visible]);

  const handleSend = async () => {
    if (sending) {
      toast.info('正在处理福袋发送，请稍候...');
      return;
    }
    const amount = Number(totalAmount);
    const winners = Number(winnerCount);
    const duration = Number(durationSeconds);
    if (amount < 1 || amount > 100) {
      toast.error('福袋总积分需在 1-100 之间！');
      return;
    }
    if (winners <= 0) {
      toast.error('请输入有效的中奖人数！');
      return;
    }
    if (Math.ceil(amount / winners) > 50) {
      toast.error('单人最多可获得 50 积分，请调整总积分或中奖人数！');
      return;
    }
    if (duration < 60 || duration > 1800) {
      toast.error('持续时间需在 60-1800 秒之间！');
      return;
    }

    setSending(true);
    try {
      const res = await luckyBagApi.create({
        totalAmount: amount,
        winnerCount: winners,
        type,
        name: name.trim() || '快来参与福袋吧',
        durationSeconds: duration,
      });
      if (res.code === 0 && res.data) {
        toast.success('福袋发送成功！');
        onSent?.();
        onClose();
      } else {
        toast.error(res.msg || res.message || '福袋发送失败！');
      }
    } catch {
      toast.error('福袋发送失败！');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Image source={{ uri: LUCKY_BAG_IMAGE }} style={styles.headerIcon} contentFit="contain" />
            <Text style={styles.headerTitle}>发送福袋</Text>
          </View>

          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 1 && styles.typeBtnActive]}
              onPress={() => setType(1)}
            >
              <Text style={[styles.typeBtnText, type === 1 && styles.typeBtnTextActive]}>随机分配</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 2 && styles.typeBtnActive]}
              onPress={() => setType(2)}
            >
              <Text style={[styles.typeBtnText, type === 2 && styles.typeBtnTextActive]}>平均分配</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>总积分 (1-100)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={totalAmount} onChangeText={setTotalAmount} />

          <Text style={styles.label}>中奖人数</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={winnerCount} onChangeText={setWinnerCount} />

          <Text style={styles.label}>持续时间 (60-1800 秒)</Text>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            value={durationSeconds}
            onChangeText={setDurationSeconds}
          />

          <Text style={styles.label}>福袋名称</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            maxLength={50}
            placeholder="快来参与福袋吧"
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendBtn} disabled={sending} onPress={handleSend}>
              <Text style={styles.sendBtnText}>{sending ? '发送中...' : '发送'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerIcon: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: '#d46b08',
    backgroundColor: '#fff7e6',
  },
  typeBtnText: {
    fontSize: 13,
    color: '#666',
  },
  typeBtnTextActive: {
    color: '#d46b08',
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#d46b08',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
