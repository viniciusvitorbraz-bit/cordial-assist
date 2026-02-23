
CREATE TABLE public.bot_control (
  id integer PRIMARY KEY,
  ai_enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE public.bot_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read bot_control" ON public.bot_control FOR SELECT USING (true);
CREATE POLICY "Allow public update bot_control" ON public.bot_control FOR UPDATE USING (true);

INSERT INTO public.bot_control (id, ai_enabled) VALUES (1, true);
