import type { BattleScene } from "../battle-scene";
import { ensureFracturaFrames, FRACTURA_PROPS, rivalSpriteKey } from "./assets";
import type { FracturaDialogueLine } from "./dialogue";
import { type FracturaRunState, getRival } from "./run-state";
import { chapterScenery, setSceneryTexture } from "./scenery";
import { RIVAL_FRAME } from "./sprite-layout";
import type { FracturaStoryEvent } from "./story";

interface HiddenActor {
  actor: Phaser.GameObjects.Components.Visible & Phaser.GameObjects.GameObject;
  visible: boolean;
}

/** Suspend combat overlays and present a conversation on the existing field. */
export class FracturaStage {
  private root: Phaser.GameObjects.Container | null = null;
  private actor: Phaser.GameObjects.Sprite | null = null;
  private prop: Phaser.GameObjects.Image | null = null;
  private tweens: Phaser.Tweens.Tween[] = [];
  private hidden: HiddenActor[] = [];
  private poseTween: Phaser.Tweens.Tween | null = null;
  private backdrop: { key: string; frame: string | number; scaleX: number; scaleY: number } | null = null;
  constructor(private readonly scene: BattleScene) {}
  private hide(actor: HiddenActor["actor"] | null | undefined): void {
    if (actor) {
      this.hidden.push({ actor, visible: actor.visible });
      actor.setVisible(false);
    }
  }
  public enter(event: FracturaStoryEvent, state: FracturaRunState, onTouch: () => void): void {
    this.clear();
    this.hide(this.scene.fieldUI);
    this.hide(this.scene.getModifierBar());
    this.hide(this.scene.getModifierBar(true));
    this.hide(this.scene.currentBattle.trainer);
    // Single battles leave empty positions in the four-slot field array.
    this.scene.getField().forEach(p => this.hide(p?.getBattleInfo()));
    this.scene.getEnemyField().forEach(p => this.hide(p));
    const message = this.scene.ui.getMessageHandler();
    message.clearText();
    this.hide(message.bg);
    this.hide(message.nameBoxContainer);
    ensureFracturaFrames(this.scene);
    const key = rivalSpriteKey(getRival(state).id);
    if (!this.scene.textures.exists(key)) {
      return;
    }
    const scenery = event.ambient ? undefined : chapterScenery(event.afterWave, state.storyId);
    if (scenery) {
      const bg = this.scene.arenaBg;
      this.backdrop = { key: bg.texture.key, frame: bg.frame.name, scaleX: bg.scaleX, scaleY: bg.scaleY };
      const transition = this.scene.arenaBgTransition;
      setSceneryTexture(this.scene, transition, scenery);
      transition.setAlpha(0).setVisible(true);
      this.tweens.push(
        this.scene.tweens.add({
          targets: transition,
          alpha: 1,
          duration: 650,
          onComplete: () => {
            setSceneryTexture(this.scene, bg, scenery);
            transition.setVisible(false);
          },
        }),
      );
    }
    this.root = this.scene.add.container(0, 0).setName("fractura-field-cast");
    this.scene.field.add(this.root);
    const height = 79;
    const footY = 104 - ((RIVAL_FRAME.height - RIVAL_FRAME.footY) * height) / RIVAL_FRAME.height;
    const shadow = this.scene.add.ellipse(251, footY, 24, 5, 0x080e17, 0.24);
    this.actor = this.scene
      .addFieldSprite(328, 104, key, 0)
      .setOrigin(0.5, 1)
      .setDisplaySize((height * RIVAL_FRAME.width) / RIVAL_FRAME.height, height)
      .setAlpha(0);
    this.actor.setInteractive({ useHandCursor: true }).on("pointerdown", onTouch);
    this.root.add([shadow, this.actor]);
    this.tweens.push(
      this.scene.tweens.add({ targets: this.actor, x: 251, alpha: 1, duration: 700, ease: "Sine.easeOut" }),
    );
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.actor,
        scaleY: this.actor.scaleY * 1.008,
        duration: 1900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }),
    );
    if (this.scene.textures.exists(FRACTURA_PROPS)) {
      const frame = event.sceneProp ?? (event.afterWave === 20 || event.afterWave === 55 ? 0 : 4);
      const f = this.scene.textures.getFrame(FRACTURA_PROPS, String(frame));
      const scale = Math.min(35 / f.width, 32 / f.height);
      this.prop = this.scene.add
        .image(183, 96, FRACTURA_PROPS, String(frame))
        .setOrigin(0.5, 1)
        .setDisplaySize(f.width * scale, f.height * scale)
        .setPipeline(this.scene.fieldSpritePipeline);
      this.prop.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
        this.react("glow");
        onTouch();
      });
      this.root.add(this.prop);
      if ([0, 4, 5, 6, 7, 15].includes(frame)) {
        const light = this.scene.add.circle(183, 94, 15, frame === 0 ? 0xe6a457 : 0x77d9d0, 0.1);
        this.root.addAt(light, 1);
        this.tweens.push(
          this.scene.tweens.add({
            targets: light,
            alpha: 0.24,
            scaleX: 1.18,
            scaleY: 1.18,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
          }),
        );
      }
    }
    for (let i = 0; i < 4; i++) {
      const mote = this.scene.add.circle(28 + i * 68, 34 + (i % 2) * 22, 0.5, 0xf5ddb0, 0.45);
      this.root.add(mote);
      this.tweens.push(
        this.scene.tweens.add({
          targets: mote,
          y: mote.y - 9,
          alpha: 0.12,
          duration: 2700 + i * 470,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        }),
      );
    }
  }
  public act(line: FracturaDialogueLine): void {
    if (!this.actor) {
      return;
    }
    const actor = this.actor;
    const pose = line.pose ?? (line.speaker === "rival" ? 1 : 0);
    this.poseTween?.remove();
    actor.setAlpha(1);
    if (String(actor.frame.name) !== String(pose)) {
      this.poseTween = this.scene.tweens.add({
        targets: actor,
        alpha: 0.72,
        duration: 100,
        onComplete: () => {
          if (this.actor !== actor) {
            return;
          }
          actor.setFrame(pose);
          this.poseTween = this.scene.tweens.add({ targets: actor, alpha: 1, duration: 140 });
        },
      });
    }
    if (line.effect) {
      this.react(line.effect);
    }
  }
  public react(effect: "signal" | "glow" | "shake"): void {
    if (!this.prop) {
      return;
    }
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.prop,
        alpha: effect === "shake" ? 0.5 : 0.68,
        duration: effect === "signal" ? 160 : 320,
        yoyo: true,
        repeat: effect === "signal" ? 2 : 0,
      }),
    );
  }
  public clear(): void {
    this.poseTween?.remove();
    this.poseTween = null;
    this.tweens.forEach(tween => tween.remove());
    this.tweens = [];
    this.root?.destroy(true);
    this.root = null;
    this.actor = null;
    this.prop = null;
    for (const entry of this.hidden) {
      if (entry.actor.scene) {
        entry.actor.setVisible(entry.visible);
      }
    }
    this.hidden = [];
    if (this.backdrop) {
      this.scene.arenaBg
        .setTexture(this.backdrop.key, this.backdrop.frame)
        .setScale(this.backdrop.scaleX, this.backdrop.scaleY);
      this.scene.arenaBgTransition.setVisible(false);
      this.backdrop = null;
    }
  }
}
