import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { glow, palette, radius, spacing } from "../../theme/colors";
import { useGameStore, type PartyMember } from "../../store/useGameStore";
import { DAMAGE_UPGRADE_AMOUNT } from "../combat/constants";
import {
  RARITY_LABELS,
  RUNE_TYPE_LABELS,
  formatRuneBonus,
} from "../../data/runesData";
import { WalletHeader } from "./WalletHeader";
import { NeonButton } from "./NeonButton";
import { RunesView } from "./RunesView";
import {
  DashboardTabs,
  type DashboardTab,
} from "./DashboardTabs";

/**
 * Painel de gerenciamento (React Native puro).
 *
 * Camada de UI fora do Canvas Skia, totalmente reativa ao `useGameStore`:
 * exibe a carteira no cabeçalho e permite evoluir os atributos do Hero, que
 * alimentam de volta o motor de combate.
 */
export function ManagementDashboardView() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("ATRIBUTOS");
  const gold = useGameStore((state) => state.gold);
  const stage = useGameStore((state) => state.stage);

  return (
    <View style={styles.container}>
      <WalletHeader gold={gold} stage={stage} />

      <View style={styles.content}>
        <TabContent tab={activeTab} />
      </View>

      <DashboardTabs active={activeTab} onChange={setActiveTab} />
    </View>
  );
}

function TabContent({ tab }: { tab: DashboardTab }) {
  if (tab === "ATRIBUTOS") {
    return <AtributosTab />;
  }

  if (tab === "PARTY") {
    return <PartyTab />;
  }

  if (tab === "RUNAS") {
    return <RunesView />;
  }

  return <LojaTab />;
}

/** Custo fixo do Baú de Runas (MVP). */
const RUNE_CHEST_COST = 100;

/** Aba da Loja: aquisição de runas via Baú (gacha) consumindo ouro. */
function LojaTab() {
  const gold = useGameStore((state) => state.gold);
  const buyRuneChest = useGameStore((state) => state.buyRuneChest);

  const canAfford = gold >= RUNE_CHEST_COST;

  const handleBuyChest = useCallback(() => {
    const rune = buyRuneChest(RUNE_CHEST_COST);
    if (!rune) {
      Alert.alert(
        "Ouro insuficiente",
        `Você precisa de ${RUNE_CHEST_COST.toLocaleString("pt-BR")} de ouro para abrir o baú.`,
      );
      return;
    }

    Alert.alert(
      "Runa Adquirida!",
      `Você tirou ${rune.name} (${RARITY_LABELS[rune.rarity]})\n${RUNE_TYPE_LABELS[rune.type]} ${formatRuneBonus(rune)}`,
    );
  }, [buyRuneChest]);

  return (
    <View style={styles.shopContainer}>
      <Text style={styles.sectionTitle}>Loja</Text>
      <Text style={styles.shopHint}>
        Invista seu ouro em baús e desbloqueie runas mais poderosas.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Comprar Baú de Runas Misterioso"
        accessibilityState={{ disabled: !canAfford }}
        onPress={handleBuyChest}
        disabled={!canAfford}
        style={({ pressed }) => [
          styles.chestCard,
          glow.magenta,
          !canAfford && styles.chestCardDisabled,
          pressed && canAfford && styles.chestCardPressed,
        ]}
      >
        <View style={styles.chestBadge}>
          <Text style={styles.chestBadgeText}>PREMIUM</Text>
        </View>

        <Text style={styles.chestTitle}>Baú de Runas Misterioso</Text>
        <Text style={styles.chestDescription}>
          Contém 1 runa aleatória. Chance de Lendária a cada abertura.
        </Text>

        <View style={styles.chestPriceRow}>
          <Text style={styles.chestPriceLabel}>Abrir por</Text>
          <Text style={styles.chestPriceValue}>
            {RUNE_CHEST_COST.toLocaleString("pt-BR")} Ouro
          </Text>
        </View>

        {!canAfford ? (
          <Text style={styles.chestLockedHint}>
            Ouro insuficiente — derrote mais inimigos.
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

/** Aba de atributos: evolui o dano do Líder consumindo ouro da store. */
function AtributosTab() {
  const gold = useGameStore((state) => state.gold);
  const leaderDamage = useGameStore((state) => state.party[0]?.baseDamage ?? 0);
  const damageUpgradeCost = useGameStore((state) => state.damageUpgradeCost);
  const upgradeDamage = useGameStore((state) => state.upgradeDamage);

  const canAfford = gold >= damageUpgradeCost;

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Atributos do Líder</Text>
      <Text style={styles.sectionHint}>
        Evolua o Idlemon para vencer encontros mais difíceis.
      </Text>

      <View style={styles.statRow}>
        <Text style={styles.statLabel}>Dano de Ataque</Text>
        <Text style={styles.statValue}>{leaderDamage}</Text>
      </View>

      <NeonButton
        label={`Upgrade Dano (+${DAMAGE_UPGRADE_AMOUNT})`}
        caption={`Custo: ${damageUpgradeCost.toLocaleString("pt-BR")} ouro`}
        accent="cyan"
        disabled={!canAfford}
        onPress={upgradeDamage}
        style={styles.levelUpButton}
      />
    </View>
  );
}

/** Aba da Party: lista os Idlemons recrutados em cards reativos à store. */
function PartyTab() {
  const party = useGameStore((state) => state.party);
  const totalDamage = party.reduce((sum, member) => sum + member.baseDamage, 0);

  return (
    <View style={styles.partyContainer}>
      <Text style={styles.sectionTitle}>Sua Party</Text>
      <Text style={styles.partyHint}>
        {party.length} {party.length === 1 ? "Idlemon" : "Idlemons"} · Dano total{" "}
        <Text style={styles.partyHintAccent}>{totalDamage}</Text>
      </Text>

      <ScrollView
        style={styles.partyList}
        contentContainerStyle={styles.partyListContent}
        showsVerticalScrollIndicator={false}
      >
        {party.map((member, index) => (
          <PartyMemberCard
            key={member.id}
            member={member}
            isLeader={index === 0}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/** Card individual de um membro da Party. */
function PartyMemberCard({
  member,
  isLeader,
}: {
  member: PartyMember;
  isLeader: boolean;
}) {
  return (
    <View style={[styles.card, { borderColor: member.color }]}>
      <View style={styles.cardLeft}>
        <View style={[styles.colorDot, { backgroundColor: member.color }]} />
        <View>
          <Text style={styles.cardId}>{member.id}</Text>
          {isLeader && <Text style={styles.cardBadge}>Líder</Text>}
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={styles.cardDamageValue}>{member.baseDamage}</Text>
        <Text style={styles.cardDamageLabel}>DANO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  tabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionHint: {
    color: palette.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: 240,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  statLabel: {
    color: palette.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  statValue: {
    color: palette.neonCyan,
    fontSize: 18,
    fontWeight: "800",
  },
  levelUpButton: {
    marginTop: spacing.md,
    minWidth: 240,
  },
  partyContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  partyHint: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  partyHintAccent: {
    color: palette.neonGold,
    fontWeight: "800",
  },
  partyList: {
    flex: 1,
    marginTop: spacing.sm,
  },
  partyListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: palette.surface,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
  },
  cardId: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  cardBadge: {
    color: palette.neonPurple,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  cardDamageValue: {
    color: palette.neonCyan,
    fontSize: 18,
    fontWeight: "800",
  },
  cardDamageLabel: {
    color: palette.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  shopContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  shopHint: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  chestCard: {
    marginTop: spacing.md,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1.5,
    borderColor: palette.neonMagenta,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chestCardDisabled: {
    opacity: 0.45,
  },
  chestCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  chestBadge: {
    alignSelf: "flex-start",
    backgroundColor: palette.neonMagenta,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chestBadgeText: {
    color: palette.trueBlack,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  chestTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  chestDescription: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  chestPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  chestPriceLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  chestPriceValue: {
    color: palette.neonMagenta,
    fontSize: 16,
    fontWeight: "800",
  },
  chestLockedHint: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
});
