import { createSSRClient } from '@/lib/supabase/server';
import { encryption } from './encryption';

interface ApiCredentials {
  api_key?: string;
  api_secret?: string;
  access_token?: string;
  refresh_token?: string;
  [key: string]: string | number | boolean | undefined;
}

export const apiCredentials = {
  // Store encrypted credentials in channel
  async store(channelId: string, credentials: ApiCredentials) {
    const supabase = await createSSRClient();
    
    const encrypted = encryption.encrypt(JSON.stringify(credentials));
    
    const { data, error } = await supabase
      .from('channel')
      .update({ api_credentials: encrypted })
      .eq('id', channelId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Retrieve and decrypt credentials from channel
  async get(channelId: string): Promise<ApiCredentials | null> {
    const supabase = await createSSRClient();
    
    const { data, error } = await supabase
      .from('channel')
      .select('api_credentials')
      .eq('id', channelId)
      .single();
    
    if (error || !data?.api_credentials) return null;

    
    const decrypted = encryption.decrypt(data.api_credentials);
    if (!decrypted) return null;
    try {
      return JSON.parse(decrypted) as ApiCredentials;
    } catch {
      return null;
    }
  },

  // Update specific credential fields
  async update(channelId: string, updates: Partial<ApiCredentials>) {
    const existing = await this.get(channelId) || {};
    const merged = { ...existing, ...updates };
    return this.store(channelId, merged);
  },

  // Clear credentials
  async clear(channelId: string) {
    const supabase = await createSSRClient();
    
    const { data, error } = await supabase
      .from('channel')
      .update({ api_credentials: null })
      .eq('id', channelId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};