-- Gestão de Diárias: programação semanal por artigo "Prato do Dia" (nome a mostrar por data).
CREATE TABLE IF NOT EXISTS public.dish_of_the_day_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  display_name text NOT NULL DEFAULT '',
  UNIQUE(menu_item_id, schedule_date)
);

CREATE INDEX IF NOT EXISTS idx_dish_of_the_day_schedule_menu_item_date
  ON public.dish_of_the_day_schedule(menu_item_id, schedule_date);
