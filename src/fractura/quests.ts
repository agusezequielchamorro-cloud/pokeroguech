import { PERSONAL_MISSIONS, personalMissionReady } from "./journal";
import { changeRelationship, type FracturaRunState, getRival } from "./run-state";
import type { FracturaStoryChoice, FracturaStoryEvent } from "./story";
export const PERSONAL_HISTORY = {
  elian:
    "Mi hermana Saira trazaba rutas para otras expediciones. Su última carta llegó incompleta. Quiero reconstruir el camino que siguió.",
  vera: "Mi familia cuidaba un archivo de reliquias. Lo vaciaron durante la evacuación. Si encuentro su sello, podré demostrar a quién pertenecían.",
  nadir:
    "Mi compañera Mara registró la primera anomalía. Alguien borró sus mediciones del archivo. Necesito pruebas para recuperar su trabajo.",
  alma: "Una caravana salió con mis instrucciones antes de que se cortara la radio. No sé si llegó al refugio. Quiero localizar a sus pasajeros.",
} as const;
const REQUESTS = {
  elian:
    "Necesito mapas de dos clases de camino: un refugio, un depósito o una ruta peligrosa. Compararemos sus señales para reconstruir la ruta de Saira.",
  vera: "Necesito examinar una reliquia del sendero. Su sello puede indicarnos qué pasó con las piezas del archivo de mi familia.",
  nadir:
    "Necesito reunir cinco puntos de investigación. Las mediciones de la expedición nos permitirán reconstruir el registro de Mara.",
  alma: "Necesito cinco puntos de compasión o ayudar tanto al campamento como a los refugiados. Los viajeros podrán indicarnos por dónde pasó la caravana.",
} as const;
const FINDINGS = {
  elian:
    "Los mapas encajan. Saira cambió de ruta para acompañar a una familia; su carta señala un refugio, no una despedida.",
  vera: "Ese sello coincide con el de la reliquia. Ahora puedo demostrar qué piezas salieron del archivo de mi familia.",
  nadir:
    "Las lecturas coinciden con el registro de Mara. Su advertencia era correcta. Guardaré copias fuera del archivo para que nadie pueda borrarlas.",
  alma: "Los viajeros reconocen las señales de la caravana. Llegaron al refugio del sur. Están heridos, pero están vivos; ya puedo organizar su atención.",
} as const;
export function getPersonalChapter(wave: number, state: FracturaRunState): FracturaStoryEvent {
  const rival = getRival(state);
  const mission = PERSONAL_MISSIONS[rival.id];
  const active = state.companionQuest === "active";
  const ready = active && personalMissionReady(state);
  const finished = state.companionQuest === "resolved";
  const starting = !active && !finished;
  const resolve = (s: FracturaRunState) => {
    s.companionQuest = "resolved";
    s.flags.companionEvidenceShared = true;
    changeRelationship(s, 16, 5, -8);
  };
  const choices: FracturaStoryChoice[] = starting
    ? [
        {
          label: "Aceptar la misión",
          spoken: "Te ayudaré. Dime qué pruebas tenemos que reunir.",
          reply: REQUESTS[rival.id],
          hint: "Misión personal · Tónico",
          resultText: "La misión de " + rival.name + " queda activa en el Diario. Recibes un Tónico.",
          consumable: "tonic",
          apply: s => {
            s.companionQuest = "active";
            changeRelationship(s, 8, 0, -3);
          },
        },
        {
          label: "Investigar por mi cuenta",
          spoken: "Buscaré las pruebas, pero prefiero trabajar por mi cuenta.",
          reply: "De acuerdo. Avísame cuando encuentres algo que encaje con esta pista.",
          hint: "Misión personal · +2 investigación",
          resultText: "Guardas una copia de la pista. La misión sigue activa y avanzarán por separado.",
          apply: s => {
            s.companionQuest = "active";
            s.investigation += 2;
            changeRelationship(s, 1, 0, 5);
          },
        },
        {
          label: "Rechazar la petición",
          spoken: "No puedo comprometerme con eso. Necesito concentrarme en la expedición.",
          reply: "Gracias por decirlo con claridad. Continuaré buscando por mi cuenta.",
          hint: "Sin misión · 1 ficha",
          resultText: "Rechazas la misión. Conservas una ficha de los suministros compartidos.",
          tokens: 1,
          apply: s => {
            s.companionQuest = "declined";
          },
        },
      ]
    : ready
      ? [
          {
            label: "Compartir todas las pruebas",
            spoken: "Estas son las pruebas. Quiero que puedas terminar lo que empezaste.",
            reply: FINDINGS[rival.id],
            hint: "Misión completada · Permiso permanente",
            resultText:
              "Completas la misión de "
              + rival.name
              + ". Su recuerdo queda en tu perfil. El permiso de taller reduce en 1 ficha las recetas, también en futuras partidas.",
            unlockWorkshop: true,
            consumable: "ether",
            apply: resolve,
          },
          {
            label: "Pedir un intercambio justo",
            spoken: "Tengo las pruebas. Compártelas conmigo y preparemos el siguiente tramo.",
            reply: "Es un trato justo. Me quedaré con una copia y te entregaré mi permiso de taller.",
            hint: "Permiso permanente · 2 fichas",
            resultText: "Intercambian las pruebas. Desbloqueas el permiso permanente de taller y recibes dos fichas.",
            unlockWorkshop: true,
            tokens: 2,
            apply: s => {
              s.companionQuest = "resolved";
              changeRelationship(s, 8, 0, 4);
            },
          },
          {
            label: "Quedarme con las pruebas",
            spoken: "He decidido conservarlas. Todavía no confío en lo que harás con ellas.",
            reply:
              "Te pedí ayuda, no que decidieras qué parte de mi historia podía conocer. Buscaré otra forma de terminarla.",
            hint: "Misión cerrada · +18 rivalidad",
            resultText: "La misión se cierra sin el permiso de taller. Aumenta la rivalidad y conservas un Prisma.",
            consumable: "prism",
            apply: s => {
              s.companionQuest = "declined";
              changeRelationship(s, -12, 0, 18);
            },
          },
        ]
      : finished
        ? [
            {
              label: "Preguntar cómo sigue",
              spoken: "¿Qué harás ahora que ya tienes una respuesta?",
              reply:
                "Volveré al refugio al terminar. Quiero que las personas relacionadas con esta historia también conozcan el resultado.",
              hint: "+8 confianza · Reserva PP",
              resultText: "Hablan del siguiente paso. Recibes una Reserva de PP.",
              consumable: "ether",
              apply: s => changeRelationship(s, 8, 3, -2),
            },
            {
              label: "Preparar el siguiente combate",
              spoken: "Terminamos una tarea. Ahora quiero concentrarme en nuestro equipo.",
              reply:
                "Bien. Tengo un sello de repuesto. Nos será más útil en el próximo combate que guardado en mi bolsa.",
              hint: "Sello protector",
              resultText: "Organizan el equipo y guardas un Sello protector.",
              consumable: "shield",
              apply: () => {},
            },
            {
              label: "Despedirnos por ahora",
              spoken: "Me alegra que lo resolvieras. Nos veremos más adelante.",
              reply: "Hasta entonces. Las rutas siguen abiertas.",
              hint: "1 ficha",
              resultText: "Retomas el camino y conservas una ficha de la expedición.",
              tokens: 1,
              apply: () => {},
            },
          ]
        : [
            {
              label: "Revisar lo que falta",
              spoken: "Aún no tenemos todas las pruebas. Repasemos qué falta antes de seguir.",
              reply: REQUESTS[rival.id],
              hint: "Misión en curso · Reserva PP",
              resultText: "La misión sigue activa. El Diario indica las pruebas que faltan. Recibes una Reserva de PP.",
              consumable: "ether",
              apply: s => changeRelationship(s, 5, 0, -2),
            },
            {
              label: "Compartir mis notas",
              spoken: "Estas notas pueden ayudarnos a completar el registro.",
              reply:
                "Voy a compararlas con las pistas anteriores. No resolverán todo, pero ya tenemos una referencia más.",
              hint: "+2 investigación · +1 compasión",
              resultText: "Cruzan sus notas. La misión sigue activa hasta que compartas las pruebas en otra reunión.",
              apply: s => {
                s.investigation += 2;
                s.compassion++;
                changeRelationship(s, 4);
              },
            },
            {
              label: "Abandonar la misión",
              spoken: "No voy a continuar con esta búsqueda. Prefiero decírtelo ahora.",
              reply: "Lo entiendo. Me encargaré de lo que falta.",
              hint: "Misión cerrada · Remedio",
              resultText: "La misión queda rechazada. Conservas un Remedio para el equipo.",
              consumable: "remedy",
              apply: s => {
                s.companionQuest = "declined";
              },
            },
          ];
  const intro = starting
    ? rival.name
      + " abre una bolsa de documentos junto al camino. Hay una pista que no pertenece a la misión principal."
    : finished
      ? rival.name + " regresa con noticias de la búsqueda que completaron."
      : "Se detienen para comparar las pistas de " + mission.title.toLowerCase() + ".";
  return {
    id: "chapter-" + wave,
    afterWave: wave,
    title: mission.title,
    intro,
    choices,
    speaker: rival.name,
    portrait: rival.frame,
    question: starting
      ? "¿Quieres ayudarme con esta búsqueda?"
      : ready
        ? "¿Qué harás con las pruebas?"
        : finished
          ? "¿De qué quieres hablar ahora?"
          : "¿Quieres continuar con la búsqueda?",
    sceneProp: rival.id === "elian" ? 10 : rival.id === "vera" ? 11 : rival.id === "nadir" ? 9 : 1,
    dialogue: [
      { speaker: "narrator", text: intro, pose: 0 },
      {
        speaker: "rival",
        text: starting
          ? PERSONAL_HISTORY[rival.id]
          : ready
            ? "Tenemos las pruebas necesarias. Quiero verlas contigo antes de decidir qué hacer."
            : finished
              ? FINDINGS[rival.id]
              : "Todavía falta una parte del registro. Repasemos lo que necesitamos.",
        pose: state.relationship.rivalry >= 55 ? 2 : 1,
      },
      { speaker: "player", text: starting ? "¿Qué necesitas de mí?" : "¿Qué podemos hacer ahora?", pose: 0 },
      {
        speaker: "rival",
        text: starting
          ? REQUESTS[rival.id]
          : ready
            ? "¿Vas a compartir las pruebas conmigo?"
            : finished
              ? "Podemos hablar de lo que viene o preparar el equipo. ¿Qué prefieres?"
              : "Podemos revisar las pistas o dejarlo aquí. ¿Cómo quieres continuar?",
        pose: 1,
      },
    ],
  };
}
