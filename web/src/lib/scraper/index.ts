import PinkbikeScraper from './pinkbike';
import AutoTraderScraper from './autotrader';
import CarsDotComScraper from './cars';
import CarGurusScraper from './cargurus';
import type { ScrapedProduct, SearchConfig } from './base';

const scrapers = [
  new PinkbikeScraper(),
  new AutoTraderScraper(),
  new CarsDotComScraper(),
  new CarGurusScraper()
];

export async function runAllScrapers(searchConfig: SearchConfig) {
  const results = await Promise.all(scrapers.map((scraper) => scraper.fetchListings(searchConfig)));
  const flattened = results.flat();
  const seen = new Set<string>();

  return flattened.filter((listing: ScrapedProduct) => {
    if (seen.has(listing.source_url)) return false;
    seen.add(listing.source_url);
    return true;
  });
}

export { scrapers };
