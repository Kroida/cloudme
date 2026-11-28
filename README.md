# Cloudme — teste DOSBox-X inspirado no Heyming

Versão experimental baseada no ZIP original `arena_web.zip`, não na migração Em-DOSBox. Mantém o HTML/CSS/JS puro e o bundle pessoal intacto. Não requer WSL, Emscripten, npm nem compilação.

## Executar

1. Extraia o ZIP completo em uma pasta nova, mantendo o projeto anterior como backup.
2. Abra o PowerShell na pasta que contém `index.html`.
3. Execute `py -m http.server 5500` (se a porta estiver ocupada, pare o servidor anterior com Ctrl+C).
4. Abra `http://localhost:5500/` e aguarde o Service Worker aplicar o isolamento. Pode haver uma recarga automática.
5. Clique em Iniciar TES: Arena. O padrão é DOSBox-X + Canvas 2D, captura do mouse desativada. Para comparar WebGL ou captura ativa, recarregue a página e altere a opção antes de iniciar.

A página informa o runtime efetivamente carregado, a versão retornada pelo player, o renderer e se o isolamento está ativo. O loader tenta a distribuição fixa 8.5.3 (endereço baseado no padrão oficial), com fallback explícito para a CDN `/latest/` caso falhe. Para testar diretamente a CDN atual: `http://localhost:5500/?runtime=latest`.

## Controles e persistência

Mantidos os controles do `app.js` original, incluindo Backspace → Escape e Ctrl esquerdo para digitar. A tecla Esc física ainda está sujeita às regras de captura do navegador.

Para testar persistência, salve dentro do Arena e depois utilize o atalho F6 do player js-dos. A persistência após recarregar a página ainda precisa ser validada na Fase 3. Os hooks documentados `fsChanges` usam IndexedDB para guardar alterações. A biblioteca também tem persistência local própria, isolada sob `cloudme-heyming-test`. Isso não é sincronização na nuvem nem garantia de salvamento automático. O teste usa uma chave nova para não misturar os saves de testes anteriores; os saves já presentes no bundle foram mantidos. Não limpe dados do site sem backup.

## GitHub Pages

O Service Worker tem escopo relativo ao diretório do projeto, usa COOP/COEP e não guarda arquivos em cache. Recursos externos precisam permitir CORS/CORP. Em caso de falha, consulte Console e Network. O bundle `private-game/arena.jsdos` e `arena-bundle/` permanecem ignorados no Git. Antes do deploy público, implementar carregamento privado autorizado; caso contrário a aplicação publicada não encontrará o jogo. Não publique arquivos pessoais ou proprietários.

## Escopo e validação

Referências: https://joeheyming.github.io/dos/ ; https://js-dos.com/player-api.html ; https://js-dos.com/save-load-game-progress.html ; https://github.com/gzuidhof/coi-serviceworker (conceito de isolamento em hospedagem estática).

Não foi possível obter os arquivos-fonte internos do Heyming. Esta é uma implementação própria baseada na arquitetura descrita no site. Não é uma cópia literal. Canvas 2D e captura desativada são escolhas de teste, não configurações confirmadas do Heyming. Não alteramos `dosbox.conf` nem o bundle, para reduzir variáveis. O endereço fixo da CDN não pôde ser verificado nesta sessão; a execução real não foi validada. O teste de navegador local neste ambiente foi bloqueado por política do Chromium. A versão é experimental e não conclui as etapas 8–11.
