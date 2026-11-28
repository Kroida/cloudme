
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
  const KEYBOARD_MAP = Object.freeze({
    Escape: [256],                 // Esc diretamente ao Arena
    KeyQ: [KEY.LEFT],              // Girar à esquerda
    KeyW: [KEY.UP],                // Andar para frente
    KeyE: [KEY.RIGHT],             // Girar à direita
    KeyA: [KEY.CTRL, KEY.LEFT],    // Deslocar à esquerda
    KeyS: [KEY.DOWN],              // Andar para trás
    KeyD: [KEY.CTRL, KEY.RIGHT],   // Deslocar à direita

    KeyF: [65],                    // Sacar/guardar arma
    KeyG: [85],                    // Usar item
    KeyR: [82],                    // Descansar
    KeyT: [83],                    // Status
    KeyC: [67],                    // Lançar magia
    Digit2: [KEY.RIGHT_SHIFT, 67], // Repetir última magia
    KeyZ: [80],                    // Furtar
    KeyX: [68],                    // Soltar item
    KeyV: [74],                    // Pulo vertical
    Space: [KEY.RIGHT_SHIFT, 74],  // Pulo longo
    KeyJ: [75],                    // Diário
    KeyM: [77],                    // Mapa local
    Backquote: [77],               // Mapa local
    KeyO: [KEY.RIGHT_SHIFT, 77],  // Mapa mundial
    Tab: [KEY.F1],                 // Ficha do personagem

    // Atalhos originais.
    F1: [KEY.F1],
    F2: [KEY.F2],
    F3: [KEY.F3],
    F4: [KEY.F4],
    F8: [KEY.F8],

    ShiftLeft: [KEY.SHIFT],
    ShiftRight: [KEY.RIGHT_SHIFT],
  });

  // Teclas preservadas durante a digitação.
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

  // Controla teclas simultâneas e seus modificadores.
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

    // Solta primeiro a ação e depois os modificadores.
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

  // Ctrl esquerdo permite digitar normalmente no jogo.
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

    // Ignora campos de formulário da página.
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest(
        "input, textarea, select, [contenteditable]"
      )
    ) {
      return;
    }

    if (event.code === "ControlLeft") {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.type === "keydown" && !typingMode) {
        releaseAll();
        typingMode = true;
      } else if (
        event.type === "keyup" &&
        typingMode
      ) {
        releaseAll();
        typingMode = false;
      }

      return;
    }

    // Preserva atalhos do navegador com Alt/Meta.
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
      ? (
          nativeCode === null
            ? KEYBOARD_MAP[event.code]
            : [nativeCode]
        )
      : KEYBOARD_MAP[event.code];

    if (!keys) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.type === "keydown") {
      // Impede pressionamentos duplicados.
      if (pressedPhysical.has(event.code)) return;

      pressedPhysical.set(event.code, keys);
      keys.forEach(pressVirtual);
    } else if (event.type === "keyup") {
      releasePhysical(event.code);
    }
  }

  // Inicialização do TES: Arena.
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

        // Reduz os controles de interface do player.
        kiosk: true,

        // Desativa a captura exclusiva do mouse.
        mouseCapture: false,

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

  // Captura as teclas antes dos listeners do js-dos.
  window.addEventListener(
    "keydown",
    handleKeyboard,
    true
  );

  window.addEventListener(
    "keyup",
    handleKeyboard,
    true
  );

  // Evita teclas presas quando a janela perde o foco.
  window.addEventListener("blur", () => {
    releaseAll();
    typingMode = false;
  });
}

init();
