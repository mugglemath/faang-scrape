import { BrowserType, chromium } from 'playwright';
import { MicrosoftScraper } from './MicrosoftScraper';
import { JobListing } from './types';
import dotenv from 'dotenv';
dotenv.config();

export { chromium, Browser, BrowserContext, Page } from 'playwright';
export { config } from './config';
export { createClient, RedisClientType } from 'redis';
export { JobListing } from './types';
export {
  writeJobContentToFile,
  cleanHTML,
  addMessageWithDeduplication,
} from './utils';

async function main(chromium: BrowserType) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const listing: JobListing = {
    jobId: '',
    title: '',
    datePosted: '',
    company: 'Microsoft',
    content: '',
  };

  const msScraper = new MicrosoftScraper(page, listing);
  await msScraper.scrape();
  await browser.close();
}

(async () => {
  main(chromium);
})();
