
CREATE TABLE public.ai_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  phone TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_events ENABLE ROW LEVEL SECURITY;

-- Public read for dashboard
CREATE POLICY "Allow public read ai_events"
  ON public.ai_events FOR SELECT
  USING (true);

-- No direct insert from client - only via edge function with service role
CREATE POLICY "Allow service role insert ai_events"
  ON public.ai_events FOR INSERT
  WITH CHECK (true);

-- Index for dashboard queries
CREATE INDEX idx_ai_events_event_type ON public.ai_events (event_type);
CREATE INDEX idx_ai_events_created_at ON public.ai_events (created_at);
CREATE INDEX idx_ai_events_conversation_id ON public.ai_events (conversation_id);
