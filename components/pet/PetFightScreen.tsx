import { bossApi } from '@/api/boss';
import { petBattleApi } from '@/api/petBattle';
import { tournamentApi } from '@/api/tournament';
import { towerApi } from '@/api/tower';
import { userApi } from '@/api/user';
import PetImage from '@/components/PetImage';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EQUIP_RARITY_COLORS } from '@/utils/petEquipDisplay';
import { toast } from '@/utils/toast';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BattleStatus = 'idle' | 'fighting' | 'victory' | 'defeat';

type Fighter = {
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  avatar: string;
  equippedItems?: Record<string, any>;
  critRate?: number;
  dodgeRate?: number;
  blockRate?: number;
  comboRate?: number;
  lifesteal?: number;
  rewards?: { coins: number; exp: number; items: string[] };
};

type BattleEffect = {
  id: string;
  type: 'damage' | 'critical' | 'miss' | 'block' | 'heal' | 'combo';
  value?: number;
  text?: string;
  position: 'left' | 'right';
};

function hpBarColor(pct: number) {
  if (pct > 50) return '#52c41a';
  if (pct > 25) return '#faad14';
  return '#ff4d4f';
}

function FightAvatar({
  avatar,
  size,
  variant,
  attacking,
  hurt,
}: {
  avatar: string;
  size: number;
  variant: 'pet' | 'boss' | 'opponent';
  attacking?: boolean;
  hurt?: boolean;
}) {
  const isUrl = avatar?.startsWith('http') || avatar?.startsWith('/');
  const wrapStyle = [
    styles.avatarWrap,
    variant === 'pet' && styles.avatarPet,
    variant === 'boss' && styles.avatarBoss,
    variant === 'opponent' && styles.avatarOpponent,
    attacking && styles.avatarAttacking,
    hurt && styles.avatarHurt,
  ];

  let inner: React.ReactNode;
  if (avatar?.toLowerCase().endsWith('.webp')) {
    inner = <PetImage url={avatar} size={size} autoPlay />;
  } else if (isUrl) {
    inner = (
      <Image
        source={{ uri: avatar }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  } else {
    inner = <Text style={{ fontSize: size * 0.45 }}>{avatar || '🐠'}</Text>;
  }

  return <View style={wrapStyle}>{inner}</View>;
}

function HealthCard({
  fighter,
  side,
  theme,
  isOpponentPet,
}: {
  fighter: Fighter;
  side: 'pet' | 'enemy';
  theme: typeof Colors.light;
  isOpponentPet?: boolean;
}) {
  const pct = fighter.maxHp > 0 ? (fighter.hp / fighter.maxHp) * 100 : 0;
  const equipEntries = Object.entries(fighter.equippedItems || {}).filter(([, v]) => !!v);

  return (
    <View
      style={[
        styles.healthCard,
        side === 'pet' ? styles.healthCardPet : isOpponentPet ? styles.healthCardOpponent : styles.healthCardBoss,
      ]}
    >
      <View style={[styles.healthHeader, side === 'enemy' && styles.healthHeaderReverse]}>
        {side === 'pet' && <FightAvatar avatar={fighter.avatar} size={40} variant="pet" />}
        <View style={[styles.healthInfo, side === 'enemy' && { alignItems: 'flex-end' }]}>
          <View style={styles.healthNameRow}>
            {side === 'enemy' && (
              <View style={[styles.levelBadge, isOpponentPet ? styles.levelBadgeBlue : styles.levelBadgeRed]}>
                <Text style={styles.levelBadgeText}>{fighter.level}</Text>
              </View>
            )}
            <Text style={[styles.healthName, { color: theme.text }]} numberOfLines={1}>
              {fighter.name}
            </Text>
            {side === 'pet' && (
              <View style={[styles.levelBadge, styles.levelBadgeBlue]}>
                <Text style={styles.levelBadgeText}>{fighter.level}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.healthStats, { color: theme.icon }]}>
            🔥 {fighter.attack}  🛡️ {fighter.defense}
          </Text>
          {side === 'enemy' && !isOpponentPet && (
            <View style={styles.bossExtra}>
              {fighter.critRate ? <Text style={styles.bossExtraTag}>💥{((fighter.critRate || 0) * 100).toFixed(0)}%</Text> : null}
              {fighter.dodgeRate ? <Text style={styles.bossExtraTag}>💨{((fighter.dodgeRate || 0) * 100).toFixed(0)}%</Text> : null}
              {fighter.blockRate ? <Text style={styles.bossExtraTag}>🛡️{((fighter.blockRate || 0) * 100).toFixed(0)}%</Text> : null}
              {fighter.comboRate ? <Text style={styles.bossExtraTag}>⚡{((fighter.comboRate || 0) * 100).toFixed(0)}%</Text> : null}
              {fighter.lifesteal ? <Text style={styles.bossExtraTag}>🩸{((fighter.lifesteal || 0) * 100).toFixed(0)}%</Text> : null}
            </View>
          )}
        </View>
        {side === 'enemy' && (
          <FightAvatar avatar={fighter.avatar} size={40} variant={isOpponentPet ? 'opponent' : 'boss'} />
        )}
      </View>
      <View style={[styles.hpTrack, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.hpFill,
            { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: hpBarColor(pct) },
          ]}
        />
      </View>
      <Text style={[styles.hpText, { color: theme.icon }]}>
        {Math.max(0, fighter.hp)} / {fighter.maxHp}
      </Text>
      {equipEntries.length > 0 ? (
        <View style={[styles.equipRow, side === 'enemy' && styles.equipRowReverse]}>
          {equipEntries.map(([slot, item]) => {
            const rarity = item?.template?.rarity || 1;
            return (
              <View
                key={slot}
                style={[styles.equipChip, { borderColor: EQUIP_RARITY_COLORS[rarity] || '#d9d9d9' }]}
              >
                {item?.template?.icon ? (
                  <Image source={{ uri: item.template.icon }} style={styles.equipIcon} contentFit="contain" />
                ) : (
                  <Text style={{ fontSize: 14 }}>⚔️</Text>
                )}
              </View>
            );
          })}
        </View>
      ) : side === 'enemy' && !isOpponentPet ? (
        <View style={styles.equipRow}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.equipPlaceholder}>
              <Text style={{ fontSize: 12 }}>🔒</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function PetFightScreen() {
  const { bossId, opponentUserId, from, targetRank, floor } = useLocalSearchParams<{
    bossId?: string;
    opponentUserId?: string;
    from?: string;
    targetRank?: string;
    floor?: string;
  }>();
  const isTower = from === 'tower';
  const isTournament = from === 'tournament';
  const isPetBattle = (!!opponentUserId || isTournament) && !isTower && !bossId;
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [battleStatus, setBattleStatus] = useState<BattleStatus>('idle');
  const [currentTurn, setCurrentTurn] = useState<'pet' | 'boss'>('pet');
  const [pet, setPet] = useState<Fighter>({
    name: '摸鱼小精灵',
    level: 1,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    avatar: '🐠',
  });
  const [enemy, setEnemy] = useState<Fighter>({
    name: 'BOSS',
    level: 30,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 100,
    avatar: '👔',
    rewards: { coins: 0, exp: 0, items: [] },
  });

  const [petAttacking, setPetAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [petHurt, setPetHurt] = useState(false);
  const [enemyHurt, setEnemyHurt] = useState(false);
  const [showCollision, setShowCollision] = useState(false);
  const [battleEffects, setBattleEffects] = useState<BattleEffect[]>([]);
  const [showRewards, setShowRewards] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [skipLabel, setSkipLabel] = useState('跳过');

  const skipRef = useRef(false);
  const petRef = useRef(pet);
  const enemyRef = useRef(enemy);
  petRef.current = pet;
  enemyRef.current = enemy;

  const addEffect = (effect: Omit<BattleEffect, 'id'>) => {
    const id = `${Date.now()}_${Math.random()}`;
    setBattleEffects((prev) => [...prev, { ...effect, id }]);
    setTimeout(() => {
      setBattleEffects((prev) => prev.filter((e) => e.id !== id));
    }, 1500);
  };

  const mapPet = (data: any, fallbackName: string): Fighter => ({
    name: data?.name || fallbackName,
    level: data?.level || 1,
    hp: data?.health ?? 100,
    maxHp: data?.health ?? data?.maxHealth ?? 100,
    attack: data?.attack ?? 10,
    defense: data?.defense ?? 5,
    avatar: data?.avatar || data?.petUrl || '🐠',
    equippedItems: data?.equippedItems,
  });

  const loadInfo = useCallback(async () => {
    setLoading(true);
    setBattleStatus('idle');
    setShowRewards(false);
    setShowExitModal(false);
    setBattleEffects([]);
    try {
      if (isTower) {
        const [progressRes, petRes] = await Promise.all([
          towerApi.getProgress(),
          userApi.getPetDetail(),
        ]);
        if (progressRes?.code === 0 && progressRes.data) {
          const { nextMonster } = progressRes.data;
          if (nextMonster) {
            setEnemy({
              name: nextMonster.name ?? `第${nextMonster.floor ?? floor ?? 1}层守卫`,
              level: nextMonster.floor ?? 1,
              hp: nextMonster.health ?? 100,
              maxHp: nextMonster.health ?? 100,
              attack: nextMonster.attack ?? 10,
              defense: 0,
              avatar: nextMonster.avatarUrl ?? '👹',
              critRate: nextMonster.critRate,
              dodgeRate: nextMonster.dodgeRate,
              blockRate: nextMonster.blockRate,
              comboRate: nextMonster.comboRate,
              lifesteal: nextMonster.lifesteal,
            });
          }
        }
        if (petRes?.code === 0 && petRes.data) {
          setPet(mapPet(petRes.data, '我的宠物'));
        }
      } else if (isTournament && opponentUserId) {
        const res = await petBattleApi.getPetBattleInfo(opponentUserId);
        if (res?.code !== 0 || !res.data) {
          toast.error(res?.message || '获取对战信息失败');
          return;
        }
        const { myPet, opponentPet } = res.data;
        if (myPet) setPet(mapPet(myPet, '我的宠物'));
        if (opponentPet) setEnemy(mapPet(opponentPet, '对手宠物'));
      } else if (isTournament) {
        const petRes = await userApi.getPetDetail();
        if (petRes?.code === 0 && petRes.data) {
          setPet(mapPet(petRes.data, '我的宠物'));
        }
        setEnemy({
          name: '虚位以待',
          level: 1,
          hp: 100,
          maxHp: 100,
          attack: 10,
          defense: 5,
          avatar: '❓',
        });
      } else if (isPetBattle && opponentUserId) {
        const res = await petBattleApi.getPetBattleInfo(opponentUserId);
        if (res?.code !== 0 || !res.data) {
          toast.error(res?.message || '获取对战信息失败');
          return;
        }
        const { myPet, opponentPet } = res.data;
        if (myPet) setPet(mapPet(myPet, '我的宠物'));
        if (opponentPet) setEnemy(mapPet(opponentPet, '对手宠物'));
      } else if (bossId) {
        const res = await bossApi.getBossBattleInfo(bossId);
        if (res?.code !== 0 || !res.data) {
          toast.error(res?.message || '获取对战信息失败');
          return;
        }
        const { bossInfo, petInfo } = res.data;
        if (bossInfo) {
          const b = bossInfo as any;
          setEnemy({
            name: bossInfo.name || '未知BOSS',
            level: 30,
            hp: bossInfo.currentHealth ?? bossInfo.maxHealth ?? 100,
            maxHp: bossInfo.maxHealth ?? bossInfo.currentHealth ?? 100,
            attack: bossInfo.attack ?? 150,
            defense: 100,
            avatar: bossInfo.avatar || '👔',
            critRate: b.critRate,
            dodgeRate: b.dodgeRate,
            blockRate: b.blockRate,
            comboRate: b.comboRate,
            lifesteal: b.lifesteal,
            rewards: {
              coins: bossInfo.rewardPoints ?? 500,
              exp: 300,
              items: ['自由勋章', '摸鱼许可证'],
            },
          });
        }
        if (petInfo) setPet(mapPet(petInfo, '摸鱼小精灵'));
      } else {
        toast.error('缺少对战参数');
        router.back();
      }
    } catch (e: any) {
      toast.error(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [bossId, opponentUserId, isPetBattle, isTower, isTournament, floor, router]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const processRound = (result: any) => {
    const attackerType = result.attackerType || '';
    const isPetAttack = isPetBattle ? attackerType === 'MY_PET' : attackerType === 'PET';
    const damage = result.damage || 0;

    setShowCollision(true);
    setTimeout(() => setShowCollision(false), 300);

    if (isPetAttack) {
      setPetAttacking(true);
      setTimeout(() => setPetAttacking(false), 500);
      setCurrentTurn('pet');
    } else {
      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 500);
      setCurrentTurn('boss');
    }

    if (damage > 0) {
      setTimeout(() => {
        if (isPetAttack) {
          setEnemyHurt(true);
          setTimeout(() => setEnemyHurt(false), 300);
        } else {
          setPetHurt(true);
          setTimeout(() => setPetHurt(false), 300);
        }
      }, 200);
    }

    const targetPos: 'left' | 'right' = isPetAttack ? 'right' : 'left';
    if (result.isDodge) {
      addEffect({ type: 'miss', text: '闪避!', position: targetPos });
    } else if (result.isBlock) {
      addEffect({ type: 'block', text: '格挡!', position: targetPos });
    } else if (result.isCritical) {
      addEffect({
        type: 'critical',
        value: damage,
        text: result.isCombo ? '暴击连击!' : '暴击!',
        position: targetPos,
      });
    } else if (result.isCombo) {
      addEffect({ type: 'combo', value: damage, text: '连击!', position: targetPos });
    } else {
      addEffect({ type: 'damage', value: damage, position: targetPos });
    }

    if (result.lifestealHeal && result.lifestealHeal > 0) {
      addEffect({
        type: 'heal',
        value: result.lifestealHeal,
        text: '吸血',
        position: isPetAttack ? 'left' : 'right',
      });
    }

    if (isPetBattle) {
      if (result.myPetRemainingHealth != null) {
        setPet((p) => ({ ...p, hp: result.myPetRemainingHealth }));
      }
      if (result.opponentPetRemainingHealth != null) {
        setEnemy((e) => ({ ...e, hp: result.opponentPetRemainingHealth }));
      }
    } else {
      if (result.petRemainingHealth != null) {
        setPet((p) => ({ ...p, hp: result.petRemainingHealth }));
      }
      if (result.bossRemainingHealth != null) {
        setEnemy((e) => ({ ...e, hp: result.bossRemainingHealth }));
      }
    }
  };

  const startBattle = async () => {
    if (battleStatus === 'fighting') return;
    skipRef.current = false;
    setSkipLabel('跳过');
    setBattleStatus('fighting');
    setBattleEffects([]);
    toast.info('战斗开始！');

    try {
      let rounds: any[] = [];
      if (isTower) {
        const res = await towerApi.challenge();
        if (res?.code === 0 && res.data) {
          rounds = res.data.battleRounds ?? [];
          const first = rounds[0];
          if (first?.petRemainingHealth != null) {
            const petMax =
              first.attackerType === 'BOSS'
                ? (first.petRemainingHealth ?? 0) + (first.damage ?? 0)
                : first.petRemainingHealth ?? 100;
            setPet((p) => ({ ...p, maxHp: petMax, hp: petMax }));
          }
        }
      } else if (isTournament && targetRank) {
        const res = await tournamentApi.challenge(Number(targetRank));
        if (res?.code === 0 && res.data?.rounds) rounds = res.data.rounds;
      } else if (isPetBattle && opponentUserId) {
        const res = await petBattleApi.startBattle(opponentUserId);
        if (res?.code === 0 && res.data) rounds = res.data;
      } else if (bossId) {
        const res = await bossApi.battle(bossId);
        if (res?.code === 0 && res.data) rounds = res.data;
      }

      if (!rounds.length) {
        toast.error('战斗失败');
        setBattleStatus('idle');
        return;
      }

      for (let i = 0; i < rounds.length; i++) {
        if (skipRef.current) {
          const last = rounds[rounds.length - 1];
          if (isPetBattle) {
            setPet((p) => ({ ...p, hp: last.myPetRemainingHealth ?? p.hp }));
            setEnemy((e) => ({ ...e, hp: last.opponentPetRemainingHealth ?? e.hp }));
          } else {
            setPet((p) => ({ ...p, hp: last.petRemainingHealth ?? p.hp }));
            setEnemy((e) => ({ ...e, hp: last.bossRemainingHealth ?? e.hp }));
          }
          break;
        }

        await new Promise((r) => setTimeout(r, i === 0 ? 500 : 1200));
        processRound(rounds[i]);

        const r = rounds[i];
        const petHp = isPetBattle ? r.myPetRemainingHealth : r.petRemainingHealth;
        const oppHp = isPetBattle ? r.opponentPetRemainingHealth : r.bossRemainingHealth;
        if ((petHp ?? 1) <= 0 || (oppHp ?? 1) <= 0) {
          await new Promise((r) => setTimeout(r, 800));
          break;
        }
      }

      const last = rounds[rounds.length - 1];
      let won = false;
      if (isPetBattle) {
        won = (last.myPetRemainingHealth ?? 0) > 0 && (last.opponentPetRemainingHealth ?? 0) <= 0;
      } else {
        won = (last.petRemainingHealth ?? 0) > 0 && (last.bossRemainingHealth ?? 0) <= 0;
      }

      const enemyName = enemyRef.current.name;
      if (won) {
        setBattleStatus('victory');
        toast.success(`恭喜！${enemyName} 被击败了！`);
        if (bossId && !isTower && !isTournament) {
          setShowRewards(true);
        } else {
          setTimeout(() => setShowExitModal(true), 1500);
        }
      } else {
        setBattleStatus('defeat');
        toast.error(`${petRef.current.name} 被击败了…`);
        setTimeout(() => setShowExitModal(true), 2000);
      }
    } catch (e: any) {
      toast.error(e?.message || '战斗失败');
      setBattleStatus('idle');
    }
  };

  const handleBack = () => {
    if (isTower) router.replace('/points/tower');
    else if (isTournament) router.replace('/points/tournament');
    else if (isPetBattle && !isTournament) router.replace('/pet');
    else router.back();
  };

  const claimRewards = () => {
    const r = enemy.rewards;
    if (r) {
      toast.success(`获得了 ${r.coins} 摸鱼币和 ${r.exp} 经验值！`);
    }
    setShowRewards(false);
    setTimeout(() => setShowExitModal(true), 600);
  };

  const battleTitle = isTower
    ? '无尽爬塔'
    : isTournament
      ? '武道大会'
      : isPetBattle
        ? '宠物对战'
        : 'BOSS 联合讨伐';
  const statusLabel =
    battleStatus === 'idle'
      ? '准备战斗'
      : battleStatus === 'fighting'
        ? '战斗中...'
        : battleStatus === 'victory'
          ? '🎉 胜利'
          : '💔 失败';

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color="#ffa768" size="large" />
          <Text style={{ color: '#8c8c8c', marginTop: 12 }}>加载对战信息中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={[styles.pageHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={8}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{battleTitle}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.icon }]} numberOfLines={1}>
              {pet.name} VS {enemy.name}
            </Text>
          </View>
          <View
            style={[
              styles.headerStatus,
              battleStatus === 'victory' && styles.headerStatusWin,
              battleStatus === 'defeat' && styles.headerStatusLose,
              battleStatus === 'fighting' && styles.headerStatusFight,
            ]}
          >
            <Text style={styles.headerStatusText}>{statusLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
          <Text style={[styles.headerBackHint, { color: theme.tint }]}>
            {isTower
              ? '返回无尽爬塔'
              : isTournament
                ? '返回武道大会'
                : isPetBattle
                  ? '返回排行榜'
                  : '返回摸鱼 BOSS'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.healthRow}>
          <HealthCard fighter={pet} side="pet" theme={theme} />
          <View style={styles.vsBox}>
            <Text style={styles.vsText}>VS</Text>
            {showCollision && <View style={styles.collisionRing} />}
          </View>
          <HealthCard fighter={enemy} side="enemy" theme={theme} isOpponentPet={isPetBattle} />
        </View>

        <View style={styles.arena}>
          <View style={styles.arenaGlow} />
          <View style={styles.arenaCombatants}>
            <View style={[styles.combatant, currentTurn === 'pet' && battleStatus === 'fighting' && styles.combatantActive]}>
              <FightAvatar
                avatar={pet.avatar}
                size={110}
                variant="pet"
                attacking={petAttacking}
                hurt={petHurt}
              />
              {currentTurn === 'pet' && battleStatus === 'fighting' && (
                <Text style={styles.turnTag}>🔥</Text>
              )}
              <Text style={styles.combatantLabel}>{pet.name}</Text>
            </View>
            <View
              style={[
                styles.combatant,
                styles.combatantEnemy,
                currentTurn === 'boss' && battleStatus === 'fighting' && styles.combatantActive,
              ]}
            >
              <FightAvatar
                avatar={enemy.avatar}
                size={isPetBattle ? 110 : 100}
                variant={isPetBattle ? 'opponent' : 'boss'}
                attacking={enemyAttacking}
                hurt={enemyHurt}
              />
              {currentTurn === 'boss' && battleStatus === 'fighting' && (
                <Text style={styles.turnTag}>🔥</Text>
              )}
              <Text style={styles.combatantLabel}>{enemy.name}</Text>
            </View>
          </View>
          {battleEffects.map((effect) => (
            <View
              key={effect.id}
              style={[
                styles.battleEffect,
                effect.position === 'left' ? styles.effectLeft : styles.effectRight,
                effect.type === 'critical' && styles.effectCritical,
                effect.type === 'miss' && styles.effectMiss,
                effect.type === 'block' && styles.effectBlock,
                effect.type === 'heal' && styles.effectHeal,
              ]}
            >
              {effect.value != null && (
                <Text style={styles.effectValue}>{effect.value}</Text>
              )}
              {effect.text ? <Text style={styles.effectText}>{effect.text}</Text> : null}
            </View>
          ))}
        </View>

        <View style={[styles.controlCard, { backgroundColor: theme.card }]}>
          {battleStatus === 'idle' && (
            <TouchableOpacity style={styles.startBtn} onPress={startBattle}>
              <Text style={styles.startBtnText}>▶ 开始战斗</Text>
            </TouchableOpacity>
          )}
          {battleStatus === 'fighting' && (
            <View style={styles.fightingRow}>
              <ActivityIndicator color="#ffa768" />
              <Text style={{ color: theme.text, marginLeft: 10 }}>战斗中...</Text>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => {
                  skipRef.current = true;
                  setSkipLabel('跳过中...');
                }}
                disabled={skipLabel === '跳过中...'}
              >
                <Text style={styles.skipBtnText}>{skipLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
          {(battleStatus === 'victory' || battleStatus === 'defeat') && (
            <TouchableOpacity style={styles.startBtn} onPress={startBattle}>
              <Text style={styles.startBtnText}>再次挑战</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={showRewards} transparent animationType="fade" onRequestClose={() => setShowRewards(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>🏆 战斗胜利！</Text>
            <Text style={{ color: theme.icon, textAlign: 'center', marginBottom: 12 }}>
              恭喜击败了 {enemy.name}！
            </Text>
            <View style={styles.rewardList}>
              <Text style={{ color: theme.text }}>💰 摸鱼币 +{enemy.rewards?.coins ?? 0}</Text>
              <Text style={{ color: theme.text }}>⭐ 经验值 +{enemy.rewards?.exp ?? 0}</Text>
              {(enemy.rewards?.items || []).map((item, i) => (
                <Text key={i} style={{ color: theme.text }}>
                  🏆 {item}
                </Text>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.tint }]} onPress={claimRewards}>
                <Text style={styles.modalBtnText}>领取奖励</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnOutline} onPress={() => setShowRewards(false)}>
                <Text style={{ color: theme.tint }}>稍后领取</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={handleBack}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {isTower
                ? '正在退出爬塔对战'
                : isTournament
                  ? '正在退出武道大会'
                  : isPetBattle
                    ? '正在退出宠物对战'
                    : '正在退出 boss 秘境'}
            </Text>
            <Text style={{ color: theme.icon, textAlign: 'center', marginBottom: 16, lineHeight: 22 }}>
              {isTower
                ? '返回爬塔，继续挑战更高层数'
                : isTournament
                  ? '返回武道大会，继续挑战更高排名'
                  : isPetBattle
                    ? '期待下一次精彩对决'
                    : '摸鱼小勇士们每天有两次挑战机会别忘记喔'}
            </Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.tint }]} onPress={handleBack}>
              <Text style={styles.modalBtnText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff9f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageHeader: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerCenter: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  headerStatus: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    maxWidth: 96,
  },
  headerStatusFight: { backgroundColor: 'rgba(255,167,104,0.2)' },
  headerStatusWin: { backgroundColor: '#f6ffed' },
  headerStatusLose: { backgroundColor: '#fff2f0' },
  headerStatusText: { fontSize: 12, fontWeight: '600', color: '#595959' },
  headerBackHint: { fontSize: 12, marginTop: 6, marginLeft: 44 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,167,104,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,167,104,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#d46b08', fontWeight: '700', fontSize: 18 },
  scrollView: { flex: 1 },
  scroll: { padding: 12, paddingBottom: 28 },
  healthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  healthCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
    gap: 6,
  },
  healthCardPet: {
    borderColor: 'rgba(82,196,26,0.4)',
    backgroundColor: 'rgba(240,255,240,0.95)',
  },
  healthCardBoss: {
    borderColor: 'rgba(245,34,45,0.3)',
    backgroundColor: 'rgba(255,245,245,0.95)',
  },
  healthCardOpponent: {
    borderColor: 'rgba(24,144,255,0.4)',
    backgroundColor: 'rgba(240,245,255,0.95)',
  },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthHeaderReverse: { flexDirection: 'row-reverse' },
  healthInfo: { flex: 1, minWidth: 0 },
  healthNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  healthName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  healthStats: { fontSize: 11, marginTop: 2 },
  bossExtra: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, justifyContent: 'flex-end' },
  bossExtraTag: {
    fontSize: 10,
    color: '#d46b08',
    backgroundColor: 'rgba(255,167,104,0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  levelBadgeBlue: { backgroundColor: '#1890ff' },
  levelBadgeRed: { backgroundColor: '#f5222d' },
  levelBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  hpTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
  hpFill: { height: '100%', borderRadius: 6 },
  hpText: { fontSize: 11, textAlign: 'center' },
  equipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  equipRowReverse: { justifyContent: 'flex-end' },
  equipChip: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  equipIcon: { width: 22, height: 22 },
  equipPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBox: {
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(255,212,59,0.12)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,212,59,0.35)',
  },
  vsText: { fontSize: 20, fontWeight: '900', color: '#ffa768' },
  collisionRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#ffd666',
    backgroundColor: 'rgba(255,214,102,0.25)',
  },
  arena: {
    minHeight: 220,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  arenaGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,167,104,0.08)',
  },
  arenaCombatants: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  combatant: { alignItems: 'center', gap: 6, flex: 1 },
  combatantEnemy: { transform: [{ scale: 0.9 }, { translateY: -8 }] },
  combatantActive: { opacity: 1 },
  combatantLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262626',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,167,104,0.3)',
  },
  turnTag: { fontSize: 18, marginTop: -4 },
  avatarWrap: { alignItems: 'center', justifyContent: 'center' },
  avatarPet: {
    borderWidth: 3,
    borderColor: '#52c41a',
    borderRadius: 70,
    padding: 4,
    backgroundColor: '#fff',
  },
  avatarBoss: {
    borderWidth: 3,
    borderColor: '#ff7875',
    borderRadius: 60,
    padding: 4,
    backgroundColor: '#fff5f5',
  },
  avatarOpponent: {
    borderWidth: 3,
    borderColor: '#1890ff',
    borderRadius: 60,
    padding: 4,
    backgroundColor: '#f0f5ff',
  },
  avatarAttacking: { transform: [{ scale: 1.08 }, { translateX: 8 }] },
  avatarHurt: { transform: [{ translateX: -4 }] },
  battleEffect: {
    position: 'absolute',
    zIndex: 20,
    alignItems: 'center',
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(245,34,45,0.9)',
  },
  effectLeft: { left: '18%', top: '32%' },
  effectRight: { right: '18%', top: '28%' },
  effectCritical: { backgroundColor: 'rgba(255,0,0,0.85)' },
  effectMiss: { backgroundColor: 'rgba(140,140,140,0.85)' },
  effectBlock: { backgroundColor: 'rgba(24,144,255,0.85)' },
  effectHeal: { backgroundColor: 'rgba(82,196,26,0.9)' },
  effectValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  effectText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  controlCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,167,104,0.2)',
  },
  startBtn: {
    backgroundColor: '#ffa768',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fightingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
    gap: 10,
  },
  skipBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },
  skipBtnText: { color: '#595959', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  rewardList: { gap: 8, marginBottom: 16 },
  modalActions: { gap: 10 },
  modalBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnOutline: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffa768',
  },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});
