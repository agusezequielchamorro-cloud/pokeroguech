import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(
  process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
    ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "@napi-rs/canvas")
    : "@napi-rs/canvas",
);
const out = path.resolve("qa/check");
fs.mkdirSync(out, { recursive: true });
for (const name of ["assets", "run-state", "sprite-layout"]) {
  let source = fs.readFileSync("src/fractura/" + name + ".ts", "utf8");
  source = source.replace(
    /import (\w+) from "([^"]+\.png)";/g,
    (_m, variable, file) => "const " + variable + " = " + JSON.stringify(file) + ";",
  );
  const js = ts
    .transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } })
    .outputText.replace(/from "\.\/(\w[\w-]*)"/g, 'from "./$1.mjs"');
  fs.writeFileSync(path.join(out, name + ".mjs"), js);
}
export const images = {},
  frames = {};
const textures = new Map();
function register(key, source) {
  images[key] = source;
  frames[key] = {};
  const texture = {
    getSourceImage: () => source,
    getContext: () => source.getContext("2d"),
    refresh() {},
    has: frame => !!frames[key][frame],
    add(name, _source, x, y, width, height) {
      frames[key][name] = { x, y, width, height, name };
      return frames[key][name];
    },
  };
  textures.set(key, texture);
  return texture;
}
for (const [key, file] of [
  ["fractura-environments", "environments"],
  ["fractura-rivals", "rivals"],
  ["fractura-rival-sprites", "rival-sprites"],
  ["fractura-scene-props", "scene-props"],
  ["fractura-arenas-natural", "arenas-natural"],
  ["fractura-arenas-arcane", "arenas-arcane"],
  ["fractura-arenas-story", "arenas-story"],
]) {
  register(key, await loadImage("src/fractura/art/" + file + ".png"));
}
const animations = new Set();
export const textureScene = {
  textures: {
    exists: key => textures.has(key),
    get: key => textures.get(key),
    createCanvas: (key, w, h) => register(key, createCanvas(w, h)),
    getFrame: (key, frame) => frames[key][frame],
  },
  anims: { exists: key => animations.has(key), create: config => animations.add(config.key) },
};
globalThis.document = {
  createElement: type => {
    assert.equal(type, "canvas");
    return createCanvas(1, 1);
  },
};
const assets = await import(path.join(out, "assets.mjs"));
const { spriteBounds, RIVAL_FRAME } = await import(path.join(out, "sprite-layout.mjs"));
const { RIVALS } = await import(path.join(out, "run-state.mjs"));
assets.ensureFracturaFrames(textureScene);
const count = textures.size;
assets.ensureFracturaFrames(textureScene);
assert.equal(textures.size, count, "Normalizing twice must reuse textures");
const contact = createCanvas(1024, 1280);
const ctx = contact.getContext("2d");
ctx.fillStyle = "#172338";
ctx.fillRect(0, 0, 1024, 1280);
const report = [];
for (const rival of RIVALS) {
  const key = assets.rivalSpriteKey(rival.id);
  const canvas = images[key];
  assert.ok(canvas, rival.id + " texture exists");
  assert.equal(Object.keys(frames[key]).length, 4);
  fs.writeFileSync(path.join(out, key + ".png"), canvas.toBuffer("image/png"));
  for (let pose = 0; pose < 4; pose++) {
    const pixels = canvas.getContext("2d").getImageData(pose * 128, 0, 128, 160).data;
    const b = spriteBounds(pixels, 128, 160);
    assert.ok(b.x > 1 && b.y > 1 && b.x + b.width < 127, rival.id + ":" + pose + " has transparent margins");
    assert.ok(Math.abs(b.y + b.height - RIVAL_FRAME.footY) <= 2, rival.id + ":" + pose + " feet share ground");
    assert.ok(Math.abs(b.footX - 64) < 4, rival.id + ":" + pose + " stays on its foot anchor");
    assert.ok(b.height >= 112, rival.id + ":" + pose + " has consistent scale");
    report.push({ rival: rival.id, pose, bounds: b });
    ctx.drawImage(canvas, pose * 128, 0, 128, 160, pose * 256, rival.frame * 320, 256, 320);
    ctx.fillStyle = "#f3d393";
    ctx.font = "14px sans-serif";
    ctx.fillText(rival.name + " · " + pose, pose * 256 + 10, rival.frame * 320 + 20);
  }
}
assert.equal(Object.keys(frames[assets.FRACTURA_PORTRAITS]).length, 4, "Every field rival has a matching portrait");
assert.equal(Object.keys(frames[assets.FRACTURA_PROPS]).length, 16, "Every prop has a tight transparent frame");
fs.writeFileSync(path.join(out, "rival-frames.png"), contact.toBuffer("image/png"));
fs.writeFileSync(path.join(out, "rival-portraits.png"), images[assets.FRACTURA_PORTRAITS].toBuffer("image/png"));
fs.writeFileSync(path.join(out, "sprite-report.json"), JSON.stringify(report, null, 2));
console.log("Sprites: 16 poses y 16 objetos con recortes y anclajes comprobados.");
