import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'climo_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.url && parsed.anonKey) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function createDynamicSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey);
}
