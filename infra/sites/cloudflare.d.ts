declare module 'cloudflare:node' {
  export function httpServerHandler(options: { port: number }): {
    fetch(request: Request, env?: unknown, context?: unknown): Promise<Response>;
  };
}
declare module 'cloudflare:workers' {
  export const env: {
    DATABASE_URL?: string;
    ASSETS: { fetch(request: Request): Promise<Response> };
  };
}
