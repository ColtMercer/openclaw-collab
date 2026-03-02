import { BaseScraper, type SearchConfig, type ScrapedProduct } from './base';

export default class CarGurusScraper extends BaseScraper {
  name = 'CarGurus';

  async fetchListings(_search: SearchConfig): Promise<ScrapedProduct[]> {
    return [];
  }
}
