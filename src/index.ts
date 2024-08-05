import { BrowserType, chromium } from 'playwright';
import { MicrosoftScraper } from './MicrosoftScraper';
import dotenv from 'dotenv';
dotenv.config();

export { chromium, Browser, BrowserContext, Page } from 'playwright';
export { config } from './config';
export { createClient } from 'redis';
export { saveJobContent } from './utils';

async function main(chromium: BrowserType) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const msScraper = new MicrosoftScraper(page);
  await msScraper.scrape();
  await browser.close();
}

(async() => {
  main(chromium);
})();
