"use client";
import {useState} from 'react';
import {Member} from '@/lib/types';

export function EmployeeSelect({members,label,name,value,defaultValue=[],onChange,disabled=false}:{members:Member[];label:string;name?:string;value?:string[];defaultValue?:string[];onChange?:(ids:string[])=>void;disabled?:boolean}) {
  const [selected,setSelected]=useState(defaultValue);
  const [search,setSearch]=useState('');
  const ids=value ?? selected;
  const available=members.filter(m=>(!('employmentStatus' in m) || m.employmentStatus==='ACTIVE') && `${m.user.displayName} ${m.user.username} ${m.user.email} ${m.department||''}`.toLowerCase().includes(search.toLowerCase()));
  return <fieldset className="employee-select" disabled={disabled}>
    <legend>{label}</legend>
    {name && ids.map(id=><input key={id} type="hidden" name={name} value={id}/>)}
    <details><summary>{ids.length ? `${ids.length} employees selected` : 'Select employees'}</summary>
      <label>Search employees<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, username or email"/></label>
      <div className="employee-options">{available.map(m=><label className="check-label" key={m.userId}><input type="checkbox" checked={ids.includes(m.userId)} onChange={e=>{const next=e.target.checked?[...ids,m.userId]:ids.filter(id=>id!==m.userId);setSelected(next);onChange?.(next);}}/><span>{m.user.displayName}<small className="muted">{m.user.email}</small></span></label>)}{!available.length && <p>No employees found.</p>}</div>
    </details>
  </fieldset>;
}
