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
    this.setCursor(0);
    this.drawMap();
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
    this.nodePositions = [];
    this.graphics.clear();

    const { width, height } = globalScene.scaledCanvas;
    const currentX = width / 2;
    const currentY = height - 34;
    const optionY = height * 0.53;
    const previewY = height * 0.3;
    const count = this.config.options.length;

    const subtitle = addTextObject(
      10,
      34,
      `${this.config.title ?? "Fractura"} · Oleada ${this.config.waveIndex}`,
      TextStyle.WINDOW,
    ).setOrigin(0);
    const currentLabel = addTextObject(
      currentX,
      currentY + 15,
      this.config.currentLocation,
      TextStyle.WINDOW,
    ).setOrigin(0.5, 0);
    this.dynamicObjects.push(subtitle, currentLabel);
    this.container.add([subtitle, currentLabel]);

    this.graphics.lineStyle(1, 0xa7c3ad, 0.55);

    const spread = count === 1 ? 0 : Math.min(88, (width - 70) / Math.max(count - 1, 1));
    const startX = currentX - (spread * (count - 1)) / 2;

    for (let i = 0; i < count; i++) {
      const option = this.config.options[i];
      const x = startX + spread * i;
      const y = optionY;
      this.nodePositions.push({ x, y });

      this.graphics.lineBetween(currentX, currentY - 8, x, y + 10);
      this.graphics.lineBetween(x, y - 10, x - 12, previewY + 8);
      this.graphics.lineBetween(x, y - 10, x + 12, previewY + 8);

      const color = NODE_COLORS[option.kind ?? "biome"];
      const node = globalScene.add.circle(x, y, 10, color, 1).setStrokeStyle(2, 0xe4f0e7, 0.9);
      const label = addTextObject(x, y + 14, option.label, TextStyle.WINDOW).setOrigin(0.5, 0);
      const description = addTextObject(x, y + 25, option.description ?? "Ruta disponible", TextStyle.WINDOW).setOrigin(
        0.5,
        0,
      );
      description.setAlpha(0.8);

      const previewLeft = globalScene.add.circle(x - 12, previewY, 5, 0x354c3a, 1).setStrokeStyle(1, 0x8fa795, 0.8);
      const previewRight = globalScene.add.circle(x + 12, previewY, 5, 0x354c3a, 1).setStrokeStyle(1, 0x8fa795, 0.8);
      const qLeft = addTextObject(x - 12, previewY - 4, "?", TextStyle.WINDOW).setOrigin(0.5, 0);
      const qRight = addTextObject(x + 12, previewY - 4, "?", TextStyle.WINDOW).setOrigin(0.5, 0);

      node.setInteractive({ useHandCursor: true });
      node.on("pointerover", () => this.setCursor(i));
      node.on("pointerdown", () => this.chooseCurrent());

      this.dynamicObjects.push(node, label, description, previewLeft, previewRight, qLeft, qRight);
      this.container.add([node, label, description, previewLeft, previewRight, qLeft, qRight]);
    }

    const currentNode = globalScene.add.circle(currentX, currentY, 9, 0x2a4934, 1).setStrokeStyle(2, 0xffffff, 0.85);
    this.dynamicObjects.push(currentNode);
    this.container.add(currentNode);
    this.updateCursorRing();
  }

  private updateCursorRing(): void {
    const pos = this.nodePositions[this.cursor];
    if (!pos) {
      this.cursorRing.setVisible(false);
      return;
    }
    this.cursorRing.setPosition(pos.x, pos.y).setVisible(true);
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
  }
}
