import { globalScene } from "#app/global-scene";
import { Egg } from "#data/egg";
import { Button } from "#enums/buttons";
import { EggSourceType } from "#enums/egg-source-types";
import { EggTier } from "#enums/egg-type";
import { VariantTier } from "#enums/variant-tier";
import { VoucherType } from "#enums/voucher-type";
import { UiHandler } from "#ui/ui-handler";
import { randInt } from "#utils/common";
import { craftConsumable, RECIPES, recipeCost } from "../../fractura/crafting";
import { splitSceneText } from "../../fractura/dialogue";
import { journalOverview } from "../../fractura/journal";
import {
  casinoWon,
  loadFracturaProfile,
  RIVAL_PALETTES,
  ROULETTE_REWARDS,
  saveFracturaProfile,
} from "../../fractura/profile";
import type { BuildId, ConsumableId } from "../../fractura/run-state";
import {
  BUILD_LABELS,
  CONSUMABLES,
  getRival,
  RELIC_LABELS,
  relationshipLabel,
  STORIES,
} from "../../fractura/run-state";
import { loadFracturaStoryState, saveFracturaStoryState } from "../../fractura/story";
import { drawCasinoView } from "../../fractura/view";
import { angleDelta, rouletteStopAngle, wheelSector } from "../../fractura/wheel";

const ITEMS: ConsumableId[] = ["tonic", "lure", "shield", "prism", "remedy", "ether"];

export class FracturaRouletteUiHandler extends UiHandler {
  private container: Phaser.GameObjects.Container;
  private wheel: Phaser.GameObjects.Container | null = null;
  private tab = 0;
  private result = "";
  private spinning = false;
  private tween: Phaser.Tweens.Tween | null = null;
  private wheelAngle = 0;
  private drag: { pointer: number; angle: number; total: number; start: number; sector: number } | null = null;
  private readonly onPointerMove = (pointer: Phaser.Input.Pointer) => this.dragWheel(pointer);
  private readonly onPointerUp = (pointer: Phaser.Input.Pointer) => this.releaseWheel(pointer);

  public override setup(): void {
    this.container = globalScene.add
      .container(0, -globalScene.scaledCanvas.height)
      .setName("fractura-casino")
      .setVisible(false);
    this.getUi().add(this.container);
    globalScene.input.on("pointermove", this.onPointerMove);
    globalScene.input.on("pointerup", this.onPointerUp);
  }

  public override show(args: any[]): boolean {
    super.show(args);
    this.tab = 0;
    this.cursor = 0;
    this.result = "";
    this.spinning = false;
    this.wheelAngle = 0;
    this.drag = null;
    this.draw();
    this.container.setVisible(true);
    this.getUi().bringToTop(this.container);
    return true;
  }

  private hasRun(): boolean {
    return !!globalScene.currentBattle && globalScene.gameMode.isClassic && globalScene.getPlayerParty().length > 0;
  }

  private diaryPages(): { title: string; subtitle: string; body: string }[] {
    if (!this.hasRun()) {
      return [
        {
          title: "Diario de expedición",
          subtitle: "Sin expedición activa",
          body: "Inicia o continúa una partida clásica. El Diario mostrará sus objetivos y decisiones.",
        },
      ];
    }
    const state = loadFracturaStoryState();
    const wave = globalScene.currentBattle.waveIndex;
    const pages: { title: string; subtitle: string; body: string }[] = [];
    journalOverview(state, wave).forEach((body, i) =>
      splitSceneText(body, 260).forEach(part =>
        pages.push({
          title: i < 2 ? STORIES[state.storyId].title : "La misión de " + getRival(state).name,
          subtitle: i < 2 ? "Objetivo de la expedición · Oleada " + wave : "Misión personal",
          body: part,
        }),
      ),
    );
    for (const entry of [...state.journal].reverse()) {
      splitSceneText(entry.choice + ". " + entry.consequence, 260).forEach(body =>
        pages.push({
          title: entry.title,
          subtitle: "Oleada " + entry.wave + " · Decisión y consecuencia",
          body,
        }),
      );
      entry.dialogue.forEach(line =>
        splitSceneText(line, 260).forEach(body =>
          pages.push({
            title: entry.title,
            subtitle: "Oleada " + entry.wave + " · Conversación",
            body,
          }),
        ),
      );
    }
    if (state.journal.length === 0 && state.completedEvents.length > 0) {
      pages.push({
        title: "Decisiones anteriores",
        subtitle: "Partida conservada",
        body: "Tus decisiones anteriores siguen activas. El registro detallado de conversaciones empieza con las escenas de esta versión.",
      });
    }
    return pages;
  }

  private draw(): void {
    const { width, height } = globalScene.scaledCanvas;
    const profile = loadFracturaProfile();
    const state = loadFracturaStoryState();
    const rival = getRival(state);
    this.wheel = drawCasinoView(globalScene, this.container, width, height, {
      tab: this.tab,
      wheelAngle: this.wheelAngle,
      onWheelDown: pointer => this.grabWheel(pointer),
      selected: this.cursor,
      vouchers: globalScene.gameData.voucherCounts[VoucherType.REGULAR] ?? 0,
      tokens: profile.casinoTokens,
      result: this.result,
      inventory: ITEMS.map(id => ({
        name: CONSUMABLES[id].short,
        count: profile.inventory[id],
        detail: CONSUMABLES[id].description,
      })),
      recipes: RECIPES.map(r => ({
        name: CONSUMABLES[r.id].short,
        cost: recipeCost(profile, r.id),
        detail: CONSUMABLES[r.id].description,
      })),
      journalPages: this.diaryPages(),
      relationshipTitle: this.hasRun() ? `${rival.name} · ${relationshipLabel(state)}` : "Sin expedición activa",
      rivalFrame: rival.frame,
      relationshipLines: this.hasRun()
        ? [
            `${rival.role} · ${rival.age} años`,
            `Confianza ${state.relationship.trust} · Afecto ${state.relationship.affection}`,
            `Enemistad ${state.relationship.rivalry} · Romance ${state.relationship.romance ? "elegido" : "no elegido"}`,
            STORIES[state.storyId].title,
            `Especialidad: ${state.build ? BUILD_LABELS[state.build] : "se elige en oleada 15"}`,
            `Reliquia: ${state.relic ? RELIC_LABELS[state.relic] : "se elige en oleada 25"}`,
          ]
        : [
            "Cada partida clásica genera un rival adulto",
            "y una historia. Continuar conserva ambos.",
            "Usa la mochila en una partida clásica.",
          ],
      palette: RIVAL_PALETTES[profile.selectedPalette as keyof typeof RIVAL_PALETTES].label,
      onTab: tab => this.changeTab(tab),
      onSelect: index => this.setCursor(index),
      onAction: () => this.action(),
      onPalette: () => this.cyclePalette(),
      onBack: () => this.back(),
    });
  }

  private persist(): void {
    if (this.hasRun()) {
      void globalScene.gameData.saveAll(true, false);
    } else {
      void globalScene.gameData.saveSystem();
    }
  }

  private changeTab(tab: number): boolean {
    if (this.spinning) {
      return false;
    }
    this.tab = (tab + 6) % 6;
    this.drag = null;
    this.cursor = 0;
    this.result = "";
    this.draw();
    return true;
  }

  public override setCursor(cursor: number): boolean {
    if (this.spinning) {
      return false;
    }
    const count = [10, 2, ITEMS.length, RECIPES.length, 1, this.diaryPages().length][this.tab];
    const changed = super.setCursor((cursor + count) % count);
    if (changed) {
      this.result = "";
      this.getUi().playSelect();
      this.draw();
    }
    return changed;
  }

  private grantReward(index: number): string {
    const reward = ROULETTE_REWARDS[index];
    const profile = loadFracturaProfile();
    const plus = () => {
      globalScene.gameData.voucherCounts[VoucherType.PLUS]++;
    };
    if (reward.id === "compass") {
      if (profile.compass) {
        plus();
        return "Brújula repetida → Voucher Plus.";
      }
      profile.compass = true;
    } else if (reward.id === "outfit") {
      const palette = randInt(2) === 0 ? "indigo" : "cobre";
      if (profile.rivalPalettes.includes(palette)) {
        plus();
        return "Paleta repetida → Voucher Plus.";
      }
      profile.rivalPalettes.push(palette);
      profile.selectedPalette = palette;
    } else if (reward.id === "supplies") {
      profile.inventory.tonic++;
      profile.inventory.shield++;
    } else if (reward.id === "prism") {
      profile.inventory.prism++;
      profile.inventory.lure++;
    } else if (reward.id === "plus") {
      plus();
    } else if (globalScene.gameData.eggs.length >= 99) {
      plus();
      return "Huevos llenos → recibes un Voucher Plus.";
    } else {
      const egg = new Egg({
        tier: reward.id === "rare" ? EggTier.RARE : reward.id === "legendary" ? EggTier.LEGENDARY : EggTier.EPIC,
        ...(reward.id === "shiny" || reward.id === "red" ? { isShiny: true } : {}),
        ...(reward.id === "red" ? { variantTier: VariantTier.EPIC } : {}),
        sourceType: EggSourceType.EVENT,
        eggDescriptor: "Casino Fractura",
      });
      egg.addEggToGameData();
    }
    saveFracturaProfile(profile);
    return `Ganaste: ${reward.label}.`;
  }

  private spin(turns = 5): boolean {
    if (this.spinning) {
      return false;
    }
    if ((globalScene.gameData.voucherCounts[VoucherType.REGULAR] ?? 0) < 1) {
      this.result = "Necesitas 1 Voucher normal. Ganas vouchers cada 10 oleadas.";
      this.draw();
      return false;
    }
    globalScene.gameData.voucherCounts[VoucherType.REGULAR]--;
    const index = randInt(10);
    // Commit the reward before the animation: closing/reloading cannot reroll an already-paid spin.
    const result = this.grantReward(index);
    this.persist();
    this.result = "Girando… El premio ya quedó guardado.";
    this.draw();
    this.spinning = true;
    const stop = rouletteStopAngle(this.wheelAngle, index, turns);
    let lastTick = -1;
    let tickAt = 0;
    this.tween = globalScene.tweens.add({
      targets: this.wheel,
      angle: stop,
      duration: 2000 + turns * 160,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        const sector = Math.floor(((this.wheel?.angle ?? 0) + 360) / 36);
        if (sector !== lastTick && globalScene.time.now - tickAt >= 85) {
          lastTick = sector;
          tickAt = globalScene.time.now;
          this.getUi().playSelect();
        }
      },
      onComplete: () => {
        this.spinning = false;
        this.wheelAngle = stop % 360;
        this.cursor = index;
        this.result = result;
        this.draw();
        globalScene.tweens.add({ targets: this.wheel, alpha: 0.65, duration: 160, yoyo: true, repeat: 2 });
      },
    });
    return true;
  }

  private grabWheel(pointer: Phaser.Input.Pointer): void {
    if (!this.active || this.spinning || this.tab !== 0 || !this.wheel) {
      return;
    }
    const point = this.container.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    const dx = point.x - 55;
    const dy = point.y - 91;
    if (Math.hypot(dx, dy) > 43) {
      return;
    }
    const local = this.wheel.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    this.drag = {
      pointer: pointer.id,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      total: 0,
      start: this.wheelAngle,
      sector: wheelSector(local.x, local.y),
    };
  }

  private dragWheel(pointer: Phaser.Input.Pointer): void {
    if (!this.drag || this.drag.pointer !== pointer.id || this.spinning) {
      return;
    }
    const point = this.container.getWorldTransformMatrix().applyInverse(pointer.x, pointer.y);
    const angle = (Math.atan2(point.y - 91, point.x - 55) * 180) / Math.PI;
    this.drag.total += angleDelta(this.drag.angle, angle);
    this.drag.angle = angle;
    this.wheelAngle = this.drag.start + this.drag.total;
    this.wheel?.setAngle(this.wheelAngle);
  }

  private releaseWheel(pointer: Phaser.Input.Pointer): void {
    if (!this.drag || this.drag.pointer !== pointer.id) {
      return;
    }
    this.dragWheel(pointer);
    const gesture = this.drag;
    this.drag = null;
    if (Math.abs(gesture.total) >= 45) {
      this.spin(5 + Math.min(3, Math.floor(Math.abs(gesture.total) / 100)));
    } else {
      this.wheelAngle = gesture.start;
      this.cursor = gesture.sector;
      this.result = "";
      this.getUi().playSelect();
      this.draw();
    }
  }

  private playCard(): boolean {
    const profile = loadFracturaProfile();
    if (profile.casinoTokens < 1) {
      this.result = "Sin fichas. Las ganas en eventos y cada 10 oleadas.";
      this.draw();
      return false;
    }
    profile.casinoTokens--;
    profile.casinoPlays++;
    if (casinoWon(this.cursor === 0 ? "sun" : "moon", randInt(10000) / 10000)) {
      const item = ITEMS[randInt(ITEMS.length)];
      profile.casinoTokens += 2;
      profile.inventory[item]++;
      this.result = `¡Acertaste! +2 fichas y ${CONSUMABLES[item].short}.`;
    } else {
      this.result = "Salió el otro símbolo. Perdiste 1 ficha.";
    }
    saveFracturaProfile(profile);
    this.persist();
    this.draw();
    return true;
  }

  private useItem(): boolean {
    const profile = loadFracturaProfile();
    const id = ITEMS[this.cursor];
    if (!this.hasRun()) {
      this.result = "Inicia o continúa una partida clásica para usarlo.";
      this.draw();
      return false;
    }
    if (globalScene.phaseManager.getCurrentPhase().phaseName !== "CommandPhase") {
      this.result = "Úsalo cuando aparezca el menú de combate, antes de elegir un ataque.";
      this.draw();
      return false;
    }
    if (profile.inventory[id] < 1) {
      this.result = "No tienes este objeto. Consigues más en eventos y casino.";
      this.draw();
      return false;
    }
    const state = loadFracturaStoryState();
    const wave = globalScene.currentBattle.waveIndex;
    if (id === "tonic") {
      const party = globalScene.getPlayerParty().filter(p => !p.isFainted());
      if (!party.some(p => p.hp < p.getMaxHp() || p.getMoveset().some(m => m && m.ppUsed > 0))) {
        this.result = "El equipo no necesita curación ni PP. Conservas el tónico.";
        this.draw();
        return false;
      }
      party.forEach(p => {
        p.heal(Math.max(1, Math.floor(p.getMaxHp() * 0.25)));
        p.getMoveset().forEach(m => {
          if (m) {
            m.ppUsed = Math.max(0, m.ppUsed - 2);
          }
        });
        void p.updateInfo(true);
      });
      this.result = "Tónico usado: +25% PS y +2 PP por movimiento.";
    } else if (id === "lure") {
      state.lureUntil = Math.max(wave, state.lureUntil) + 5;
      this.result = `Señuelo activo para nuevos encuentros hasta oleada ${state.lureUntil}.`;
    } else if (id === "shield") {
      state.shieldUntil = Math.max(wave - 1, state.shieldUntil) + 3;
      this.result = `Sello: daño recibido −15% hasta oleada ${state.shieldUntil}.`;
    } else if (id === "remedy") {
      const party = globalScene.getPlayerParty().filter(p => !p.isFainted() && !!p.status);
      if (party.length === 0) {
        this.result = "El equipo no tiene estados alterados. Conservas el Remedio.";
        this.draw();
        return false;
      }
      party.forEach(p => {
        p.resetStatus(true, false, false, false);
        void p.updateInfo(true);
      });
      this.result = "Remedio usado: estados alterados curados. No revive Pokémon.";
    } else if (id === "ether") {
      const party = globalScene.getPlayerParty().filter(p => !p.isFainted());
      if (!party.some(p => p.getMoveset().some(m => m && m.ppUsed > 0))) {
        this.result = "El equipo tiene todos sus PP. Conservas la Reserva.";
        this.draw();
        return false;
      }
      party.forEach(p => {
        p.getMoveset().forEach(m => {
          if (m) {
            m.ppUsed = Math.max(0, m.ppUsed - 4);
          }
        });
        void p.updateInfo(true);
      });
      this.result = "Reserva usada: +4 PP por movimiento del equipo consciente.";
    } else {
      const builds: BuildId[] = ["critical", "rain", "recovery"];
      state.build = builds[(builds.indexOf(state.build ?? "recovery") + 1) % builds.length];
      this.result = `Especialidad cambiada: ${BUILD_LABELS[state.build]}. Lluvia empieza en el próximo combate.`;
    }
    profile.inventory[id]--;
    saveFracturaProfile(profile);
    saveFracturaStoryState(state);
    this.persist();
    this.draw();
    return true;
  }

  private cyclePalette(): boolean {
    if (this.spinning) {
      return false;
    }
    const profile = loadFracturaProfile();
    profile.selectedPalette =
      profile.rivalPalettes[
        (profile.rivalPalettes.indexOf(profile.selectedPalette) + 1) % profile.rivalPalettes.length
      ];
    saveFracturaProfile(profile);
    this.result = "";
    this.persist();
    this.draw();
    return true;
  }

  private craft(): boolean {
    const profile = loadFracturaProfile();
    const recipe = RECIPES[this.cursor];
    const result = craftConsumable(profile, recipe.id);
    this.result =
      result === "made"
        ? "Fabricaste " + CONSUMABLES[recipe.id].short + ". Se guardó en la Mochila."
        : result === "coins"
          ? "Necesitas " + recipeCost(profile, recipe.id) + " fichas para esta receta."
          : "No hay espacio para más unidades de este objeto.";
    if (result === "made") {
      saveFracturaProfile(profile);
      this.persist();
    }
    this.draw();
    return result === "made";
  }
  private action(): boolean {
    if (this.tab === 0) {
      return this.spin();
    }
    if (this.tab === 1) {
      return this.playCard();
    }
    if (this.tab === 2) {
      return this.useItem();
    }
    if (this.tab === 3) {
      return this.craft();
    }
    if (this.tab === 4) {
      return this.cyclePalette();
    }
    return this.setCursor(this.cursor + 1);
  }
  private back(): boolean {
    if (this.spinning) {
      return false;
    }
    this.getUi().revertMode();
    return true;
  }
  public override processInput(button: Button): boolean {
    if (!this.active || this.spinning) {
      return false;
    }
    if (button === Button.LEFT) {
      return this.changeTab(this.tab - 1);
    }
    if (button === Button.RIGHT) {
      return this.changeTab(this.tab + 1);
    }
    if (button === Button.UP) {
      return this.setCursor(this.cursor - 1);
    }
    if (button === Button.DOWN) {
      return this.setCursor(this.cursor + 1);
    }
    if (button === Button.ACTION || button === Button.SUBMIT) {
      return this.action();
    }
    if (button === Button.CANCEL) {
      return this.back();
    }
    return false;
  }
  public override clear(): void {
    super.clear();
    this.container.setVisible(false);
    this.drag = null;
    this.tween?.remove();
    this.spinning = false;
  }
  public override destroy(): void {
    this.tween?.stop();
    globalScene.input.off("pointermove", this.onPointerMove);
    globalScene.input.off("pointerup", this.onPointerUp);
    this.container?.destroy();
  }
}
