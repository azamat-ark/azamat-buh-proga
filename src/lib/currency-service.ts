import { supabase } from '@/integrations/supabase/client';

export interface CurrencyRate {
  currency: string;
  rate: number;
  date: string;
}

const NB_KAZ_RSS_URL = 'https://nationalbank.kz/rss/rates_all.xml';

// Using a public CORS proxy to bypass CORS restrictions in the browser
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

export async function fetchDailyRates(): Promise<CurrencyRate[]> {
  try {
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(NB_KAZ_RSS_URL)}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch rates: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const items = xmlDoc.querySelectorAll('item');
    const rates: CurrencyRate[] = [];
    const today = new Date().toISOString().split('T')[0];

    // RSS structure from nationalbank.kz usually has <title>CURRENCY</title> and <description>RATE</description>
    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent; // e.g., "USD"
      const description = item.querySelector('description')?.textContent; // e.g., "495.59"

      if (title && description) {
         const currency = title.trim();
         const rate = parseFloat(description.trim());

         // Filter for major currencies
         if (['USD', 'EUR', 'RUB'].includes(currency)) {
            rates.push({
              currency,
              rate,
              date: today
            });
         }
      }
    });

    // Save to Supabase
    if (rates.length > 0) {
      const { error } = await supabase
        .from('currency_rates')
        .upsert(
          rates.map(r => ({
             date: r.date,
             currency: r.currency,
             rate: r.rate
          })),
          { onConflict: 'date,currency' }
        );

      if (error) {
        console.error('Error saving rates to database:', error);
        throw error;
      }
    }

    return rates;

  } catch (error) {
    console.error('Error in fetchDailyRates:', error);
    throw error;
  }
}
