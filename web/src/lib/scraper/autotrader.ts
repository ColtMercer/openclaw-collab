import { BaseScraper, type SearchConfig, type ScrapedProduct } from './base';

export default class AutoTraderScraper extends BaseScraper {
  name = 'AutoTrader';

  async fetchListings(_search: SearchConfig): Promise<ScrapedProduct[]> {
    return [];
  }
}
