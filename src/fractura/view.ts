import {
  ensureFracturaFrames,
  FRACTURA_ARENAS,
  FRACTURA_ENVIRONMENTS,
  FRACTURA_PORTRAITS,
  FRACTURA_RIVALS,
} from "./assets";
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
  scenery?: readonly [number, number] | undefined;
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
    art(
      scene,
      root,
      option.scenery ? FRACTURA_ARENAS[option.scenery[0]] : FRACTURA_ENVIRONMENTS,
      option.scenery?.[1] ?? option.environment,
      x + 2,
      47,
      cw - 4,
      31,
      0.94,
    );
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
  uiText(scene, root, 9, 153, model.history || "Toca un camino para leerlo.", 6, MUTED, 134);
  uiButton(scene, root, w / 2 - 5, h - 26, 104, 20, "CONFIRMAR RUTA  ·  A", model.onConfirm, true);
  if (model.options.length > 3) {
    uiText(scene, root, w - 48, 29, `${Math.floor(start / 3) + 1}/${Math.ceil(model.options.length / 3)}`, 7);
  }
}

export const DIALOGUE_FONT_SIZE = 8.5;
export const dialogueWidth = (width: number): number => width - 62;

export interface StoryViewModel {
  title: string;
  subtitle: string;
  speaker: string;
  portrait: number;
  speakerKind?: "rival" | "player" | "narrator";
  environment: number;
  text: string;
  pageLabel: string;
  choices: { label: string; hint: string }[];
  selected: number;
  canPrevious?: boolean;
  onPrevious?: () => void;
  onSelect: (index: number) => void;
  onContinue: () => void;
  onConfirm: () => void;
}
function portraitArt(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  frame: number,
  x: number,
  y: number,
  side: number,
) {
  ensureFracturaFrames(scene);
  return art(
    scene,
    root,
    scene.textures.exists(FRACTURA_PORTRAITS) ? FRACTURA_PORTRAITS : FRACTURA_RIVALS,
    frame,
    x,
    y,
    side,
    side,
  );
}
export function drawStoryView(
  scene: Phaser.Scene,
  root: Phaser.GameObjects.Container,
  w: number,
  h: number,
  model: StoryViewModel,
): Phaser.GameObjects.Image | null {
  root.removeAll(true);
  panel(scene, root, 8, 5, 212, 26, 0x0c1420, GOLD);
  const title = uiText(scene, root, 16, 7, model.title, 8.5, "#f3d393").setFontStyle("bold");
  while (title.width > 196 && Number.parseFloat(title.style.fontSize as string) > 7) {
    title.setFontSize(Number.parseFloat(title.style.fontSize as string) - 0.5);
  }
  uiText(scene, root, 16, 22, model.subtitle, 6, MUTED);
  let portrait: Phaser.GameObjects.Image | null = null;
  if (model.choices.length > 0) {
    panel(scene, root, 9, 35, 210, 45, 0x101b2c, GOLD);
    uiText(scene, root, 17, 39, model.speaker, 8, "#f3d393").setFontStyle("bold");
    const prompt = uiText(scene, root, 17, 52, model.text, 7.5, WHITE, 193);
    while (prompt.height > 26 && Number.parseFloat(prompt.style.fontSize as string) > 6.5) {
      prompt.setFontSize(Number.parseFloat(prompt.style.fontSize as string) - 0.5);
    }
    model.choices.forEach((choice, i) => {
      const y = 85 + i * 25;
      const selected = i === model.selected;
      panel(scene, root, 9, y, 210, 23, selected ? 0x3a3330 : 0x142238, selected ? GOLD : 0x68798b);
      const dot = scene.add.circle(17, y + 8, 2, selected ? GOLD : 0x536170);
      root.add(dot);
      const label = uiText(scene, root, 25, y + 2, choice.label, 7.5, WHITE);
      while (label.width > 185 && Number.parseFloat(label.style.fontSize as string) > 6.5) {
        label.setFontSize(Number.parseFloat(label.style.fontSize as string) - 0.5);
      }
      const hint = uiText(scene, root, 25, y + 15, choice.hint, 5.8, "#e7d3ab");
      while (hint.width > 185 && Number.parseFloat(hint.style.fontSize as string) > 5) {
        hint.setFontSize(Number.parseFloat(hint.style.fontSize as string) - 0.2);
      }
      const hit = scene.add.rectangle(9, y, 210, 23, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => model.onSelect(i));
      root.add(hit);
    });
    uiText(scene, root, 16, h - 13, "B: volver al diálogo", 6, MUTED);
    uiButton(scene, root, 121, h - 17, 97, 14, "RESPONDER · A", model.onConfirm, true);
  } else {
    panel(scene, root, 8, h - 80, w - 16, 74, 0x101b2c, GOLD);
    uiText(scene, root, 16, h - 76, model.speaker, 8.5, "#f3d393").setFontStyle("bold");
    uiText(scene, root, 16, h - 61, model.text, DIALOGUE_FONT_SIZE, WHITE, dialogueWidth(w)).setName(
      "fractura-dialogue-text",
    );
    if (!model.speakerKind || model.speakerKind === "rival") {
      portrait = portraitArt(scene, root, model.portrait, w - 38, h - 75, 23);
    }
    uiText(scene, root, 16, h - 19, model.pageLabel, 6.2, MUTED);
    if (model.canPrevious && model.onPrevious) {
      uiButton(scene, root, 133, h - 19, 30, 13, "B: ←", model.onPrevious);
    }
    uiButton(scene, root, 174, h - 19, 93, 13, "CONTINUAR · A", model.onContinue, true);
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
  recipes?: { name: string; cost: number; detail: string }[];
  forge?: {
    title: string;
    subtitle: string;
    balance: number;
    rows: { name: string; detail: string }[];
    cost: number | null;
    action: string;
    backEnabled?: boolean;
  };
  synergies?: { name: string; count: number; active: boolean; detail: string }[];
  journalPages?: { title: string; subtitle: string; body: string }[];
  relationshipTitle: string;
  rivalFrame: number;
  relationshipLines: string[];
  palette: string;
  wheelAngle?: number;
  onWheelDown?: (pointer: Phaser.Input.Pointer) => void;
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
  shell(
    scene,
    root,
    w,
    h,
    "REFUGIO FRACTURA · 5",
    model.tab === 0
      ? "Desliza la rueda · Toca para consultar · Premios: 10%"
      : "Solo recursos del juego · Sin dinero real",
    3,
  );
  uiText(scene, root, w - 110, 6, `V: ${model.vouchers}   Fichas: ${model.tokens}`, 7, "#f3d393");
  ["Ruleta", "Azar", "Mochila", "Taller", "Vínculo", "Diario", "Forja", "Equipo"].forEach((tab, i) =>
    uiButton(scene, root, 7 + i * ((w - 14) / 8), 28, (w - 14) / 8 - 3, 17, tab, () => model.onTab(i), i === model.tab),
  );
  let wheel: Phaser.GameObjects.Container | null = null;
  if (model.tab === 0) {
    wheel = scene.add.container(55, 91).setAngle(model.wheelAngle ?? 0);
    root.add(wheel);
    const g = scene.add.graphics();
    const colors = [0x4b698b, 0x725b99, 0xad7657, 0x4c9187, 0x748ead, 0x925c8f, 0xb6984d, 0x64a078, 0x8c9ca9, 0x8e645e];
    wheel.add(g);
    ROULETTE_REWARDS.forEach((_reward, i) => {
      const a = (i * Math.PI * 2) / 10 - Math.PI / 2;
      const mid = a + Math.PI / 10;
      g.fillStyle(model.selected === i ? 0xd2ad64 : colors[i])
        .slice(0, 0, 39, a, a + (Math.PI * 2) / 10)
        .fillPath();
      g.lineStyle(0.6, GOLD, 1).lineBetween(0, 0, Math.cos(a) * 39, Math.sin(a) * 39);
      const number = uiText(scene, wheel!, Math.cos(mid) * 27, Math.sin(mid) * 27, `${i + 1}`, 8).setOrigin(0.5);
      number.setFontStyle("bold");
    });
    g.lineStyle(1.5, GOLD).strokeCircle(0, 0, 39).fillStyle(GOLD).fillCircle(0, 0, 4);
    const arrow = scene.add.triangle(55, 48, 0, 0, 8, 0, 4, 7, GOLD).setOrigin(0.5, 0);
    root.add(arrow);
    const wheelHit = scene.add.rectangle(0, 0, 82, 82, 0, 0).setInteractive({ useHandCursor: true });
    wheelHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => model.onWheelDown?.(pointer));
    wheel.add(wheelHit);
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
    uiText(scene, root, 17, 58, "Elige el símbolo de la próxima carta", 10, "#f3d393");
    uiText(
      scene,
      root,
      17,
      77,
      "Apuesta: 1 ficha. Cada símbolo tiene 50% de probabilidad.\nAcierto: 2 fichas + 1 consumible. Fallo: pierdes la apuesta.",
      8,
      WHITE,
      w - 34,
    );
    uiButton(scene, root, 55, 118, 93, 20, "SOL", () => model.onSelect(0), model.selected === 0);
    uiButton(scene, root, 158, 118, 93, 20, "LUNA", () => model.onSelect(1), model.selected === 1);
    uiButton(scene, root, 120, h - 18, 99, 16, "REVELAR  ·  A", () => model.onAction(), true);
  } else if (model.tab === 2 || model.tab === 3) {
    const workshop = model.tab === 3;
    const rows = workshop ? (model.recipes ?? []) : model.inventory;
    rows.forEach((item, i) => {
      const quantity = workshop ? "" : " ×" + model.inventory[i].count;
      uiButton(
        scene,
        root,
        9,
        52 + i * 15,
        97,
        13,
        item.name + quantity,
        () => model.onSelect(i),
        model.selected === i,
      );
    });
    const selected = rows[model.selected];
    panel(scene, root, 113, 52, w - 122, 89, 0x172438, GOLD);
    uiText(scene, root, 121, 59, selected?.name ?? "", 9, "#f3d393");
    uiText(scene, root, 121, 76, selected?.detail ?? "", 7.5, WHITE, w - 138);
    if (workshop) {
      uiText(scene, root, 121, 130, "Costo: " + (model.recipes?.[model.selected]?.cost ?? 0) + " fichas", 6, MUTED);
    }
    uiButton(scene, root, 122, h - 18, 100, 16, workshop ? "FABRICAR · A" : "USAR · A", () => model.onAction(), true);
  } else if (model.tab === 4) {
    portraitArt(scene, root, model.rivalFrame, 9, 51, 79);
    const name = uiText(scene, root, 103, 53, model.relationshipTitle, 9, "#f3d393").setFontStyle("bold");
    while (name.width > w - 114 && Number.parseFloat(name.style.fontSize as string) > 7) {
      name.setFontSize(Number.parseFloat(name.style.fontSize as string) - 0.5);
    }
    uiText(scene, root, 103, 70, model.relationshipLines.join("\n"), 7, WHITE, w - 114);
    if (!model.result) {
      uiButton(scene, root, 9, 143, 87, 15, model.palette, model.onPalette);
      uiText(
        scene,
        root,
        104,
        143,
        "El rival conserva su identidad.\nToca la paleta para cambiar su color.",
        6,
        MUTED,
        w - 115,
      );
    }
  } else if (model.tab === 6 || model.tab === 7) {
    const forge = model.tab === 6;
    const rows = forge
      ? (model.forge?.rows ?? [])
      : (model.synergies ?? []).map(s => ({
          name: s.name + " " + s.count + "/3",
          detail: (s.active ? "ACTIVA. " : "Necesitas " + Math.max(0, 3 - s.count) + " más. ") + s.detail,
        }));
    rows.forEach((row, i) => {
      const label = row.name.length > 22 ? row.name.slice(0, 20) + "…" : row.name;
      uiButton(scene, root, 9, 52 + i * 15, 97, 13, label, () => model.onSelect(i), model.selected === i);
    });
    panel(scene, root, 113, 52, w - 122, 89, 0x172438, GOLD);
    const title = uiText(
      scene,
      root,
      121,
      57,
      forge ? (model.forge?.title ?? "Forja de movimientos") : (rows[model.selected]?.name ?? "Equipo"),
      8,
      "#f3d393",
    );
    while (title.width > w - 138 && Number.parseFloat(title.style.fontSize as string) > 6) {
      title.setFontSize(Number.parseFloat(title.style.fontSize as string) - 0.5);
    }
    uiText(
      scene,
      root,
      121,
      70,
      forge ? (model.forge?.subtitle ?? "") : "Cuenta Pokémon conscientes de todo el equipo.",
      6,
      MUTED,
      w - 138,
    );
    uiText(
      scene,
      root,
      121,
      88,
      rows[model.selected]?.detail ?? "Inicia una partida clásica para usar este sistema.",
      7,
      WHITE,
      w - 138,
    );
    if (forge) {
      const cost = model.forge?.cost;
      uiText(
        scene,
        root,
        121,
        130,
        "Fragmentos: " + (model.forge?.balance ?? 0) + (cost == null ? "" : " · Costo: " + cost),
        6,
        MUTED,
      );
      uiButton(scene, root, 123, h - 18, 105, 16, model.forge?.action ?? "CONTINUAR · A", () => model.onAction(), true);
      if (!model.result && model.forge?.backEnabled) {
        uiButton(scene, root, 233, h - 18, 78, 16, "← PASO", model.onPalette);
      }
    } else {
      uiButton(scene, root, 123, h - 18, 105, 16, "SIGUIENTE · A", () => model.onAction());
    }
  } else {
    const pages = model.journalPages ?? [
      {
        title: "Diario de expedición",
        subtitle: "Sin expedición activa",
        body: "Inicia una partida clásica para registrar sus decisiones.",
      },
    ];
    const page = pages[model.selected] ?? pages[0];
    panel(scene, root, 9, 51, w - 18, 108, 0x172438, GOLD);
    const title = uiText(scene, root, 18, 58, page.title, 9, "#f3d393").setFontStyle("bold");
    while (title.width > w - 36 && Number.parseFloat(title.style.fontSize as string) > 7) {
      title.setFontSize(Number.parseFloat(title.style.fontSize as string) - 0.5);
    }
    uiText(scene, root, 18, 73, page.subtitle, 6, MUTED);
    uiText(scene, root, 18, 86, page.body, 8, WHITE, w - 37);
    uiText(scene, root, 244, 146, model.selected + 1 + "/" + pages.length, 6, MUTED);
    uiButton(scene, root, 115, h - 18, 55, 16, "← ANTERIOR", () =>
      model.onSelect((model.selected + pages.length - 1) % pages.length),
    );
    uiButton(scene, root, 180, h - 18, 55, 16, "SIGUIENTE →", () =>
      model.onSelect((model.selected + 1) % pages.length),
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
