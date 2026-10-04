import type { FracturaProfile } from "./profile";
import type { ConsumableId } from "./run-state";
export const RECIPES: { id: ConsumableId; cost: number }[] = [
  { id: "tonic", cost: 2 },
  { id: "shield", cost: 3 },
  { id: "lure", cost: 4 },
  { id: "remedy", cost: 2 },
  { id: "ether", cost: 3 },
  { id: "prism", cost: 5 },
];
export function recipeCost(profile: FracturaProfile, id: ConsumableId): number {
  const recipe = RECIPES.find(r => r.id === id);
  return recipe ? Math.max(1, recipe.cost - (profile.workshopLicense ? 1 : 0)) : Number.POSITIVE_INFINITY;
}
/** Validate the whole purchase before deducting anything. */
export function craftConsumable(profile: FracturaProfile, id: ConsumableId): "made" | "coins" | "full" {
  const cost = recipeCost(profile, id);
  if (profile.casinoTokens < cost) {
    return "coins";
  }
  if (profile.inventory[id] >= 9999) {
    return "full";
  }
  profile.casinoTokens -= cost;
  profile.inventory[id]++;
  return "made";
}
