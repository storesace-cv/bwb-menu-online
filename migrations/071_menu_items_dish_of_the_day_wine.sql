-- Prato do Dia e Vinho: dois novos booleanos em menu_items (default false para todos).
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_dish_of_the_day boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_wine boolean NOT NULL DEFAULT false;
