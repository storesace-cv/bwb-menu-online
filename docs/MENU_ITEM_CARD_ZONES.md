# Zonas do card de artigo (menu público)

Este documento define as zonas de apresentação de um registo de artigo no menu apresentado aos clientes. Referência: imagens "zonas & campos" e "Exemplo apresentação de registo".

Quando se fala em "zona 1", "zona A", "zona F", etc., refere-se exactamente às definições abaixo.

---

## Tabela de referência

| Ref | Nome |
|-----|------|
| **1** | Imagem do Artigo |
| **A** | Zona de apresentação dos ícones informativos |
| **B** | Zona de apresentação do nome do artigo |
| **C** | Zona de apresentação dos ingredientes do artigo |
| **D** | Zona de apresentação do ícone "Tempo de Preparação" e do valor numérico |
| **E** | Zona de apresentação dos Alergénicos |
| **F** | Zona de apresentação do Preço Antigo |
| **G** | Zona de apresentação do Preço do Artigo |

---

## Regras por zona

- **Zona 1 – Imagem do Artigo**  
  Ocupa a parte superior do card. Se clicada, deve abrir uma janela (modal) com a imagem em grande e a descrição dos ingredientes do artigo por baixo.

- **Zona A – Ícones informativos**  
  Faixa horizontal no topo da área de conteúdo (abaixo da imagem). Conteúdo: ícones de tipo de artigo, promoção, take-away, "em destaque". Alinhamento: **à direita**.

- **Zona B – Nome do artigo**  
  Texto do nome do artigo. Alinhamento: **à esquerda**.

- **Zona C – Ingredientes do artigo**  
  Mostra o texto "Ingredientes" alinhado à esquerda e o sinal "+" alinhado à direita. Ao clicar nesta zona, o espaço vertical aumenta e o conteúdo é substituído pela lista de ingredientes (e o "+" passa a "−" para recolher). Quando recolhido, volta a mostrar "Ingredientes" e "+".

- **Zona D – Tempo de Preparação**  
  Ícone de tempo de preparação + valor numérico (ex.: 8'). Alinhamento: **à esquerda**. Só se apresenta quando existir valor.

- **Zona E – Alergénicos**  
  Texto "Alergénios: " seguido da lista. Alinhamento: **à esquerda**. Só se apresenta quando existirem alergénios.

- **Zona F – Preço Antigo**  
  Preço antigo (em promoções). Alinhamento: **ao centro** da respectiva zona. Estilo: texto a cinza claro e com traço a meio (strikethrough).

- **Zona G – Preço do Artigo**  
  Preço actual. Alinhamento: **à direita** da zona. O símbolo da moeda fica à direita do valor numérico, com um espaço de intervalo.

---

## Campos na base de dados

- Zona C: `menu_items.menu_ingredients`
- Zona D: `menu_items.prep_minutes`
- Zona E: `menu_item_allergens` + `allergens`
- Zonas F/G: `menu_items.price_old`, `menu_items.menu_price`
