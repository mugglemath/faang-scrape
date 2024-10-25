interface Config {
  debug: boolean;
  msJobsPage: string;
  location: string;
  streamName: string;
  groupName: string;
  consumerName: string;
}

function getEnvVariable(name: string, defaultValue:string): string {
  const value = process.env[name];
  if (value === undefined) {
    console.warn(`Warning: Environment variable ${name} is not set. Using default value: ${defaultValue}`);
    return defaultValue;
  }
  return value;
}

export const config: Config = {
  debug: getEnvVariable('DEBUG', 'true') === 'true',
  msJobsPage: getEnvVariable('MS_JOBS_PAGE', 'https://jobs.careers.microsoft.com/global/en/search'),
  location: getEnvVariable('LOCATION', 'Redmond,'),
  streamName: getEnvVariable('STREAM_NAME', 'jobContentStream'),
  groupName: getEnvVariable('GROUP_NAME', 'myGroup'),
  consumerName: getEnvVariable('CONSUMER_NAME', 'consumer1'),
}

if (config.debug) {
  console.log('Config:', config);
}
