import { BaseScraper, type SearchConfig, type ScrapedProduct } from './base';

export default class PinkbikeScraper extends BaseScraper {
  name = 'PinkBike';

  async fetchListings(_search: SearchConfig): Promise<ScrapedProduct[]> {
    return [];
  }
}
