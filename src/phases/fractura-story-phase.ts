import { globalScene } from "#app/global-scene";
import { modifierTypes } from "#data/data-lists";
import { UiMode } from "#enums/ui-mode";
import { BattlePhase } from "#phases/battle-phase";
import type { OptionSelectModeConfig } from "#types/ui-types";
import { applyFracturaStoryChoice, getFracturaStoryEvent } from "../fractura/story";

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

    globalScene.ui.setMode(UiMode.MESSAGE);
    globalScene.ui.showText(
      `${event.title}$${event.intro}`,
      null,
      () => {
        const config: OptionSelectModeConfig = {
          blockCancelButton: true,
          inputDelay: 250,
          yOffset: 38,
          options: event.choices.map(choice => ({
            label: choice.label,
            handler: () => {
              applyFracturaStoryChoice(event, choice);
              globalScene.ui.setMode(UiMode.MESSAGE);
              globalScene.ui.showText(
                choice.resultText,
                null,
                () => {
                  if (choice.reward) {
                    globalScene.phaseManager.unshiftNew("ModifierRewardPhase", modifierTypes[choice.reward]);
                  }
                  if (choice.healParty) {
                    globalScene.phaseManager.unshiftNew("PartyHealPhase", false);
                  }
                  this.end();
                },
                null,
                true,
              );
              return true;
            },
          })),
        };
        globalScene.ui.setMode(UiMode.OPTION_SELECT, config);
      },
      null,
      true,
    );
  }
}
