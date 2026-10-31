export type PanelRect = { left: number; right: number; top: number; bottom: number; width: number; height: number };
export function anchoredPanelPosition(anchor: PanelRect, box: {width:number;height:number}, viewport: {left:number;top:number;width:number;height:number}) {
  const pad=12, gap=10, minX=viewport.left+pad, minY=viewport.top+pad;
  const maxX=Math.max(minX,viewport.left+viewport.width-box.width-pad);
  const maxY=Math.max(minY,viewport.top+viewport.height-box.height-pad);
  let left=anchor.right+gap;
  if(left>maxX) left=anchor.left-box.width-gap>=minX?anchor.left-box.width-gap:anchor.left+(anchor.width-box.width)/2;
  let top=anchor.bottom+gap;
  if(top>maxY) top=anchor.top-box.height-gap;
  return {left:Math.max(minX,Math.min(maxX,left)),top:Math.max(minY,Math.min(maxY,top))};
}
