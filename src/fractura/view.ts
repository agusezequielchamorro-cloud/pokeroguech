import { ensureFracturaFrames, FRACTURA_ENVIRONMENTS, FRACTURA_RIVALS } from "./assets";
import { ROULETTE_REWARDS } from "./profile";

const INK = 0x101724;
const GOLD = 0xdab571;
const WHITE = "#f5efe3";
const MUTED = "#b9c4cf";

/** Fractura uses display-space coordinates throughout, without the base game's 1/6 text scale. */
export function uiText(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  x: number,
  y: number,
  text: string,
  size = 8,
  color = WHITE,
  width?: number,
): Phaser.GameObjects.Text {
  const object = scene.add
    .text(x, y, text, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${size}px`,
      color,
      lineSpacing: 2,
      ...(width === undefined ? {} : { wordWrap: { width, useAdvancedWrap: true } }),
    })
    .setResolution(6)
    .setOrigin(0);
  root.add(object);
  return object;
}

export function panel(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = INK,
  border = 0x536170,
  alpha = 1,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, 3);
  g.lineStyle(0.7, border, 0.9).strokeRoundedRect(x, y, w, h, 3);
  root.add(g);
  return g;
}

export function uiButton(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  selected = false,
): void {
  panel(scene, root, x, y, w, h, selected ? 0x3a3330 : 0x1b2839, selected ? GOLD : 0x68798b);
  const text = uiText(scene, root, x + w / 2, y + h / 2, label, 8, selected ? "#ffe1a0" : WHITE).setOrigin(0.5);
  if (text.width > w - 8) {
    text.setFontSize(7);
  }
  const hit = scene.add.rectangle(x, y, w, h, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
  hit.on("pointerdown", onClick);
  root.add(hit);
}

export function art(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  key: string,
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
): Phaser.GameObjects.Image | null {
  ensureFracturaFrames(scene);
  if (!scene.textures.exists(key)) {
    return null;
  }
  const image = scene.add.image(x, y, key, `${frame}`).setOrigin(0).setDisplaySize(w, h).setAlpha(alpha);
  root.add(image);
  return image;
}

export function shell(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  w: number,
  h: number,
  title: string,
  subtitle: string,
  environment = 0,
): void {
  root.removeAll(true);
  const bg = scene.add.rectangle(0, 0, w, h, INK).setOrigin(0);
  root.add(bg);
  art(scene, root, FRACTURA_ENVIRONMENTS, environment, 0, 0, w, h, 0.28);
  panel(scene, root, 0, 0, w, 24, 0x0c1420, GOLD, 0.96);
  uiText(scene, root, 9, 2, title, 10, "#f3d393").setFontStyle("bold");
  uiText(scene, root, 9, 17, subtitle, 6, MUTED);
}

export interface RouteCard {
  label: string;
  description: string;
  tag: string;
  color: number;
  environment: number;
}
export interface RouteViewModel {
  title: string;
  subtitle: string;
  options: RouteCard[];
  selected: number;
  history: string;
  onSelect: (index: number) => void;
  onConfirm: () => void;
}

export function drawRouteView(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  w: number,
  h: number,
  model: RouteViewModel,
): void {
  shell(scene, root, w, h, "CAMINOS DE FRACTURA", model.subtitle, 0);
  const start = Math.floor(model.selected / 3) * 3;
  const options = model.options.slice(start, start + 3);
  uiText(scene, root, 9, 29, model.title, 8);
  const path = scene.add.graphics().lineStyle(1, GOLD, 0.8);
  root.add(path);
  path.lineBetween(w / 2, 40, w / 2, 44);
  const gap = 7;
  const cw = (w - 18 - gap * (options.length - 1)) / options.length;
  options.forEach((option, i) => {
    const x = 9 + i * (cw + gap);
    const selected = start + i === model.selected;
    path.lineBetween(w / 2, 40, x + cw / 2, 45);
    panel(scene, root, x, 45, cw, 60, selected ? 0x283440 : 0x131d2c, selected ? GOLD : option.color);
    art(scene, root, FRACTURA_ENVIRONMENTS, option.environment, x + 2, 47, cw - 4, 31, 0.94);
    const label = uiText(scene, root, x + 5, 81, option.label, options.length === 3 ? 8 : 9, WHITE);
    while (label.width > cw - 10 && Number.parseInt(label.style.fontSize as string) > 6) {
      label.setFontSize(Number.parseInt(label.style.fontSize as string) - 1);
    }
    uiText(scene, root, x + 5, 94, option.tag, 6, selected ? "#ffe1a0" : "#cbd7e3");
    const hit = scene.add.rectangle(x, 45, cw, 60, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => model.onSelect(start + i));
    root.add(hit);
  });
  const option = model.options[model.selected];
  panel(scene, root, 9, 111, w - 18, 37, 0x101a29, GOLD);
  uiText(scene, root, 15, 114, option.label, 8, "#f3d393").setFontStyle("bold");
  uiText(scene, root, 15, 128, option.description, 7, WHITE, w - 30);
  uiText(scene, root, 9, 153, model.history || "Tocá un camino para leerlo.", 6, MUTED, 134);
  uiButton(scene, root, w / 2 - 5, h - 26, 104, 20, "CONFIRMAR RUTA  ·  A", model.onConfirm, true);
  if (model.options.length > 3) {
    uiText(scene, root, w - 48, 29, `${Math.floor(start / 3) + 1}/${Math.ceil(model.options.length / 3)}`, 7);
  }
}

export interface StoryViewModel {
  title: string;
  subtitle: string;
  speaker: string;
  portrait: number;
  environment: number;
  text: string;
  pageLabel: string;
  choices: { label: string; hint: string }[];
  selected: number;
  onSelect: (index: number) => void;
  onContinue: () => void;
  onConfirm: () => void;
}

export function drawStoryView(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  w: number,
  h: number,
  model: StoryViewModel,
): Phaser.GameObjects.Image | null {
  shell(scene, root, w, h, model.title, model.subtitle, model.environment);
  panel(scene, root, 7, 31, 89, h - 38, 0x182234, GOLD);
  const portrait = art(scene, root, FRACTURA_RIVALS, model.portrait, 9, 33, 85, 88);
  uiText(scene, root, 13, 127, model.speaker, 10, "#f3d393").setFontStyle("bold");
  uiText(scene, root, 13, 142, model.pageLabel, 7, MUTED, 79);
  panel(scene, root, 102, 31, w - 110, model.choices.length > 0 ? 52 : 112, 0x111b2c, 0x8193a7, 0.96);
  uiText(scene, root, 109, 37, model.text, 8, WHITE, w - 124);
  if (model.choices.length > 0) {
    model.choices.forEach((choice, i) => {
      const y = 89 + i * 21;
      uiButton(scene, root, 102, y, w - 110, 19, choice.label, () => model.onSelect(i), i === model.selected);
    });
    const hint = model.choices[model.selected]?.hint ?? "";
    uiText(scene, root, 103, h - 24, hint, 6, "#d8cfb9", w - 190);
    uiButton(scene, root, w - 85, h - 24, 77, 18, "ELEGIR  ·  A", model.onConfirm, true);
  } else {
    uiButton(scene, root, 172, h - 27, w - 180, 20, "CONTINUAR  ·  A", model.onContinue, true);
  }
  return portrait;
}

export interface CasinoViewModel {
  tab: number;
  selected: number;
  vouchers: number;
  tokens: number;
  result: string;
  inventory: { name: string; count: number; detail: string }[];
  relationshipTitle: string;
  rivalFrame: number;
  relationshipLines: string[];
  palette: string;
  onTab: (tab: number) => void;
  onSelect: (index: number) => void;
  onAction: (index?: number) => void;
  onPalette: () => void;
  onBack: () => void;
}

export function drawCasinoView(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  w: number,
  h: number,
  model: CasinoViewModel,
): Phaser.GameObjects.Container | null {
  shell(scene, root, w, h, "CASINO FRACTURA", "Solo recursos del juego · Sin dinero real", 3);
  uiText(scene, root, w - 110, 6, `V: ${model.vouchers}   Fichas: ${model.tokens}`, 7, "#f3d393");
  ["Ruleta", "Sol / Luna", "Mochila", "Vínculo"].forEach((tab, i) =>
    uiButton(scene, root, 7 + i * ((w - 14) / 4), 28, (w - 14) / 4 - 3, 17, tab, () => model.onTab(i), i === model.tab),
  );
  let wheel: Phaser.GameObjects.Container | null = null;
  if (model.tab === 0) {
    wheel = scene.add.container(55, 91);
    root.add(wheel);
    const g = scene.add.graphics();
    const colors = [0x4b698b, 0x725b99, 0xad7657, 0x4c9187, 0x748ead, 0x925c8f, 0xb6984d, 0x64a078, 0x8c9ca9, 0x8e645e];
    wheel.add(g);
    ROULETTE_REWARDS.forEach((_reward, i) => {
      const a = (i * Math.PI * 2) / 10 - Math.PI / 2;
      const mid = a + Math.PI / 10;
      g.fillStyle(colors[i])
        .slice(0, 0, 39, a, a + (Math.PI * 2) / 10)
        .fillPath();
      g.lineStyle(0.6, GOLD, 1).lineBetween(0, 0, Math.cos(a) * 39, Math.sin(a) * 39);
      const number = uiText(scene, wheel!, Math.cos(mid) * 27, Math.sin(mid) * 27, `${i + 1}`, 8).setOrigin(0.5);
      number.setFontStyle("bold");
    });
    g.lineStyle(1.5, GOLD).strokeCircle(0, 0, 39).fillStyle(GOLD).fillCircle(0, 0, 4);
    const arrow = scene.add.triangle(55, 48, 0, 0, 8, 0, 4, 7, GOLD).setOrigin(0.5, 0);
    root.add(arrow);
    ROULETTE_REWARDS.forEach((reward, i) => {
      const y = 49 + i * 8;
      if (model.selected === i) {
        panel(scene, root, 104, y - 1, w - 112, 8, 0x473c31, GOLD);
      }
      uiText(scene, root, 109, y, `${i + 1}. ${reward.label}`, 6, WHITE);
      uiText(scene, root, w - 28, y, "10%", 6, "#e7c889");
      const hit = scene.add
        .rectangle(104, y - 1, w - 112, 8, 0, 0)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => model.onSelect(i));
      root.add(hit);
    });
    if (!model.result) {
      uiText(scene, root, 9, 134, ROULETTE_REWARDS[model.selected].detail, 6, WHITE, w - 18);
    }
    uiButton(scene, root, 123, h - 18, 96, 16, "GIRAR  ·  1 Voucher", () => model.onAction(), true);
  } else if (model.tab === 1) {
    panel(scene, root, 9, 51, w - 18, 61, 0x201f31, GOLD, 0.95);
    uiText(scene, root, 17, 58, "Elegí el símbolo de la próxima carta", 10, "#f3d393");
    uiText(
      scene,
      root,
      17,
      77,
      "Apuesta: 1 ficha. Cada símbolo tiene 50% de probabilidad.\nAcierto: 2 fichas + 1 consumible. Fallo: perdés la apuesta.",
      8,
      WHITE,
      w - 34,
    );
    uiButton(scene, root, 55, 118, 93, 20, "SOL", () => model.onSelect(0), model.selected === 0);
    uiButton(scene, root, 158, 118, 93, 20, "LUNA", () => model.onSelect(1), model.selected === 1);
    uiButton(scene, root, 120, h - 18, 99, 16, "REVELAR  ·  A", () => model.onAction(), true);
  } else if (model.tab === 2) {
    model.inventory.forEach((item, i) => {
      uiButton(
        scene,
        root,
        9,
        52 + i * 22,
        95,
        19,
        `${item.name} ×${item.count}`,
        () => model.onSelect(i),
        model.selected === i,
      );
    });
    panel(scene, root, 111, 52, w - 120, 89, 0x172438, GOLD);
    uiText(scene, root, 118, 59, model.inventory[model.selected].name, 10, "#f3d393");
    uiText(scene, root, 118, 77, model.inventory[model.selected].detail, 8, WHITE, w - 134);
    uiButton(scene, root, 122, h - 18, 100, 16, "USAR  ·  A", () => model.onAction(), true);
  } else {
    art(scene, root, FRACTURA_RIVALS, model.rivalFrame, 9, 51, 83, 86);
    uiText(scene, root, 103, 53, model.relationshipTitle, 10, "#f3d393").setFontStyle("bold");
    uiText(scene, root, 103, 70, model.relationshipLines.join("\n"), 7, WHITE, w - 114);
    uiButton(scene, root, 9, 143, 87, 18, model.palette, model.onPalette);
    uiText(
      scene,
      root,
      104,
      143,
      "La paleta cambia el color del sprite de combate.\nLos retratos son propios de cada personaje.",
      6,
      MUTED,
      w - 115,
    );
  }
  uiButton(scene, root, 9, h - 18, 69, 16, "VOLVER  ·  B", model.onBack);
  if (model.result) {
    const y = model.tab === 0 ? 132 : 143;
    panel(scene, root, 9, y, w - 18, model.tab === 0 ? 28 : 17, 0x192435, GOLD);
    uiText(scene, root, 15, y + 3, model.result, model.tab === 0 ? 7 : 6, "#ffe1a0", w - 30);
  }
  return wheel;
}
