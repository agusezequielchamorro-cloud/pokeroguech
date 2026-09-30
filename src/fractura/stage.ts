import type { BattleScene } from "../battle-scene";
import { ensureFracturaFrames, rivalSpriteKey } from "./assets";
import type { FracturaDialogueLine } from "./dialogue";
import { type FracturaRunState, getRival } from "./run-state";
import { chapterScenery, setSceneryTexture } from "./scenery";
import type { FracturaStoryEvent } from "./story";

/** A small, disposable cast enters the real field. Combat sprites, ground and weather remain in the scene. */
export class FracturaStage {
  private root: Phaser.GameObjects.Container | null = null;
  private actor: Phaser.GameObjects.Sprite | null = null;
  private prop: Phaser.GameObjects.Container | null = null;
  private timers: Phaser.Time.TimerEvent[] = [];
  private tweens: Phaser.Tweens.Tween[] = [];
  private backdrop: { key: string; frame: string | number; scaleX: number; scaleY: number } | null = null;
  private speaking = false;

  constructor(private readonly scene: BattleScene) {}

  public enter(event: FracturaStoryEvent, state: FracturaRunState, onTouch: () => void): void {
    this.clear();
    ensureFracturaFrames(this.scene);
    const rival = getRival(state);
    const key = rivalSpriteKey(rival.id);
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
          duration: 550,
          onComplete: () => {
            setSceneryTexture(this.scene, bg, scenery);
            transition.setVisible(false);
          },
        }),
      );
    }
    this.root = this.scene.add.container(0, 0).setName("fractura-field-cast");
    this.scene.field.add(this.root);
    const shadow = this.scene.add.ellipse(244, 104, 25, 7, 0x111322, 0.28);
    this.actor = this.scene.add.sprite(340, 106, key, 0).setOrigin(0.5, 1).setDisplaySize(78, 78);
    this.actor.setInteractive({ useHandCursor: true }).on("pointerdown", onTouch);
    this.root.add([shadow, this.actor]);
    this.tweens.push(this.scene.tweens.add({ targets: this.actor, x: 244, duration: 600, ease: "Sine.easeOut" }));
    const actorY = this.actor.y;
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.actor,
        y: actorY - 0.8,
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      }),
    );
    // A discoverable object sits on the same ground as the cast, instead of becoming a full-screen PNG.
    this.prop = this.scene.add.container(178, 93);
    const marker = this.scene.add.graphics();
    marker.fillStyle(event.afterWave === 20 ? 0xf5b772 : 0x96e5df, 0.45).fillCircle(0, -5, 8);
    marker.fillStyle(0x273c4b).fillRoundedRect(-4, -10, 8, 10, 2);
    marker.lineStyle(0.8, 0xeac589).strokeRoundedRect(-4, -10, 8, 10, 2);
    marker.fillStyle(0xeac589).fillRect(-2, -8, 4, 2);
    const hit = this.scene.add.rectangle(0, -6, 22, 22, 0, 0).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => {
      this.react("glow");
      onTouch();
    });
    this.prop.add([marker, hit]);
    this.root.add(this.prop);
    this.tweens.push(
      this.scene.tweens.add({ targets: this.prop, alpha: 0.65, duration: 1000, yoyo: true, repeat: -1 }),
    );
    this.timers.push(
      this.scene.time.addEvent({
        delay: 600,
        loop: true,
        callback: () => {
          if (this.speaking && this.actor) {
            this.actor.setFrame(String(this.actor.frame.name) === "1" ? 0 : 1);
          }
        },
      }),
    );
    // Six ambient motes give the scene movement without an expensive particle system on a phone.
    for (let i = 0; i < 6; i++) {
      const mote = this.scene.add.circle(34 + i * 46, 28 + (i % 3) * 17, 0.65, 0xf5ddb0, 0.5);
      this.root.add(mote);
      this.tweens.push(
        this.scene.tweens.add({
          targets: mote,
          y: mote.y - 13,
          x: mote.x + 7,
          alpha: 0.1,
          duration: 2300 + i * 270,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        }),
      );
    }
  }

  public act(line: FracturaDialogueLine): void {
    this.speaking = line.speaker === "rival";
    this.actor?.setFrame(line.pose ?? (this.speaking ? 1 : 0));
    if (line.effect) {
      this.react(line.effect);
    }
  }

  public react(effect: "signal" | "glow" | "shake"): void {
    if (!this.root || !this.actor) {
      return;
    }
    if (effect === "shake") {
      this.tweens.push(this.scene.tweens.add({ targets: this.actor, x: 247, duration: 80, yoyo: true, repeat: 3 }));
    } else if (this.prop) {
      this.tweens.push(
        this.scene.tweens.add({
          targets: this.prop,
          y: 87,
          duration: 240,
          yoyo: true,
          repeat: 2,
          ease: "Sine.easeInOut",
        }),
      );
    }
  }

  public clear(): void {
    this.timers.forEach(timer => timer.remove(false));
    this.tweens.forEach(tween => tween.remove());
    this.timers = [];
    this.tweens = [];
    this.root?.destroy(true);
    this.root = null;
    this.actor = null;
    this.prop = null;
    this.speaking = false;
    if (this.backdrop) {
      this.scene.arenaBg
        .setTexture(this.backdrop.key, this.backdrop.frame)
        .setScale(this.backdrop.scaleX, this.backdrop.scaleY);
      this.scene.arenaBgTransition.setVisible(false);
      this.backdrop = null;
    }
  }
}
