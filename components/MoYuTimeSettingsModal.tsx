import TimePickerField from './TimePickerField';
import { Colors } from '@/constants/theme';
import type { MoYuSettings } from '@/utils/moyuTime';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  visible: boolean;
  settings: MoYuSettings;
  theme: typeof Colors['light'];
  onClose: () => void;
  onSave: (s: MoYuSettings) => void;
}

export default function MoYuTimeSettingsModal({
  visible,
  settings,
  theme,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (visible) setDraft(settings);
  }, [visible, settings]);

  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: theme.card }]}>
          <Text style={[s.title, { color: theme.text }]}>摸鱼时间设置</Text>
          <Text style={[s.hint, { color: theme.icon }]}>点击时间使用滚轮选择</Text>

          <TimePickerField
            label="上班时间"
            value={draft.startTime}
            theme={theme}
            onChange={(startTime) => setDraft((prev) => ({ ...prev, startTime }))}
          />
          <TimePickerField
            label="午饭时间"
            value={draft.lunchTime}
            theme={theme}
            onChange={(lunchTime) => setDraft((prev) => ({ ...prev, lunchTime }))}
          />
          <TimePickerField
            label="下班时间"
            value={draft.endTime}
            theme={theme}
            onChange={(endTime) => setDraft((prev) => ({ ...prev, endTime }))}
          />

          <View style={s.row}>
            <Text style={[s.label, { color: theme.text }]}>工作制度</Text>
            <View style={s.chips}>
              {(
                [
                  { v: 'double' as const, l: '双休' },
                  { v: 'single' as const, l: '单休' },
                ] as const
              ).map(({ v, l }) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    s.chip,
                    { borderColor: theme.border },
                    draft.workdayType === v && {
                      borderColor: theme.tint,
                      backgroundColor: theme.tint + '18',
                    },
                  ]}
                  onPress={() => setDraft((prev) => ({ ...prev, workdayType: v }))}
                >
                  <Text style={{ color: draft.workdayType === v ? theme.tint : theme.text }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.footer}>
            <TouchableOpacity style={[s.btn, { borderColor: theme.border }]} onPress={onClose}>
              <Text style={{ color: theme.text }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: theme.tint, borderColor: theme.tint }]}
              onPress={() => {
                onSave(draft);
                onClose();
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = (theme: typeof Colors['light']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    card: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      paddingBottom: 32,
    },
    title: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
    hint: { fontSize: 12, marginBottom: 16 },
    row: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
    chips: { flexDirection: 'row', gap: 8 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    footer: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btn: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
  });
