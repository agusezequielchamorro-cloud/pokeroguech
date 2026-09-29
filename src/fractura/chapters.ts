import type { FracturaRunState } from "./run-state";
import { changeRelationship, getRival, relationshipLabel, STORIES } from "./run-state";
import type { FracturaStoryChoice, FracturaStoryEvent } from "./story";

export const FRACTURA_EVENT_WAVES = [1, 8, 10, 15, 20, 25, 30, 40, 49, 55, 60, 75, 95, 145, 195];

/** Three authored story families, assembled with the seeded rival and consequences of earlier choices. */
export function getFracturaChapter(wave: number, state: FracturaRunState): FracturaStoryEvent | undefined {
  const rival = getRival(state);
  const story = STORIES[state.storyId];
  const hostile = state.relationship.rivalry >= 55;
  const close = relationshipLabel(state) === "Romance";
  const event = (
    title: string,
    intro: string,
    choices: FracturaStoryChoice[],
    environment: number = story.environment,
  ): FracturaStoryEvent => ({
    id: `chapter-${wave}`,
    afterWave: wave,
    title,
    intro,
    choices,
    environment,
    speaker: rival.name,
    portrait: rival.frame,
  });
  const trust = (s: FracturaRunState) => changeRelationship(s, 16, 5, -8);
  const oppose = (s: FracturaRunState) => changeRelationship(s, -10, 0, 24);

  if (wave === 1) {
    const openings = {
      umbral:
        "Una señal corta todas las comunicaciones. UMBRAL está experimentando con Pokémon en laboratorios ocultos. Una expedición de entrenadores adultos sale a investigar.",
      invasion:
        "Dos facciones se disputan la región. Los refugios están aislados y los Pokémon huyen de las ciudades. Tu expedición debe decidir a quién proteger.",
      eclipse:
        "El sol desaparece por unos segundos. Bajo las ruinas despierta una presencia antigua. Cada anomalía alimenta una grieta que amenaza con tragarse la región.",
    };
    return event(
      story.title,
      `${openings[state.storyId]} Tu rival de esta expedición es ${rival.name}, ${rival.role.toLowerCase()}, de ${rival.age} años. «${rival.greeting}»`,
      [
        {
          label: "Hagamos esto juntos",
          hint: "+16 confianza · Tónico",
          resultText: `${rival.name} acepta compartir información. Recibís un Tónico de campamento. Lo encontrás en Casino Fractura > Mochila.`,
          consumable: "tonic",
          apply: trust,
        },
        {
          label: "Que gane el mejor",
          hint: "+8 rivalidad · 2 fichas",
          resultText: "Acuerdan una competencia justa. Ganás dos fichas para Sol o Luna en el Casino Fractura.",
          tokens: 2,
          apply: s => changeRelationship(s, 3, 0, 8),
        },
        {
          label: "No te metas en mi camino",
          hint: "+24 enemistad · Sello",
          resultText: `${rival.name} retrocede y toma nota de tu advertencia. Encontrás un Sello protector entre los suministros.`,
          consumable: "shield",
          apply: oppose,
        },
      ],
      0,
    );
  }
  if (wave === 8) {
    return event(
      "El primer desencuentro",
      `${rival.name} llega antes que vos a un puente roto. ${hostile ? "La tensión entre ustedes hace imposible confiar sin negociar." : "Un Pokémon herido impide el paso y la anomalía se acerca."} Hay tiempo para una sola decisión.`,
      [
        {
          label: "Ayudar y compartir el hallazgo",
          hint: "+16 confianza · Señuelo",
          resultText:
            "Salvan al Pokémon. Tu rival comparte un Señuelo prisma: duplica las probabilidades shiny de cinco oleadas salvajes.",
          consumable: "lure",
          apply: s => {
            trust(s);
            s.compassion += 2;
          },
        },
        {
          label: "Tomar el atajo en solitario",
          hint: "+12 rivalidad · Voucher Plus",
          resultText: "Encontrás un Voucher Plus al otro lado. Tu rival recuerda que priorizaste avanzar.",
          reward: "VOUCHER_PLUS",
          apply: s => changeRelationship(s, -4, 0, 12),
        },
        {
          label: "Sabotear su paso",
          hint: "+24 enemistad · Prisma",
          resultText:
            "Recuperás un Prisma de reinvención. Tu rival promete devolverte la jugada. Con enemistad 55+, sus ataques harán 15% más daño.",
          consumable: "prism",
          apply: s => {
            oppose(s);
            s.flags.rivalSabotaged = true;
          },
        },
      ],
      1,
    );
  }
  if (wave === 10) {
    const signals = {
      umbral: "Interceptás una transmisión de UMBRAL. Sus cápsulas se trasladan hacia un laboratorio oculto.",
      invasion:
        "Un mensaje pide ayuda: una ciudad está a punto de quedarse sin suministros. Dos facciones ofrecen rutas distintas.",
      eclipse: "Una grieta aparece junto al camino. En su interior hay un símbolo que responde a tus Pokémon.",
    };
    return event("Una señal en el camino", signals[state.storyId], [
      {
        label: "Investigar la señal",
        hint: "Datos · Voucher Plus",
        resultText: "Guardás las coordenadas. Las pistas cambiarán el encuentro de la oleada 30.",
        reward: "VOUCHER_PLUS",
        apply: s => {
          s.investigation += 3;
          s.flags.followedSignal = true;
        },
      },
      {
        label: "Proteger a quienes huyen",
        hint: "+confianza · Tónico",
        resultText: "El refugio sobrevive. Tu rival ve que puede contar con vos cuando la situación empeora.",
        consumable: "tonic",
        apply: s => {
          trust(s);
          s.compassion += 3;
          s.flags.helpedRefugees = true;
        },
      },
      {
        label: "Perseguir el origen",
        hint: "Desafío · 3 fichas",
        resultText:
          "Seguís el rastro antes de que desaparezca. Encontrás tres fichas de casino en una mochila abandonada.",
        tokens: 3,
        apply: s => {
          s.defiance += 3;
          s.flags.huntedUmbral = true;
        },
      },
    ]);
  }
  if (wave === 20) {
    return event(
      "Campamento al anochecer",
      `${rival.name} comparte un refugio con vos. ${state.flags.helpedRefugees ? "Los refugiados que ayudaste traen mapas de la zona." : "A lo lejos se ve una columna de humo."} Podés preparar el siguiente tramo o dedicarle tiempo a tu rival.`,
      [
        {
          label: "Estudiar los mapas",
          hint: "Mapa · Pista para oleada 40",
          resultText: "Anotás una ruta oculta. En la oleada 40 podrás recuperar un depósito que otros no encuentran.",
          reward: "MAP",
          apply: s => {
            s.investigation += 2;
            s.flags.campMapped = true;
          },
        },
        {
          label: "Cuidar a los heridos juntos",
          hint: "+confianza · Curación completa",
          resultText: `${rival.name} te ayuda a recuperar al equipo. Los refugiados recordarán tu decisión en la oleada 40.`,
          healParty: true,
          apply: s => {
            trust(s);
            s.compassion += 2;
            s.flags.campHelped = true;
          },
        },
        {
          label: "Conversar junto al fuego",
          hint: "+15 afecto · Sello",
          resultText:
            "Hablan de lo que dejaron atrás. Un silencio cómodo reemplaza la competencia por unos minutos. Recibís un Sello protector. El romance seguirá siendo una elección tuya.",
          consumable: "shield",
          apply: s => {
            changeRelationship(s, 12, 15, -6);
            s.flags.campPrepared = true;
          },
        },
      ],
      0,
    );
  }
  if (wave === 30) {
    const scenes = {
      umbral: state.flags.followedUmbralRoute
        ? "La ruta peligrosa te lleva a un laboratorio activo de UMBRAL. Hay Pokémon dentro de las cápsulas."
        : "Las coordenadas terminan en un laboratorio abandonado. Algunas cápsulas siguen encendidas.",
      invasion:
        "Una ciudad ocupada esconde un almacén de suministros. La guardia protege la comida antes que a los habitantes.",
      eclipse:
        "En las ruinas hay un altar y tres conductos. Abrirlos alimentaría la grieta, pero sellarlos consume energía.",
    };
    return event(
      state.storyId === "umbral"
        ? "El laboratorio"
        : state.storyId === "invasion"
          ? "La ciudad ocupada"
          : "El altar abierto",
      scenes[state.storyId],
      [
        {
          label: "Robar la información",
          hint: "Datos · Voucher Plus",
          resultText:
            "Conseguís el plano del dispositivo de la oleada 50. Podrás modificar su clima antes de combatir.",
          reward: "VOUCHER_PLUS",
          apply: s => {
            s.investigation += 3;
            s.flags.stoleLabData = true;
          },
        },
        {
          label: "Rescatar a los cautivos",
          hint: "+confianza · Amuleto Shiny",
          resultText:
            "La evacuación funciona. Tu rival empieza a confiar en tu forma de dirigir. Un viajero te entrega un Amuleto Shiny.",
          reward: "SHINY_CHARM",
          apply: s => {
            trust(s);
            s.compassion += 3;
            s.flags.freedLabPokemon = true;
            s.flags.citySaved = true;
          },
        },
        {
          label: "Destruir el dispositivo",
          hint: "Sabotaje · Amuleto Habilidad",
          resultText:
            "La instalación queda inutilizada. Conservás un componente útil, pero tu rival considera que asumiste demasiado riesgo.",
          reward: "ABILITY_CHARM",
          apply: s => {
            s.defiance += 3;
            s.flags.sabotagedUmbralLab = true;
            changeRelationship(s, -5, 0, 14);
          },
        },
      ],
    );
  }
  if (wave === 40) {
    const payoff = state.flags.campMapped
      ? "Tus mapas revelan un depósito oculto."
      : state.flags.campHelped
        ? "Los refugiados vuelven con suministros: tu ayuda cambió su destino."
        : "Las provisiones del campamento alcanzan para interceptar un convoy.";
    return event(
      "Lo que dejaste atrás",
      `${payoff} ${state.flags.citySaved ? "La ciudad que salvaste ofrece un lugar seguro." : "La zona sigue bajo amenaza."} ${rival.name} te pregunta qué van a hacer con el hallazgo.`,
      [
        {
          label: "Compartir los suministros",
          hint: "+confianza · 2 consumibles",
          resultText:
            "Tu rival recibe parte de los recursos. Guardás un Tónico y un Señuelo en la mochila. La próxima batalla clave podrá empezar con lluvia.",
          consumable: "tonic",
          extraConsumable: "lure",
          apply: s => {
            trust(s);
            s.flags.escortedRefugees = true;
            s.flags.bossForcedRain = true;
          },
        },
        {
          label: "Usarlo para la expedición",
          hint: "Voucher Plus · 3 fichas",
          resultText: "Preparás tu equipo. Ganás un Voucher Plus y tres fichas de casino.",
          reward: "VOUCHER_PLUS",
          tokens: 3,
          apply: s => {
            s.investigation += 2;
            s.flags.foundUmbralCache = true;
          },
        },
        {
          label: "Quedarte con todo",
          hint: "+24 enemistad · 2 Sellos",
          resultText: `${rival.name} se marcha sin despedirse. Guardás dos Sellos protectores. La rivalidad tendrá consecuencias en sus próximos combates.`,
          consumable: "shield",
          extraConsumable: "shield",
          apply: oppose,
        },
      ],
      state.storyId === "umbral" ? 2 : 1,
    );
  }
  if (wave === 49) {
    return event(
      "Antes de la tormenta",
      `${story.title}: el próximo campo de batalla está conectado a un dispositivo. Lo que investigaste permite intervenir. ${hostile ? `${rival.name} se niega a ayudarte.` : `${rival.name} espera tu decisión.`}`,
      [
        {
          label: "Aplicar nuestro plan",
          hint: "Clima según tus decisiones",
          resultText:
            "El plan usa tus descubrimientos: rescates traen lluvia; sabotajes traen arena; en otro caso, sol. La alteración ocurre en la oleada 50.",
          reward: "VOUCHER_PLUS",
          apply: s => {
            s.flags.bossUsedPlan = true;
            s.flags.bossForcedStorm = false;
            s.flags.bossForcedRain = false;
          },
        },
        {
          label: "Romper el generador",
          hint: "Tormenta de arena · Sello",
          resultText: "El generador estalla. En la oleada 50 habrá tormenta de arena. Recibís un Sello protector.",
          consumable: "shield",
          apply: s => {
            s.flags.bossForcedStorm = true;
            s.flags.bossForcedRain = false;
          },
        },
        {
          label: "Abrir el refrigerante",
          hint: "Lluvia · Señuelo",
          resultText: "La lluvia enfría el campo antes de la batalla de la oleada 50. Encontrás un Señuelo prisma.",
          consumable: "lure",
          apply: s => {
            s.flags.bossForcedRain = true;
            s.flags.bossForcedStorm = false;
          },
        },
      ],
    );
  }
  if (wave === 55) {
    return event(
      hostile ? "Una tregua difícil" : "Bajo las estrellas",
      hostile
        ? `${rival.name} recuerda el puente y los suministros. «No puedo confiar en vos. Pero todavía podemos cambiar esto».`
        : `${rival.name} te espera lejos del campamento. «Me preocupó no verte volver. ¿Qué somos cuando termina el combate?»`,
      [
        {
          label: "Quiero algo más con vos",
          hint: "Romance opcional · +25 afecto",
          resultText: hostile
            ? "Tu rival acepta hablar, pero necesita recuperar la confianza antes de acercarse. El romance no borra lo ocurrido."
            : "Se toman de la mano. Deciden conocer lo que existe fuera de la competencia, sin apresurarlo.",
          reward: "VOUCHER_PLUS",
          apply: s => {
            s.relationship.romance = true;
            s.flags.rivalRomance = true;
            s.flags.rivalTruce = true;
            changeRelationship(s, 20, 25, -25);
          },
        },
        {
          label: "Te quiero como compañero",
          hint: "Amistad · +20 confianza",
          resultText: "Acuerdan una alianza sin romance. Tu rival comparte un Tónico y promete volver a encontrarte.",
          consumable: "tonic",
          apply: s => {
            s.relationship.romance = false;
            s.flags.rivalRomance = false;
            s.flags.rivalTruce = true;
            changeRelationship(s, 20, 0, -20);
          },
        },
        {
          label: "Voy a ser tu peor enemigo",
          hint: "Enemistad · +30 rivalidad",
          resultText:
            "El desafío queda dicho. A partir de 55 puntos de enemistad, los ataques de tu rival harán 15% más daño. La próxima reunión tendrá otro tono.",
          consumable: "prism",
          apply: s => {
            s.relationship.romance = false;
            s.flags.rivalRomance = false;
            changeRelationship(s, -20, 0, 30);
          },
        },
      ],
      0,
    );
  }
  if (wave === 60) {
    return event(
      "La fractura responde",
      `${state.storyId === "umbral" ? "UMBRAL pierde el control de sus cápsulas." : state.storyId === "invasion" ? "Una nueva brecha divide la ciudad." : "La presencia del eclipse abre los ojos."} ${state.flags.citySaved ? "Los habitantes que salvaste ayudan a evacuar." : "No hay refugio cercano."}`,
      [
        {
          label: "Estabilizar la grieta",
          hint: "Sello · +confianza",
          resultText: "La zona se vuelve transitable. Tu rival respeta que hayas elegido protegerla.",
          consumable: "shield",
          apply: s => {
            s.flags.stabilizedFracture = true;
            s.compassion += 3;
            trust(s);
          },
        },
        {
          label: "Explorar su interior",
          hint: "Amuleto Shiny · Riesgo",
          resultText: "Encontrás energía rara. Conseguís un Amuleto Shiny; la grieta permanece abierta.",
          reward: "SHINY_CHARM",
          apply: s => {
            s.flags.enteredFracture = true;
            s.defiance += 3;
          },
        },
        {
          label: "Marcarla y seguir la pista",
          hint: "Voucher Plus · Datos",
          resultText: "Dejás un marcador y seguís las señales. Tendrás más información en el reencuentro.",
          reward: "VOUCHER_PLUS",
          apply: s => {
            s.flags.trackedUmbral = true;
            s.investigation += 3;
          },
        },
      ],
    );
  }
  if (wave === 75) {
    return event(
      "La casa de las dos lunas",
      "Un casino ambulante abre sus puertas entre las ruinas. No acepta dinero real: usa fichas de expedición. Su dueño ofrece suministros o una apuesta. También podés jugar desde el menú Casino Fractura.",
      [
        {
          label: "Tomar el kit seguro",
          hint: "Tónico + Sello",
          resultText: "Elegís recursos seguros. Se guardan en la mochila permanente.",
          consumable: "tonic",
          extraConsumable: "shield",
          apply: () => {},
        },
        {
          label: "Aceptar fichas de juego",
          hint: "6 fichas · Sol o Luna",
          resultText:
            "Recibís seis fichas. En Sol o Luna apostás una: 50% de ganar dos fichas y un consumible; 50% de perderla.",
          tokens: 6,
          apply: s => {
            s.flags.visitedCasino = true;
          },
        },
        {
          label: "Comprar la información",
          hint: "Amuleto Habilidad",
          resultText: "El dueño comparte lo que sabe de la anomalía. Conseguís un Amuleto Habilidad.",
          reward: "ABILITY_CHARM",
          apply: s => {
            s.investigation += 2;
          },
        },
      ],
      3,
    );
  }
  if (wave === 95 || wave === 145) {
    return event(
      hostile ? "El desafío que no termina" : close ? "Volver a encontrarte" : "La promesa del camino",
      `${hostile ? `${rival.name} viene a cobrar las decisiones que tomaste. «No pienso dejarte controlar esta expedición».` : close ? `${rival.name} te abraza al llegar. «Cada vez que nos separamos, pienso en este momento».` : `${rival.name} trae mapas nuevos. «Todavía quiero ver hasta dónde llegás».`} ${state.flags.stabilizedFracture ? "La grieta que sellaste sigue estable." : "La anomalía sigue creciendo."}`,
      [
        {
          label: close ? "Elegir un futuro juntos" : "Reconstruir la confianza",
          hint: "+20 confianza · +15 afecto",
          resultText:
            "Eligen seguir hablando y asumir lo que pasó. Tu rival comparte un Tónico y un Sello. Ninguna decisión borra automáticamente la enemistad.",
          consumable: "tonic",
          extraConsumable: "shield",
          apply: s => {
            changeRelationship(s, 20, s.relationship.romance ? 15 : 0, -20);
            s.flags.rivalTrusted = true;
          },
        },
        {
          label: "Competir con respeto",
          hint: "Voucher Plus · Alianza",
          resultText: "Acuerdan reglas claras. Tu rival sigue creciendo con su equipo durante la expedición.",
          reward: "VOUCHER_PLUS",
          apply: s => changeRelationship(s, 10, 0, -10),
        },
        {
          label: "Romper el acuerdo",
          hint: "+25 enemistad · Prisma",
          resultText:
            "Se separan con una promesa de revancha. Guardás un Prisma para cambiar tu build antes del siguiente tramo.",
          consumable: "prism",
          apply: s => {
            oppose(s);
            s.flags.rivalTrusted = false;
          },
        },
      ],
      1,
    );
  }
  if (wave === 195) {
    return event(
      "La última promesa",
      `${story.goal}. El desenlace está cerca. ${hostile ? `${rival.name} promete enfrentarte una vez más.` : close ? `${rival.name} te toma la mano: «Volvé. Nos falta una vida por conocer».` : `${rival.name} se queda a tu lado: «Terminemos lo que empezamos».`}`,
      [
        {
          label: "Proteger lo que construimos",
          hint: "Curación completa · Final de alianza",
          resultText:
            "El equipo recupera sus fuerzas. La expedición deja constancia de tu alianza, y la decisión queda guardada en esta run.",
          healParty: true,
          apply: s => {
            s.flags.endingAlliance = true;
            changeRelationship(s, 15, s.relationship.romance ? 15 : 0, -10);
          },
        },
        {
          label: "Buscar todas las respuestas",
          hint: "Amuleto Habilidad · Final de investigación",
          resultText:
            "Guardás los datos para que nadie repita lo ocurrido. Una pieza experimental mejora tus recursos.",
          reward: "ABILITY_CHARM",
          apply: s => {
            s.flags.endingDiscovery = true;
            s.investigation += 5;
          },
        },
        {
          label: "Conseguir la victoria a cualquier costo",
          hint: "2 Sellos · Final de desafío",
          resultText:
            "La competencia se convierte en tu objetivo. La historia conserva esa elección para el final de la expedición.",
          consumable: "shield",
          extraConsumable: "shield",
          apply: s => {
            s.flags.endingDefiance = true;
            s.defiance += 5;
          },
        },
      ],
    );
  }
  return undefined;
}
