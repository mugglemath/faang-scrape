import { config, createClient, RedisClientType } from './index';
import path from 'path';
import fs from 'fs';
import { JobListing } from './types';
import { createHash, Hash } from 'crypto';

/**
 * Writes job content from the listing object to a file. Primarily for debugging.
 * @param {Object} listing - The job listing object.
 */
export async function writeJobContentToFile(listing: JobListing) {
  const dirPath = path.join(__dirname, '../raw_content');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(
    dirPath,
    `${listing.company} - ${listing.title}.html`,
  );
  fs.writeFileSync(filePath, listing.content);
  if (config.debug) {
    console.log(`Content saved to ${filePath}`);
  }
}

/**
 * Creates a unique Id based off listing title, date posted, and company name.
 * @param {Object} listing - The job listing object.
 * @returns {string} - Unique hex string of the combined input.
 */
export function generateUniqueId(listing: JobListing): string {
  const combinedString = `${listing.title}${listing.datePosted}${listing.company}`;
  const hash: Hash = createHash('sha256');
  hash.update(combinedString);
  return hash.digest('hex');
}

/**
 * Converts raw date from listing to ISO format for lexicographical sorting.
 * @param {string | undefined} date - The raw date from the listing.
 * @param {object} listing - The job listing object.
 */
export function convertDate(date: string | undefined, listing: JobListing) {
  if (date !== undefined) {
    const newDate = new Date(date);
    if (!isNaN(newDate.getTime())) {
      const isoDateString = newDate.toISOString().split('T')[0];
      listing.datePosted = isoDateString;
      if (config.debug) console.log(`${isoDateString}`);
    } else {
      console.warn('Invalid date string provided');
      listing.datePosted = '';
      if (config.debug) console.log(date);
    }
  } else {
    console.warn('Date is undefined');
    listing.datePosted = '';
    if (config.debug) console.log(date);
  }
}

/**
 * Checks deduplication set before adding new messages to the Redis Stream.
 * @param {Object} listing - The job listing object.
 * @param {string} uniqueId - Unique Id created with generateUniqueId().
 * @param {RedisClientType} client - Redis client.
 * @returns {Promise<void>}
 */
export async function addMessageWithDeduplication(
  listing: JobListing,
  uniqueId: string,
  client: RedisClientType,
) {
  const exists = await client.sIsMember('deduplication_set', uniqueId);
  if (exists) {
    console.log(`Duplicate message with ID ${uniqueId}, not adding to stream.`);
    return;
  }

  await client.sAdd('deduplication_set', uniqueId);

  try {
    const message = {
      jobId: listing.jobId,
      title: listing.title,
      datePosted: listing.datePosted,
      company: listing.company,
      content: listing.content,
    };
    const messageId = await client.xAdd(config.streamName, '*', message);
    console.log(`Content sent to Redis stream: ${messageId}`);
  } catch (error) {
    console.error('Error sending content to Redis:', error);
  }
}

/**
 * Creates a Redis Streams consumer group.
 * @param {RedisClientType} client - Redis client.
 */
export async function createGroup(client: RedisClientType) {
  try {
    await client.sendCommand([
      'XGROUP',
      'CREATE',
      config.streamName,
      config.groupName,
      '$',
      'MKSTREAM',
    ]);
    console.log(
      `Consumer group '${config.groupName}' created for stream '${config.streamName}'.`,
    );
  } catch (error) {
    console.log(`Consumer group '${config.groupName}' already exists.`);
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

export function sanitizeFileName(fileName:string): string {
  return fileName
    .replace(/[\/\\:*?"<>|]/g, '-')  // replace problematic characters with hyphens
    .replace(/\s+/g, ' ')            // replace multiple spaces with a single space
    .trim()                          // remove leading and trailing whitespace
    .substring(0, 255);              // limit filename length
}

export function createRedisClient(): RedisClientType {
  const client: RedisClientType = createClient({
    url: 'redis://redis:6379',
  });

  client.on('error', (err) => console.error('Redis client error', err));
  return client;
}

export async function connectToRedis(client: RedisClientType) {
  await client.connect();
}
