"use strict";

function init() {
  const status = document.querySelector("#app-status");
  const container = document.querySelector("#dos");
  const startButton = document.querySelector("#start-arena");

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

        onEvent: (event) => {
          if (event === "ci-ready") {
            status.textContent = "Emulador pronto! Iniciando Arena...";
          }
        },
      });
    } catch (error) {
      status.textContent = `Erro: ${error.message}`;
      console.error(error);
      startButton.disabled = false;
    }
  });
}

init();
