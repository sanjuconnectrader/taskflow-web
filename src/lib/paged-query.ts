'use client';
import {useInfiniteQuery} from '@tanstack/react-query';
import {request} from './api';
export function usePagedQuery<T>(key:readonly unknown[],path:string,enabled=true){
 const result=useInfiniteQuery({queryKey:key,initialPageParam:undefined as string|undefined,queryFn:({pageParam})=>request<{items:T[];nextCursor:string|null;enabled?:boolean}>(`${path}${path.includes('?')?'&':'?'}${pageParam?`cursor=${pageParam}&`:''}limit=50`),getNextPageParam:last=>last.nextCursor||undefined,enabled});
 return {...result,items:result.data?.pages.flatMap(page=>page.items)||[]};
}
