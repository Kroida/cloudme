"use strict";

function init() {
  const status = document.querySelector("#app-status");
  const container = document.querySelector("#dos");
  const startButton = document.querySelector("#start-arena");

  let ci = null;

  if (!status || !container || !startButton) {
    throw new Error("Elementos da aplicação não encontrados.");
  }

  status.textContent = "Ambiente configurado!";

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

  function handleKeyboard(event) {
    if (!ci || event.code !== "KeyW") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.type === "keydown" && event.repeat) {
      return;
    }

    const pressed = event.type === "keydown";

    ci.sendKeyEvent(265, pressed);
  }

  window.addEventListener("keydown", handleKeyboard, true);
  window.addEventListener("keyup", handleKeyboard, true);

  window.addEventListener("blur", () => {
    ci?.sendKeyEvent(265, false);
  });
}

init();
