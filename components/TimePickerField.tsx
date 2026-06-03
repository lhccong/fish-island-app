import { Colors } from '@/constants/theme';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function hmToDate(hm: string): Date {
  const [h, m] = hm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function dateToHm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

interface Props {
  label: string;
  value: string;
  theme: typeof Colors['light'];
  onChange: (hm: string) => void;
}

export default function TimePickerField({ label, value, theme, onChange }: Props) {
  const [show, setShow] = useState(false);
  const pickerValue = useMemo(() => hmToDate(value || '09:00'), [value]);

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(dateToHm(date));
  };

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: theme.border, backgroundColor: theme.background }]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: theme.text }]}>{value || '09:00'}</Text>
        <Text style={{ color: theme.icon, fontSize: 13 }}>选择</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPickerChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerText: { fontSize: 16, fontWeight: '500' },
});
