import { WeatherServer } from './WeatherServer';
import { LocationServer } from './LocationServer';
import { GitHubServer } from './GitHubServer';
import { TavilyServer } from './TavilyServer';
import { WebServer } from './WebServer';

export const createServerRegistry = () => ({
  weather: new WeatherServer(),
  location: new LocationServer(),
  github: new GitHubServer(),
  tavily: new TavilyServer(),
  webserver: new WebServer(),
});

export type ServerRegistry = ReturnType<typeof createServerRegistry>;
export type ServerType = keyof ServerRegistry;

export * from './BaseServer';
export * from './WeatherServer';
export * from './LocationServer';
export * from './GitHubServer';
export * from './TavilyServer';
export * from './WebServer';
