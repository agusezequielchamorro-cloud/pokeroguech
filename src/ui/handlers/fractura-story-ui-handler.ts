import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { UiHandler } from "#ui/ui-handler";
import { getRival, relationshipLabel, STORIES } from "../../fractura/run-state";
import type { FracturaStoryEvent } from "../../fractura/story";
import { loadFracturaStoryState } from "../../fractura/story";
import { drawStoryView } from "../../fractura/view";

export interface FracturaSceneConfig {
  event: FracturaStoryEvent;
  onChoice: (index: number) => string;
  onDone: () => void;
}

/** Short explicit pages give every line a place on the 320×180 battle canvas. */
export function splitSceneText(text: string, limit = 280): string[] {
  const pages: string[] = [];
  let page = "";
  for (const word of text.replaceAll("$", " ").split(/\s+/)) {
    if (page && page.length + word.length + 1 > limit) {
      pages.push(page);
      page = word;
    } else {
      page += `${page ? " " : ""}${word}`;
    }
  }
  if (page) {
    pages.push(page);
  }
  return pages.length > 0 ? pages : [""];
}

export class FracturaStoryUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private config: FracturaSceneConfig | null = null;
  private pages: string[] = [];
  private page = 0;
  private stage: "intro" | "choice" | "result" = "intro";
  private committed = false;
  private nextInputAt = 0;

  public override setup(): void {
    this.container = globalScene.add
      .container(0, -globalScene.scaledCanvas.height)
      .setVisible(false)
      .setName("fractura-cinematic");
    this.getUi().add(this.container);
  }

  public override show(args: any[]): boolean {
    const config = args[0] as FracturaSceneConfig;
    if (!config?.event || !config.onChoice || !config.onDone) {
      return false;
    }
    super.show(args);
    this.config = config;
    this.pages = splitSceneText(config.event.intro);
    this.page = 0;
    this.cursor = 0;
    this.stage = "intro";
    this.committed = false;
    this.nextInputAt = globalScene.time.now + 200;
    this.draw(true);
    this.container.setVisible(true);
    this.getUi().bringToTop(this.container);
    return true;
  }

  private draw(animate = false): void {
    if (!this.config) {
      return;
    }
    const state = loadFracturaStoryState();
    const rival = getRival(state);
    const { width, height } = globalScene.scaledCanvas;
    const event = this.config.event;
    const portrait = drawStoryView(globalScene, this.container, width, height, {
      title: event.title,
      subtitle: `${STORIES[state.storyId].title} · Oleada ${event.afterWave}`,
      speaker: event.speaker ?? rival.name,
      portrait: event.portrait ?? rival.frame,
      environment: event.environment ?? (event.afterWave === 15 || event.afterWave === 25 ? 1 : 0),
      text:
        this.stage === "choice"
          ? `¿Qué decidís? Tu elección queda guardada.\nVínculo con ${rival.name}: ${relationshipLabel(state)}.`
          : this.pages[this.page],
      pageLabel:
        this.stage === "choice"
          ? "Decisión"
          : `${this.stage === "result" ? "Consecuencia" : "Escena"} ${this.page + 1}/${this.pages.length}`,
      choices:
        this.stage === "choice"
          ? event.choices.map(c => ({ label: c.label, hint: c.hint ?? "Se aplica durante esta partida." }))
          : [],
      selected: this.cursor,
      onSelect: index => this.setCursor(index),
      onContinue: () => this.advance(),
      onConfirm: () => this.commit(),
    });
    if (animate && portrait) {
      portrait.setAlpha(0).setX(4);
      globalScene.tweens.add({ targets: portrait, alpha: 1, x: 9, duration: 450, ease: "Sine.easeOut" });
    }
  }

  private advance(): boolean {
    if (!this.config || globalScene.time.now < this.nextInputAt) {
      return false;
    }
    this.nextInputAt = globalScene.time.now + 180;
    if (this.page < this.pages.length - 1) {
      this.page++;
      this.draw();
    } else if (this.stage === "intro") {
      this.stage = "choice";
      this.draw();
    } else if (this.stage === "result") {
      const done = this.config.onDone;
      this.config = null;
      done();
    }
    return true;
  }

  private commit(): boolean {
    if (!this.config || this.stage !== "choice" || this.committed || globalScene.time.now < this.nextInputAt) {
      return false;
    }
    this.committed = true;
    this.pages = splitSceneText(this.config.onChoice(this.cursor));
    this.page = 0;
    this.stage = "result";
    this.nextInputAt = globalScene.time.now + 180;
    this.draw(true);
    return true;
  }

  public override setCursor(cursor: number): boolean {
    if (!this.config || this.stage !== "choice") {
      return false;
    }
    const changed = super.setCursor((cursor + this.config.event.choices.length) % this.config.event.choices.length);
    if (changed) {
      this.getUi().playSelect();
      this.draw();
    }
    return changed;
  }

  public override processInput(button: Button): boolean {
    if (!this.active) {
      return false;
    }
    if (button === Button.UP || button === Button.LEFT) {
      return this.setCursor(this.cursor - 1);
    }
    if (button === Button.DOWN || button === Button.RIGHT) {
      return this.setCursor(this.cursor + 1);
    }
    if (button === Button.ACTION || button === Button.SUBMIT) {
      return this.stage === "choice" ? this.commit() : this.advance();
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
