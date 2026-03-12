# Template .xlsm para export Actualizações ao Menu

O ficheiro exportado em **Definições → Actualizações ao Menu** inclui as macros VBA para substituição em massa na coluna Nome (D), em folha protegida. O servidor usa um **template .xlsm** e, quando o template tem VBA ou existe **vbaProject.bin** no repositório, injecta as macros no ficheiro exportado. O resultado é um ficheiro **.xlsm** (Excel Macro-Enabled Workbook) com dados e macros prontos a usar. **Os botões do template** (Form controls que chamam as macros, ex.: "Tudo Começa por...", "Tudo Termina com...", "Tudo Contém...") são preservados no ficheiro exportado: o export faz um patch ao template como ZIP, substituindo apenas os dados da folha e mantendo desenhos e botões intactos.

## Utilizador final

**O utilizador final não precisa de abrir o Excel nem de conhecimentos de VBA.** Basta fazer o download do ficheiro .xlsm em Definições → Actualizações ao Menu. O ficheiro inclui três botões que chamam as macros (ReplaceStartsWith, ReplaceEndsWith, ReplaceContains); pode usar os botões ou executar as macros por Alt+F8 para substituir texto na coluna Nome (D).

## Como o export inclui as macros

A API de export (`GET /api/portal-admin/settings/menu-updates/export`) devolve **.xlsm** com macros quando o template .xlsm tem VBA embutido ou quando existe o ficheiro **vbaProject.bin** em **apps/web/public/templates/**. Se o template não tiver VBA, o servidor tenta carregar esse blob e injectá-lo no ficheiro exportado; assim o .xlsm inclui as macros quando o template já as tem ou quando o projeto tiver o blob no repositório.

## Setup do projeto (uma vez)

Para que o ficheiro exportado inclua as macros, quem mantém o projeto deve gerar **vbaProject.bin** uma vez e fazer commit:

1. Abra **menu-export-template.xlsm** no Excel (em `apps/web/public/templates/`). Se não existir, execute `node apps/web/scripts/create-menu-export-template.mjs` a partir da raiz do monorepo (ou a partir de `apps/web` com `node scripts/create-menu-export-template.mjs`).
2. No Excel: Editor VBA (Alt+F11) → Insert → Module → cole o conteúdo de [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas). Guarde o livro (Ctrl+S).
3. Execute o script de extração (a partir da raiz do monorepo ou de `apps/web`):
   ```bash
   node apps/web/scripts/extract-vba-from-template.mjs
   ```
   Ou a partir de `apps/web`: `node scripts/extract-vba-from-template.mjs`
4. Faça commit de **apps/web/public/templates/vbaProject.bin**.

Depois disso, todos os deploys e utilizadores recebem o .xlsm com macros; não é necessário voltar a abrir o Excel para configurar nada.

## Template no repositório

O repositório inclui **apps/web/public/templates/menu-export-template.xlsm**, gerado pelo script `apps/web/scripts/create-menu-export-template.mjs` (folha "Menu" e cabeçalhos A–R). O template pode já incluir macros (por exemplo, copiando de `local/templates/` após edição no Excel); nesse caso o export devolve .xlsm com macros sem depender de vbaProject.bin. Se o ficheiro não tiver VBA, as macros são injectadas a partir de **vbaProject.bin** quando este existe (ver secção anterior).

Para regenerar apenas a estrutura (folha + cabeçalhos), sem VBA: execute `node apps/web/scripts/create-menu-export-template.mjs` (ou a partir de `apps/web`: `node scripts/create-menu-export-template.mjs`). Para voltar a ter macros no export, copie para o repo o template com macros (ex.: de `local/templates/`) ou tenha **vbaProject.bin** commitado.

## Como criar o template do zero (uma vez)

1. Abra o Excel e crie um novo livro.
2. Renomeie a primeira folha para **Menu**.
3. Na linha 1, insira os cabeçalhos nas colunas A a R (exactamente nesta ordem):
   - Tenant, Loja, Código, Nome, Descrição, Ingredientes, Preço, Tipo, Familia, Sub Familia, Secção, Categoria, Promo, TA, Tempo prep., Ordem, Visível, Destaque
4. (Opcional) Aplique proteção à folha e desbloqueie a coluna D.
5. Abra o Editor VBA (Alt+F11), insira um **Módulo** (Insert → Module) e cole o conteúdo do ficheiro [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas). Guarde o módulo.
6. Guarde o livro como **Excel Macro-Enabled Workbook (.xlsm)** com o nome **menu-export-template.xlsm** em **apps/web/public/templates/**.
7. Execute o script de extração para gerar **vbaProject.bin** e faça commit (ver secção "Setup do projeto (uma vez)").

Se o template não existir, a API de export devolve um .xlsx gerado por ExcelJS (sem macros).

## Estrutura esperada do template

- **Folha:** nome exacto **Menu** (a API preenche apenas esta folha).
- **Linha 1:** cabeçalhos nas colunas A–R (podem estar vazios; serão sobrescritos pelo servidor com os mesmos cabeçalhos).
- **Linhas 2 em diante:** serão sobrescritas com os dados dos artigos (tenant, loja, código, nome, etc.).

O módulo VBA em [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas) actua automaticamente na coluna D da folha "Menu".

## Protecção da folha e password

O export aplica proteção à folha "Menu" com uma **password única**: **bwb-naomexer**. Para desproteger a folha (por exemplo para alterar estrutura ou formatação), use no Excel: Rever → Desproteger folha e introduza a password `bwb-naomexer`. Em VBA: `ThisWorkbook.Sheets("Menu").Unprotect "bwb-naomexer"`.
