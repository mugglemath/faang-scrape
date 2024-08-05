import { config, createClient } from './index';
import path from 'path';
import fs from 'fs';

/**
   * Writes the raw HTML content from the job listing to a file.
   * @param {string} jobNumber - Name of job posting.
   * @param {string} content - Raw HTML content of the job posting.
   * @param {Object} [options] - Options for saving or sending content.
   * @param {boolean} [options.writeToFile=true] - Whether to write the content to a file.
   * @param {boolean} [options.saveToRedis=true] - Whether to send the content to a Redis server.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   *
   * @throws {Error} Throws an error if there is an issue with file writing or Redis operations.
   */
export async function saveJobContent(jobNumber: string, content: string, options: { writeToFile?: boolean, saveToRedis?: boolean } = {}) {
  if (options.writeToFile) {
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
  if (options.saveToRedis) {
    const client = createClient({
      url: 'redis://localhost:6379'
    });
    
    client.on('error', (err) => console.error('Redis client error', err));

    try {
      await client.connect();
      const streamName = 'jobContentStream';
      const messageId = await client.xAdd(streamName, '*', { jobNumber, content });
      console.log(`Content sent to Redis stream: ${messageId}`);
    } catch (error) {
      console.error('Error sending content to Redis:', error);
    } finally {
      await client.quit();
    }
  }
}