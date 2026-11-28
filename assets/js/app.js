
"use strict";

function init() {
  const status = document.querySelector("#app-status");
  const container = document.querySelector("#dos");
  const startButton = document.querySelector("#start-arena");

  if (!status || !container || !startButton) {
    throw new Error("Elementos da aplicação não encontrados.");
  }

  // Códigos de teclado aceitos pelo CommandInterface do js-dos v8.
  const KEY = Object.freeze({
    UP: 265,
    DOWN: 264,
    LEFT: 263,
    RIGHT: 262,
    CTRL: 341,
    SHIFT: 340,
    RIGHT_SHIFT: 344,
    F1: 290,
    F2: 291,
    F3: 292,
    F4: 293,
    F8: 297,
    TAB: 258,
    SPACE: 32,
    GRAVE: 96,
  });

  // Layout alternativo: A/D deslocam lateralmente; Q/E giram a câmera.
  // O segundo conjunto de teclas em cada combinação é enviado ao DOS, não ao navegador.
  const KEYBOARD_MAP = Object.freeze({
    KeyQ: [KEY.LEFT],             // Girar à esquerda
    KeyW: [KEY.UP],               // Andar para frente
    KeyE: [KEY.RIGHT],            // Girar à direita
    KeyA: [KEY.CTRL, KEY.LEFT],   // Deslocar à esquerda
    KeyS: [KEY.DOWN],             // Andar para trás
    KeyD: [KEY.CTRL, KEY.RIGHT],  // Deslocar à direita

    KeyF: [65],                   // A: sacar/guardar arma
    KeyG: [85],                   // U: usar item
    KeyR: [82],                   // R: descansar
    KeyT: [83],                   // S: status
    KeyC: [67],                   // C: lançar magia
    Digit2: [KEY.RIGHT_SHIFT, 67], // Shift+C: repetir última magia
    KeyZ: [80],                   // P: furtar
    KeyX: [68],                   // D: soltar item
    KeyV: [74],                   // J: pulo vertical
    Space: [KEY.RIGHT_SHIFT, 74], // Shift+J: pulo longo
    KeyJ: [75],                   // K: diário
    KeyM: [77],                   // M: mapa local
    Backquote: [77],              // M: mapa local (~ no teclado US)
    KeyO: [KEY.RIGHT_SHIFT, 77], // Shift+M: mapa mundial
    Tab: [KEY.F1],                // F1: ficha / inventário

    // Atalhos do jogo mantidos com suas próprias teclas.
    F1: [KEY.F1],
    F2: [KEY.F2],
    F3: [KEY.F3],
    F4: [KEY.F4],
    F8: [KEY.F8],

    // Compartilham o mesmo controle de teclas pressionadas dos atalhos compostos.
    ShiftLeft: [KEY.SHIFT],
    ShiftRight: [KEY.RIGHT_SHIFT],
  });

  // Teclas de pontuação preservadas durante o modo de digitação.
  const PUNCTUATION = Object.freeze({
    Backquote: KEY.GRAVE,
    Minus: 45,
    Equal: 61,
    BracketLeft: 91,
    BracketRight: 93,
    Backslash: 92,
    Semicolon: 59,
    Quote: 39,
    Comma: 44,
    Period: 46,
    Slash: 47,
    Space: KEY.SPACE,
    Tab: KEY.TAB,
  });

  let ci = null;
  let typingMode = false;

  // Controla pressionamentos simultâneos para não soltar Ctrl/Shift cedo demais.
  const pressedPhysical = new Map();
  const pressedVirtual = new Map();

  function pressVirtual(keyCode) {
    const count = pressedVirtual.get(keyCode) ?? 0;

    if (count === 0) {
      ci.sendKeyEvent(keyCode, true);
    }

    pressedVirtual.set(keyCode, count + 1);
  }

  function releaseVirtual(keyCode) {
    const count = pressedVirtual.get(keyCode) ?? 0;

    if (count <= 1) {
      if (count === 1 && ci) {
        ci.sendKeyEvent(keyCode, false);
      }

      pressedVirtual.delete(keyCode);
    } else {
      pressedVirtual.set(keyCode, count - 1);
    }
  }

  function releasePhysical(code) {
    const keys = pressedPhysical.get(code);

    if (!keys) return;

    // Solta primeiro a tecla de ação, depois seus modificadores.
    for (const key of [...keys].reverse()) {
      releaseVirtual(key);
    }

    pressedPhysical.delete(code);
  }

  function releaseAll() {
    for (const code of [...pressedPhysical.keys()]) {
      releasePhysical(code);
    }
  }

  // Ctrl esquerdo restaura as letras e números originais para digitar no Arena.
  // O Ctrl físico não é enviado ao jogo nesse modo.
  function nativeTypingKey(code) {
    if (/^Key[A-Z]$/.test(code)) {
      return code.charCodeAt(3);
    }

    if (/^Digit[0-9]$/.test(code)) {
      return code.charCodeAt(5);
    }

    return PUNCTUATION[code] ?? null;
  }

  function handleKeyboard(event) {
    if (!ci || event.isComposing) return;

    // Não captura a digitação em formulários da própria página.
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest("input, textarea, select, [contenteditable]")
    ) {
      return;
    }

    if (event.code === "ControlLeft") {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.type === "keydown" && !typingMode) {
        releaseAll();
        typingMode = true;
      } else if (event.type === "keyup" && typingMode) {
        releaseAll();
        typingMode = false;
      }

      return;
    }

    // Preserva atalhos com Alt/Meta e solta comandos anteriores, se necessário.
    if (event.altKey || event.metaKey) {
      if (event.type === "keyup") {
        releasePhysical(event.code);
      }

      return;
    }

    const nativeCode = typingMode
      ? nativeTypingKey(event.code)
      : null;

    const keys = typingMode
      ? (nativeCode === null
          ? KEYBOARD_MAP[event.code]
          : [nativeCode])
      : KEYBOARD_MAP[event.code];

    if (!keys) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.type === "keydown") {
      // O evento repeat não deve gerar pressionamentos duplicados.
      if (pressedPhysical.has(event.code)) return;

      pressedPhysical.set(event.code, keys);
      keys.forEach(pressVirtual);
    } else if (event.type === "keyup") {
      releasePhysical(event.code);
    }
  }

  startButton.addEventListener("click", () => {
    if (typeof window.Dos !== "function") {
      status.textContent = "Biblioteca js-dos indisponível.";
      return;
    }

    startButton.disabled = true;
    status.textContent = "Carregando TES: Arena...";

    try {
      window.Dos(container, {
        url: "./private-game/arena.jsdos",
        autoStart: true,
        renderAspect: "4/3",

        onEvent: (event, commandInterface) => {
          if (event === "ci-ready") {
            releaseAll();
            ci = commandInterface;
            status.textContent = "Emulador pronto!";
          }
        },
      });
    } catch (error) {
      status.textContent = `Erro: ${error.message}`;
      console.error(error);
      startButton.disabled = false;
    }
  });

  // Captura as teclas antes dos listeners do player js-dos.
  window.addEventListener("keydown", handleKeyboard, true);
  window.addEventListener("keyup", handleKeyboard, true);

  // Evita movimento contínuo quando o navegador perde o foco.
  window.addEventListener("blur", () => {
    releaseAll();
    typingMode = false;
  });
}

init();
