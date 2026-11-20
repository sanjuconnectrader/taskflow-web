import {afterEach,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {AppUpdates} from '@/components/app-updates';
import {newer} from '@/lib/versions';
vi.mock('@capacitor/core',()=>({Capacitor:{getPlatform:()=> 'web',isNativePlatform:()=>false},registerPlugin:()=>({})}));
afterEach(()=>{cleanup();vi.unstubAllGlobals();sessionStorage.clear();delete window.taskflow;});

it('compares release versions numerically and rejects downgrades',()=>{
  expect(newer('1.10.0','1.9.9')).toBe(true);
  expect(newer('1.1.0','1.1.0')).toBe(false);
  expect(newer('1.0.9','1.1.0')).toBe(false);
  expect(newer('garbage','1.0.0')).toBe(false);
});
it('retains one refresh action after dismissing the web update popup and remounting',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({version:'9.0.0'})))));
  const view=render(<AppUpdates showStatus/>);
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button',{name:'Later'}));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getAllByRole('button',{name:'Refresh Application'})).toHaveLength(1);
  view.unmount();render(<AppUpdates showStatus/>);
  await screen.findByRole('button',{name:'Refresh Application'});
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('offers the desktop install bridge and marks installed releases current',async()=>{
  const installUpdate=vi.fn().mockResolvedValue(undefined);
  window.taskflow={platform:'win32',getVersion:async()=> '1.0.0',getSession:async()=>null,setSession:async()=>{},installUpdate};
  vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({version:'1.1.0'})))));
  render(<AppUpdates showStatus/>);
  fireEvent.click(await screen.findByRole('button',{name:'Install Update'}));
  await waitFor(()=>expect(installUpdate).toHaveBeenCalledTimes(1));
  window.taskflow.getVersion=async()=> '1.1.0';
  fireEvent.click(screen.getByRole('button',{name:'Check for updates'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Already Installed'})).toBeDisabled());
});
