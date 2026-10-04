import { globalScene } from "#app/global-scene";
import { MoveCategory } from "#enums/move-category";
import { MoveId } from "#enums/move-id";
import { MoveTarget } from "#enums/move-target";
import { PokemonType } from "#enums/pokemon-type";
import type { Pokemon } from "#field/pokemon";
import type { Move } from "#moves/move";
import { type ForgeMoveKind, findForging, validForging } from "./forging";
import { loadFracturaStoryState } from "./story";
import { type TeamSynergyId, teamSynergies } from "./synergies";

export function forgeMoveKind(move: Move): ForgeMoveKind {
  if (move.id === MoveId.PROTECT) {
    return "guard";
  }
  return move.category !== MoveCategory.STATUS
    && move.power > 0
    && move.id !== MoveId.STRUGGLE
    && [MoveTarget.OTHER, MoveTarget.NEAR_OTHER, MoveTarget.NEAR_ENEMY, MoveTarget.RANDOM_NEAR_ENEMY].includes(
      move.moveTarget,
    )
    && !move.isChargingMove()
    && !move.hasAttr("OverrideMoveEffectAttr")
    && !move.hasAttr("FixedDamageAttr")
    && !move.hasAttr("OneHitKOAttr")
    && !move.hasAttr("MultiHitAttr")
    ? "attack"
    : "unsupported";
}
export function getForgedMove(pokemon: Pokemon, move: Move) {
  if (
    !globalScene.gameMode.isClassic
    || !pokemon.isPlayer()
    || !pokemon.getMoveset().some(m => m?.moveId === move.id)
  ) {
    return;
  }
  const forging = findForging(loadFracturaStoryState(), pokemon.id, move.id);
  return forging && validForging(forgeMoveKind(move), forging.form, forging.seal) ? forging : undefined;
}
const TYPES: Partial<Record<PokemonType, TeamSynergyId>> = {
  [PokemonType.WATER]: "water",
  [PokemonType.GRASS]: "grass",
  [PokemonType.STEEL]: "steel",
  [PokemonType.POISON]: "poison",
};
export function activeTeamSynergies() {
  return teamSynergies(
    globalScene.gameMode.isClassic
      ? globalScene.getPlayerParty().map(p => ({
          hp: p.hp,
          types: p
            .getTypes()
            .map(t => TYPES[t])
            .filter((t): t is TeamSynergyId => !!t),
        }))
      : [],
  );
}
export function hasTeamSynergy(id: TeamSynergyId): boolean {
  return globalScene.gameMode.isClassic && activeTeamSynergies().some(s => s.id === id && s.active);
}
