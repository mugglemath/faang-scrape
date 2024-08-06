import { config, createClient } from './index';
import path from 'path';
import fs from 'fs';
import { JobListing } from './types';

/**
 * Writes job content from the listing object to a file. Primarily for debugging.
 * @param {JobListing} listing - JobListing object.
 */
export async function writeJobContentToFile(listing: JobListing) {
  const dirPath = path.join(__dirname, '../raw_content');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, `${listing.title}.html`);
  fs.writeFileSync(filePath, listing.content);
  if (config.debug) {
  console.log(`Content saved to ${filePath}`);
  }
}

/**
 * Produces a Redis Stream message from the listing object and sends it to the Redis server.
 * @param {JobListing} listing - JobListing object.
 */
export async function produceRedisStreamMessage(listing: JobListing) {  
  const client = createClient({
    url: 'redis://localhost:6379'
  });
  
  client.on('error', (err) => console.error('Redis client error', err));

  try {
    await client.connect();
    const streamName = 'jobContentStream';
    const company = listing.company;
    const title = listing.title;
    const content = listing.content;
    const messageId = await client.xAdd(streamName, '*', { company, title, content });
    console.log(`Content sent to Redis stream: ${messageId}`);
  } catch (error) {
    console.error('Error sending content to Redis:', error);
  } finally {
    await client.quit();
  }
}

/**
 * Preprocess content by removing script and style tags along with other unnecessary information.
 * @param {string} html - The raw content HTML.
 * @returns {string} - Returns cleaned text.
 */
export function cleanHTML(html: string): string {
  // remove script and style tags using non-greedy matching
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // preserve headers and paragraphs
  html = html.replace(/<(h[1-6]|p)[^>]*>/gi, '\n$&');
  html = html.replace(/<\/(h[1-6]|p)>/gi, '$&\n');

  // Remove all other HTML tags
  html = html.replace(/<\/?[^>]+(>|$)/g, '');

  // replace HTML entities
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/&amp;/g, '&');
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  html = html.replace(/&quot;/g, '"');
  html = html.replace(/&#39;/g, "'");

  // normalize whitespace
  html = html.replace(/\s+/g, ' ').trim();

  // restore preserved tags by removing placeholder newlines
  html = html.replace(/\n\s*/g, '\n').trim();

  // remove non-ASCII characters
  html = html.replace(/[^\x20-\x7E]/g, '');

  return html;
}
