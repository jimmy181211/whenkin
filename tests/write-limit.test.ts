import {describe,it,expect} from 'vitest';
import {createWriteLimiter} from '../lib/write-limit';
describe('Sites write protection',()=>{
  it('limits one caller while allowing another caller',async()=>{const limiter=createWriteLimiter();for(let i=0;i<30;i++)expect((await limiter.limit({key:'one'})).success).toBe(true);expect((await limiter.limit({key:'one'})).success).toBe(false);expect((await limiter.limit({key:'two'})).success).toBe(true);});
  it('allows writes again when the window expires',async()=>{let time=0;const limiter=createWriteLimiter(()=>time);for(let i=0;i<31;i++)await limiter.limit({key:'one'});time=60000;expect((await limiter.limit({key:'one'})).success).toBe(true);});
  it('bounds new callers under load and recovers after expiry',async()=>{let time=0;const limiter=createWriteLimiter(()=>time);for(let i=0;i<5000;i++)await limiter.limit({key:String(i)});expect((await limiter.limit({key:'new'})).success).toBe(false);time=60000;expect((await limiter.limit({key:'new'})).success).toBe(true);});
});
