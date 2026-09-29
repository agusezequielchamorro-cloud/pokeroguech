/** Permanent Fractura unlocks on this device and browser origin. */
export interface FracturaProfile {
  compass: boolean;
  rivalPalettes: string[];
  selectedPalette: string;
}

export const RIVAL_PALETTES = {
  original: { label: "Original", tint: 0xffffff },
  indigo: { label: "Índigo", tint: 0x9fb6ff },
  cobre: { label: "Cobre", tint: 0xffbd8c },
} as const;

const KEY = "pokerogue-fractura-profile-v1";

export function loadFracturaProfile(): FracturaProfile {
  const initial: FracturaProfile = { compass: false, rivalPalettes: ["original"], selectedPalette: "original" };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!saved || typeof saved !== "object") {
      return initial;
    }
    const palettes = ["original", ...(Array.isArray(saved.rivalPalettes) ? saved.rivalPalettes : [])].filter(
      (value, index, values) => value in RIVAL_PALETTES && values.indexOf(value) === index,
    );
    return {
      compass: saved.compass === true,
      rivalPalettes: palettes,
      selectedPalette: palettes.includes(saved.selectedPalette) ? saved.selectedPalette : "original",
    };
  } catch {
    return initial;
  }
}

export function saveFracturaProfile(profile: FracturaProfile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}
