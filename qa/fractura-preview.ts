import Phaser from "phaser";
import { queueFracturaArt } from "../src/fractura/assets";
import { BUILD_LABELS, CONSUMABLES, createFracturaRun, getRival, STORIES } from "../src/fractura/run-state";
import { drawCasinoView, drawRouteView, drawStoryView } from "../src/fractura/view";

class Preview extends Phaser.Scene {
  root: Phaser.GameObjects.Container;
  choice = 0;
  tab = 0;
  scenario = "routes";
  notice = "";
  preload() {
    queueFracturaArt(this);
  }
  create() {
    this.root = this.add.container(0, 0);
    document.querySelectorAll<HTMLButtonElement>("[data-scene]").forEach(
      button =>
        (button.onclick = () => {
          this.scenario = button.dataset.scene!;
          this.choice = 0;
          this.notice = "";
          this.draw();
        }),
    );
    this.draw();
  }
  draw() {
    const state = createFracturaRun("fractura-quality-preview");
    const rival = getRival(state);
    const select = (index: number) => {
      this.choice = index;
      this.notice = "";
      this.draw();
    };
    if (this.scenario === "routes" || this.scenario === "routes-many") {
      drawRouteView(this, this.root, 320, 180, {
        title: "Elegí tu siguiente destino",
        subtitle: "Obra · Próxima oleada 51",
        selected: this.choice,
        history: "Recorrido: Bosque → Metrópolis",
        options: [
          {
            label: "Centro de investigación",
            tag: "REFUGIO",
            description: "Refugio: Amuleto EXP + Tónico para la mochila. El descanso del bioma recupera al equipo.",
            color: 0x8dbaaa,
            environment: 2,
          },
          {
            label: "Ruinas abandonadas",
            tag: "HALLAZGO",
            description: "Depósito oculto: 1 Voucher + 1 Señuelo shiny para nuevos encuentros.",
            color: 0xc1a769,
            environment: 1,
          },
          {
            label: "Dojo",
            tag: "RIESGO",
            description: "Ruta peligrosa: 1 Voucher Plus. La primera oleada empieza con tormenta de arena.",
            color: 0xb77172,
            environment: 1,
          },
          ...(this.scenario === "routes-many"
            ? [
                {
                  label: "Lago",
                  tag: "REFUGIO",
                  description: "Una cuarta ruta aparece en la segunda página.",
                  color: 0x8dbaaa,
                  environment: 0,
                },
              ]
            : []),
        ],
        onSelect: select,
        onConfirm: () => {
          this.notice = "Ruta confirmada";
          this.audit();
        },
      });
    } else if (this.scenario.startsWith("story")) {
      const choiceStage = this.scenario === "story-choices";
      drawStoryView(this, this.root, 320, 180, {
        title: "Bajo las estrellas",
        subtitle: "El proyecto UMBRAL · Oleada 55",
        speaker: rival.name,
        portrait: rival.frame,
        environment: 0,
        text: choiceStage
          ? `¿Qué decidís? Tu elección queda guardada.\nVínculo con ${rival.name}: Cercanía.`
          : `${rival.name} te espera lejos del campamento. «Me preocupó no verte volver. ¿Qué somos cuando termina el combate?» Hablan de lo que dejaron atrás y del futuro de la expedición. El romance sigue siendo una decisión tuya, igual que la amistad y la enemistad.`,
        pageLabel: choiceStage ? "Decisión" : "Escena 1/2",
        selected: this.choice,
        choices: choiceStage
          ? [
              { label: "Quiero algo más con vos", hint: "Romance opcional · +25 afecto" },
              { label: "Te quiero como compañero", hint: "+20 confianza · Tónico" },
              { label: "Voy a ser tu peor enemigo", hint: "Enemistad · +30 rivalidad" },
            ]
          : [],
        onSelect: select,
        onContinue: () => {
          this.scenario = "story-choices";
          this.draw();
        },
        onConfirm: () => {
          this.notice = "Decisión confirmada";
          this.audit();
        },
      });
    } else {
      if (this.scenario === "casino-result") {
        this.notice = "Necesitás 1 Voucher normal. Ganás vouchers cada 10 oleadas.";
      }
      drawCasinoView(this, this.root, 320, 180, {
        tab: this.tab,
        selected: this.choice,
        vouchers: 12,
        tokens: 7,
        result: this.notice,
        inventory: Object.values(CONSUMABLES).map(item => ({ name: item.short, count: 3, detail: item.description })),
        relationshipTitle: `${rival.name} · Romance`,
        rivalFrame: rival.frame,
        relationshipLines: [
          rival.role,
          "Confianza 65 · Afecto 55",
          "Enemistad 12 · Romance elegido",
          STORIES[state.storyId].title,
          `Build: ${BUILD_LABELS.recovery}`,
          "Reliquia: Coraza · daño −10%",
        ],
        palette: "Índigo",
        onTab: tab => {
          this.tab = tab;
          this.choice = 0;
          this.notice = "";
          this.scenario = "casino";
          this.draw();
        },
        onSelect: select,
        onAction: () => {
          this.notice =
            this.tab === 0
              ? "Ganaste: Kit de expedición."
              : this.tab === 1
                ? "¡Acertaste! +2 fichas y Tónico."
                : "Señuelo activo para nuevos encuentros hasta oleada 56.";
          this.draw();
        },
        onPalette: () => {},
        onBack: () => {
          this.scenario = "routes";
          this.draw();
        },
      });
    }
    this.audit();
  }
  audit() {
    const texts: Phaser.GameObjects.Text[] = [];
    const visit = (object: Phaser.GameObjects.GameObject) => {
      if (object instanceof Phaser.GameObjects.Container) {
        object.list.forEach(visit);
      } else if (object instanceof Phaser.GameObjects.Text) {
        texts.push(object);
      }
    };
    visit(this.root);
    const issues: string[] = [];
    texts.forEach(text => {
      const b = text.getBounds();
      if (b.x < -0.5 || b.y < -0.5 || b.right > 320.5 || b.bottom > 180.5) {
        issues.push(`Fuera del lienzo: ${text.text}`);
      }
    });
    texts.forEach((a, i) =>
      texts.slice(i + 1).forEach(b => {
        const ba = a.getBounds();
        const bb = b.getBounds();
        const overlapX = Math.min(ba.right, bb.right) - Math.max(ba.x, bb.x);
        const overlapY = Math.min(ba.bottom, bb.bottom) - Math.max(ba.y, bb.y);
        if (overlapX > 0.6 && overlapY > 0.6) {
          issues.push(`Textos superpuestos: ${a.text} / ${b.text}`);
        }
      }),
    );
    document.getElementById("qa-status")!.textContent =
      `${this.scenario} · ${texts.length} textos\n${issues.length > 0 ? issues.join("\n") : "Sin textos fuera de pantalla ni superpuestos"}\n${this.notice}`;
  }
}

new Phaser.Game({
  type: Phaser.CANVAS,
  width: 320,
  height: 180,
  parent: "game",
  backgroundColor: "#101724",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Preview,
});
