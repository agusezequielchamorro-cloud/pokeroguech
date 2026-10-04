import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const canvasPackage = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "@napi-rs/canvas")
  : "@napi-rs/canvas";
const { createCanvas, GlobalFonts } = require(canvasPackage);
GlobalFonts.registerFromPath("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "Arial");
GlobalFonts.registerFromPath("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "Arial Bold");
const out = path.resolve("qa/check");
fs.mkdirSync(out, { recursive: true });
for (const name of [
  "run-state",
  "profile",
  "chapters",
  "dialogue",
  "encounters",
  "view",
  "quests",
  "journal",
  "crafting",
  "forging",
  "synergies",
]) {
  const source = fs.readFileSync(`src/fractura/${name}.ts`, "utf8");
  const js = ts
    .transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } })
    .outputText.replace(/from "\.\/(\w[\w-]*)"/g, 'from "./$1.mjs"');
  fs.writeFileSync(path.join(out, `${name}.mjs`), js);
}
const { images, frames, textureScene } = await import("./validate-sprites.mjs");
const run = await import(path.join(out, "run-state.mjs"));
const profile = await import(path.join(out, "profile.mjs"));
const chapters = await import(path.join(out, "chapters.mjs"));
const dialogue = await import(path.join(out, "dialogue.mjs"));
const encounters = await import(path.join(out, "encounters.mjs"));
const forging = await import(path.join(out, "forging.mjs"));
const synergies = await import(path.join(out, "synergies.mjs"));
const view = await import(path.join(out, "view.mjs"));
let checks = 0;
const check = (value, info) => {
  assert.ok(value, info);
  checks++;
};
const combos = new Set();
for (let i = 0; i < 120; i++) {
  const a = run.createFracturaRun(`run-${i}`);
  const b = run.normalizeFracturaRun(JSON.parse(JSON.stringify(a)), `run-${i}`);
  assert.deepEqual(a, b);
  checks++;
  combos.add(`${a.rivalId}:${a.storyId}`);
}
check(combos.size === 12, "The seeded pool covers all four rivals and three story families");
const old = run.normalizeFracturaRun(
  {
    build: "rain",
    relic: "ward",
    flags: { rivalRomance: true, campHelped: true },
    completedEvents: ["camp-before-the-lab"],
  },
  "old-run",
);
check(
  old.build === "rain" && old.relic === "ward" && old.relationship.romance && old.flags.campHelped,
  "v1 saves migrate without losing decisions/build/relic",
);
const bad = run.normalizeFracturaRun(
  {
    rivalId: "missing",
    storyId: "missing",
    relationship: { trust: -10, affection: Number.POSITIVE_INFINITY, rivalry: 500 },
    routeHistory: [null],
    completedEvents: ["x", "x", 3],
  },
  "safe",
);
check(
  bad.relationship.trust === 0
    && bad.relationship.affection === 0
    && bad.relationship.rivalry === 100
    && bad.completedEvents.length === 1,
  "corrupted values bounded",
);
run.changeRelationship(old, 999, 999, -999);
check(
  old.relationship.trust === 100 && old.relationship.affection === 100 && old.relationship.rivalry === 0,
  "relationship bounds",
);
check(run.relationshipLabel(old) === "Romance", "opted-in romance has earned trust/affection");
old.relationship.romance = false;
old.flags.rivalRomance = false;
check(run.relationshipLabel(old) === "Alianza", "affection alone never forces romance");
for (const storyId of ["umbral", "invasion", "eclipse"]) {
  for (const wave of chapters.FRACTURA_EVENT_WAVES) {
    const state = run.createFracturaRun(storyId);
    state.storyId = storyId;
    const event = chapters.getFracturaChapter(wave, state);
    check(event?.choices.length === 3, `${storyId}:${wave} has a playable chapter`);
    for (const choice of event.choices) {
      const next = structuredClone(state);
      choice.apply(next);
      check(typeof next.relationship.trust === "number", `${storyId}:${wave} choice valid`);
    }
  }
}
const hostile = run.createFracturaRun("hostile");
chapters.getFracturaChapter(1, hostile).choices[2].apply(hostile);
chapters.getFracturaChapter(8, hostile).choices[2].apply(hostile);
check(
  hostile.relationship.rivalry >= 55 && run.relationshipLabel(hostile) === "Enemistad",
  "hostility path reaches combat consequence",
);
const sectors = new Array(10).fill(0);
for (let i = 0; i < 1000; i++) {
  sectors[profile.rouletteIndex(i / 1000)]++;
}
check(
  sectors.every(v => v === 100),
  "roulette sectors exactly 10%",
);
let wins = 0;
for (let i = 0; i < 1000; i++) {
  if (profile.casinoWon("sun", i / 1000)) {
    wins++;
  }
}
check(wins === 500, "Sol/Luna has 50% odds");
const migrated = profile.normalizeFracturaProfile({
  compass: true,
  rivalPalettes: ["original", "indigo", "indigo", "bad"],
  selectedPalette: "indigo",
});
check(
  migrated.compass && migrated.rivalPalettes.length === 2 && migrated.inventory.tonic === 0,
  "permanent profile migration",
);
const textSrc = fs.readFileSync("node_modules/phaser/src/gameobjects/text/Text.js", "utf8").replaceAll("\r", "");
const start = textSrc.indexOf("advancedWordWrap: function") + "advancedWordWrap: ".length;
const end = textSrc.indexOf("\n    },", start) + 6;
const wrap = new Function(`return (${textSrc.slice(start, end)})`)();
const measuring = createCanvas(16, 16).getContext("2d");
const hex = color => "#" + color.toString(16).padStart(6, "0");
class Node {
  constructor(type, x = 0, y = 0, w = 0, h = 0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.ox = 0.5;
    this.oy = 0.5;
    this.alpha = 1;
    this.list = [];
    this.ops = [];
    this.rotation = 0;
  }
  add(items) {
    for (const item of Array.isArray(items) ? items : [items]) {
      item.parent = this;
      this.list.push(item);
    }
    return this;
  }
  removeAll() {
    this.list = [];
    return this;
  }
  setOrigin(x, y = x) {
    this.ox = x;
    this.oy = y;
    return this;
  }
  setName(name) {
    this.name = name;
    return this;
  }
  setAngle(angle) {
    this.rotation = (angle * Math.PI) / 180;
    return this;
  }
  setAlpha(a) {
    this.alpha = a;
    return this;
  }
  setResolution() {
    return this;
  }
  setDisplaySize(w, h) {
    this.w = w;
    this.h = h;
    return this;
  }
  setInteractive() {
    return this;
  }
  on() {
    return this;
  }
  setFontStyle(style) {
    this.style.fontStyle = style;
    return this;
  }
  setFontSize(size) {
    this.style.fontSize = `${size}px`;
    return this;
  }
  font() {
    return `${this.style.fontStyle === "bold" ? "bold " : ""}${this.style.fontSize} Arial`;
  }
  metrics() {
    measuring.font = this.font();
    const metrics = measuring.measureText("|MÉq");
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    const lines = (
      this.style.wordWrap
        ? wrap.call({ splitRegExp: /\r\n|\r|\n/, letterSpacing: 0 }, this.text, measuring, this.style.wordWrap.width)
        : this.text
    ).split("\n");
    return {
      lines,
      ascent: metrics.actualBoundingBoxAscent,
      lineHeight: height,
      width: Math.ceil(Math.max(...lines.map(line => measuring.measureText(line).width))),
      height: height * lines.length + (this.style.lineSpacing ?? 0) * (lines.length - 1),
    };
  }
  get width() {
    return this.type === "text" ? this.metrics().width : this.w;
  }
  get height() {
    return this.type === "text" ? this.metrics().height : this.h;
  }
  bounds() {
    let x = this.x - this.width * this.ox;
    let y = this.y - this.height * this.oy;
    for (let p = this.parent; p; p = p.parent) {
      x += p.x;
      y += p.y;
    }
    return { x, y, right: x + this.width, bottom: y + this.height };
  }
  fillStyle(color, alpha = 1) {
    this.fill = hex(color);
    this.fillAlpha = alpha;
    return this;
  }
  lineStyle(width, color, alpha = 1) {
    this.stroke = hex(color);
    this.strokeWidth = width;
    this.strokeAlpha = alpha;
    return this;
  }
  op(kind, args) {
    this.ops.push({
      kind,
      args,
      fill: this.fill,
      fillAlpha: this.fillAlpha,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      strokeAlpha: this.strokeAlpha,
    });
    return this;
  }
  fillRoundedRect(...a) {
    return this.op("fillRect", a);
  }
  strokeRoundedRect(...a) {
    return this.op("strokeRect", a);
  }
  lineBetween(...a) {
    return this.op("line", a);
  }
  slice(...a) {
    this.arc = a;
    return this;
  }
  fillPath() {
    return this.op("slice", this.arc);
  }
  strokeCircle(...a) {
    return this.op("strokeCircle", a);
  }
  fillCircle(...a) {
    return this.op("fillCircle", a);
  }
}
const scene = {
  textures: textureScene.textures,
  anims: textureScene.anims,
  add: {
    text: (x, y, text, style) => Object.assign(new Node("text", x, y), { text, style }),
    graphics: () => new Node("graphics"),
    container: (x, y) => new Node("container", x, y),
    rectangle: (x, y, w, h, color, alpha = 1) => Object.assign(new Node("rectangle", x, y, w, h), { color, alpha }),
    image: (x, y, key, frame) => Object.assign(new Node("image", x, y), { key, frame: Number(frame) }),
    circle: (x, y, radius, color, alpha = 1) =>
      Object.assign(new Node("circle", x, y, radius * 2, radius * 2), { color, alpha }),
    triangle: (x, y, ...args) =>
      Object.assign(new Node("triangle", x, y, 8, 7), { coords: args.slice(0, 6), color: args[6] }),
  },
};
const root = new Node("container", 0, 0);
const textNodes = [];
function paint(node, ctx) {
  ctx.save();
  ctx.translate(node.x, node.y);
  ctx.rotate(node.rotation);
  ctx.globalAlpha *= node.alpha;
  if (node.type === "container") {
    node.list.forEach(n => paint(n, ctx));
  }
  if (node.type === "rectangle") {
    ctx.fillStyle = hex(node.color);
    ctx.fillRect(-node.w * node.ox, -node.h * node.oy, node.w, node.h);
  }
  if (node.type === "image") {
    const im = images[node.key];
    const f = frames[node.key][String(node.frame)];
    ctx.drawImage(im, f.x, f.y, f.width, f.height, -node.w * node.ox, -node.h * node.oy, node.w, node.h);
  }
  if (node.type === "circle") {
    ctx.fillStyle = hex(node.color);
    ctx.beginPath();
    ctx.arc(0, 0, node.w / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (node.type === "text") {
    const m = node.metrics();
    ctx.font = node.font();
    ctx.fillStyle = node.style.color;
    ctx.textBaseline = "alphabetic";
    m.lines.forEach((line, i) =>
      ctx.fillText(
        line,
        -m.width * node.ox,
        -m.height * node.oy + m.ascent + i * (m.lineHeight + (node.style.lineSpacing ?? 0)),
      ),
    );
  }
  if (node.type === "triangle") {
    ctx.fillStyle = hex(node.color);
    ctx.beginPath();
    node.coords.forEach((v, i) => {
      if (i % 2 === 0) {
        i === 0
          ? ctx.moveTo(v - node.w * node.ox, node.coords[i + 1] - node.h * node.oy)
          : ctx.lineTo(v - node.w * node.ox, node.coords[i + 1] - node.h * node.oy);
      }
    });
    ctx.closePath();
    ctx.fill();
  }
  if (node.type === "graphics") {
    for (const op of node.ops) {
      ctx.save();
      ctx.globalAlpha *=
        op.kind.startsWith("stroke") || op.kind === "line" ? (op.strokeAlpha ?? 1) : (op.fillAlpha ?? 1);
      ctx.fillStyle = op.fill ?? "#000";
      ctx.strokeStyle = op.stroke ?? "#000";
      ctx.lineWidth = op.strokeWidth ?? 1;
      const a = op.args;
      ctx.beginPath();
      if (op.kind === "fillRect" || op.kind === "strokeRect") {
        ctx.roundRect(a[0], a[1], a[2], a[3], a[4] ?? 0);
        op.kind === "fillRect" ? ctx.fill() : ctx.stroke();
      } else if (op.kind === "line") {
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(a[2], a[3]);
        ctx.stroke();
      } else if (op.kind === "slice") {
        ctx.moveTo(a[0], a[1]);
        ctx.arc(...a);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.arc(a[0], a[1], a[2], 0, Math.PI * 2);
        op.kind === "fillCircle" ? ctx.fill() : ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.restore();
}
function storyPages(text) {
  measuring.font = view.DIALOGUE_FONT_SIZE + "px Arial";
  return dialogue.splitSceneText(
    text,
    240,
    candidate =>
      wrap
        .call({ splitRegExp: /\r\n|\r|\n/, letterSpacing: 0 }, candidate, measuring, view.dialogueWidth(320))
        .split("\n").length <= 3,
  );
}
const report = [];
function render(name, draw, save = true) {
  root.removeAll();
  draw();
  textNodes.length = 0;
  const collect = node => {
    if (node.type === "text") {
      textNodes.push(node);
    }
    node.list.forEach(collect);
  };
  collect(root);
  let canvas;
  if (save) {
    canvas = createCanvas(1280, 720);
    const ctx = canvas.getContext("2d");
    ctx.scale(4, 4);
    paint(root, ctx);
  }
  const issues = [];
  for (const n of textNodes) {
    const b = n.bounds();
    if (b.x < -0.5 || b.y < -0.5 || b.right > 320.5 || b.bottom > 180.5) {
      issues.push(`outside: ${n.text}`);
    }
  }
  for (let i = 0; i < textNodes.length; i++) {
    for (let j = i + 1; j < textNodes.length; j++) {
      const a = textNodes[i];
      const b = textNodes[j];
      const ba = a.bounds();
      const bb = b.bounds();
      if (
        Math.min(ba.right, bb.right) - Math.max(ba.x, bb.x) > 0.5
        && Math.min(ba.bottom, bb.bottom) - Math.max(ba.y, bb.y) > 0.5
      ) {
        issues.push(`overlap: ${a.text} / ${b.text}`);
      }
    }
  }
  if (save) {
    fs.writeFileSync(path.join(out, `${name}.png`), canvas.toBuffer("image/png"));
  }
  report.push({ name, texts: textNodes.length, issues });
}
const options = [
  {
    label: "Centro de investigación",
    description: "Refugio: Amuleto EXP + Tónico para la mochila. El descanso del bioma recupera al equipo.",
    tag: "REFUGIO",
    color: 0x8dbaaa,
    environment: 2,
    scenery: [2, 1],
  },
  {
    label: "Ruinas abandonadas",
    description: "Depósito oculto: 1 Voucher + 1 Señuelo shiny para nuevos encuentros.",
    tag: "HALLAZGO",
    color: 0xc1a769,
    environment: 1,
    scenery: [1, 6],
  },
  {
    label: "Dojo",
    description: "Ruta peligrosa: 1 Voucher Plus. La primera oleada empieza con tormenta de arena.",
    tag: "RIESGO",
    color: 0xb77172,
    environment: 1,
    scenery: [1, 4],
  },
];
for (let i = 0; i < 3; i++) {
  render(`route-${i}`, () =>
    view.drawRouteView(scene, root, 320, 180, {
      title: "Elige tu próximo destino",
      subtitle: "Obra · Próxima oleada 51",
      options,
      selected: i,
      history: "Recorrido: Bosque → Metrópolis",
      onSelect: () => {},
      onConfirm: () => {},
    }),
  );
}
const state = run.createFracturaRun("art-preview");
const rival = run.getRival(state);
const baseCasino = {
  tab: 0,
  selected: 0,
  vouchers: 12,
  tokens: 7,
  result: "",
  inventory: Object.values(run.CONSUMABLES).map(item => ({ name: item.short, count: 3, detail: item.description })),
  relationshipTitle: `${rival.name} · Romance`,
  rivalFrame: rival.frame,
  relationshipLines: [
    rival.role,
    "Confianza 65 · Afecto 55",
    "Enemistad 12 · Romance elegido",
    run.STORIES[state.storyId].title,
    "Especialidad: Reserva vital",
    "Reliquia: Coraza · daño −10%",
  ],
  recipes: Object.values(run.CONSUMABLES).map(item => ({ name: item.short, cost: 2, detail: item.description })),
  journalPages: [
    {
      title: "La última ruta de Saira",
      subtitle: "Misión personal · Pruebas reunidas",
      body: "Has visitado dos clases de camino. Comparte las pruebas con Elian en la oleada 85, 125 o 175 para completar su misión y desbloquear el permiso de taller.",
    },
  ],
  palette: "Índigo",
  onTab: () => {},
  onSelect: () => {},
  onAction: () => {},
  onPalette: () => {},
  onBack: () => {},
};
baseCasino.forge = {
  title: "Elige una forma",
  subtitle: "Solo esta partida · 2 fragmentos cada 10 oleadas",
  balance: 9999,
  cost: 4,
  action: "ELEGIR · A",
  backEnabled: true,
  rows: Object.values(forging.FORGE_FORMS).map(form => ({ name: form.name, detail: form.detail })),
};
baseCasino.synergies = synergies.TEAM_SYNERGIES.map(s => ({ ...s, count: 3, active: true }));
for (let tab = 0; tab < 8; tab++) {
  const rows = tab === 0 ? 10 : tab === 2 || tab === 3 ? 6 : tab === 6 || tab === 7 ? 4 : 1;
  for (let selected = 0; selected < rows; selected++) {
    for (const result of ["", "Necesitas 1 Voucher normal. Ganas vouchers cada 10 oleadas."]) {
      render(`casino-${tab}-${selected}-${result ? "result" : "idle"}`, () =>
        view.drawCasinoView(scene, root, 320, 180, { ...baseCasino, tab, selected, result: tab === 5 ? "" : result }),
      );
    }
  }
}
const forgePanels = [
  {
    title: "Elige un Pokémon",
    rows: ["Charizard", "Ferropaladín", "Greninja", "Decidueye", "Meowscarada", "Crabominable"].map(name => ({
      name,
      detail:
        "Selecciona un movimiento de "
        + name
        + ". Puedes cambiar una modificación o retirarla gratis. Conserva el tipo y los PP originales.",
    })),
    cost: null,
    action: "ELEGIR · A",
  },
  {
    title: "Elige un movimiento",
    rows: [
      {
        name: "Protección",
        detail: "Protección admite la forma Vital: cura 10% de PS máximos cuando consigue protegerte.",
      },
      {
        name: "Movimientos incompatibles",
        detail:
          "Este movimiento conserva sus reglas originales. La Forja admite ataques de un solo impacto y objetivo, sin carga ni daño fijo, y Protección.",
      },
    ],
    cost: null,
    action: "ELEGIR · A",
  },
  {
    title: "Elige una forma",
    rows: Object.values(forging.FORGE_FORMS).map(f => ({ name: f.name, detail: f.detail })),
    cost: 2,
    action: "ELEGIR · A",
  },
  {
    title: "Elige un sello",
    rows: Object.values(forging.FORGE_SEALS).map(f => ({ name: f.name, detail: f.detail })),
    cost: 4,
    action: "ELEGIR · A",
  },
  {
    title: "Confirma la modificación",
    rows: [
      {
        name: "Aplicar modificación",
        detail:
          "Precisión + Chispa. Reemplaza la modificación anterior. No devuelve fragmentos al cambiarla. Retirar forma y sello es gratis.",
      },
    ],
    cost: 4,
    action: "CONFIRMAR · A",
  },
];
forgePanels.forEach((forge, step) => {
  for (let selected = 0; selected < forge.rows.length; selected++) {
    for (const result of [
      "",
      "Modificación guardada: Rayo.",
      "Necesitas 4 fragmentos. No se ha cambiado nada.",
      "Este movimiento no es compatible. Conservas tus fragmentos.",
    ]) {
      render(`forja-${step}-${selected}-${result ? result.slice(0, 6) : "idle"}`, () =>
        view.drawCasinoView(scene, root, 320, 180, {
          ...baseCasino,
          tab: 6,
          selected,
          result,
          forge: {
            ...forge,
            subtitle: step === 4 ? "Destrucción Apocalíptica · Crabominable" : baseCasino.forge.subtitle,
            balance: 9999,
            backEnabled: step > 0,
          },
        }),
      );
    }
  }
});
for (const choices of [
  [],
  [
    { label: "Quiero una relación contigo", hint: "Romance opcional · +25 afecto" },
    { label: "Quiero mantener nuestra amistad", hint: "Amistad · +20 confianza" },
    { label: "Voy a ser tu peor enemigo", hint: "Enemistad · +30 rivalidad" },
  ],
]) {
  render(`story-${choices.length > 0 ? "choices" : "intro"}`, () =>
    view.drawStoryView(scene, root, 320, 180, {
      title: "Bajo las estrellas",
      subtitle: "El proyecto UMBRAL · Oleada 55",
      speaker: rival.name,
      portrait: rival.frame,
      environment: 0,
      text:
        choices.length > 0
          ? `Vínculo con ${rival.name}: Cercanía.`
          : "Me preocupó no verte volver. ¿Qué somos cuando termina el combate? Quiero escucharte.",
      pageLabel: choices.length > 0 ? "Decisión" : "Escena 1/2",
      choices,
      selected: 0,
      onSelect: () => {},
      onContinue: () => {},
      onConfirm: () => {},
    }),
  );
}
// Exercise production dialogue, choices and result pages at the same measured width.
function renderChapter(current, wave, prefix) {
  const rivalProfile = run.getRival(current);
  const event = chapters.getFracturaChapter(wave, current);
  const base = {
    title: event.title,
    subtitle: `${run.STORIES[current.storyId].title} · Oleada ${wave}`,
    speaker: rivalProfile.name,
    portrait: rivalProfile.frame,
    environment: event.environment ?? 0,
    text: event.question ?? "¿Cómo quieres continuar?",
    pageLabel: "Decisión",
    choices: [],
    selected: 0,
    onSelect: () => {},
    onContinue: () => {},
    onConfirm: () => {},
    onPrevious: () => {},
  };
  const lines = [...dialogue.conversationFor(event, current)];
  event.choices.forEach((choice, selected) => {
    const after = structuredClone(current);
    choice.apply(after);
    lines.push(...dialogue.responseFor(event, selected, after, choice.resultText, current));
    render(
      `${prefix}-choice-${selected}`,
      () =>
        view.drawStoryView(scene, root, 320, 180, {
          ...base,
          selected,
          choices: event.choices.map(c => ({ label: c.label, hint: c.hint ?? "Se aplica durante esta partida." })),
        }),
      false,
    );
  });
  lines.forEach((line, index) => {
    storyPages(line.text).forEach((text, page) => {
      render(
        `${prefix}-line-${index}-${page}`,
        () =>
          view.drawStoryView(scene, root, 320, 180, {
            ...base,
            text,
            speakerKind: line.speaker,
            speaker: line.speaker === "rival" ? rivalProfile.name : line.speaker === "player" ? "Tú" : "Narración",
            pageLabel: `Escena ${page + 1}`,
            canPrevious: true,
          }),
        false,
      );
    });
  });
}
for (const storyId of ["umbral", "invasion", "eclipse"]) {
  for (const rivalProfile of run.RIVALS) {
    for (const hostile of [false, true]) {
      for (const wave of chapters.FRACTURA_EVENT_WAVES) {
        const current = run.createFracturaRun("layout-world");
        current.storyId = storyId;
        current.rivalId = rivalProfile.id;
        current.relationship.rivalry = hostile ? 80 : 0;
        renderChapter(current, wave, `${storyId}-${rivalProfile.id}-${hostile}-${wave}`);
      }
    }
    // The default run cannot reach these branches: examine earned mission and romance states too.
    for (const status of ["pending", "ready", "resolved"]) {
      const current = run.createFracturaRun("layout-quest");
      current.storyId = storyId;
      current.rivalId = rivalProfile.id;
      current.companionQuest = status === "resolved" ? "resolved" : "active";
      if (status !== "pending") {
        current.investigation = 5;
        current.compassion = 5;
        current.relic = "ward";
        current.flags["visited-camp"] = true;
        current.flags["visited-cache"] = true;
      }
      for (const wave of [85, 125, 175]) {
        renderChapter(current, wave, `${storyId}-${rivalProfile.id}-${status}-${wave}`);
      }
    }
    for (const romance of [false, true]) {
      const current = run.createFracturaRun("layout-romance");
      current.storyId = storyId;
      current.rivalId = rivalProfile.id;
      current.relationship = { trust: 80, affection: 60, rivalry: 0, romance };
      current.flags.romanceInterest = true;
      for (const wave of [55, 175]) {
        renderChapter(current, wave, `${storyId}-${rivalProfile.id}-romance-${romance}-${wave}`);
      }
    }
  }
}
const previewState = run.createFracturaRun("scene-preview");
previewState.rivalId = "vera";
const previewEvent = encounters.ambientEncounter(
  { seed: "scene-preview", wave: 12, biome: 5, hurt: true },
  previewState,
);
render("living-field", () => {
  view.drawStoryView(scene, root, 320, 180, {
    title: previewEvent.title,
    subtitle: "El proyecto UMBRAL · Oleada 12",
    speaker: "Vera",
    speakerKind: "rival",
    portrait: 1,
    environment: 0,
    text: storyPages(previewEvent.dialogue[1].text)[0],
    pageLabel: "Escena 2/4",
    choices: [],
    selected: 0,
    onSelect: () => {},
    onContinue: () => {},
    onConfirm: () => {},
  });
  const background = scene.add.image(0, 0, "fractura-arenas-natural", "5").setOrigin(0).setDisplaySize(320, 180);
  const actor = scene.add.image(251, 104, "fractura-rival-vera", "1").setOrigin(0.5, 1).setDisplaySize(63.2, 79);
  const f = frames["fractura-scene-props"]["1"];
  const scale = Math.min(35 / f.width, 32 / f.height);
  const prop = scene.add
    .image(183, 96, "fractura-scene-props", "1")
    .setOrigin(0.5, 1)
    .setDisplaySize(f.width * scale, f.height * scale);
  const shadow = scene.add.circle(251, 101, 8, 0x080e17, 0.2);
  shadow.setDisplaySize(24, 5);
  root.list.unshift(background, shadow, actor, prop);
  background.parent = root;
  actor.parent = root;
  shadow.parent = root;
  prop.parent = root;
});
fs.writeFileSync(
  path.join(out, "report.json"),
  JSON.stringify({ checks, combinations: combos.size, layouts: report }, null, 2),
);
console.log(`${checks} comprobaciones de reglas y guardados; ${report.length} variantes de interfaz.`);
const failures = report.filter(r => r.issues.length);
console.log(JSON.stringify(failures, null, 2));
if (failures.length > 0) {
  process.exitCode = 1;
}
