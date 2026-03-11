# Responsividade do menu público

O menu público (template BWB Branco e componentes associados) segue boas práticas de responsividade e acessibilidade, com referência a:

- **WCAG 2.2 Reflow (1.4.10):** conteúdo adapta-se à viewport sem scroll horizontal indevido.
- **WCAG Target Size (2.5.5):** alvos de toque com pelo menos 24px (recomendado 44px).
- **WCAG Orientation (1.3.4):** orientação não é bloqueada.

## Disposição dos cards

- **Modelo Restaurante 2:** mantém disposição horizontal (imagem à esquerda, conteúdo à direita) em todos os tamanhos de ecrã, incluindo smartphone; em mobile a imagem é 100×100px, em `sm` e acima 280×280px.
- **Modelo Restaurante 1** e **ItemCardFromLayout:** cards verticais (imagem em cima, conteúdo em baixo) em todos os tamanhos.
- **Modelo Destaque 1:** usado no carrossel; slot com `min(320px, 85vw)`; overlay com `min-w-0` e texto com `break-words` para evitar overflow.

## Componentes

- **Container:** `.menu-public` e `main` usam `box-sizing: border-box`, `width: 100%`, `max-width: 100vw`; padding `px-1` em mobile e `md:px-4` em desktop.
- **Carrossel:** indicadores (dots) com área de toque 44×44px, mantendo o círculo visual 8/12px.
- **FAB e BottomSheet:** botões/itens com `min-h-[44px]` e `min-w-[44px]` onde aplicável.
- **Rodapé:** morada com `overflow-x-auto` para texto longo; contentor com `min-w-0 max-w-full`.
