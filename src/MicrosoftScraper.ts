import { Page, config } from './index';
import path from 'path';
import fs from 'fs';

/**
 * Class for scraping the Microsoft careers website filtering for Students and Graduates.
 */
export class MicrosoftScraper {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }


  /**
   * Retrieves list of job results.
   * @returns {Promise<ElementHandle<[]>} - Promise that resolves an array of list items.
   */
  private async getListItems() {
    return await this.page.$$('.ms-List-cell');
  }

  /**
   * Retrieves search result totals.
   * @param {boolean} filtered - Flag to toggle if results are filtered or not.
   * @returns {Promise<number>} - Promise that returns the number of search results. 
   *                              Will return -1 if number of search results was not retrieved.
   */
  private async getResultsTotal(filtered: boolean): Promise<number> {
    const statusDiv = this.page.locator('div[role="status"][aria-live="polite"]:has-text("Showing")');
    const textContent = await statusDiv.innerText();
    const regex = /of (\d+) results/;
    const match = textContent.match(regex);
    if (match) {
      const totalResults = parseInt(match[1], 10);
    
      if (config.debug) {
        console.log(`${filtered ? 'Filtered' : 'Unfiltered'} results: ${totalResults}`);
      }
    
    return totalResults;
    } else {
      console.log('\"Showing x-y of z results\" text not found.');
    }
    return -1;
  }

  /**
   * Writes the raw HTML content from the job listing to a file.
   * @param {string} jobNumber - Name of job posting.
   * @param {string} content - Raw HTML content.
   */
  async saveJobContent(jobNumber: string, content: string) {
    const dirPath = path.join(__dirname, '../raw_content');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path.join(dirPath, `${jobNumber}.html`);
    fs.writeFileSync(filePath, content);
    if (config.debug) {
      console.log(`Content saved to ${filePath}`);
    }
  }

  /**
   * Starts the scraping process.
   */
  async scrape(): Promise<void> {
    try {
      await this.page.goto(config.msJobsPage);
      const unfilteredResultsTotal = await this.getResultsTotal(false);
  
      // filter location
      await this.page.getByPlaceholder('City, state, or country/region').fill(config.location);
      await this.page.getByRole('listbox')
                     .getByText(config.location, { exact: true })
                     .first()
                     .click();
  
      // filter experience level
      await this.page.getByText('Experience', { exact: true }).click();
      await this.page.getByRole('listbox').getByText(/Students and graduates/).click();
  
      const filteredResultsTotal = await this.getResultsTotal(true);
  
      // jobs for students and grads should always be less than all jobs
      if (unfilteredResultsTotal <= filteredResultsTotal) {
        console.warn(`Results mismatch of ${unfilteredResultsTotal} and ${filteredResultsTotal}`);
      }
  
      // loop through each results page
      let hasNext = true; 
      while (hasNext) {
        const nextButton = this.page.getByLabel('Go to next page');
        const nextButtonGreyedOut = await nextButton.getAttribute('disabled') !== null;
        
        if (nextButtonGreyedOut) {
          hasNext = false;
        }
        
        // TODO: prevents flakiness for now change later
        await this.page.waitForLoadState('networkidle');
        await this.page.getByLabel('job list')
                       .getByRole('listitem')
                       .first()
                       .waitFor({ state: 'visible' });
  
        // get job listings
        let listItems = await this.getListItems();
  
        if (config.debug) console.log(`Total list items found: ${listItems.length}`);
  
        await this.page.waitForSelector('.ms-List-cell');
        const jobCells = await this.page.$$('.ms-List-cell');
        const jobItems = await this.page.locator('div[aria-label^="Job item "]').elementHandles();
        const jobItemNumbers: string[] = [];
  
        for (const jobItem of jobItems) {
          const ariaLabel = await jobItem.getAttribute('aria-label') ?? '';
          if (ariaLabel) {
              jobItemNumbers.push(ariaLabel);
              
              if (config.debug) console.log(ariaLabel);
  
          } else if (ariaLabel === '') {
            console.warn('Empty \"Job number\" string...');
          }
        }
  
        // navigate to each job listing on the page and save main content HTML
        for (let i = 0; i < jobCells.length; i++) {
          const jobCell = jobCells[i];
          await this.page.getByLabel('job list')
                         .getByRole('listitem')
                         .first()
                         .waitFor({ state: 'visible' });
          
          const jobTitleElement = await jobCell.$('h2');
          const jobTitle = await jobTitleElement?.innerText();
          
          if (config.debug) console.log(`Job ${i + 1}: ${jobTitle}`);
          
          const detailsButton = this.page.locator(`div[aria-label="${jobItemNumbers[i]}"]`)
                                    .locator('div')
                                    .filter({ hasText: 'See details' })
                                    .nth(2)
          
          // navigate to listing
          if (detailsButton) {
            await detailsButton.click();
            await this.page.getByText('Job number').innerText();
            const content = await this.page.$eval('#main-content', (element) => element.innerHTML);
            
            // save content
            await this.saveJobContent(jobItemNumbers[i], content);
  
            await this.page.goBack();
            await this.page.waitForSelector('.ms-List-cell');
          } else {
              console.log(`"See details" link not found for Job ${i + 1}`);
          }
        }
        if (!nextButtonGreyedOut) {
          await nextButton.click();
        }
      }
    } catch (error) {
        console.error('Error during scraping', error);
    }
  }
}
