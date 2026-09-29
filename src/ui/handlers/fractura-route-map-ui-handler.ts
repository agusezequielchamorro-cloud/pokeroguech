import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { TextStyle } from "#enums/text-style";
import type { FracturaRouteMapConfig } from "#types/ui-types";
import { addTextObject } from "#ui/text";
import { UiHandler } from "#ui/ui-handler";
import { addWindow } from "#ui/ui-theme";

const NODE_COLORS = {
  battle: 0x5f8f62,
  trainer: 0x46689c,
  event: 0xa777ba,
  shop: 0xd19a45,
  camp: 0x62a6a1,
  elite: 0xb95858,
  boss: 0xd15d3f,
  biome: 0x6c866d,
} as const;

export class FracturaRouteMapUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private config: FracturaRouteMapConfig | null = null;
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];
  private cursorRing: Phaser.GameObjects.Arc;
  private nodePositions: { x: number; y: number }[] = [];
  private detailText: Phaser.GameObjects.Text | null = null;

  public override setup(): void {
    const { width, height } = globalScene.scaledCanvas;
    this.container = globalScene.add.container(0, -height).setName("fractura-route-map").setVisible(false);

    const overlay = globalScene.add.rectangle(0, 0, width, height, 0x0a1712, 0.96).setOrigin(0);
    const header = addWindow(4, 4, width - 8, 26).setOrigin(0);
    const title = addTextObject(10, 9, "MAPA DE RUTA", TextStyle.HEADER_LABEL).setOrigin(0);
    const help = addTextObject(width - 8, height - 14, "← → elegir   A/Enter confirmar", TextStyle.WINDOW).setOrigin(
      1,
      0.5,
    );

    this.graphics = globalScene.add.graphics();
    this.cursorRing = globalScene.add.circle(0, 0, 13).setStrokeStyle(2, 0xffe76a, 1).setVisible(false);

    this.container.add([overlay, header, title, this.graphics, this.cursorRing, help]);
    this.getUi().add(this.container);
  }

  public override show(args: any[]): boolean {
    const config = args[0] as FracturaRouteMapConfig | undefined;
    if (!config?.options?.length) {
      console.warn("Fractura route map requires at least one route option.");
      return false;
    }

    super.show(args);
    this.config = config;
    this.drawMap();
    this.setCursor(0);
    this.container.setVisible(true);
    this.getUi().bringToTop(this.container);
    return true;
  }

  private drawMap(): void {
    if (!this.config) {
      return;
    }

    this.dynamicObjects.forEach(obj => obj.destroy());
    this.dynamicObjects = [];
    this.detailText = null;
    this.nodePositions = [];
    this.graphics.clear();

    const { width } = globalScene.scaledCanvas;
    const count = this.config.options.length;
    const cardWidth = Math.min(92, (width - 20) / count - 4);
    const startX = width / 2 - ((count - 1) * (cardWidth + 4)) / 2;
    const cardY = 62;
    const sourceY = 53;
    const subtitle = addTextObject(
      width / 2,
      36,
      `${this.config.currentLocation}  >  Oleada ${this.config.waveIndex}`,
      TextStyle.WINDOW,
    ).setOrigin(0.5, 0);
    this.dynamicObjects.push(subtitle);
    this.container.add(subtitle);

    this.graphics.lineStyle(1, 0xa7c3ad, 0.65);
    for (let i = 0; i < count; i++) {
      const option = this.config.options[i];
      const x = startX + (cardWidth + 4) * i;
      const centerX = x;
      const color = NODE_COLORS[option.kind ?? "biome"];
      this.graphics.lineBetween(width / 2, sourceY, centerX, cardY);
      const card = globalScene.add.rectangle(x, cardY + 22, cardWidth, 47, 0x22362c, 1).setStrokeStyle(1, color, 1);
      const node = globalScene.add.circle(x, cardY + 5, 5, color, 1).setStrokeStyle(1, 0xe4f0e7, 1);
      const label = addTextObject(x, cardY + 14, option.label, TextStyle.WINDOW).setOrigin(0.5, 0);
      label.setWordWrapWidth(cardWidth - 5, true);
      const kind = option.kind === "camp" ? "DESCANSO" : option.kind === "event" ? "HALLAZGO" : "PELIGRO";
      const tag = addTextObject(x, cardY + 38, kind, TextStyle.WINDOW).setOrigin(0.5, 0);
      tag.setAlpha(0.85);
      card.setInteractive({ useHandCursor: true });
      card.on("pointerover", () => this.setCursor(i));
      card.on("pointerdown", () => {
        this.setCursor(i);
        this.chooseCurrent();
      });
      this.nodePositions.push({ x, y: cardY + 22 });
      this.dynamicObjects.push(card, node, label, tag);
      this.container.add([card, node, label, tag]);
    }

    const detailPanel = globalScene.add
      .rectangle(width / 2, 132, width - 16, 35, 0x172920, 1)
      .setStrokeStyle(1, 0x78947e, 1);
    this.detailText = addTextObject(13, 118, "", TextStyle.WINDOW).setOrigin(0);
    this.detailText.setWordWrapWidth(width - 26, true);
    this.dynamicObjects.push(detailPanel, this.detailText);
    this.container.add([detailPanel, this.detailText]);
    this.updateCursorRing();
  }

  private updateCursorRing(): void {
    const pos = this.nodePositions[this.cursor];
    if (!pos) {
      this.cursorRing.setVisible(false);
      return;
    }
    this.cursorRing.setPosition(pos.x, pos.y).setVisible(true);
    const option = this.config?.options[this.cursor];
    this.detailText?.setText(option ? `${option.label}: ${option.description ?? "Ruta disponible"}` : "");
  }

  public override setCursor(cursor: number): boolean {
    if (!this.config?.options.length) {
      return false;
    }
    const normalized = (cursor + this.config.options.length) % this.config.options.length;
    const changed = super.setCursor(normalized);
    if (changed) {
      this.getUi().playSelect();
    }
    this.updateCursorRing();
    return changed;
  }

  private chooseCurrent(): boolean {
    const option = this.config?.options[this.cursor];
    if (!option) {
      return false;
    }
    this.getUi().playSelect();
    return option.handler();
  }

  public override processInput(button: Button): boolean {
    if (!this.active || !this.config) {
      return false;
    }
    switch (button) {
      case Button.LEFT:
      case Button.UP:
        return this.setCursor(this.cursor - 1);
      case Button.RIGHT:
      case Button.DOWN:
        return this.setCursor(this.cursor + 1);
      case Button.SUBMIT:
      case Button.ACTION:
        return this.chooseCurrent();
      default:
        return false;
    }
  }

  public override clear(): void {
    super.clear();
    this.container.setVisible(false);
    this.cursorRing.setVisible(false);
    this.config = null;
    this.detailText = null;
  }
}
