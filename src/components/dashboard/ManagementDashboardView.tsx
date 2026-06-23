import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { palette, radius, spacing } from "../../theme/colors";
import { useGameStore, type PartyMember } from "../../store/useGameStore";
import { DAMAGE_UPGRADE_AMOUNT } from "../combat/constants";
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

  return (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Loja</Text>
      <Text style={styles.sectionHint}>
        Gaste seu ouro em melhorias e equipamentos. (Em breve)
      </Text>
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
});
