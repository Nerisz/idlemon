import React, { useCallback } from "react";
import { StyleSheet, View } from "react-native";
import { SkiaCombatEngine } from "../components/combat";
import { ManagementDashboardView } from "../components/dashboard";
import { useGameStore } from "../store/useGameStore";
import { palette } from "../theme/colors";

/**
 * Tela principal do jogo.
 *
 * Faz a composição (e a fronteira) entre as duas camadas:
 *  - Topo: motor de combate Skia (arena com altura fixa pela proporção).
 *  - Restante: painel de gerenciamento em React Native puro.
 *
 * É o ponto de integração: injeta o dano do Hero no motor e recebe de volta as
 * vitórias para alimentar a economia do `useGameStore`.
 */
export function GameScreen() {
  const heroDamage = useGameStore((state) => state.heroDamage);
  const addGold = useGameStore((state) => state.addGold);
  const nextStage = useGameStore((state) => state.nextStage);

  // Recompensa a vitória: credita ouro e avança o estágio na store.
  const handleEnemyDefeated = useCallback(
    (goldReward: number) => {
      addGold(goldReward);
      nextStage();
    },
    [addGold, nextStage],
  );

  return (
    <View style={styles.container}>
      <SkiaCombatEngine
        heroDamage={heroDamage}
        onEnemyDefeated={handleEnemyDefeated}
      />
      <ManagementDashboardView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.trueBlack,
  },
});
