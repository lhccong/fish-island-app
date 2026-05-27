import { stockApi } from '@/api/stock';
import { Colors } from '@/constants/theme';
import { useUser } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { toast } from '@/utils/toast';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const TRADE_CLICK_DEBOUNCE_MS = 500;

const TRADABLE_INDEX_CODES = new Set([
  'sh000001',
  'sz399001',
  'sz399006',
  'sh000300',
  'sh000016',
]);

const parseNum = (v: unknown) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/%/g, ''));
  return Number.isNaN(n) ? 0 : n;
};

const fmt = (v: unknown, precision = 2) => Number(parseNum(v)).toFixed(precision);

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
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [transactionPage, setTransactionPage] = useState(1);
  const [tradeVisible, setTradeVisible] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [selectedIndex, setSelectedIndex] = useState<any>(null);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [amountInput, setAmountInput] = useState('');
  const [sharesInput, setSharesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const lastTradeClickRef = useRef(0);

  const getPositionByCode = useCallback(
    (indexCode?: string) => positions.find((p) => p.indexCode === indexCode),
    [positions],
  );

  const isTradableIndex = (indexCode?: string) =>
    !!indexCode && TRADABLE_INDEX_CODES.has(indexCode);

  const loadTransactions = useCallback(async (page = 1) => {
    const txRes = await stockApi.getTransactions({ current: page, pageSize: 10 });
    if (txRes?.code === 0) {
      setTransactions(txRes.data?.records || []);
      setTransactionTotal(txRes.data?.total || 0);
      setTransactionPage(page);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [idxRes, posRes] = await Promise.all([
        stockApi.getMajorIndices(),
        stockApi.getPositions(),
      ]);
      if (idxRes?.code === 0) setIndices(idxRes.data || []);
      if (posRes?.code === 0) {
        const list = posRes.data || [];
        setPositions(
          list.filter((p: any) => p.indexCode && (p.totalShares || 0) > 0),
        );
      } else {
        setPositions([]);
      }
      await loadTransactions(1);
    } catch {
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [loadTransactions]);

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
    let dayProfit = 0;
    positions.forEach((pos) => {
      totalMarketValue += parseNum(pos.marketValue);
      totalProfit += parseNum(pos.totalProfit);
      const prevValue =
        parseNum(pos.totalShares) *
        (parseNum(pos.currentNav) / (1 + parseNum(pos.changePercent) / 100));
      dayProfit += parseNum(pos.marketValue) - prevValue;
    });
    return { totalMarketValue, totalProfit, dayProfit };
  }, [positions]);

  const openTradeModal = (type: 'buy' | 'sell', index?: any, position?: any) => {
    setTradeType(type);
    setSelectedIndex(index || null);
    setSelectedPosition(position || null);
    setAmountInput('');
    setSharesInput('');
    setTradeVisible(true);
  };

  const openTradeModalDebounced = (type: 'buy' | 'sell', index?: any, position?: any) => {
    const now = Date.now();
    if (now - lastTradeClickRef.current < TRADE_CLICK_DEBOUNCE_MS) return;
    lastTradeClickRef.current = now;
    openTradeModal(type, index, position);
  };

  const submitTrade = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (tradeType === 'buy') {
        const amount = Number(amountInput);
        if (!amount || amount < 100) {
          toast.error('最小买入金额为100积分');
          return;
        }
        const indexCode =
          selectedIndex?.indexCode || selectedPosition?.indexCode;
        const res = await stockApi.buy({ indexCode, amount });
        if (res?.code === 0) {
          toast.success(`买入成功！成交份额 ${fmt(res.data?.shares)}`);
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

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'market', label: '市场行情' },
    { key: 'position', label: '我的持仓', badge: positions.length || undefined },
    { key: 'records', label: '交易记录' },
  ];

  const tradeIndexName =
    tradeType === 'buy'
      ? selectedIndex?.indexName || selectedPosition?.indexName
      : selectedPosition?.indexName;
  const tradeIndexCode =
    tradeType === 'buy'
      ? selectedIndex?.indexCode || selectedPosition?.indexCode
      : selectedPosition?.indexCode;

  return (
    <View style={[styles.wrap, { backgroundColor: '#f0f2f5' }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Text style={styles.headerIcon}>📈</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>摸鱼股市</Text>
          <Text style={{ color: theme.icon, fontSize: 11 }}>
            使用积分交易上证、深证成指、创业板指、沪深300、上证50 等主要指数
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={{ color: '#cf1322', fontWeight: '600' }}>刷新</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsRow}
      >
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.icon, fontSize: 12 }}>可用积分</Text>
          <Text style={[styles.statVal, { color: '#52c41a' }]}>{fmt(availablePoints)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.icon, fontSize: 12 }}>持仓市值</Text>
          <Text style={[styles.statVal, { color: '#1890ff' }]}>
            {fmt(stats.totalMarketValue)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.icon, fontSize: 12 }}>今日盈亏</Text>
          <Text
            style={[
              styles.statVal,
              { color: stats.dayProfit >= 0 ? '#cf1322' : '#3f8600' },
            ]}
          >
            {stats.dayProfit >= 0 ? '+' : ''}
            {fmt(stats.dayProfit)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={{ color: theme.icon, fontSize: 12 }}>累计盈亏</Text>
          <Text
            style={[
              styles.statVal,
              { color: stats.totalProfit >= 0 ? '#cf1322' : '#3f8600' },
            ]}
          >
            {stats.totalProfit >= 0 ? '+' : ''}
            {fmt(stats.totalProfit)}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabItemActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              style={{
                color: tab === t.key ? '#cf1322' : theme.icon,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {t.label}
              {t.badge ? ` (${t.badge})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cf1322" />
        }
        contentContainerStyle={styles.list}
      >
        {loading ? (
          <ActivityIndicator color="#cf1322" style={{ marginTop: 40 }} />
        ) : null}

        {tab === 'market' &&
          indices.map((idx) => {
            const holding = getPositionByCode(idx.indexCode);
            const tradable = isTradableIndex(idx.indexCode);
            const changeVal = parseNum(idx.changeValue);
            const changePct = parseNum(idx.changePercent);
            const up = changeVal >= 0;
            return (
              <View
                key={idx.indexCode}
                style={[
                  styles.indexCard,
                  { backgroundColor: theme.card },
                  holding ? styles.indexCardHolding : null,
                ]}
              >
                <View style={styles.indexTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tagRow}>
                      <Text style={[styles.indexName, { color: theme.text }]}>
                        {idx.indexName}
                      </Text>
                      {holding ? (
                        <>
                          <View style={styles.tagBlue}>
                            <Text style={styles.tagText}>已持仓</Text>
                          </View>
                          <Text style={styles.holdingBrief} numberOfLines={1}>
                            持有 {fmt(holding.totalShares)} 份 · 市值 ¥{fmt(holding.marketValue)}
                          </Text>
                        </>
                      ) : null}
                      {!tradable ? (
                        <View style={styles.tagGray}>
                          <Text style={styles.tagTextGray}>暂不可交易</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: theme.icon, fontSize: 12 }}>{idx.indexCode}</Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: up ? '#cf1322' : '#3f8600',
                    marginBottom: 8,
                  }}
                >
                  {parseNum(idx.currentValue).toFixed(2)}
                </Text>
                <View style={styles.changeRow}>
                  <Text style={{ color: up ? '#cf1322' : '#3f8600', fontWeight: '600' }}>
                    {up ? '+' : ''}
                    {changeVal.toFixed(2)}
                  </Text>
                  <Text style={{ color: changePct >= 0 ? '#cf1322' : '#3f8600', fontWeight: '600' }}>
                    {changePct >= 0 ? '+' : ''}
                    {changePct.toFixed(2)}%
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.buyBtn, !tradable && styles.btnDisabled]}
                  disabled={!tradable}
                  onPress={() => openTradeModalDebounced('buy', idx)}
                >
                  <Text style={styles.buyBtnText}>{holding ? '加仓' : '买入'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}

        {tab === 'position' &&
          (positions.length === 0 ? (
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 40 }}>
              暂无持仓，快去市场买入吧
            </Text>
          ) : (
            positions.map((pos) => {
              const pct = parseNum(pos.changePercent);
              const profitUp = parseNum(pos.totalProfit) >= 0;
              return (
                <View key={pos.indexCode} style={[styles.indexCard, { backgroundColor: theme.card }]}>
                  <View style={styles.indexTop}>
                    <View>
                      <Text style={[styles.indexName, { color: theme.text }]}>{pos.indexName}</Text>
                      <Text style={{ color: theme.icon, fontSize: 12 }}>{pos.indexCode}</Text>
                    </View>
                    <View
                      style={[
                        styles.pctBadge,
                        { backgroundColor: pct >= 0 ? '#fff1f0' : '#f6ffed' },
                      ]}
                    >
                      <Text style={{ color: pct >= 0 ? '#cf1322' : '#3f8600', fontWeight: '700' }}>
                        {pct >= 0 ? '+' : ''}
                        {pct.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.posGrid}>
                    {[
                      ['持有份额', fmt(pos.totalShares)],
                      ['可用份额', fmt(pos.availableShares)],
                      ['当前净值', `¥${fmt(pos.currentNav, 4)}`],
                      ['平均成本', `¥${fmt(pos.avgCost, 4)}`],
                      ['持仓市值', `¥${fmt(pos.marketValue)}`],
                      [
                        '累计盈亏',
                        `${profitUp ? '+' : ''}¥${fmt(pos.totalProfit)}`,
                        profitUp ? '#cf1322' : '#3f8600',
                      ],
                    ].map(([label, value, color]) => (
                      <View key={String(label)} style={styles.gridItem}>
                        <Text style={{ color: theme.icon, fontSize: 11 }}>{label}</Text>
                        <Text
                          style={{
                            fontWeight: '600',
                            marginTop: 4,
                            color: (color as string) || theme.text,
                          }}
                        >
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.posActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.buyBtnAction]}
                      onPress={() =>
                        openTradeModalDebounced(
                          'buy',
                          indices.find((i) => i.indexCode === pos.indexCode),
                          pos,
                        )
                      }
                    >
                      <Text style={styles.actionBtnText}>加仓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.sellBtnAction,
                        !pos.availableShares && styles.btnDisabled,
                      ]}
                      disabled={!pos.availableShares}
                      onPress={() => openTradeModalDebounced('sell', undefined, pos)}
                    >
                      <Text style={styles.actionBtnText}>卖出</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ))}

        {tab === 'records' &&
          (transactions.length === 0 ? (
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 40 }}>
              暂无交易记录
            </Text>
          ) : (
            <>
              {transactions.map((tx) => (
                <View key={tx.id} style={[styles.txRow, { backgroundColor: theme.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '600' }}>{tx.indexName}</Text>
                    <Text style={{ color: theme.icon, fontSize: 11 }}>{tx.createTime}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: tx.tradeType === 1 ? '#cf1322' : '#3f8600',
                        fontWeight: '700',
                      }}
                    >
                      {tx.tradeType === 1 ? '买入' : '卖出'} · 份额 {fmt(tx.shares)}
                    </Text>
                    <Text style={{ color: theme.icon, fontSize: 11 }}>
                      净值 ¥{fmt(tx.nav, 4)} ·{' '}
                      {tx.tradeType === 1 ? '-' : '+'}¥{fmt(tx.amount)}
                    </Text>
                    {tx.profitLoss != null ? (
                      <Text
                        style={{
                          color: parseNum(tx.profitLoss) >= 0 ? '#cf1322' : '#3f8600',
                          fontSize: 11,
                          fontWeight: '600',
                        }}
                      >
                        盈亏 {parseNum(tx.profitLoss) >= 0 ? '+' : ''}¥{fmt(tx.profitLoss)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {transactionTotal > 10 ? (
                <View style={styles.pager}>
                  <TouchableOpacity
                    disabled={transactionPage <= 1}
                    onPress={() => loadTransactions(transactionPage - 1)}
                  >
                    <Text style={{ color: transactionPage <= 1 ? theme.icon : '#cf1322' }}>
                      上一页
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.icon, fontSize: 12 }}>
                    {transactionPage} / {Math.ceil(transactionTotal / 10)}
                  </Text>
                  <TouchableOpacity
                    disabled={transactionPage * 10 >= transactionTotal}
                    onPress={() => loadTransactions(transactionPage + 1)}
                  >
                    <Text
                      style={{
                        color:
                          transactionPage * 10 >= transactionTotal ? theme.icon : '#cf1322',
                      }}
                    >
                      下一页
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          ))}
      </ScrollView>

      <Modal
        visible={tradeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTradeVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {tradeType === 'buy' ? '买入指数' : '卖出指数'}
            </Text>
            <Text style={[styles.tradeIndexName, { color: theme.text }]}>{tradeIndexName || '—'}</Text>
            <Text style={{ color: theme.icon, fontSize: 12, marginBottom: 12 }}>
              {tradeIndexCode}
            </Text>
            {tradeType === 'buy' ? (
              <>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="买入金额（积分），最低100"
                  placeholderTextColor={theme.icon}
                  keyboardType="decimal-pad"
                  value={amountInput}
                  onChangeText={setAmountInput}
                />
                <Text style={{ color: theme.icon, fontSize: 11, marginBottom: 12 }}>
                  最小买入金额为100积分，剩余积分：{fmt(availablePoints)}
                </Text>
                {selectedIndex ? (
                  <Text style={{ color: theme.icon, fontSize: 11, marginBottom: 12 }}>
                    最新点位: {parseNum(selectedIndex.currentValue).toFixed(2)}（
                    {parseNum(selectedIndex.changePercent) >= 0 ? '+' : ''}
                    {parseNum(selectedIndex.changePercent).toFixed(2)}%）
                  </Text>
                ) : null}
                {selectedPosition ? (
                  <Text style={{ color: theme.icon, fontSize: 11, marginBottom: 12 }}>
                    当前持仓: {fmt(selectedPosition.totalShares)} 份 · 可用{' '}
                    {fmt(selectedPosition.availableShares)} 份
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                  placeholder="卖出份额"
                  placeholderTextColor={theme.icon}
                  keyboardType="decimal-pad"
                  value={sharesInput}
                  onChangeText={setSharesInput}
                />
                {selectedPosition ? (
                  <Text style={{ color: theme.icon, fontSize: 11, marginBottom: 12 }}>
                    可用份额: {fmt(selectedPosition.availableShares)} · 当前净值 ¥
                    {fmt(selectedPosition.currentNav, 4)}
                  </Text>
                ) : null}
              </>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setTradeVisible(false)}
                disabled={submitting}
              >
                <Text style={{ color: theme.text }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOk, submitting && styles.btnDisabled]}
                onPress={submitTrade}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {tradeType === 'buy' ? '确认买入' : '确认卖出'}
                  </Text>
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
  statsScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 76,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statCard: {
    width: 108,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 12, borderRadius: 10, overflow: 'hidden' },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabItemActive: { backgroundColor: '#fff1f0' },
  list: { padding: 12, paddingBottom: 24 },
  indexCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  indexCardHolding: {
    borderColor: '#91caff',
  },
  indexTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  indexName: { fontSize: 16, fontWeight: '700' },
  tagBlue: {
    backgroundColor: '#e6f4ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: { color: '#1677ff', fontSize: 10 },
  tagGray: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTextGray: { color: '#8c8c8c', fontSize: 10 },
  holdingBrief: { flex: 1, fontSize: 11, color: '#0958d9', minWidth: 0 },
  changeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  buyBtn: {
    backgroundColor: '#cf1322',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  buyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buyBtnAction: { backgroundColor: '#cf1322' },
  sellBtnAction: { backgroundColor: '#3f8600' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.45 },
  posGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
  },
  posActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  txRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  tradeIndexName: { fontSize: 16, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
