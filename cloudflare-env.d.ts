declare namespace Cloudflare {
  interface Env {
    DATABASE_URL?: string;
    WRITE_LIMITER?: {limit:(arg:{key:string})=>Promise<{success:boolean}>};
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
