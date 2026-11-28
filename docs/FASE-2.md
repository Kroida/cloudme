# Fase 2 — Emulação e integração

## Contexto e resultado

O objetivo da fase é executar TES: Arena localmente no navegador, incluindo teclado, mouse, áudio e tela cheia. O primeiro protótipo com js-dos/DOSBox apresentou artefatos gráficos no Chrome e, posteriormente, no Firefox. A tentativa com Em-DOSBox foi compilada no WSL, mas não resultou em execução funcional. A integração atual utiliza js-dos v8 com DOSBox-X e foi inspirada na arquitetura documentada do Heyming DOS Player, não em uma cópia literal de seu código.

O usuário confirmou uma primeira versão jogável no Chrome. Foram realizados ajustes pontuais na barra lateral, nos atalhos F6/F7 e na apresentação em tela cheia. A persistência dos saves permanece fora do escopo de conclusão desta fase.

## Arquitetura

```text
index.html + style.css
          |
        app.js ------ coi-sw.js (isolamento)
          |
     js-dos v8 Player
          |
    DOSBox-X / WebAssembly (worker)
          |
    private-game/arena.jsdos
```

- `index.html`: container do player, seleção de renderização, captura de mouse, inicialização, tela cheia e diagnóstico.
- `assets/css/style.css`: layout, alinhamento dos atalhos F6/F7 e regras específicas de tela cheia para ocultar controles, espaçador e moldura.
- `assets/js/app.js`: carregamento da biblioteca, isolamento, inicialização, controles personalizados e callbacks de persistência experimental.
- `coi-sw.js`: aplica `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp` às respostas locais; não armazena recursos em cache.
- `.nojekyll`: marcador para hospedagem estática no GitHub Pages.

## Inicialização e configuração

`prepareIsolation()` tenta registrar o Service Worker com escopo relativo e usa `sessionStorage` para limitar a recarga automática. `loadRuntime()` tenta `https://v8.js-dos.com/8.xx/8.5.3`, com fallback para `https://v8.js-dos.com/latest`. A opção `?runtime=latest` pula a primeira tentativa. O endereço fixo não foi confirmado como funcional; a captura de execução fornecida pelo usuário mostrou o fallback `/latest`.

Após verificar o bundle por HTTP HEAD, `window.Dos()` recebe os parâmetros:

| Opção | Valor |
| --- | --- |
| backend | `dosboxX` |
| backendLocked | `true` |
| workerThread | `true` |
| autoStart | `true` |
| renderAspect | `4/3` |
| renderBackend | Selecionado na interface (Canvas por padrão) |
| mouseCapture | Selecionado na interface (desativado por padrão) |
| imageRendering | `pixelated` |
| opfsRoot | `cloudme-heyming-test` |

O evento `ci-ready` disponibiliza a CommandInterface, habilita tela cheia e atualiza o status. A tela apresenta motor, renderizador, isolamento, endereço da CDN e versão informada pelo player. A disponibilidade da CDN e o CORS/CORP são dependências externas.

## Bundle e configuração DOS

O bundle enviado é um ZIP com extensão `.jsdos` e contém 443 entradas, incluindo `.jsdos/dosbox.conf` e a pasta `ARENA/`. A integridade do ZIP e do bundle foi verificada na revisão documental. A configuração efetivamente empacotada usa `machine=svga_s3`, `memsize=32`, `core=dynamic`, `cycles=max`, `scaler=hq3x`, `frameskip=0` e `aspect=true`. Esses parâmetros foram preservados, sem novas otimizações ou benchmarks.

Inicialização presente no bundle:

```ini
[autoexec]
@echo off
mount C: ./ARENA
mount D: ./ARENA -t cdrom
C:
SET ARENADATA=C:
D:
ACD -Ssbpdig.adv -IOS220 -IRQS7 -DMAS1 -Mgenmidi.adv -IOM330 -IRQM2 -DMAM1
```

O bundle pessoal inclui recursos do jogo, mods e saves e não deve ser distribuído junto com o código público.

## Teclado, mouse e tela cheia

O remapeamento usa `KeyboardEvent.code` e `CommandInterface.sendKeyEvent()`. Os mapas `pressedPhysical` e `pressedVirtual` controlam combinações e compartilhamento de teclas virtuais; a perda de foco libera comandos registrados. Ctrl esquerdo ativa temporariamente a digitação normal. Backspace envia Escape virtual durante gameplay, sem acionar diretamente a tecla física de liberação do mouse.

Os estilos de tela cheia ocultam a sidebar e o slider, removem a moldura e o espaçador e uniformizam o fundo. A proporção 4:3 é preservada; faixas pretas em monitores widescreen são esperadas. Os seletores dependem da estrutura interna do player e podem exigir revisão caso o runtime mude. A saída de segurança pelo Esc físico continua sujeita ao navegador.

## Persistência preliminar

O IndexedDB `cloudme-heyming-saves`, versão 1, contém o object store `changes`. A integração `fsChanges` usa a chave `arena-dosbox-x-v1.changes`, `local: true` e callbacks `pull`, `push` e `delete` para ler, guardar e remover alterações. O código também configura um namespace OPFS no player. A presença dessas configurações não comprova que os saves sejam recuperados: o usuário relatou ausência de persistência. A Fase 3 deve validar esse fluxo, incluindo salvamento dentro do jogo, fechamento, recuperação e backups. Não se trata de um snapshot da CPU nem de sincronização remota.

## Checklist da fase

| Etapa | Entrega | Registro |
| --- | --- | --- |
| 1 | Adicionar js-dos v8 | Concluída |
| 2 | Criar o componente visual | Concluída |
| 3 | Executar Digger | Concluída (teste anterior) |
| 4 | Localizar arquivos pessoais do Arena | Concluída |
| 5 | Criar bundle .jsdos | Concluída |
| 6 | Configurar inicialização | Concluída |
| 7 | Executar Arena no navegador | Versão jogável confirmada |
| 8 | Testar teclado e mouse | Aceita pelo usuário no escopo atual; Esc físico sujeito ao navegador |
| 9 | Testar áudio | Encerramento indicado pelo usuário; latência não medida |
| 10 | Testar tela cheia e resolução | Ajustes aplicados; última correção aceita na sequência da conversa |
| 11 | Verificar erros e desempenho | Versão jogável confirmada; estabilidade prolongada e comparação entre navegadores não medidas |
| 12 | Documentar e versionar alterações | Documentação preparada; commit local pendente |

## Versionamento

A revisão do ZIP identificou sete arquivos rastreados no índice Git e nenhum arquivo sob `arena-bundle/` ou `private-game/` atualmente rastreado. Porém, o histórico de `main` e da referência remota local `origin/main` contém caminhos de arquivos pessoais do jogo. O `.gitignore` não remove esses registros históricos. Não publique ou envie o histórico sem revisar a exposição e decidir como tratá-la. O estado efetivo do repositório remoto não foi consultado.

O commit documental pode ser realizado localmente:

```bash
git add -- README.md docs/FASE-2.md
git diff --cached --stat
git diff --cached --name-only
git commit -m "docs: document phase 2 emulator integration"
```

Confira se somente os arquivos de documentação estão no índice antes do commit. Não foi realizado commit ou push em nome do usuário nesta revisão.

## Limites da revisão

A documentação foi atualizada a partir do ZIP `arena_web(2).zip` e dos resultados reportados pelo usuário. Nenhum código funcional, arquivo de configuração, recurso do jogo ou histórico Git foi modificado. A revisão não repetiu os testes reais do emulador; não garante persistência, desempenho, compatibilidade total ou deploy. A próxima fase será a persistência local, após o fechamento da Etapa 12.
