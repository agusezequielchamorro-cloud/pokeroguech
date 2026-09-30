import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const out = path.resolve("qa/check");
fs.mkdirSync(out, { recursive: true });
for (const name of ["run-state", "profile", "chapters"]) {
  const source = fs.readFileSync(`src/fractura/${name}.ts`, "utf8");
  const js = ts
    .transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } })
    .outputText.replace(/from "\.\/(\w[\w-]*)"/g, 'from "./$1.mjs"');
  fs.writeFileSync(path.join(out, `${name}.mjs`), js);
}
const run = await import(path.join(out, "run-state.mjs"));
const profile = await import(path.join(out, "profile.mjs"));
const chapters = await import(path.join(out, "chapters.mjs"));
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
console.log(`${checks} comprobaciones aprobadas; las 12 combinaciones de rival e historia funcionan.`);
