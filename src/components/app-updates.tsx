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
export function AppUpdates({showStatus=false}:{showStatus?:boolean}){
  const [installedVersion,setInstalledVersion]=useState('');
  const [checkState,setCheckState]=useState<'checking'|'current'|'available'|'failed'>('checking');
  const [latestVersion,setLatestVersion]=useState('');
  const [checkNumber,setCheckNumber]=useState(0);
  const [version,setVersion]=useState<string|null>(null);
  const [progress,setProgress]=useState<{state:string;percent?:number}|null>(null);
  const [error,setError]=useState<unknown>();
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const unsubscribe=window.taskflow?.onUpdateStatus?.(setProgress);
    let active=true;
    async function check(){
      const android=Capacitor.getPlatform()==='android';
      if(!android && !window.taskflow?.getVersion) return;
      try {
        if(active)setCheckState('checking');
        const installed=android ? (await (await import('@capacitor/app')).App.getInfo()).version : await window.taskflow!.getVersion!();
        if(active)setInstalledVersion(installed);
        const release=await request<{version:string}>(android?'/updates/mobile':'/updates/desktop');
        if(!active)return;
        setLatestVersion(release.version);
        const available=newer(release.version,installed);
        setCheckState(available?'available':'current');
        if(android && available && sessionStorage.getItem('dismissed-update')!==release.version)setVersion(release.version);
      } catch {if(active)setCheckState('failed');}
    }
    check();const timer=setInterval(check,6*60*60*1000);
    return ()=>{active=false;clearInterval(timer);unsubscribe?.();};
  },[checkNumber]);
  return <>
    {showStatus && installedVersion && <div className="update-progress" role="status" aria-live="polite"><strong>{checkState==='current'?'Latest version installed':checkState==='available'?'New update available':checkState==='checking'?'Checking for updates…':'Unable to check for updates'}</strong><p>Installed: {installedVersion}{latestVersion && checkState==='available'?` · Latest: ${latestVersion}`:''}</p><button type="button" disabled={checkState==='checking'} onClick={()=>{sessionStorage.removeItem('dismissed-update');setCheckNumber(n=>n+1);}}>Check for updates</button></div>}
    {progress?.state==='downloading' && <div className="update-progress" role="status">Downloading update: {progress.percent ?? 0}%</div>}
    {progress?.state==='error' && <div className="update-progress" role="status">Update download failed. Please try again later.</div>}
    <Modal open={!!version} title="New Update Available" onClose={()=>{if(version)sessionStorage.setItem('dismissed-update',version);setVersion(null);}}>
      <div className="padded-form"><p>A new version of TaskFlow is available with improvements, new features, and bug fixes.</p>
        <p className="muted">Android will ask you to approve installation.</p><ErrorNotice error={error}/>
        <div className="inline"><button className="primary" disabled={busy} onClick={async()=>{setBusy(true);setError(null);try{
          const ticket=await send('/updates/mobile/ticket',{});
          const {Browser}=await import('@capacitor/browser');
          await Browser.open({url:`${API}${ticket.path}`});setVersion(null);
        }catch(e){setError(e);}finally{setBusy(false);}}}>Update Now</button>
        <button onClick={()=>{if(version)sessionStorage.setItem('dismissed-update',version);setVersion(null);}}>Later</button></div>
      </div>
    </Modal>
  </>;
}
