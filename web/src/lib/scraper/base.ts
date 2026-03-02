export type ScrapedProduct = {
  title: string;
  price: number;
  image_url?: string;
  source_url: string;
  source_name: string;
  category: string;
  specs?: Record<string, string>;
  location?: string;
  year?: number;
  date_found?: Date;
  date_last_seen?: Date;
  is_active?: boolean;
};

export type SearchConfig = {
  name: string;
  category: string;
  search_terms: string[];
  filters?: Record<string, unknown>;
  location?: string;
};

export interface Scraper {
  name: string;
  fetchListings(search: SearchConfig): Promise<ScrapedProduct[]>;
}

export abstract class BaseScraper implements Scraper {
  abstract name: string;
  abstract fetchListings(search: SearchConfig): Promise<ScrapedProduct[]>;

  protected normalize(listing: ScrapedProduct): ScrapedProduct {
    return {
      ...listing,
      date_found: listing.date_found ?? new Date(),
      date_last_seen: listing.date_last_seen ?? new Date(),
      is_active: listing.is_active ?? true
    };
  }
}
