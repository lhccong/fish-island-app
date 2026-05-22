import type { LotteryWinner } from '@/api/moments';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  theme: typeof Colors['light'];
  loading: boolean;
  result: { winners?: LotteryWinner[] } | null;
  winnerCount: number;
  onWinnerCountChange: (n: number) => void;
  onClose: () => void;
  onStart: () => void;
}

const PRESETS = [1, 3, 5, 10];

export default function MomentLotteryModal({
  visible,
  theme,
  loading,
  result,
  winnerCount,
  onWinnerCountChange,
  onClose,
  onStart,
}: Props) {
  const [inputVal, setInputVal] = useState(String(winnerCount));

  const applyCount = (n: number) => {
    const v = Math.min(100, Math.max(1, n));
    onWinnerCountChange(v);
    setInputVal(String(v));
  };

  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: theme.card }]}>
          <Text style={[s.title, { color: theme.text }]}>🏆 发起抽奖</Text>

          {!result ? (
            <>
              <Text style={[s.desc, { color: theme.icon }]}>
                从给这条动态点赞的用户中随机抽取幸运儿，抽奖结果将自动发布到评论区
              </Text>
              <View style={s.countRow}>
                <Text style={[s.countLabel, { color: theme.text }]}>抽取人数</Text>
                <TextInput
                  style={[s.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  keyboardType="number-pad"
                  value={inputVal}
                  onChangeText={(t) => {
                    setInputVal(t);
                    const n = parseInt(t, 10);
                    if (!isNaN(n)) onWinnerCountChange(Math.min(100, Math.max(1, n)));
                  }}
                />
                <Text style={{ color: theme.icon }}>人</Text>
              </View>
              <View style={s.presets}>
                {PRESETS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      s.preset,
                      { borderColor: theme.border },
                      winnerCount === v && { borderColor: theme.tint, backgroundColor: theme.tint + '18' },
                    ]}
                    onPress={() => applyCount(v)}
                  >
                    <Text style={{ color: winnerCount === v ? theme.tint : theme.text }}>{v} 人</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.footer}>
                <TouchableOpacity style={[s.btnGhost, { borderColor: theme.border }]} onPress={onClose}>
                  <Text style={{ color: theme.text }}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btnPrimary, { backgroundColor: theme.tint }]}
                  onPress={onStart}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.btnPrimaryText}>开始抽奖</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[s.resultTitle, { color: theme.text }]}>🎉 抽奖结果</Text>
              {(result.winners || []).length === 0 ? (
                <Text style={[s.empty, { color: theme.icon }]}>暂无点赞用户，无法抽奖</Text>
              ) : (
                <View style={s.winners}>
                  {(result.winners || []).map((w, idx) => (
                    <View key={w.userId} style={[s.winnerRow, { borderColor: theme.border }]}>
                      <Text style={[s.rank, { color: theme.tint }]}>第 {idx + 1} 名</Text>
                      <Image
                        source={{ uri: w.userAvatar }}
                        style={s.winnerAvatar}
                      />
                      <Text style={[s.winnerName, { color: theme.text }]}>{w.userName}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={[s.hint, { color: theme.icon }]}>抽奖结果已自动发布到评论区 🎊</Text>
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor: theme.tint, alignSelf: 'stretch' }]}
                onPress={onClose}
              >
                <Text style={s.btnPrimaryText}>好的</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = (theme: typeof Colors['light']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 24,
    },
    card: { borderRadius: 14, padding: 20 },
    title: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
    desc: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
    countRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    countLabel: { fontSize: 14, fontWeight: '600' },
    input: {
      width: 72,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 15,
      textAlign: 'center',
    },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    preset: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    footer: { flexDirection: 'row', gap: 12 },
    btnGhost: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnPrimary: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    resultTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
    empty: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
    winners: { gap: 8, marginBottom: 12 },
    winnerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rank: { fontSize: 12, width: 52 },
    winnerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.border },
    winnerName: { fontSize: 14, fontWeight: '600', flex: 1 },
    hint: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  });
