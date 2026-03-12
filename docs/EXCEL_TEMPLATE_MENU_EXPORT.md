# Template .xlsm para export Actualizações ao Menu

O ficheiro exportado em **Definições → Actualizações ao Menu** deve incluir as macros VBA para substituição em massa na coluna Nome (D), em folha protegida. O ExcelJS não suporta escrever VBA; por isso o export usa um **template .xlsm** que já contém o módulo VBA. O servidor preenche o template com os dados e devolve um .xlsm.

## Como criar o template (uma vez)

1. Abra o Excel e crie um novo livro.
2. Renomeie a primeira folha para **Menu**.
3. Na linha 1, insira os cabeçalhos nas colunas A a R (exactamente nesta ordem):
   - Tenant, Loja, Código, Nome, Descrição, Ingredientes, Preço, Tipo, Familia, Sub Familia, Secção, Categoria, Promo, TA, Tempo prep., Ordem, Visível, Destaque
4. (Opcional) Aplique proteção à folha e desbloqueie a coluna D, para replicar o comportamento do export gerado por ExcelJS. O preenchimento pelo servidor não altera a proteção do template.
5. Abra o Editor VBA (Alt+F11), insira um **Módulo** (Insert → Module) e cole o conteúdo do ficheiro [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas). Guarde o módulo.
6. Guarde o livro como **Excel Macro-Enabled Workbook (.xlsm)** com o nome **menu-export-template.xlsm**.
7. Coloque o ficheiro em:
   - **apps/web/public/templates/menu-export-template.xlsm**

Se este ficheiro existir, a API de export (`GET /api/portal-admin/settings/menu-updates/export`) devolve um .xlsm preenchido com os dados do menu e com as macros disponíveis. Se o template não existir, o export continua a devolver um .xlsx gerado apenas por ExcelJS (sem macros).

## Estrutura esperada do template

- **Folha:** nome exacto **Menu** (a API preenche apenas esta folha).
- **Linha 1:** cabeçalhos nas colunas A–R (podem estar vazios; serão sobrescritos pelo servidor com os mesmos cabeçalhos).
- **Linhas 2 em diante:** serão sobrescritas com os dados dos artigos (tenant, loja, código, nome, etc.).

O módulo VBA em [docs/excel-vba-replace-column-d.bas](excel-vba-replace-column-d.bas) actua automaticamente na coluna D da folha "Menu".
