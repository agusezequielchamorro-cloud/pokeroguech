import { type FracturaRunState, getRival, STORIES } from "./run-state";
export const PERSONAL_MISSIONS = {
  elian: {
    title: "La última ruta de Saira",
    detail: "Visita dos clases de camino para reconstruir la ruta de su hermana.",
    reward: "Elian comparte su carta y un permiso de taller.",
  },
  vera: {
    title: "Una reliquia con dueño",
    detail: "Conserva una reliquia del sendero para identificar el sello del archivo de Vera.",
    reward: "Vera recupera la historia de su familia y comparte un permiso de taller.",
  },
  nadir: {
    title: "El registro borrado",
    detail: "Reúne 5 puntos de investigación para reconstruir el registro de su antigua expedición.",
    reward: "Nadir publica las pruebas y comparte un permiso de taller.",
  },
  alma: {
    title: "La caravana perdida",
    detail: "Reúne 5 puntos de compasión o ayuda tanto a los refugiados como al campamento.",
    reward: "Alma localiza a la caravana y comparte un permiso de taller.",
  },
} as const;
export function personalMissionReady(state: FracturaRunState): boolean {
  if (state.rivalId === "vera") {
    return !!state.relic;
  }
  if (state.rivalId === "nadir") {
    return state.investigation >= 5;
  }
  if (state.rivalId === "alma") {
    return state.compassion >= 5 || !!(state.flags.helpedRefugees && state.flags.campHelped);
  }
  return (
    ["camp", "cache", "danger"].filter(
      kind => state.flags["visited-" + kind] || state.routeHistory.some(r => r.kind === kind),
    ).length >= 2
  );
}
export function currentObjective(state: FracturaRunState, wave: number): string {
  const next =
    wave < 10
      ? 10
      : wave < 30
        ? 30
        : wave < 49
          ? 49
          : wave < 60
            ? 60
            : wave < 95
              ? 95
              : wave < 145
                ? 145
                : wave < 195
                  ? 195
                  : 200;
  const goals = {
    umbral: {
      10: "Localizar una transmisión de UMBRAL.",
      30: "Llegar al laboratorio y elegir entre las pruebas y el rescate.",
      49: "Preparar el clima del núcleo antes de la oleada 50.",
      60: "Examinar la abertura que dejó el núcleo.",
      95: "Reunir a la expedición y comparar sus pruebas.",
      145: "Asegurar la entrada a la instalación central.",
      195: "Decidir cómo cerrar la fractura central.",
      200: "Vencer al Pokémon del núcleo para ejecutar el plan final.",
    },
    invasion: {
      10: "Encontrar la petición de ayuda del primer refugio.",
      30: "Recuperar suministros o información del almacén ocupado.",
      49: "Regular el faro climático antes de defender el paso.",
      60: "Investigar por qué las anomalías atraen Pokémon hacia la ciudad.",
      95: "Organizar la evacuación con las rutas abiertas.",
      145: "Asegurar el corredor final de evacuación.",
      195: "Elegir el destino del faro y de los refugios.",
      200: "Vencer al Pokémon que bloquea la evacuación final.",
    },
    eclipse: {
      10: "Seguir el símbolo que aparece durante el eclipse.",
      30: "Descifrar el altar y proteger a quienes quedaron cerca.",
      49: "Regular los conductos del altar antes de la oleada 50.",
      60: "Comprobar qué alimenta la grieta.",
      95: "Reunir las lecturas de los santuarios.",
      145: "Abrir una entrada segura al santuario central.",
      195: "Elegir cómo interrumpir la energía del eclipse.",
      200: "Vencer al Pokémon de la grieta para terminar el sello.",
    },
  };
  return goals[state.storyId][next] + " Próximo hito: " + next + ".";
}
export function journalOverview(state: FracturaRunState, wave: number): string[] {
  const mission = PERSONAL_MISSIONS[state.rivalId];
  const status = {
    available: "Aún no iniciada",
    active: personalMissionReady(state) ? "Pruebas reunidas" : "En curso",
    resolved: "Completada",
    declined: "Rechazada",
  };
  return [
    STORIES[state.storyId].goal,
    currentObjective(state, wave),
    getRival(state).name + ": " + mission.title + ". " + status[state.companionQuest] + ".",
    state.companionQuest === "active"
      ? mission.detail + " Comparte las pruebas en 85, 125 o 175."
      : state.companionQuest === "resolved"
        ? mission.reward
        : "La misión se ofrece en 35 y vuelve a aparecer en 85 y 125.",
  ];
}
