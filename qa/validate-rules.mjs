import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const out = path.resolve("qa/check");
fs.mkdirSync(out, { recursive: true });
for (const name of [
  "run-state",
  "profile",
  "chapters",
  "dialogue",
  "encounters",
  "wheel",
  "quests",
  "journal",
  "crafting",
  "sprite-layout",
  "forging",
  "synergies",
]) {
  const source = fs.readFileSync(`src/fractura/${name}.ts`, "utf8");
  const js = ts
    .transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } })
    .outputText.replace(/from "\.\/(\w[\w-]*)"/g, 'from "./$1.mjs"');
  fs.writeFileSync(path.join(out, `${name}.mjs`), js);
}
const run = await import(path.join(out, "run-state.mjs"));
const profile = await import(path.join(out, "profile.mjs"));
const chapters = await import(path.join(out, "chapters.mjs"));
const dialogue = await import(path.join(out, "dialogue.mjs"));
const encounters = await import(path.join(out, "encounters.mjs"));
const wheel = await import(path.join(out, "wheel.mjs"));
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
for (let i = 0; i < 40; i++) {
  const current = run.createFracturaRun(`new-rival-${i}`);
  const next = run.createFracturaRun(`new-rival-${i + 1}`, current.rivalId);
  check(current.rivalId !== next.rivalId, "A new run avoids the previous rival");
}
for (const from of [-1092, -15, 0, 33, 359, 420]) {
  for (let prize = 0; prize < 10; prize++) {
    const stop = wheel.rouletteStopAngle(from, prize);
    const angle = ((-90 - stop) * Math.PI) / 180;
    check(
      wheel.wheelSector(Math.cos(angle), Math.sin(angle)) === prize,
      "The roulette pointer lands on the awarded prize",
    );
  }
}
const context = { seed: "ambient-test", wave: 12, biome: 5, hurt: true };
const ambientState = run.createFracturaRun("ambient-test");
check(encounters.ambientEncounter(context, ambientState)?.id === "ambient-12-aid", "Injuries trigger contextual aid");
check(
  !encounters.ambientEncounter({ ...context, mysteryEncounter: true }, ambientState),
  "Native mystery events have priority",
);
ambientState.lastAmbientWave = 9;
check(!encounters.ambientEncounter(context, ambientState), "Ambient conversations respect their cooldown");
for (const rival of run.RIVALS) {
  const before = run.createFracturaRun(rival.id);
  before.rivalId = rival.id;
  const event = chapters.getFracturaChapter(55, before);
  const after = structuredClone(before);
  event.choices[2].apply(after);
  const lines = dialogue.responseFor(event, 2, after, event.choices[2].resultText, before);
  check(lines[1].pose === 2, "A hostile choice gets a hostile reply");
  const pages = dialogue.splitSceneText(event.intro);
  check(
    pages.join(" ") === event.intro.replaceAll("$", " ").trim().replace(/\s+/g, " "),
    "Scene paging preserves every word",
  );
}
console.log(`${checks} comprobaciones aprobadas; las 12 combinaciones de rival e historia funcionan.`);
