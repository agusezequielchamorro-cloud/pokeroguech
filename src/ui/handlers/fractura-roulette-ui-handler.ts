import { globalScene } from "#app/global-scene";
import { Egg } from "#data/egg";
import { Button } from "#enums/buttons";
import { EggSourceType } from "#enums/egg-source-types";
import { EggTier } from "#enums/egg-type";
import { TextStyle } from "#enums/text-style";
import { VariantTier } from "#enums/variant-tier";
import { VoucherType } from "#enums/voucher-type";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";
import { randInt } from "#utils/common";
import { loadFracturaProfile, RIVAL_PALETTES, saveFracturaProfile } from "../../fractura/profile";

interface RouletteReward {
  readonly label: string;
  readonly shortLabel: string;
  readonly eggTier?: EggTier;
  readonly shiny?: boolean;
  readonly variantTier?: VariantTier;
  readonly plusVoucher?: boolean;
  readonly permanent?: "compass" | "indigo" | "cobre";
}

const ROULETTE_REWARDS: readonly RouletteReward[] = [
  { label: "Brújula permanente", shortLabel: "BRÚJULA", permanent: "compass" },
  { label: "Rival índigo", shortLabel: "ÍNDIGO", permanent: "indigo" },
  { label: "Rival cobre", shortLabel: "COBRE", permanent: "cobre" },
  { label: "Huevo raro", shortLabel: "RARO", eggTier: EggTier.RARE },
  { label: "Huevo raro", shortLabel: "RARO", eggTier: EggTier.RARE },
  { label: "Huevo épico", shortLabel: "ÉPICO", eggTier: EggTier.EPIC },
  { label: "Huevo legendario", shortLabel: "LEGEND", eggTier: EggTier.LEGENDARY },
  { label: "Huevo shiny", shortLabel: "SHINY", eggTier: EggTier.EPIC, shiny: true },
  {
    label: "Huevo shiny rojo",
    shortLabel: "★ ROJA",
    eggTier: EggTier.EPIC,
    shiny: true,
    variantTier: VariantTier.EPIC,
  },
  { label: "Voucher Plus", shortLabel: "V+", plusVoucher: true },
];

export class FracturaRouletteUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private wheelContainer: Phaser.GameObjects.Container;
  private resultText: Phaser.GameObjects.Text;
  private voucherText: Phaser.GameObjects.Text;
  private paletteText: Phaser.GameObjects.Text;
  private spinning = false;
  private spinTween: Phaser.Tweens.Tween | null = null;

  public override setup(): void {
    const { width, height } = globalScene.scaledCanvas;
    this.container = globalScene.add.container(0, -height).setName("fractura-roulette").setVisible(false);

    const overlay = globalScene.add.rectangle(0, 0, width, height, 0x111018, 0.97).setOrigin(0);
    const header = addWindow(4, 4, width - 8, 27).setOrigin(0);
    const title = addTextObject(10, 9, "RULETA FRACTURA", TextStyle.HEADER_LABEL).setOrigin(0);
    const subtitle = addTextObject(10, 36, "1 Voucher = 1 giro", TextStyle.WINDOW).setOrigin(0);

    const wheelX = 69;
    const wheelY = 103;
    this.wheelContainer = globalScene.add.container(wheelX, wheelY);
    const wheel = globalScene.add.graphics();
    const radius = 44;
    const colors = [0x384d69, 0x496786, 0x7185a0, 0x527a64, 0x7da36d, 0x96734f, 0x8f5b55, 0xa06c91, 0x985a78, 0xc4a455];

    const angleStep = (Math.PI * 2) / ROULETTE_REWARDS.length;
    for (let i = 0; i < ROULETTE_REWARDS.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      wheel.fillStyle(colors[i], 1);
      wheel.slice(0, 0, radius, angle, angle + angleStep).fillPath();
      wheel.lineStyle(1, 0xe6dfb5, 0.7).lineBetween(0, 0, Math.cos(angle) * radius, Math.sin(angle) * radius);
      const middle = angle + angleStep / 2;
      const number = addTextObject(
        Math.cos(middle) * 30,
        Math.sin(middle) * 30,
        `${i + 1}`,
        TextStyle.WINDOW,
      ).setOrigin(0.5);
      this.wheelContainer.add(number);
    }
    wheel.lineStyle(2, 0xe6dfb5, 1).strokeCircle(0, 0, radius);
    wheel.fillStyle(0xe6dfb5, 1).fillCircle(0, 0, 4);
    this.wheelContainer.addAt(wheel, 0);

    const pointer = globalScene.add
      .triangle(wheelX, wheelY - radius - 5, 0, 0, 10, 0, 5, 10, 0xffe76a)
      .setOrigin(0.5, 1);

    const prizeList = ROULETTE_REWARDS.map((reward, index) => `${index + 1}. ${reward.label}`).join("\n");
    const legend = addTextObject(122, 37, prizeList, TextStyle.WINDOW).setOrigin(0);
    this.paletteText = addTextObject(8, height - 39, "", TextStyle.WINDOW).setOrigin(0);
    this.resultText = addTextObject(8, height - 26, "A: girar · B: volver", TextStyle.WINDOW).setOrigin(0);
    this.resultText.setWordWrapWidth(width - 16, true);
    this.voucherText = addTextObject(8, height - 15, "", TextStyle.WINDOW).setOrigin(0);

    this.container.add([
      overlay,
      header,
      title,
      subtitle,
      this.wheelContainer,
      pointer,
      legend,
      this.paletteText,
      this.resultText,
      this.voucherText,
    ]);
    this.getUi().add(this.container);
  }

  public override show(args: any[]): boolean {
    super.show(args);
    this.spinning = false;
    this.wheelContainer.setRotation(0);
    this.updateVoucherText();
    this.updatePaletteText();
    this.resultText.setText("A: girar · B: volver");
    this.container.setVisible(true);
    this.getUi().bringToTop(this.container);
    return true;
  }

  private updateVoucherText(): void {
    const regular = globalScene.gameData.voucherCounts[VoucherType.REGULAR] ?? 0;
    const plus = globalScene.gameData.voucherCounts[VoucherType.PLUS] ?? 0;
    this.voucherText.setText(`Vouchers: ${regular}   Voucher Plus: ${plus}`);
  }

  private updatePaletteText(): void {
    const profile = loadFracturaProfile();
    const palette = RIVAL_PALETTES[profile.selectedPalette as keyof typeof RIVAL_PALETTES];
    this.paletteText.setText(`Rival: ${palette.label}  ← → cambiar`);
  }

  private cyclePalette(direction: number): boolean {
    const profile = loadFracturaProfile();
    const index = profile.rivalPalettes.indexOf(profile.selectedPalette);
    profile.selectedPalette =
      profile.rivalPalettes[(index + direction + profile.rivalPalettes.length) % profile.rivalPalettes.length];
    saveFracturaProfile(profile);
    this.updatePaletteText();
    return true;
  }

  private spin(): boolean {
    if (this.spinning) {
      return false;
    }
    if ((globalScene.gameData.voucherCounts[VoucherType.REGULAR] ?? 0) < 1) {
      this.resultText.setText("Necesitás al menos 1 Voucher normal.");
      return false;
    }
    if (globalScene.gameData.eggs.length >= 99) {
      this.resultText.setText("Límite de huevos (99). Eclosioná uno.");
      return false;
    }

    globalScene.gameData.voucherCounts[VoucherType.REGULAR]--;
    this.updateVoucherText();
    this.spinning = true;
    this.resultText.setText("Girando...");

    const rewardIndex = randInt(ROULETTE_REWARDS.length);
    const segmentAngle = 360 / ROULETTE_REWARDS.length;
    const targetDegrees = 360 * 5 + (360 - (rewardIndex + 0.5) * segmentAngle);

    this.spinTween?.stop();
    this.spinTween = globalScene.tweens.add({
      targets: this.wheelContainer,
      angle: targetDegrees,
      duration: 2200,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.grantReward(ROULETTE_REWARDS[rewardIndex]);
        this.spinning = false;
      },
    });
    return true;
  }

  private grantReward(reward: RouletteReward): void {
    if (reward.permanent) {
      const profile = loadFracturaProfile();
      if (reward.permanent === "compass") {
        if (profile.compass) {
          globalScene.gameData.voucherCounts[VoucherType.PLUS]++;
          this.resultText.setText("Brújula repetida: Voucher Plus.");
        } else {
          profile.compass = true;
          this.resultText.setText("Brújula: +1 Voucher en cada nueva run.");
        }
      } else if (profile.rivalPalettes.includes(reward.permanent)) {
        globalScene.gameData.voucherCounts[VoucherType.PLUS]++;
        this.resultText.setText("Color repetido: Voucher Plus.");
      } else {
        profile.rivalPalettes.push(reward.permanent);
        profile.selectedPalette = reward.permanent;
        this.resultText.setText(`Desbloqueado: rival ${reward.permanent}.`);
      }
      saveFracturaProfile(profile);
      this.updatePaletteText();
    } else if (reward.plusVoucher) {
      globalScene.gameData.voucherCounts[VoucherType.PLUS]++;
    } else {
      const egg = new Egg({
        tier: reward.eggTier ?? EggTier.COMMON,
        ...(reward.shiny === undefined ? {} : { isShiny: reward.shiny }),
        ...(reward.variantTier === undefined ? {} : { variantTier: reward.variantTier }),
        sourceType: EggSourceType.EVENT,
        eggDescriptor: "Ruleta Fractura",
      });
      egg.addEggToGameData();
    }

    if (!reward.permanent) {
      this.resultText.setText(`¡Premio! ${reward.label}`);
    }
    this.updateVoucherText();
    void globalScene.gameData.saveSystem();
  }

  public override processInput(button: Button): boolean {
    if (!this.active) {
      return false;
    }
    switch (button) {
      case Button.SUBMIT:
      case Button.ACTION:
        return this.spin();
      case Button.LEFT:
        return this.spinning ? false : this.cyclePalette(-1);
      case Button.RIGHT:
        return this.spinning ? false : this.cyclePalette(1);
      case Button.CANCEL:
        if (!this.spinning) {
          this.getUi().revertMode();
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  public override clear(): void {
    super.clear();
    this.container.setVisible(false);
  }
}
