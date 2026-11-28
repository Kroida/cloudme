# Cloudme — Arena Web

Aplicação web pessoal para executar **The Elder Scrolls: Arena** no navegador, com controles personalizados e uma futura integração de salvamentos locais e sincronização pelo Google Drive.

**Estado do projeto:** primeira versão jogável (Fase 2 — Emulação e integração). Execução no Chrome confirmada pelo usuário. Persistência entre sessões e publicação funcional ainda não validadas.

## Tecnologias

| Tecnologia | Responsabilidade |
| --- | --- |
| HTML, CSS e JavaScript | Interface e integração |
| js-dos v8 + DOSBox-X | Emulação DOS via WebAssembly |
| Service Worker | Isolamento entre origens (COOP/COEP) |
| IndexedDB | Integração preliminar de alterações do sistema de arquivos |
| Git e GitHub | Versionamento |
| GitHub Pages | Hospedagem estática planejada |
| Google OAuth e Drive API | Autenticação e sincronização planejadas |

Sem backend próprio, banco de dados servidor, npm ou compilação local do emulador. A experiência com Em-DOSBox foi descontinuada.

## Executar localmente

Requisitos: Python 3, navegador com suporte a WebAssembly e Service Worker, acesso à CDN do js-dos e uma cópia pessoal compatível do bundle em `private-game/arena.jsdos`.

Na raiz do projeto, pelo PowerShell:

```powershell
py -m http.server 5500
```

Abra <http://localhost:5500/>. Aguarde a preparação do isolamento (pode ocorrer uma recarga automática), escolha a renderização e a captura do mouse e clique em **Iniciar TES: Arena**.

A configuração inicial é DOSBox-X, Canvas 2D, proporção 4:3 e captura do mouse desmarcada. Para alterar as opções após iniciar, recarregue a página. O botão **Tela cheia** fica disponível quando o emulador estiver pronto.

Para encerrar o servidor, pressione `Ctrl+C` no terminal.

## Estrutura

```text
arena_web/
├── assets/
│   ├── css/style.css
│   └── js/app.js
├── docs/FASE-2.md
├── arena-bundle/           # preparação local do jogo; ignorada
├── private-game/
│   └── arena.jsdos         # cópia pessoal; ignorada
├── coi-sw.js
├── index.html
├── .gitignore
├── .nojekyll
└── README.md
```

## Controles

| Tecla | Ação configurada |
| --- | --- |
| W / S | Avançar / recuar |
| A / D | Deslocamento lateral |
| Q / E | Girar à esquerda / direita |
| F / G | Sacar/guardar arma / usar item |
| R / T | Descansar / status |
| C / 2 | Lançar / repetir magia |
| Z / X | Furtar / soltar item |
| V / Espaço | Pulo vertical / longo |
| J / M / O | Diário / mapa local / mapa mundial |
| Tab | Ficha do personagem |
| Backspace | Envia Esc ao jogo |
| Ctrl esquerdo (segurar) | Digitação normal; Backspace apaga caracteres |

Os atalhos F1, F2, F3, F4 e F8 permanecem mapeados aos códigos originais. F6 e F7 não são interceptados pelo remapeamento personalizado e ficam sob responsabilidade do player. O Esc físico pode liberar a captura do mouse ou sair da tela cheia por regras de segurança do navegador.

## Salvamentos

Salve primeiro dentro do Arena. A interface mantém os atalhos de salvamento do js-dos; o botão redundante “Salvar no navegador” foi removido. Embora o código já tenha callbacks `fsChanges` e armazenamento IndexedDB, a recuperação dos saves após recarregar ainda não foi confirmada. Não confie nesta versão como único backup de uma partida e não limpe os dados do site sem uma cópia segura.

## Publicação e privacidade

O projeto é estático e foi pensado para GitHub Pages. O bundle e a pasta de preparação não devem ser publicados. O carregamento autorizado dos arquivos privados e a sincronização com Google Drive serão tratados posteriormente. O `.gitignore` protege novos arquivos não rastreados, mas não elimina conteúdo de commits anteriores: revise o histórico antes de publicar ou enviar alterações a um repositório remoto.

## Roadmap

1. Arquitetura e configuração do ambiente.
2. Emulação e integração do jogo — versão jogável; documentação e versionamento em fechamento.
3. Persistência e salvamentos locais.
4. Autenticação e sincronização na nuvem.
5. Interface, testes e publicação.

## Documentação

- [Fase 2 — Emulação e integração](docs/FASE-2.md)
- [js-dos — Player API](https://js-dos.com/player-api.html)
- [js-dos — Save/Load](https://js-dos.com/save-load-game-progress.html)
- [Heyming DOS Player — referência arquitetural](https://joeheyming.github.io/dos/)
- [COI Service Worker — referência conceitual](https://github.com/gzuidhof/coi-serviceworker)
