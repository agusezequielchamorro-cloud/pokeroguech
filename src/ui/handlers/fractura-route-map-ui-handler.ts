import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import type { FracturaRouteMapConfig } from "#types/ui-types";
import { UiHandler } from "#ui/ui-handler";
import { loadFracturaStoryState } from "../../fractura/story";
import { drawRouteView } from "../../fractura/view";

const TAGS = {
  camp: "REFUGIO",
  event: "HALLAZGO",
  battle: "RIESGO",
  trainer: "ENTRENADOR",
  shop: "TIENDA",
  elite: "ÉLITE",
  boss: "JEFE",
  biome: "EXPLORACIÓN",
};

export class FracturaRouteMapUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private config: FracturaRouteMapConfig | null = null;
  private choosing = false;

  public override setup(): void {
    this.container = globalScene.add
      .container(0, -globalScene.scaledCanvas.height)
      .setName("fractura-route-map")
      .setVisible(false);
    this.getUi().add(this.container);
  }

  public override show(args: any[]): boolean {
    const config = args[0] as FracturaRouteMapConfig;
    if (!config?.options?.length) {
      return false;
    }
    super.show(args);
    this.config = config;
    this.cursor = 0;
    this.choosing = false;
    this.draw();
    this.container.setVisible(true);
    this.getUi().bringToTop(this.container);
    return true;
  }

  private draw(): void {
    if (!this.config) {
      return;
    }
    const { width, height } = globalScene.scaledCanvas;
    const history = loadFracturaStoryState().routeHistory;
    drawRouteView(globalScene, this.container, width, height, {
      title: this.config.title ?? "Elegí el próximo destino",
      subtitle: `${this.config.currentLocation} · Próxima oleada ${this.config.waveIndex}`,
      options: this.config.options.map(option => ({
        label: option.label,
        scenery: option.scenery,
        description: option.description ?? "Un nuevo territorio para explorar.",
        tag: TAGS[option.kind ?? "biome"],
        color: option.kind === "battle" ? 0xb77172 : option.kind === "event" ? 0xc1a769 : 0x8dbaaa,
        environment: option.environment ?? (option.kind === "battle" ? 2 : option.kind === "event" ? 1 : 0),
      })),
      selected: this.cursor,
      history:
        history.length > 0
          ? `Recorrido: ${history
              .slice(-2)
              .map(r => r.label)
              .join(" → ")}`
          : "Tocá un camino para leerlo.",
      onSelect: index => this.setCursor(index),
      onConfirm: () => this.choose(),
    });
  }

  public override setCursor(cursor: number): boolean {
    if (!this.config || this.choosing) {
      return false;
    }
    const changed = super.setCursor((cursor + this.config.options.length) % this.config.options.length);
    if (changed) {
      this.getUi().playSelect();
      this.draw();
    }
    return changed;
  }

  private choose(): boolean {
    if (this.choosing || !this.config) {
      return false;
    }
    this.choosing = true;
    const result = this.config.options[this.cursor].handler();
    if (!result) {
      this.choosing = false;
    }
    return result;
  }

  public override processInput(button: Button): boolean {
    if (!this.active) {
      return false;
    }
    if (button === Button.LEFT || button === Button.UP) {
      return this.setCursor(this.cursor - 1);
    }
    if (button === Button.RIGHT || button === Button.DOWN) {
      return this.setCursor(this.cursor + 1);
    }
    if (button === Button.ACTION || button === Button.SUBMIT) {
      return this.choose();
    }
    return false;
  }

  public override clear(): void {
    super.clear();
    this.container.setVisible(false);
    this.config = null;
  }

  public override destroy(): void {
    this.container?.destroy();
  }
}
