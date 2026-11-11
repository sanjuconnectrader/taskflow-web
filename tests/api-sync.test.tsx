import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/platform',()=>({currentToken:()=>null}));
import {request,send} from '@/lib/api';
afterEach(()=>vi.unstubAllGlobals());
describe('API synchronization',()=>{
  it('announces only successful writes and bypasses cached reads',async()=>{
    const listener=vi.fn();
    window.addEventListener('taskflow:data-changed',listener);
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'saved'}),{status:201}));
    vi.stubGlobal('fetch',fetcher);
    try {
      await send('/workspaces/company/tasks',{title:'Task'});
      expect(listener).toHaveBeenCalledTimes(1);
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({items:[]})));
      await request('/workspaces/company/tasks');
      expect(fetcher.mock.calls[1][1].cache).toBe('no-store');
      expect(listener).toHaveBeenCalledTimes(1);
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:{message:'Denied'}}),{status:403}));
      await expect(send('/workspaces/company/tasks',{})).rejects.toThrow('Denied');
      expect(listener).toHaveBeenCalledTimes(1);
      fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ok:true})));
      await send('/workspaces/company/tasks/id',undefined,'DELETE');
      expect(listener).toHaveBeenCalledTimes(2);
    } finally {window.removeEventListener('taskflow:data-changed',listener);}
  });
});
