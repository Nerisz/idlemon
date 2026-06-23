import React, { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { palette, radius, spacing } from "../../theme/colors";
import { useGameStore, useCombatStats } from "../../store/useGameStore";
import {
  RARITY_COLORS,
  RUNE_TYPE_LABELS,
  formatRuneBonus,
  getRuneById,
  type Rune,
} from "../../data/runesData";

/**
 * Aba "Runas".
 *
 * Topo: slots de equipamento (tocar para desequipar). Base: grid rolável do
 * inventário (tocar para equipar no primeiro slot livre). A cor neon de cada
 * raridade vem do `theme.ts` via `RARITY_COLORS`.
 */
export function RunesView() {
  const inventoryRunes = useGameStore((state) => state.inventoryRunes);
  const equippedRunes = useGameStore((state) => state.equippedRunes);
  const equipRune = useGameStore((state) => state.equipRune);
  const unequipRune = useGameStore((state) => state.unequipRune);
  const stats = useCombatStats();

  const handleEquip = useCallback(
    (runeId: string) => {
      const freeSlot = equippedRunes.findIndex((id) => id === null);
      if (freeSlot === -1) return;
      equipRune(runeId, freeSlot);
    },
    [equippedRunes, equipRune],
  );

  const damageBonusPct = Math.round((stats.damageMultiplier - 1) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Runas Equipadas</Text>
        <Text style={styles.headerStat}>
          Dano <Text style={styles.headerStatValue}>{stats.finalDamage}</Text>
          {damageBonusPct > 0 ? (
            <Text style={styles.headerStatBonus}> (+{damageBonusPct}%)</Text>
          ) : null}
        </Text>
      </View>

      <View style={styles.slotsRow}>
        {equippedRunes.map((runeId, index) => (
          <EquipSlot
            key={`slot-${index}`}
            rune={runeId ? getRuneById(runeId) : undefined}
            onPress={() => unequipRune(index)}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.inventoryTitle]}>
        Inventário
      </Text>

      <ScrollView
        style={styles.inventoryList}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {inventoryRunes.length === 0 ? (
          <Text style={styles.emptyHint}>Nenhuma runa no inventário.</Text>
        ) : (
          inventoryRunes.map((runeId) => {
            const rune = getRuneById(runeId);
            if (!rune) return null;
            const isEquipped = equippedRunes.includes(runeId);
            return (
              <RuneCard
                key={runeId}
                rune={rune}
                isEquipped={isEquipped}
                onPress={() => handleEquip(runeId)}
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/** Slot de equipamento: mostra a runa atual ou um placeholder vazio. */
function EquipSlot({ rune, onPress }: { rune?: Rune; onPress: () => void }) {
  if (!rune) {
    return (
      <View style={[styles.slot, styles.slotEmpty]}>
        <Text style={styles.slotEmptyText}>Vazio</Text>
      </View>
    );
  }

  const accent = RARITY_COLORS[rune.rarity];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Desequipar ${rune.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.slot,
        { borderColor: accent },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.slotRuneName, { color: accent }]} numberOfLines={1}>
        {rune.name}
      </Text>
      <Text style={styles.slotRuneBonus}>{formatRuneBonus(rune)}</Text>
      <Text style={styles.slotRuneType}>{RUNE_TYPE_LABELS[rune.type]}</Text>
    </Pressable>
  );
}

/** Card de uma runa do inventário. Borda neon pela raridade. */
function RuneCard({
  rune,
  isEquipped,
  onPress,
}: {
  rune: Rune;
  isEquipped: boolean;
  onPress: () => void;
}) {
  const accent = RARITY_COLORS[rune.rarity];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Equipar ${rune.name}`}
      accessibilityState={{ disabled: isEquipped }}
      onPress={onPress}
      disabled={isEquipped}
      style={({ pressed }) => [
        styles.card,
        { borderColor: accent },
        isEquipped && styles.cardEquipped,
        pressed && !isEquipped && styles.pressed,
      ]}
    >
      <View style={[styles.rarityDot, { backgroundColor: accent }]} />
      <Text style={[styles.cardName, { color: accent }]} numberOfLines={1}>
        {rune.name}
      </Text>
      <Text style={styles.cardBonus}>{formatRuneBonus(rune)}</Text>
      <Text style={styles.cardType}>{RUNE_TYPE_LABELS[rune.type]}</Text>
      {isEquipped ? <Text style={styles.cardEquippedTag}>Equipada</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  headerStat: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  headerStatValue: {
    color: palette.neonCyan,
    fontWeight: "800",
  },
  headerStatBonus: {
    color: palette.neonGold,
    fontWeight: "800",
  },
  slotsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  slot: {
    flex: 1,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: palette.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  slotEmpty: {
    borderStyle: "dashed",
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  slotEmptyText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  slotRuneName: {
    fontSize: 14,
    fontWeight: "800",
  },
  slotRuneBonus: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
  slotRuneType: {
    color: palette.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inventoryTitle: {
    marginTop: spacing.sm,
  },
  inventoryList: {
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  emptyHint: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    width: "47%",
    borderRadius: radius.md,
    borderWidth: 1.5,
    backgroundColor: palette.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  cardEquipped: {
    opacity: 0.55,
  },
  rarityDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "800",
  },
  cardBonus: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  cardType: {
    color: palette.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardEquippedTag: {
    color: palette.neonPurple,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
