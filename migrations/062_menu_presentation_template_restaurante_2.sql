-- Add "Modelo Restaurante 2" (layout: image left, content right).
INSERT INTO public.menu_presentation_templates (name, component_key)
VALUES ('Modelo Restaurante 2', 'modelo-restaurante-2')
ON CONFLICT (name) DO NOTHING;
