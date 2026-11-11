"use client";
import {useEffect, useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {API, request, send} from '@/lib/api';
import {Modal, ErrorNotice} from './ui';

function newer(candidate:string, current:string) {
  if(!/^\d+\.\d+\.\d+$/.test(candidate) || !/^\d+\.\d+\.\d+$/.test(current)) return false;
  const a=candidate.split('.').map(Number), b=current.split('.').map(Number);
  for(let i=0;i<3;i++) if(a[i]!==b[i]) return a[i]>b[i];
  return false;
}
export function AppUpdates(){
  const [version,setVersion]=useState<string|null>(null);
  const [progress,setProgress]=useState<{state:string;percent?:number}|null>(null);
  const [error,setError]=useState<unknown>();
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const unsubscribe=window.taskflow?.onUpdateStatus?.(setProgress);
    let active=true;
    async function check(){
      if(Capacitor.getPlatform()!=='android') return;
      try {
        const {App}=await import('@capacitor/app');
        const installed=await App.getInfo();
        const release=await request<{version:string}>('/updates/mobile');
        if(active && newer(release.version,installed.version) && localStorage.getItem('dismissed-update')!==release.version) setVersion(release.version);
      } catch { /* Updates are optional when the release service is unavailable. */ }
    }
    check();const timer=setInterval(check,6*60*60*1000);
    return ()=>{active=false;clearInterval(timer);unsubscribe?.();};
  },[]);
  return <>
    {progress?.state==='downloading' && <div className="update-progress" role="status">Downloading update: {progress.percent ?? 0}%</div>}
    {progress?.state==='error' && <div className="update-progress" role="status">Update download failed. Please try again later.</div>}
    <Modal open={!!version} title="New Update Available" onClose={()=>{if(version)localStorage.setItem('dismissed-update',version);setVersion(null);}}>
      <div className="padded-form"><p>A new version of TaskFlow is available with improvements, new features, and bug fixes.</p>
        <p className="muted">Android will ask you to approve installation.</p><ErrorNotice error={error}/>
        <div className="inline"><button className="primary" disabled={busy} onClick={async()=>{setBusy(true);setError(null);try{
          const ticket=await send('/updates/mobile/ticket',{});
          const {Browser}=await import('@capacitor/browser');
          await Browser.open({url:`${API}${ticket.path}`});setVersion(null);
        }catch(e){setError(e);}finally{setBusy(false);}}}>Update Now</button>
        <button onClick={()=>{if(version)localStorage.setItem('dismissed-update',version);setVersion(null);}}>Later</button></div>
      </div>
    </Modal>
  </>;
}
