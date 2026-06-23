import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, radius, spacing } from "../../theme/colors";

interface WalletHeaderProps {
  /** Quantidade de ouro do jogador. */
  gold: number;
  /** Estágio atual do core loop. */
  stage?: number;
}

/**
 * Cabeçalho do painel exibindo a carteira e o progresso do jogador.
 * Os valores vêm do `useGameStore` (fonte de verdade), de forma reativa.
 */
export function WalletHeader({ gold, stage }: WalletHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Gerenciamento</Text>
        {stage != null ? (
          <Text style={styles.stage}>Estágio {stage}</Text>
        ) : null}
      </View>
      <View style={styles.wallet}>
        <Text style={styles.coin}>💰</Text>
        <Text style={styles.amount}>{gold.toLocaleString("pt-BR")}</Text>
        <Text style={styles.currency}>Ouro</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  title: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  stage: {
    color: palette.neonPurple,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  wallet: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  coin: {
    fontSize: 14,
  },
  amount: {
    color: palette.neonGold,
    fontSize: 16,
    fontWeight: "800",
  },
  currency: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
});
