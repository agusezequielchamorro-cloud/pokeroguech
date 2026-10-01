import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { ChallengeType } from "#enums/challenge-type";
import { UiMode } from "#enums/ui-mode";
import { BattlePhase } from "#phases/battle-phase";
import type { FracturaSceneConfig } from "#ui/fractura-story-ui-handler";
import { applyChallenges } from "#utils/challenge-utils";
import { BooleanHolder } from "#utils/common";
import { getModifierType } from "#utils/modifier-utils";
import { addConsumable, loadFracturaProfile, saveFracturaProfile } from "../fractura/profile";
import { applyFracturaStoryChoice, getFracturaStoryEvent, loadFracturaStoryState } from "../fractura/story";

export class FracturaStoryPhase extends BattlePhase {
  public readonly phaseName = "FracturaStoryPhase";
  constructor(private readonly afterWave: number) {
    super();
  }

  public override start(): void {
    super.start();
    const event = getFracturaStoryEvent(this.afterWave);
    if (!event) {
      this.end();
      return;
    }
    const config: FracturaSceneConfig = {
      event,
      onChoice: index => {
        const choice = event.choices[index];
        if (loadFracturaStoryState().completedEvents.includes(event.id)) {
          return choice.resultText;
        }
        // Apply all rewards with the choice; navigating away during the result cannot lose a queued reward.
        if (choice.reward) {
          globalScene.addModifier(
            getModifierType(modifierTypes[choice.reward]).newModifier(),
            false,
            false,
            false,
            true,
          );
        }
        if (choice.consumable) {
          addConsumable(choice.consumable);
        }
        if (choice.extraConsumable) {
          addConsumable(choice.extraConsumable);
        }
        if (choice.tokens) {
          const profile = loadFracturaProfile();
          profile.casinoTokens += choice.tokens;
          saveFracturaProfile(profile);
        }
        if (choice.healFraction) {
          for (const p of globalScene.getPlayerParty()) {
            if (p.isFainted()) {
              continue;
            }
            p.hp = Math.min(p.getMaxHp(), p.hp + Math.max(1, Math.floor(p.getMaxHp() * choice.healFraction)));
            void p.updateInfo(true);
          }
        }
        if (choice.healParty) {
          const preventRevive = new BooleanHolder(false);
          applyChallenges(ChallengeType.PREVENT_REVIVE, preventRevive);
          for (const p of globalScene.getPlayerParty()) {
            if (p.isFainted() && preventRevive.value) {
              continue;
            }
            p.hp = p.getMaxHp();
            p.resetStatus(true, false, false, true);
            p.getMoveset().forEach(m => {
              if (m) {
                m.ppUsed = 0;
              }
            });
            void p.updateInfo(true);
          }
        }
        applyFracturaStoryChoice(event, choice);
        void globalScene.gameData.saveSystem();
        return choice.resultText;
      },
      onDone: () => {
        globalScene.ui.setMode(UiMode.MESSAGE);
        this.end();
      },
    };
    globalScene.ui.setMode(UiMode.FRACTURA_STORY, config);
  }
}
