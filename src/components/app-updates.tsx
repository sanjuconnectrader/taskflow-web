"use client";
import {useEffect, useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {API, request, send} from '@/lib/api';
import {Modal, ErrorNotice} from './ui';
import {newer} from '@/lib/versions';

type Release={version:string;notes?:string;publishedAt?:string};
export function AppUpdates({showStatus=false}:{showStatus?:boolean}){
  const [installed,setInstalled]=useState('');
  const [release,setRelease]=useState<Release>();
  const [state,setState]=useState<'checking'|'current'|'available'|'failed'>('checking');
  const [checkNumber,setCheckNumber]=useState(0);
  const [popup,setPopup]=useState(false);
  const [progress,setProgress]=useState<{state:string;percent?:number}|null>(null);
  const [error,setError]=useState<unknown>();
  const [busy,setBusy]=useState(false);
  const android=Capacitor.getPlatform()==='android';
  const desktop=typeof window!=='undefined' && !!window.taskflow;
  const web=!android && !desktop;
  useEffect(()=>{
    let active=true;
    const unsubscribe=window.taskflow?.onUpdateStatus?.(setProgress);
    async function check(){
      try {
        const version=android ? (await (await import('@capacitor/app')).App.getInfo()).version : desktop ? await window.taskflow!.getVersion!() : process.env.NEXT_PUBLIC_APP_VERSION || '1.1.0';
        const latest:Release=web ? await fetch(`/version.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Unable to check for updates.');return r.json();}) : await request<Release>(android?'/updates/mobile':'/updates/desktop');
        if(!active)return;
        setInstalled(version);setRelease(latest);
        const available=newer(latest.version,version);
        setState(available?'available':'current');
        if(!desktop && available && sessionStorage.getItem('dismissed-update')!==latest.version)setPopup(true);
        if(!available)setPopup(false);
      } catch(e){if(active){setState('failed');setError(e);}}
    }
    check();const timer=setInterval(check,15*60*1000);
    const visible=()=>{if(document.visibilityState==='visible')check();};
    document.addEventListener('visibilitychange',visible);
    window.addEventListener('online',check);
    let removeResume:(()=>void)|undefined;
    if(android) import('@capacitor/app').then(async({App})=>{const listener=await App.addListener('appStateChange',({isActive})=>{if(isActive)check();});if(!active)listener.remove();else removeResume=()=>{listener.remove();};});
    return ()=>{active=false;clearInterval(timer);unsubscribe?.();removeResume?.();document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',check);};
  },[checkNumber,android,desktop,web]);
  const dismiss=()=>{if(release)sessionStorage.setItem('dismissed-update',release.version);setPopup(false);};
  async function install(){
    setBusy(true);setError(null);
    try {
      if(web){location.reload();return;}
      if(desktop){await window.taskflow!.installUpdate!();return;}
      const ticket=await send('/updates/mobile/ticket',{});
      const {Browser}=await import('@capacitor/browser');
      await Browser.open({url:`${API}${ticket.path}`});setPopup(false);
    }catch(e){setError(e);}finally{setBusy(false);}
  }
  const action=<button type="button" className="primary" disabled={busy || state!=='available' || progress?.state==='downloading'} onClick={install}>{state==='current'?'Already Installed':busy?'Preparing update...':progress?.state==='ready'?'Install and Restart':web?'Refresh Application':'Install Update'}</button>;
  return <>
    {showStatus && <section className="update-progress" aria-label="Application update notification" role="status" aria-live="polite">
      <strong>{state==='available'?`TaskFlow ${release?.version} available`:state==='current'?'Already Installed':state==='checking'?'Checking for updates...':'Unable to check for updates'}</strong>
      <p>{installed && `Installed: ${installed}`}{release && ` ? Latest: ${release.version}`}</p>
      {release?.notes && <p style={{whiteSpace:'pre-wrap'}}>{release.notes}</p>}
      {android && state==='available' && <p>Download the APK, open it from Downloads, and approve installation. Your account stays intact.</p>}
      <div className="inline">{release && action}<button type="button" disabled={busy} onClick={()=>{setError(null);setState('checking');setCheckNumber(n=>n+1);}}>Check for updates</button></div>
      <ErrorNotice error={error}/>
    </section>}
    {progress?.state==='downloading' && <div className="update-progress" role="status">Downloading update: {progress.percent ?? 0}%</div>}
    {progress?.state==='ready' && !showStatus && <div className="update-progress" role="status">Update ready. Open Notifications to install and restart.</div>}
    {progress?.state==='error' && <div className="update-progress" role="alert">Update failed. Open Notifications to retry.</div>}
    <Modal open={popup} title="New Update Available" onClose={dismiss}>
      <div className="padded-form"><p>TaskFlow {release?.version} is available.</p><p>{release?.notes || 'Improvements, new features, and bug fixes.'}</p><p className="muted">You can always return to Notifications to update.</p><ErrorNotice error={error}/><div className="inline">{action}<button type="button" onClick={dismiss}>Later</button></div></div>
    </Modal>
  </>;
}
