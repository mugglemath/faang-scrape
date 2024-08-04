interface Config {
  debug: boolean;
  msJobsPage: string;
  location: string;
}

/**
 * Environment variables located in .env file.
 */
export const config: Config = {
  debug: process.env.DEBUG === 'true',
  msJobsPage: process.env.MS_JOBS_PAGE!,
  location: process.env.LOCATION!,
};

if (config.debug) {
  console.log('Config:', config);
}
