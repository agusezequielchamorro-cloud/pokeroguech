import { globalScene } from "#app/global-scene";
import { allBiomes, modifierTypes } from "#data/data-lists";
import { BiomeId } from "#enums/biome-id";
import { ChallengeType } from "#enums/challenge-type";
import { UiMode } from "#enums/ui-mode";
import { MoneyInterestModifier } from "#modifiers/modifier";
import { BattlePhase } from "#phases/battle-phase";
import type { FracturaRouteMapConfig, OptionSelectModeConfig } from "#types/ui-types";
import { applyChallenges } from "#utils/challenge-utils";
import { BooleanHolder, getBiomeName, randSeedInt, randSeedItem } from "#utils/common";
import { enumValueToKey } from "#utils/enums";
import { addConsumable } from "../fractura/profile";
import { BIOME_SCENERY } from "../fractura/scenery";
import { loadFracturaStoryState, saveFracturaStoryState } from "../fractura/story";

export class SelectBiomePhase extends BattlePhase {
  public readonly phaseName = "SelectBiomePhase";

  start() {
    super.start();

    globalScene.resetSeed();

    const gameMode = globalScene.gameMode;
    const currentBiome = globalScene.arena.biomeId;
    const currentWaveIndex = globalScene.currentBattle.waveIndex;
    const nextWaveIndex = currentWaveIndex + 1;

    if (
      (gameMode.isClassic && gameMode.isWaveFinal(nextWaveIndex + 9))
      || (gameMode.isDaily && gameMode.isWaveFinal(nextWaveIndex))
      || (gameMode.hasShortBiomes && !(nextWaveIndex % 50))
    ) {
      this.setNextBiomeAndEnd(BiomeId.END);
      return;
    }

    if (gameMode.hasRandomBiomes) {
      this.setNextBiomeAndEnd(this.generateNextBiome(nextWaveIndex));
      return;
    }

    const { biomeLinks } = allBiomes.get(currentBiome);
    if (biomeLinks.length > 1) {
      const biomes: BiomeId[] = biomeLinks
        .filter(b => !Array.isArray(b) || !randSeedInt(b[1]))
        .map(b => (Array.isArray(b) ? b[0] : b));

      if (biomes.length > 1) {
        // Daily runs keep their standard biome selection without Classic-only route rewards.
        if (!gameMode.isClassic) {
          const config: OptionSelectModeConfig = {
            options: biomes.map(b => ({
              label: getBiomeName(b),
              handler: () => {
                globalScene.ui.setMode(UiMode.MESSAGE);
                this.setNextBiomeAndEnd(b);
                return true;
              },
            })),
            inputDelay: 1000,
            blockCancelButton: true,
          };
          globalScene.ui.setMode(UiMode.OPTION_SELECT, config);
          return;
        }
        const routeKinds = ["camp", "cache", "danger"] as const;
        const routeConfig: FracturaRouteMapConfig = {
          title: "Elegí el próximo camino",
          currentLocation: getBiomeName(currentBiome),
          waveIndex: nextWaveIndex,
          options: biomes.map((b, index) => {
            const kind = index === biomes.length - 1 ? "danger" : routeKinds[Math.min(index, routeKinds.length - 1)];
            return {
              label: getBiomeName(b),
              scenery: BIOME_SCENERY[b],
              description:
                kind === "camp"
                  ? "Refugio: Amuleto EXP + Tónico para la mochila. El descanso del bioma recupera al equipo."
                  : kind === "cache"
                    ? "Depósito oculto: 1 Voucher + 1 Señuelo shiny para nuevos encuentros."
                    : "Ruta peligrosa: 1 Voucher Plus. La primera oleada empieza con tormenta de arena.",
              kind: kind === "cache" ? "event" : kind === "danger" ? "battle" : "camp",
              environment: [
                BiomeId.LABORATORY,
                BiomeId.ABYSS,
                BiomeId.SPACE,
                BiomeId.FACTORY,
                BiomeId.POWER_PLANT,
              ].includes(b as any)
                ? 2
                : [
                      BiomeId.CAVE,
                      BiomeId.ICE_CAVE,
                      BiomeId.RUINS,
                      BiomeId.METROPOLIS,
                      BiomeId.SLUM,
                      BiomeId.DOJO,
                      BiomeId.CONSTRUCTION_SITE,
                    ].includes(b as any)
                  ? 1
                  : 0,
              handler: () => {
                const story = loadFracturaStoryState();
                story.route = { kind, nextWave: nextWaveIndex };
                story.routeHistory.push({ wave: nextWaveIndex, label: getBiomeName(b), kind });
                story.routeHistory = story.routeHistory.slice(-6);
                if (kind === "danger") {
                  story.flags.followedUmbralRoute = true;
                  story.flags.tookDangerousRoute = true;
                  globalScene.phaseManager.unshiftNew("ModifierRewardPhase", modifierTypes.VOUCHER_PLUS);
                } else if (kind === "cache") {
                  addConsumable("lure");
                  story.flags.foundRouteCache = true;
                  globalScene.phaseManager.unshiftNew("ModifierRewardPhase", modifierTypes.VOUCHER);
                } else {
                  addConsumable("tonic");
                  story.flags.usedRouteCamp = true;
                  globalScene.phaseManager.unshiftNew("ModifierRewardPhase", modifierTypes.EXP_CHARM);
                }
                saveFracturaStoryState(story);
                globalScene.ui.setMode(UiMode.MESSAGE);
                this.setNextBiomeAndEnd(b);
                return true;
              },
            };
          }),
        };
        globalScene.ui.setMode(UiMode.FRACTURA_ROUTE_MAP, routeConfig);
      } else {
        this.setNextBiomeAndEnd(randSeedItem(biomes));
      }
      return;
    }

    if (biomeLinks.length === 1) {
      if (Array.isArray(biomeLinks[0])) {
        console.warn(
          "Biomes with a link to a single other biome should not have a weight assigned to the link.\n",
          "Biome:",
          enumValueToKey(BiomeId, allBiomes.get(currentBiome).biomeId),
          "| Links:",
          biomeLinks,
        );
        // @ts-expect-error: failsafe for invalid biome links structure
        biomeLinks[0] = biomeLinks[0][0];
      }
      this.setNextBiomeAndEnd(biomeLinks[0] as BiomeId);
      return;
    }

    this.setNextBiomeAndEnd(this.generateNextBiome(nextWaveIndex));
  }

  private generateNextBiome(waveIndex: number): BiomeId {
    return waveIndex % 50 === 0 ? BiomeId.END : globalScene.generateRandomBiome(waveIndex);
  }

  private setNextBiomeAndEnd(nextBiome: BiomeId): void {
    const gameMode = globalScene.gameMode;
    const currentWaveIndex = globalScene.currentBattle.waveIndex;
    const nextWaveIndex = currentWaveIndex + 1;

    if (nextWaveIndex % 10 === 1) {
      globalScene.applyModifiers(MoneyInterestModifier, true);
      const healStatus = new BooleanHolder(true);
      applyChallenges(ChallengeType.PARTY_HEAL, healStatus);
      if (healStatus.value) {
        globalScene.phaseManager.unshiftNew("PartyHealPhase", false);
      } else {
        globalScene.phaseManager.unshiftNew(
          "SelectModifierPhase",
          undefined,
          undefined,
          gameMode.isFixedBattle(currentWaveIndex)
            ? gameMode.getFixedBattle(currentWaveIndex)?.customModifierRewardSettings
            : undefined,
        );
      }
    }
    globalScene.phaseManager.unshiftNew("SwitchBiomePhase", nextBiome);
    this.end();
  }
}
