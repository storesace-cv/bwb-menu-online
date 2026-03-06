# GUI do Portal Admin

O estilo visual do portal-admin (rotas `/portal-admin`) foi replicado a partir do projeto **bwb-efatura-docs-main** (zip). Aplica-se **apenas** às páginas do portal de administração; o menu público não é alterado.

## Origem

- **Fonte:** bwb-efatura-docs-main (templates/base.html, templates/components/macros.html, static/app.css, api/login_page.py).
- **Stack:** Tailwind (CDN no original), tema dark com gradient slate e cor de destaque emerald.

## Tokens / classes de referência

### Fundo e tema

- **Fundo base do admin:**  
  `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 min-h-screen`
- **Header / chrome:**  
  `bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm shadow-md px-4 py-3`
- **Card principal:**  
  `bg-slate-900/70 border border-slate-700 rounded-2xl shadow-xl backdrop-blur-sm p-6`

### Formulários

- **Input padrão:**  
  `w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-white placeholder-slate-500`
- **Botão primary:**  
  `bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg`
- **Botão outline:**  
  `border border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500 font-medium rounded-lg ... focus:ring-emerald-500`

### Alertas

- **Erro:**  
  `bg-red-950/40 border border-red-900 text-red-400`
- **Sucesso:**  
  `bg-emerald-950/40 border border-emerald-800 text-emerald-400`

### Links (nav)

- **Link normal:**  
  `text-slate-200 hover:text-emerald-400 transition-colors`
- **Link destaque:**  
  `text-emerald-400 hover:text-emerald-300`

## Componentes React (portal-admin)

Em `apps/web/components/admin/`:

| Componente | Uso |
|------------|-----|
| `Button` | Variants: `primary`, `secondary`, `success`, `danger`, `warning`, `outline`. |
| `Input` | Campos de texto; prop `legible` para fundo branco; `wrapperClassName` para ajustar margem. |
| `Select` | Selects com o mesmo estilo; `legible` e `wrapperClassName` opcionais. |
| `Card` | Wrapper com fundo translúcido, border e sombra. |
| `Alert` | Variants: `error`, `success`. |
| `Spinner` | Indicador de carregamento (classe `.spinner` em admin.css). |
| `TableContainer` | Wrapper com max-height e overflow para tabelas. |

### Exemplos de uso

```tsx
import { Card, Input, Button, Alert } from "@/components/admin";

// Card com formulário
<Card>
  <h2 className="text-lg font-medium text-slate-200 mb-4">Título</h2>
  <form>
    <Input id="email" name="email" label="Email" type="email" required />
    <Button type="submit" variant="primary">Enviar</Button>
    {error && <Alert variant="error">{error}</Alert>}
  </form>
</Card>

// Botões
<Button variant="primary">Guardar</Button>
<Button variant="outline" type="button">Cancelar</Button>
<Button variant="danger" onClick={handleDelete}>Apagar</Button>
```

## Ficheiros de estilo

- **Tailwind:** Config em `apps/web/tailwind.config.ts` (preflight desativado para não alterar o menu público). Diretivas em `app/globals.css`.
- **Admin-only:** `apps/web/app/portal-admin/admin.css` (scrollbar dark, `.spinner`, `.input-legible`, `.grid-cards-dynamic`, `.table-container`). Importado apenas no layout de `/portal-admin`.

## Isolamento

- O layout de `/portal-admin` envolve todo o conteúdo num wrapper com as classes de tema (gradient, texto slate).
- O menu público (raiz, subdomínios fora de `/portal-admin`) não usa este layout nem o `admin.css`, mantendo o aspecto atual.
