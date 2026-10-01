import { globalScene } from "#app/global-scene";
import { Button } from "#enums/buttons";
import { UiHandler } from "#ui/ui-handler";
import { conversationFor, type FracturaDialogueLine, responseFor, splitSceneText } from "../../fractura/dialogue";
import { getRival, relationshipLabel, STORIES } from "../../fractura/run-state";
import { FracturaStage } from "../../fractura/stage";
import type { FracturaStoryEvent } from "../../fractura/story";
import { loadFracturaStoryState } from "../../fractura/story";
import { drawStoryView } from "../../fractura/view";

export interface FracturaSceneConfig {
  event: FracturaStoryEvent;
  onChoice: (index: number) => string;
  onDone: () => void;
}

export class FracturaStoryUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private config: FracturaSceneConfig | null = null;
  private pages: FracturaDialogueLine[] = [];
  private stageCast: FracturaStage;
  private textTimer: Phaser.Time.TimerEvent | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;
  private typing = false;
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
    this.stageCast = new FracturaStage(globalScene);
  }

  public override show(args: any[]): boolean {
    const config = args[0] as FracturaSceneConfig;
    if (!config?.event || !config.onChoice || !config.onDone) {
      return false;
    }
    super.show(args);
    this.config = config;
    this.pages = conversationFor(config.event, loadFracturaStoryState()).flatMap(line =>
      splitSceneText(line.text).map(text => ({ ...line, text })),
    );
    this.page = 0;
    this.cursor = 0;
    this.stage = "intro";
    this.committed = false;
    this.nextInputAt = globalScene.time.now + 200;
    this.stageCast.enter(config.event, loadFracturaStoryState(), () => this.advance());
    this.draw();
    this.container.setVisible(true);
    this.getUi().bringToTop(this.container);
    return true;
  }

  private draw(): void {
    if (!this.config) {
      return;
    }
    this.textTimer?.remove(false);
    this.textTimer = null;
    this.typing = false;
    this.dialogueText = null;
    const state = loadFracturaStoryState();
    const rival = getRival(state);
    const { width, height } = globalScene.scaledCanvas;
    const event = this.config.event;
    const line = this.pages[this.page];
    drawStoryView(globalScene, this.container, width, height, {
      title: event.title,
      subtitle: `${STORIES[state.storyId].title} · Oleada ${event.afterWave}`,
      speaker:
        this.stage === "choice" || line.speaker === "rival"
          ? rival.name
          : line.speaker === "player"
            ? "Vos"
            : "El camino",
      portrait: event.portrait ?? rival.frame,
      speakerKind: this.stage === "choice" ? "rival" : line.speaker,
      environment: event.environment ?? (event.afterWave === 15 || event.afterWave === 25 ? 1 : 0),
      text: this.stage === "choice" ? `Vínculo con ${rival.name}: ${relationshipLabel(state)}.` : line.text,
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
    if (this.stage !== "choice") {
      this.stageCast.act(line);
      const text = this.container.getByName("fractura-dialogue-text") as Phaser.GameObjects.Text | null;
      if (text?.setText && line.text.length > 0) {
        this.dialogueText = text;
        text.setText("");
        this.typing = true;
        let visible = 0;
        this.textTimer = globalScene.time.addEvent({
          delay: 20,
          repeat: Math.ceil(line.text.length / 2) - 1,
          callback: () => {
            visible += 2;
            text.setText(line.text.slice(0, visible));
            if (visible >= line.text.length) {
              this.typing = false;
            }
          },
        });
      }
    }
  }

  private advance(): boolean {
    if (!this.config || globalScene.time.now < this.nextInputAt) {
      return false;
    }
    this.nextInputAt = globalScene.time.now + 180;
    if (this.typing) {
      this.textTimer?.remove(false);
      this.textTimer = null;
      this.dialogueText?.setText(this.pages[this.page].text);
      this.typing = false;
    } else if (this.page < this.pages.length - 1) {
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
    const previous = structuredClone(loadFracturaStoryState());
    const result = this.config.onChoice(this.cursor);
    this.pages = responseFor(this.config.event, this.cursor, loadFracturaStoryState(), result, previous).flatMap(line =>
      splitSceneText(line.text).map(text => ({ ...line, text })),
    );
    this.page = 0;
    this.stage = "result";
    this.nextInputAt = globalScene.time.now + 180;
    this.draw();
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
    this.textTimer?.remove(false);
    this.textTimer = null;
    this.dialogueText = null;
    this.typing = false;
    this.stageCast.clear();
    this.config = null;
  }

  public override destroy(): void {
    this.textTimer?.remove(false);
    this.stageCast?.clear();
    this.container?.destroy();
  }
}
