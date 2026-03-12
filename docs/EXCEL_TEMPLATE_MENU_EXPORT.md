# Template .xlsm para export Actualizações ao Menu

O ficheiro exportado em **Definições → Actualizações ao Menu** deve incluir as macros VBA para substituição em massa na coluna Nome (D), em folha protegida. O ExcelJS não suporta escrever VBA; por isso o export usa um **template .xlsm** que já contém o módulo VBA. O servidor lê o template, preenche os dados e devolve um ficheiro **.xls** (Excel 97-2004, formato BIFF8). O formato .xls suporta macros e evita problemas no Excel com ficheiros com macros (em comparação com .xlsm).

## Template no repositório

O repositório pode já incluir **apps/web/public/templates/menu-export-template.xlsm**, gerado pelo script `apps/web/scripts/create-menu-export-template.mjs` (folha "Menu" e cabeçalhos A–R). Esse ficheiro tem a estrutura correcta mas **sem macros**. Para o export devolver .xls com as macros de substituição na coluna D:

1. Abra **menu-export-template.xlsm** no Excel (a partir de `apps/web/public/templates/`).
2. Abra o Editor VBA (Alt+F11), insira um **Módulo** (Insert → Module) e cole o conteúdo de [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas). Guarde.
3. (Opcional) Aplique proteção à folha e desbloqueie a coluna D.
4. Guarde o livro (Ctrl+S). O ficheiro passará a incluir as macros; faça commit e deploy.

Para regenerar apenas a estrutura (folha + cabeçalhos), sem VBA: a partir de `apps/web`, execute `node scripts/create-menu-export-template.mjs`. Depois adicione o VBA no Excel conforme acima.

## Como criar o template do zero (uma vez)

1. Abra o Excel e crie um novo livro.
2. Renomeie a primeira folha para **Menu**.
3. Na linha 1, insira os cabeçalhos nas colunas A a R (exactamente nesta ordem):
   - Tenant, Loja, Código, Nome, Descrição, Ingredientes, Preço, Tipo, Familia, Sub Familia, Secção, Categoria, Promo, TA, Tempo prep., Ordem, Visível, Destaque
4. (Opcional) Aplique proteção à folha e desbloqueie a coluna D, para replicar o comportamento do export gerado por ExcelJS. O preenchimento pelo servidor não altera a proteção do template.
5. Abra o Editor VBA (Alt+F11), insira um **Módulo** (Insert → Module) e cole o conteúdo do ficheiro [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas). Guarde o módulo.
6. Guarde o livro como **Excel Macro-Enabled Workbook (.xlsm)** com o nome **menu-export-template.xlsm**.
7. Coloque o ficheiro em:
   - **apps/web/public/templates/menu-export-template.xlsm**

Se este ficheiro existir, a API de export (`GET /api/portal-admin/settings/menu-updates/export`) devolve um **.xls** (Excel 97-2004) preenchido com os dados do menu e com as macros disponíveis. O servidor lê o template .xlsm e escreve a resposta em formato .xls. Se o template não existir, o export continua a devolver um .xlsx gerado apenas por ExcelJS (sem macros).

## Estrutura esperada do template

- **Folha:** nome exacto **Menu** (a API preenche apenas esta folha).
- **Linha 1:** cabeçalhos nas colunas A–R (podem estar vazios; serão sobrescritos pelo servidor com os mesmos cabeçalhos).
- **Linhas 2 em diante:** serão sobrescritas com os dados dos artigos (tenant, loja, código, nome, etc.).

O módulo VBA em [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas) actua automaticamente na coluna D da folha "Menu".
