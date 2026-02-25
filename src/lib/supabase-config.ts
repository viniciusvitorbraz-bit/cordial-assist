import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'climo_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigHash: string | null = null;

const DEFAULT_CONFIG: SupabaseConfig = {
  url: 'https://kolfmrmwekxtibwhlbaz.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvbGZtcm13ZWt4dGlid2hsYmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMDU5ODAsImV4cCI6MjA3OTU4MTk4MH0.nzOhd5qKz7I1gYwnA3ijCH6_5zrebfdSZ_RnvSWMFxs',
};

export function getSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    if (parsed.url && parsed.anonKey) return parsed;
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Invalidate cached client when config changes
  cachedClient = null;
  cachedConfigHash = null;
}

export function createDynamicSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;

  const hash = `${config.url}|${config.anonKey}`;
  if (cachedClient && cachedConfigHash === hash) {
    return cachedClient;
  }

  cachedClient = createClient(config.url, config.anonKey);
  cachedConfigHash = hash;
  return cachedClient;
}
