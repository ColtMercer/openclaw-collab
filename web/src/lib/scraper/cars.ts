import { BaseScraper, type SearchConfig, type ScrapedProduct } from './base';

export default class CarsDotComScraper extends BaseScraper {
  name = 'Cars.com';

  async fetchListings(_search: SearchConfig): Promise<ScrapedProduct[]> {
    return [];
  }
}
