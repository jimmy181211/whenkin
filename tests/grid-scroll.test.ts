import { describe, expect, it, vi } from 'vitest';
import { scrollGrid } from '../src/lib/grid-scroll';
function scroller(top=0){
  let current=top;
  return {clientHeight:500,clientWidth:700,scrollWidth:700,scrollLeft:0,get scrollTop(){return current;},set scrollTop(value:number){current=Math.min(1000,Math.max(0,value));}} as HTMLElement;
}
function wheel(deltaY:number,extra={}){return {deltaY,deltaX:0,deltaMode:0,ctrlKey:false,metaKey:false,preventDefault:vi.fn(),...extra} as unknown as WheelEvent;}
describe('laptop trackpad and mouse wheel grid scrolling',()=>{
  it('handles fractional pixel and diagonal trackpad movement once',()=>{
    const element=scroller(),event=wheel(12.5,{deltaX:2});scrollGrid(element,event);
    expect(element.scrollTop).toBe(12.5);expect(event.preventDefault).toHaveBeenCalledOnce();
  });
  it('normalizes mouse wheel lines and pages',()=>{
    const element=scroller();scrollGrid(element,wheel(3,{deltaMode:1}));expect(element.scrollTop).toBe(48);
    scrollGrid(element,wheel(1,{deltaMode:2}));expect(element.scrollTop).toBe(548);
  });
  it('leaves browser pinch zoom and page scrolling at a boundary alone',()=>{
    const element=scroller(),pinch=wheel(50,{ctrlKey:true}),edge=wheel(-50);
    scrollGrid(element,pinch);scrollGrid(element,edge);
    expect(element.scrollTop).toBe(0);expect(pinch.preventDefault).not.toHaveBeenCalled();expect(edge.preventDefault).not.toHaveBeenCalled();
  });
});
