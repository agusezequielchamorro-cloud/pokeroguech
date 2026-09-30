import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const canvasPackage = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
  ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "@napi-rs/canvas")
  : "@napi-rs/canvas";
const { createCanvas, loadImage, GlobalFonts } = require(canvasPackage);
GlobalFonts.registerFromPath("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "Arial");
GlobalFonts.registerFromPath("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "Arial Bold");
const out = path.resolve("qa/check");
fs.mkdirSync(out, { recursive: true });
for (const name of ["run-state", "profile", "chapters", "view"]) {
  const source = fs.readFileSync(`src/fractura/${name}.ts`, "utf8");
  const js = ts
    .transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } })
    .outputText.replace(/from "\.\/(\w[\w-]*)"/g, 'from "./$1.mjs"');
  fs.writeFileSync(path.join(out, `${name}.mjs`), js);
}
fs.writeFileSync(
  path.join(out, "assets.mjs"),
  'export const FRACTURA_ENVIRONMENTS="fractura-environments", FRACTURA_RIVALS="fractura-rivals"; export function ensureFracturaFrames() {}',
);
const run = await import(path.join(out, "run-state.mjs"));
const profile = await import(path.join(out, "profile.mjs"));
const chapters = await import(path.join(out, "chapters.mjs"));
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
  for (const wave of chapters.FRACTURA_EVENT_WAVES.filter(w => w !== 15 && w !== 25)) {
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
const images = {
  "fractura-environments": await loadImage("src/fractura/art/environments.png"),
  "fractura-rivals": await loadImage("src/fractura/art/rivals.png"),
};
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
  textures: { exists: k => !!images[k] },
  add: {
    text: (x, y, text, style) => Object.assign(new Node("text", x, y), { text, style }),
    graphics: () => new Node("graphics"),
    container: (x, y) => new Node("container", x, y),
    rectangle: (x, y, w, h, color, alpha = 1) => Object.assign(new Node("rectangle", x, y, w, h), { color, alpha }),
    image: (x, y, key, frame) => Object.assign(new Node("image", x, y), { key, frame: Number(frame) }),
    triangle: (x, y, ...args) =>
      Object.assign(new Node("triangle", x, y, 8, 7), { coords: args.slice(0, 6), color: args[6] }),
  },
};
const root = new Node("container", 0, 0);
const textNodes = [];
function paint(node, ctx) {
  ctx.save();
  ctx.translate(node.x, node.y);
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
    const w = Math.floor(im.width / 2);
    const h = Math.floor(im.height / 2);
    ctx.drawImage(
      im,
      (node.frame % 2) * w,
      Math.floor(node.frame / 2) * h,
      w,
      h,
      -node.w * node.ox,
      -node.h * node.oy,
      node.w,
      node.h,
    );
  }
  if (node.type === "text") {
    textNodes.push(node);
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
const report = [];
function render(name, draw) {
  root.removeAll();
  draw();
  textNodes.length = 0;
  const canvas = createCanvas(1280, 720);
  const ctx = canvas.getContext("2d");
  ctx.scale(4, 4);
  paint(root, ctx);
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
  fs.writeFileSync(path.join(out, `${name}.png`), canvas.toBuffer("image/png"));
  report.push({ name, texts: textNodes.length, issues });
}
const options = [
  {
    label: "Centro de investigación",
    description: "Refugio: Amuleto EXP + Tónico para la mochila. El descanso del bioma recupera al equipo.",
    tag: "REFUGIO",
    color: 0x8dbaaa,
    environment: 2,
  },
  {
    label: "Ruinas abandonadas",
    description: "Depósito oculto: 1 Voucher + 1 Señuelo shiny para nuevos encuentros.",
    tag: "HALLAZGO",
    color: 0xc1a769,
    environment: 1,
  },
  {
    label: "Dojo",
    description: "Ruta peligrosa: 1 Voucher Plus. La primera oleada empieza con tormenta de arena.",
    tag: "RIESGO",
    color: 0xb77172,
    environment: 1,
  },
];
for (let i = 0; i < 3; i++) {
  render(`route-${i}`, () =>
    view.drawRouteView(scene, root, 320, 180, {
      title: "Elegí tu próximo destino",
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
    "Build: Reserva vital",
    "Reliquia: Coraza · daño −10%",
  ],
  palette: "Índigo",
  onTab: () => {},
  onSelect: () => {},
  onAction: () => {},
  onPalette: () => {},
  onBack: () => {},
};
for (let tab = 0; tab < 4; tab++) {
  for (let selected = 0; selected < (tab === 0 ? 10 : tab === 2 ? 4 : 1); selected++) {
    for (const result of ["", "Necesitás 1 Voucher normal. Ganás vouchers cada 10 oleadas."]) {
      render(`casino-${tab}-${selected}-${result ? "result" : "idle"}`, () =>
        view.drawCasinoView(scene, root, 320, 180, { ...baseCasino, tab, selected, result: tab === 3 ? "" : result }),
      );
    }
  }
}
for (const choices of [
  [],
  [
    { label: "Quiero algo más con vos", hint: "Romance opcional · +25 afecto" },
    { label: "Te quiero como compañero", hint: "Amistad · +20 confianza" },
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
          ? `¿Qué decidís? Tu elección queda guardada.\nVínculo con ${rival.name}: Cercanía.`
          : `${rival.name} te espera lejos del campamento. «Me preocupó no verte volver. ¿Qué somos cuando termina el combate?» Hablan de lo que dejaron atrás y del futuro de la expedición. El romance sigue siendo una decisión tuya, igual que la amistad y la enemistad.`,
      pageLabel: choices.length > 0 ? "Decisión" : "Escena 1/2",
      choices,
      selected: 0,
      onSelect: () => {},
      onContinue: () => {},
      onConfirm: () => {},
    }),
  );
}
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
