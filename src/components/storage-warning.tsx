'use client';
import {useQuery} from '@tanstack/react-query';
import {request} from '@/lib/api';
import type {StorageStats} from './storage-panel';
export function StorageWarning({wid,onOpen}:{wid:string;onOpen:()=>void}){
 const query=useQuery<StorageStats>({queryKey:['storage',wid],queryFn:()=>request(`/storage/workspaces/${wid}`),refetchInterval:60000});
 const high=[query.data?.database,query.data?.files].filter((meter)=>meter?.percent!==null&&meter?.percent!==undefined&&meter.percent>=70);
 if(!high.length)return null;const percent=Math.max(...high.map(meter=>meter!.percent!));
 return <div className={`notice storage-warning ${percent>=95?'critical':percent>=85?'warning':'notice'}`} role="status">Storage is {percent.toFixed(1)}% of configured capacity. <button className="text-button" onClick={onOpen}>Review storage</button></div>;
}
