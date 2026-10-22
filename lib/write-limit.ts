// Bounded fallback for Sites runtimes without a native write-rate binding.
export function createWriteLimiter(now:()=>number=Date.now){
  const windows=new Map<string,{count:number;ends:number}>();
  return {async limit({key}:{key:string}){
    const time=now();let current=windows.get(key);
    if(!current||current.ends<=time){
      if(windows.size>=5000){for(const [id,value] of windows){if(value.ends<=time)windows.delete(id);}}
      if(windows.size>=5000&&!windows.has(key))return {success:false};
      current={count:0,ends:time+60000};windows.set(key,current);
    }
    current.count++;return {success:current.count<=30};
  }};
}
export const writeLimiter=createWriteLimiter();
