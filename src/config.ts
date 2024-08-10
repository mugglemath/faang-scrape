interface Config {
  debug: boolean;
  msJobsPage: string;
  location: string;
  streamName: string;
  groupName: string;
  consumerName: string;
}

/**
 * Environment variables located in .env file.
 */
export const config: Config = {
  debug: process.env.DEBUG === 'true',
  msJobsPage: process.env.MS_JOBS_PAGE!,
  location: process.env.LOCATION!,
  streamName: process.env.STREAM_NAME!,
  groupName: process.env.GROUP_NAME!,
  consumerName: process.env.CONSUMER_NAME!,
};

if (config.debug) {
  console.log('Config:', config);
}
