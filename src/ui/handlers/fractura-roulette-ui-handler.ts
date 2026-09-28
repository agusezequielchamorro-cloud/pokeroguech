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

interface RouletteReward {
  readonly label: string;
  readonly shortLabel: string;
  readonly eggTier?: EggTier;
  readonly shiny?: boolean;
  readonly variantTier?: VariantTier;
  readonly plusVoucher?: boolean;
}

const ROULETTE_REWARDS: readonly RouletteReward[] = [
  { label: "Huevo común", shortLabel: "HUEVO", eggTier: EggTier.COMMON },
  { label: "Huevo común", shortLabel: "HUEVO", eggTier: EggTier.COMMON },
  { label: "Huevo común", shortLabel: "HUEVO", eggTier: EggTier.COMMON },
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
  private spinning = false;
  private spinTween: Phaser.Tweens.Tween | null = null;

  public override setup(): void {
    const { width, height } = globalScene.scaledCanvas;
    this.container = globalScene.add.container(0, -height).setName("fractura-roulette").setVisible(false);

    const overlay = globalScene.add.rectangle(0, 0, width, height, 0x111018, 0.97).setOrigin(0);
    const header = addWindow(4, 4, width - 8, 27).setOrigin(0);
    const title = addTextObject(10, 9, "RULETA FRACTURA", TextStyle.HEADER_LABEL).setOrigin(0);
    const subtitle = addTextObject(width / 2, 37, "1 Voucher = 1 giro", TextStyle.WINDOW).setOrigin(0.5, 0);

    this.wheelContainer = globalScene.add.container(width / 2, height / 2 + 5);
    const wheel = globalScene.add.graphics();
    wheel.fillStyle(0x253447, 1).fillCircle(0, 0, 58);
    wheel.lineStyle(2, 0xe6dfb5, 0.9).strokeCircle(0, 0, 58);

    const angleStep = (Math.PI * 2) / ROULETTE_REWARDS.length;
    for (let i = 0; i < ROULETTE_REWARDS.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      wheel.lineBetween(0, 0, Math.cos(angle) * 58, Math.sin(angle) * 58);
      const centerAngle = angle + angleStep / 2;
      const label = addTextObject(
        Math.cos(centerAngle) * 41,
        Math.sin(centerAngle) * 41,
        ROULETTE_REWARDS[i].shortLabel,
        TextStyle.WINDOW,
      )
        .setOrigin(0.5)
        .setScale(0.72);
      label.setRotation(centerAngle + Math.PI / 2);
      this.wheelContainer.add(label);
    }
    this.wheelContainer.addAt(wheel, 0);

    const pointer = globalScene.add
      .triangle(width / 2, height / 2 - 62, 0, 0, 10, 0, 5, 10, 0xffe76a)
      .setOrigin(0.5, 1);

    this.resultText = addTextObject(
      width / 2,
      height - 42,
      "A/Enter: girar · B/Esc: volver",
      TextStyle.WINDOW,
    ).setOrigin(0.5, 0);
    this.voucherText = addTextObject(width / 2, height - 23, "", TextStyle.WINDOW).setOrigin(0.5, 0);

    this.container.add([
      overlay,
      header,
      title,
      subtitle,
      this.wheelContainer,
      pointer,
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
    this.resultText.setText("A/Enter: girar · B/Esc: volver");
    this.container.setVisible(true);
    this.getUi().bringToTop(this.container);
    return true;
  }

  private updateVoucherText(): void {
    const regular = globalScene.gameData.voucherCounts[VoucherType.REGULAR] ?? 0;
    const plus = globalScene.gameData.voucherCounts[VoucherType.PLUS] ?? 0;
    this.voucherText.setText(`Vouchers: ${regular}   Voucher Plus: ${plus}`);
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
      this.resultText.setText("Tenés demasiados huevos. Eclosioná alguno antes de girar.");
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
    if (reward.plusVoucher) {
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

    this.resultText.setText(`¡Premio! ${reward.label}`);
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
