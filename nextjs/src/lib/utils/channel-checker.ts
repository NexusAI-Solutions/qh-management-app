import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { encryption } from '@/lib/encryption';
import { LightspeedAPI } from '@/lib/apis/lightspeed';

interface Channel {
  id: number;
  name: string | null;
  type: 'lightspeed' | 'woocommerce' | 'channable';
  country_code: string;
  api_credentials: string | null;
}

interface ChannelCheckResult {
  channelId: number;
  exists: boolean;
  error: boolean;
}

export async function checkProductOnChannel(channelId: number, ean: string): Promise<ChannelCheckResult> {
  try {
    // Step 1: Fetch the channel data
    const supabase = await createServerAdminClient();
    const { data: channel, error } = await supabase
      .from('channel')
      .select('id, name, type, country_code, api_credentials')
      .eq('id', channelId)
      .single<Channel>();

    if (error || !channel) {
      console.error(`Channel ${channelId} not found:`, error);
      return { channelId, exists: false, error: true };
    }

    // Step 2: Decrypt API credentials
    if (!channel.api_credentials) {
      console.error(`Channel ${channelId} has no API credentials`);
      return { channelId, exists: false, error: true };
    }

    const decrypted = encryption.decrypt(channel.api_credentials);
    let api_key: string | undefined, api_secret: string | undefined;

    if (typeof decrypted === 'string') {
      // If decrypted is a JSON string, parse it
      ({ api_key, api_secret } = JSON.parse(decrypted));
    } else if (decrypted && typeof decrypted === 'object') {
      ({ api_key, api_secret } = decrypted as { api_key: string, api_secret: string });
    } else {
      console.error(`Channel ${channelId} has invalid API credentials format`);
      return { channelId, exists: false, error: true };
    }

    // Step 3: Ensure credentials are defined and check channel type
    if (!api_key || !api_secret) {
      console.error(`Channel ${channelId} missing API key or secret`);
      return { channelId, exists: false, error: true };
    }

    // Step 4: Create appropriate API instance based on channel type
    let productExists = false;

    switch (channel.type) {
      case 'lightspeed':
        const lightspeedAPI = new LightspeedAPI({
          apiKey: api_key,
          apiSecret: api_secret,
          language: channel.country_code,
        });

        // Check if product exists by EAN
        const variants = await lightspeedAPI.getProductVariantsByEAN(ean);
        productExists = variants.length > 0;
        break;

      case 'woocommerce':
        // TODO: Implement WooCommerce API checking
        console.log(`WooCommerce support not yet implemented for channel ${channelId}`);
        return { channelId, exists: false, error: true };

      case 'channable':
        // TODO: Implement Channable API checking
        console.log(`Channable support not yet implemented for channel ${channelId}`);
        return { channelId, exists: false, error: true };

      default:
        console.error(`Unknown channel type: ${channel.type} for channel ${channelId}`);
        return { channelId, exists: false, error: true };
    }

    return { channelId, exists: productExists, error: false };

  } catch (error) {
    console.error(`Error checking product on channel ${channelId}:`, error);
    return { channelId, exists: false, error: true };
  }
}

export async function checkProductOnAllChannels(ean: string): Promise<number[]> {
  try {
    // Fetch all active channels
    const supabase = await createServerAdminClient();
    const { data: channels, error } = await supabase
      .from('channel')
      .select('id, name, type, country_code, api_credentials')
      .not('api_credentials', 'is', null);

    if (error || !channels) {
      console.error('Failed to fetch channels:', error);
      return [];
    }

    // Check product on each channel
    const results = await Promise.allSettled(
      channels.map(channel => checkProductOnChannel(channel.id, ean))
    );

    // Collect channel IDs where product exists (and no error occurred)
    const activeChannels: number[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.exists && !result.value.error) {
        activeChannels.push(channels[index].id);
      }
    });

    return activeChannels;

  } catch (error) {
    console.error('Error checking product on all channels:', error);
    return [];
  }
}