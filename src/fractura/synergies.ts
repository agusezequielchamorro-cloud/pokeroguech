export const TEAM_SYNERGIES = [
  {
    id: "water",
    name: "Marea",
    detail:
      "3 Pokémon de Agua conscientes: lluvia durante 5 turnos al iniciar el combate si no hay otro clima. Las habilidades pueden cambiarla.",
  },
  {
    id: "grass",
    name: "Bosque",
    detail:
      "3 Pokémon de Planta conscientes: los miembros activos recuperan 1/64 de sus PS máximos al terminar cada turno.",
  },
  {
    id: "steel",
    name: "Fortaleza",
    detail: "3 Pokémon de Acero conscientes: el equipo recibe 5% menos daño de ataques.",
  },
  {
    id: "poison",
    name: "Toxina",
    detail: "3 Pokémon de Veneno conscientes: los ataques del equipo hacen 20% más daño a enemigos envenenados.",
  },
] as const;
export type TeamSynergyId = (typeof TEAM_SYNERGIES)[number]["id"];
export interface TeamMemberSnapshot {
  hp: number;
  types: readonly string[];
}
export function teamSynergies(party: readonly TeamMemberSnapshot[]) {
  return TEAM_SYNERGIES.map(s => {
    const count = party.filter(p => p.hp > 0 && p.types.includes(s.id)).length;
    return { ...s, count, active: count >= 3 };
  });
}
