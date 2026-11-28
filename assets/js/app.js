
"use strict";

// Runtime fixado para evitar mudanças silenciosas causadas por /latest/.
// A distribuição oficial usa o padrão /8.xx/<versão>/.
const PINNED_RUNTIME = "https://v8.js-dos.com/8.xx/8.5.3";
const LATEST_RUNTIME = "https://v8.js-dos.com/latest";

function loadAsset(tag, url) {
  return new Promise((resolve, reject) => {
    const element = document.createElement(tag);
    element.crossOrigin = "anonymous";
    if (tag === "script") element.src = url;
    else { element.rel = "stylesheet"; element.href = url; }
    const timeout = setTimeout(() => fail(), 20000);
    function fail() {
      clearTimeout(timeout);
      element.remove();
      reject(new Error(`Falha ao carregar ${url}`));
    }
    element.onload = () => { clearTimeout(timeout); resolve(element); };
    element.onerror = fail;
    document.head.append(element);
  });
}

async function loadRuntime() {
  // Se a distribuição fixa estiver indisponível, usa a CDN oficial documentada.
  const candidates = new URLSearchParams(location.search).get("runtime") === "latest"
    ? [LATEST_RUNTIME] : [PINNED_RUNTIME, LATEST_RUNTIME];
  let lastError;
  for (const base of candidates) {
    let stylesheet;
    try {
      stylesheet = await loadAsset("link", `${base}/js-dos.css`);
      await loadAsset("script", `${base}/js-dos.js`);
      if (typeof window.Dos !== "function") throw new Error("Dos() não encontrado.");
      return base;
    } catch (error) {
      stylesheet?.remove();
      lastError = error;
      console.warn("[Cloudme] runtime indisponível:", base, error);
    }
  }
  throw lastError;
}

// Isolamento por Service Worker, com apenas uma recarga automática por tentativa.
async function prepareIsolation() {
  if (window.crossOriginIsolated) return false;
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return false;
  const key = `cloudme-coi-reload:${location.pathname}`;
  if (sessionStorage.getItem(key)) return false;
  try {
    await navigator.serviceWorker.register("./coi-sw.js", { scope: "./" });
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          navigator.serviceWorker.removeEventListener("controllerchange", onChange);
          reject(new Error("Service Worker não assumiu o controle."));
        }, 8000);
        function onChange() {
          clearTimeout(timer);
          navigator.serviceWorker.removeEventListener("controllerchange", onChange);
          resolve();
        }
        navigator.serviceWorker.addEventListener("controllerchange", onChange);
        if (navigator.serviceWorker.controller) onChange();
      });
    }
    sessionStorage.setItem(key, "1");
    location.reload();
    return true;
  } catch (error) {
    console.warn("[Cloudme] isolamento indisponível:", error);
    return false;
  }
}

// IndexedDB guarda somente os arquivos modificados, não o estado da CPU.
const dbPromise = new Promise((resolve, reject) => {
  const request = indexedDB.open("cloudme-heyming-saves", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("changes");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
// Evita rejeição não tratada se o armazenamento estiver bloqueado.
dbPromise.catch(error => console.warn("[Cloudme] IndexedDB:", error));

async function saveTransaction(mode, operation) {
  const db = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx = db.transaction("changes", mode);
    const request = operation(tx.objectStore("changes"));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Transação interrompida."));
  });
}
async function readSave(key) {
  const data = await saveTransaction("readonly", store => store.get(key));
  return data == null ? null : new Uint8Array(data);
}
async function writeSave(key, data) {
  await saveTransaction("readwrite", store => store.put(new Uint8Array(data), key));
}
async function deleteSave(key) {
  await saveTransaction("readwrite", store => store.delete(key));
}


async function init() {
  const status = document.querySelector("#app-status");
  const container = document.querySelector("#dos");
  const startButton = document.querySelector("#start-arena");
  const renderer = document.querySelector("#renderer");
  const capture = document.querySelector("#capture");
  const saveButton = document.querySelector("#save-arena");
  const fullscreenButton = document.querySelector("#fullscreen-arena");
  const diagnostics = document.querySelector("#diagnostics");
  let player = null;
  let runtimeBase = null;
  let loadingTimer = null;

  if (!status || !container || !startButton) {
    throw new Error("Elementos da aplicação não encontrados.");
  }

  // Códigos de teclado utilizados pelo js-dos v8.
  const KEY = Object.freeze({
    ESCAPE: 256,
    BACKSPACE: 259,
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

  // Layout alternativo dos controles do TES: Arena.
  const KEYBOARD_MAP = Object.freeze({
    // Movimentação.
    KeyQ: [KEY.LEFT],
    KeyW: [KEY.UP],
    KeyE: [KEY.RIGHT],
    KeyA: [KEY.CTRL, KEY.LEFT],
    KeyS: [KEY.DOWN],
    KeyD: [KEY.CTRL, KEY.RIGHT],

    // Interações.
    KeyF: [65],
    KeyG: [85],
    KeyR: [82],
    KeyT: [83],
    KeyC: [67],
    Digit2: [KEY.RIGHT_SHIFT, 67],
    KeyZ: [80],
    KeyX: [68],

    // Saltos.
    KeyV: [74],
    Space: [KEY.RIGHT_SHIFT, 74],

    // Mapas e menus.
    KeyJ: [75],
    KeyM: [77],
    Backquote: [77],
    KeyO: [KEY.RIGHT_SHIFT, 77],
    Tab: [KEY.F1],

    // Correção da captura do mouse.
    Backspace: [KEY.ESCAPE],

    // Atalhos originais.
    F1: [KEY.F1],
    F2: [KEY.F2],
    F3: [KEY.F3],
    F4: [KEY.F4],
    F8: [KEY.F8],

    // Modificadores.
    ShiftLeft: [KEY.SHIFT],
    ShiftRight: [KEY.RIGHT_SHIFT],
  });

  // Caracteres preservados durante a digitação.
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

  // Registra teclas físicas e virtuais pressionadas.
  const pressedPhysical = new Map();
  const pressedVirtual = new Map();

  // Envia uma tecla pressionada ao emulador.
  function pressVirtual(keyCode) {
    const count = pressedVirtual.get(keyCode) ?? 0;

    if (count === 0) {
      ci.sendKeyEvent(keyCode, true);
    }

    pressedVirtual.set(keyCode, count + 1);
  }

  // Libera uma tecla virtual anteriormente pressionada.
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

  // Libera as teclas associadas a uma tecla física.
  function releasePhysical(code) {
    const keys = pressedPhysical.get(code);

    if (!keys) return;

    for (const key of [...keys].reverse()) {
      releaseVirtual(key);
    }

    pressedPhysical.delete(code);
  }

  // Libera todos os comandos ativos.
  function releaseAll() {
    for (const code of [...pressedPhysical.keys()]) {
      releasePhysical(code);
    }
  }

  // Restaura as teclas originais no modo de digitação.
  function nativeTypingKey(code) {
    if (/^Key[A-Z]$/.test(code)) {
      return code.charCodeAt(3);
    }

    if (/^Digit[0-9]$/.test(code)) {
      return code.charCodeAt(5);
    }

    // Mantém Backspace como apagar texto.
    if (code === "Backspace") {
      return KEY.BACKSPACE;
    }

    return PUNCTUATION[code] ?? null;
  }

  // Intercepta eventos e aplica os controles personalizados.
  function handleKeyboard(event) {
    if (!ci || event.isComposing) return;

    const target = event.target;

    // Preserva os campos de formulário da aplicação.
    if (
      target instanceof Element &&
      target.closest(
        "input, textarea, select, [contenteditable]"
      )
    ) {
      return;
    }

    // Ctrl esquerdo ativa temporariamente o modo de digitação.
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

    // Preserva atalhos especiais do navegador.
    if (event.altKey || event.metaKey) {
      if (event.type === "keyup") {
        releasePhysical(event.code);
      }

      return;
    }

    // Escolhe entre o layout personalizado e a digitação normal.
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
      // Ignora repetições de uma tecla já pressionada.
      if (pressedPhysical.has(event.code)) {
        return;
      }

      pressedPhysical.set(event.code, keys);
      keys.forEach(pressVirtual);
    } else if (event.type === "keyup") {
      releasePhysical(event.code);
    }
  }

  // Inicializa o TES: Arena com o mesmo tipo de backend usado pelo Heyming.
  startButton.addEventListener("click", async () => {
    if (typeof window.Dos !== "function") {
      status.textContent = "Biblioteca js-dos indisponível.";
      return;
    }

    startButton.disabled = true;
    renderer.disabled = true;
    capture.disabled = true;
    status.textContent = "Carregando TES: Arena...";

    try {
      // Verifica a presença do bundle antes de iniciar o player.
      const bundle = new URL("./private-game/arena.jsdos", document.baseURI);
      const response = await fetch(bundle, { method: "HEAD" });
      if (!response.ok) throw new Error(`Bundle não encontrado (HTTP ${response.status}).`);

      player = window.Dos(container, {
        url: bundle.href,
        pathPrefix: `${runtimeBase}/emulators/`,
        backend: "dosboxX",
        backendLocked: true,
        workerThread: true,
        autoStart: true,
        renderAspect: "4/3",
        renderBackend: renderer.value,
        mouseCapture: capture.checked,
        imageRendering: "pixelated",
        opfsRoot: "cloudme-heyming-test",
        fsChanges: {
          local: true,
          urlToKey: async () => "arena-dosbox-x-v1.changes",
          pull: readSave,
          push: writeSave,
          delete: deleteSave,
        },

        onEvent: (event, commandInterface) => {
          console.info("[Cloudme] evento js-dos:", event);
          if (event === "emu-ready") status.textContent = "Motor carregado. Iniciando Arena...";
          if (event === "ci-ready") {
            releaseAll();

            ci = commandInterface;
            clearTimeout(loadingTimer);
            status.textContent = "DOSBox-X iniciado.";
            saveButton.disabled = false;
            fullscreenButton.disabled = false;
            updateDiagnostics();
          }
        },
      });
      loadingTimer = setTimeout(() => {
        if (!ci) status.textContent = "Inicialização ainda não concluída. Consulte F12 > Console e Network.";
      }, 45000);
      if (ci) clearTimeout(loadingTimer);
      updateDiagnostics();
    } catch (error) {
      status.textContent = `Erro: ${error.message}`;
      console.error(error);

      renderer.disabled = false;
      capture.disabled = false;
      startButton.disabled = false;
    }
  });

  // Persiste as alterações depois de salvar dentro do jogo.
  saveButton.addEventListener("click", async () => {
    if (!player) return;
    saveButton.disabled = true;
    try {
      const saved = await player.save();
      status.textContent = saved ? "Alterações salvas no navegador." : "Nenhuma confirmação de salvamento; confira o player.";
    } catch (error) {
      status.textContent = `Erro ao salvar: ${error.message}`;
      console.error(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  fullscreenButton.addEventListener("click", () => {
    if (player) player.setFullScreen(true);
  });

  function updateDiagnostics() {
    let versions = "não informado";
    try { versions = player?.getVersion?.().join(" / ") ?? versions; } catch (error) { console.warn(error); }
    diagnostics.textContent = `DOSBox-X | ${renderer.value} | isolamento: ${window.crossOriginIsolated ? "ativo" : "inativo"} | runtime: ${runtimeBase ?? "pendente"} | versão: ${versions}`;
  }

  // Captura eventos antes do processamento padrão do js-dos.
  window.addEventListener("keydown", handleKeyboard, true);
  window.addEventListener("keyup", handleKeyboard, true);

  // Evita teclas presas quando o navegador perde o foco.
  window.addEventListener("blur", () => {
    releaseAll();
    typingMode = false;
  });

  // O carregamento assíncrono exibe erros em vez de deixar a página parada.
  try {
    status.textContent = "Preparando isolamento do navegador...";
    if (await prepareIsolation()) return;
    status.textContent = "Carregando biblioteca js-dos...";
    runtimeBase = await loadRuntime();
    updateDiagnostics();
    startButton.disabled = false;
    status.textContent = window.crossOriginIsolated
      ? "Pronto para iniciar TES: Arena."
      : "Pronto para iniciar (sem isolamento; confira o diagnóstico).";
  } catch (error) {
    status.textContent = `Erro na inicialização: ${error.message}`;
    console.error(error);
  }
}

init();