import { stockApi } from '@/api/stock';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type TabKey = 'market' | 'position' | 'records';

const parseNum = (v: any) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/%/g, ''));
  return Number.isNaN(n) ? 0 : n;
};

export default function StockMarketPanel() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { userInfo, refreshUserInfo } = useUser();
  const availablePoints = (userInfo?.points ?? 0) - (userInfo?.usedPoints ?? 0);

  const [tab, setTab] = useState<TabKey>('market');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [indices, setIndices] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tradeVisible, setTradeVisible] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [selectedIndex, setSelectedIndex] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [amountInput, setAmountInput] = useState('');
  const [sharesInput, setSharesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [idxRes, posRes, txRes] = await Promise.all([
        stockApi.getMajorIndices(),
        stockApi.getPosition(),
        stockApi.getTransactions({ current: 1, pageSize: 10 }),
      ]);
      if (idxRes?.code === 0) setIndices(idxRes.data || []);
      if (posRes?.code === 0) {
        const d = posRes.data;
        if (Array.isArray(d)) setPositions(d);
        else if (d?.indexCode) setPositions([d]);
        else setPositions([]);
      }
      if (txRes?.code === 0) setTransactions(txRes.data?.records || []);
    } catch {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAll(), refreshUserInfo()]);
    setRefreshing(false);
    toast.success('刷新成功');
  };

  const stats = useMemo(() => {
    let totalMarketValue = 0;
    let totalProfit = 0;
    positions.forEach((pos) => {
      totalMarketValue += parseNum(pos.marketValue);
      totalProfit += parseNum(pos.totalProfit);
    });
    return { totalMarketValue, totalProfit };
  }, [positions]);

  const openBuy = (index: any) => {
    setTradeType('buy');
    setSelectedIndex(index);
    setSelectedPosition(null);
    setAmountInput('');
    setTradeVisible(true);
  };

  const openSell = (pos: any) => {
    setTradeType('sell');
    setSelectedPosition(pos);
    setSelectedIndex(null);
    setSharesInput('');
    setTradeVisible(true);
  };

  const submitTrade = async () => {
    setSubmitting(true);
    try {
      if (tradeType === 'buy') {
        const amount = Number(amountInput);
        if (!amount || amount <= 0) {
          toast.error('请输入有效金额');
          return;
        }
        const res = await stockApi.buy({
          indexCode: selectedIndex?.indexCode,
          amount,
        });
        if (res?.code === 0) {
          toast.success(`买入成功！份额 ${Number(res.data?.shares || 0).toFixed(2)}`);
          setTradeVisible(false);
          await Promise.all([loadAll(), refreshUserInfo()]);
        } else {
          toast.error(res?.message || '买入失败');
        }
      } else {
        const shares = Number(sharesInput);
        if (!shares || shares <= 0) {
          toast.error('请输入有效份额');
          return;
        }
        const res = await stockApi.sell({
          indexCode: selectedPosition?.indexCode,
          shares,
        });
        if (res?.code === 0) {
          toast.success('卖出成功');
          setTradeVisible(false);
          await Promise.all([loadAll(), refreshUserInfo()]);
        } else {
          toast.error(res?.message || '卖出失败');
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '交易失败');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'market', label: '市场行情' },
    { key: 'position', label: '我的持仓' },
    { key: 'records', label: '交易记录' },
  ];

  return (
    <View style={[styles.wrap, { backgroundColor: '#f0f2f5' }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Text style={styles.headerIcon}>📈</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>摸鱼股市</Text>
          <Text style={{ color: theme.icon, fontSize: 11 }}>使用积分交易主要指数</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={{ color: '#cf1322', fontWeight: '600' }}>刷新</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.icon, fontSize: 12 }}>可用积分</Text>
          <Text style={[styles.statVal, { color: theme.tint }]}>{availablePoints}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.icon, fontSize: 12 }}>持仓市值</Text>
          <Text style={styles.statVal}>{stats.totalMarketValue.toFixed(2)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.icon, fontSize: 12 }}>总盈亏</Text>
          <Text style={[styles.statVal, { color: stats.totalProfit >= 0 ? '#cf1322' : '#3f8600' }]}>
            {stats.totalProfit >= 0 ? '+' : ''}
            {stats.totalProfit.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={{ color: tab === t.key ? '#cf1322' : theme.icon, fontWeight: '600', fontSize: 13 }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cf1322" />}
        contentContainerStyle={styles.list}
      >
        {loading && tab === 'market' ? (
          <ActivityIndicator color="#cf1322" style={{ marginTop: 40 }} />
        ) : null}

        {tab === 'market' &&
          indices.map((idx) => {
            const change = parseNum(idx.changePercent ?? idx.change);
            const up = change >= 0;
            return (
              <View key={idx.indexCode} style={[styles.indexCard, { backgroundColor: theme.card }]}>
                <View style={styles.indexTop}>
                  <Text style={[styles.indexName, { color: theme.text }]}>{idx.indexName}</Text>
                  <Text style={{ color: up ? '#cf1322' : '#3f8600', fontWeight: '700' }}>
                    {up ? '+' : ''}
                    {change}%
                  </Text>
                </View>
                <Text style={{ color: theme.icon, fontSize: 12, marginBottom: 10 }}>
                  {idx.indexCode} · 净值 {parseNum(idx.currentNav || idx.nav).toFixed(4)}
                </Text>
                <TouchableOpacity style={styles.buyBtn} onPress={() => openBuy(idx)}>
                  <Text style={styles.buyBtnText}>买入</Text>
                </TouchableOpacity>
              </View>
            );
          })}

        {tab === 'position' &&
          (positions.length === 0 ? (
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 40 }}>暂无持仓</Text>
          ) : (
            positions.map((pos) => (
              <View key={pos.indexCode} style={[styles.indexCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.indexName, { color: theme.text }]}>{pos.indexName}</Text>
                <Text style={{ color: theme.icon, fontSize: 12, marginVertical: 6 }}>
                  份额 {parseNum(pos.totalShares || pos.availableShares).toFixed(2)} · 盈亏{' '}
                  {parseNum(pos.totalProfit).toFixed(2)}
                </Text>
                <TouchableOpacity style={styles.sellBtn} onPress={() => openSell(pos)}>
                  <Text style={styles.sellBtnText}>卖出</Text>
                </TouchableOpacity>
              </View>
            ))
          ))}

        {tab === 'records' &&
          (transactions.length === 0 ? (
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 40 }}>暂无交易记录</Text>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={[styles.txRow, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{tx.indexName}</Text>
                  <Text style={{ color: theme.icon, fontSize: 11 }}>{tx.createTime}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: tx.tradeType === 1 ? '#cf1322' : '#3f8600', fontWeight: '700' }}>
                    {tx.tradeType === 1 ? '买入' : '卖出'} ¥{parseNum(tx.amount).toFixed(2)}
                  </Text>
                  <Text style={{ color: theme.icon, fontSize: 11 }}>份额 {parseNum(tx.shares).toFixed(2)}</Text>
                </View>
              </View>
            ))
          ))}
      </ScrollView>

      <Modal visible={tradeVisible} transparent animationType="slide" onRequestClose={() => setTradeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {tradeType === 'buy' ? '买入指数' : '卖出指数'}
            </Text>
            <Text style={{ color: theme.icon, marginBottom: 12 }}>
              {tradeType === 'buy'
                ? selectedIndex?.indexName
                : `${selectedPosition?.indexName}（可卖 ${parseNum(selectedPosition?.availableShares).toFixed(2)}）`}
            </Text>
            {tradeType === 'buy' ? (
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="买入金额（积分）"
                placeholderTextColor={theme.icon}
                keyboardType="decimal-pad"
                value={amountInput}
                onChangeText={setAmountInput}
              />
            ) : (
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="卖出份额"
                placeholderTextColor={theme.icon}
                keyboardType="decimal-pad"
                value={sharesInput}
                onChangeText={setSharesInput}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setTradeVisible(false)}>
                <Text style={{ color: theme.text }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOk} onPress={submitTrade} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>确认</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
  },
  headerIcon: { fontSize: 26 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  refreshBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  statsRow: { flexDirection: 'row', gap: 8, padding: 12 },
  statCard: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 12, borderRadius: 10, overflow: 'hidden' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabItemActive: { backgroundColor: '#fff1f0' },
  list: { padding: 12, paddingBottom: 24 },
  indexCard: { borderRadius: 10, padding: 14, marginBottom: 10 },
  indexTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  indexName: { fontSize: 16, fontWeight: '700' },
  buyBtn: { backgroundColor: '#cf1322', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  buyBtnText: { color: '#fff', fontWeight: '600' },
  sellBtn: { backgroundColor: '#3f8600', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  sellBtnText: { color: '#fff', fontWeight: '600' },
  txRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  modalOk: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#cf1322',
  },
});
