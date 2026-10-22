"use client";
import { useEffect, useState, type ComponentType } from 'react';
export default function WhenkinClient(){
  const [Application,setApplication]=useState<ComponentType|null>(null);
  useEffect(()=>{let active=true;import('../src/App').then(module=>{if(active)setApplication(()=>module.default);});return()=>{active=false;};},[]);
  return Application?<Application/>:<main style={{maxWidth:1120,margin:'80px auto',padding:24}} aria-busy="true"><h1>Whenkin</h1><p>Find your shared time.</p></main>;
}
