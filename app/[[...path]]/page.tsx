import WhenkinClient from '../whenkin-client';
import { notFound } from 'next/navigation';
export default async function Page({params}:{params:Promise<{path?:string[]}>}){
  const {path=[]}=await params;
  if(path.length!==0&&!(path.length===1&&['terms','privacy','how-it-works'].includes(path[0]))&&!(path.length===2&&path[0]==='e'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path[1])))notFound();
  return <WhenkinClient/>;
}
