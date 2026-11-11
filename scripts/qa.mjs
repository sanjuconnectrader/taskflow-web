import {chromium} from '@playwright/test';import fs from 'node:fs';
const content=fs.readFileSync('../backend/.env','utf8');const password=content.match(/^SEED_PASSWORD=(.+)$/m)?.[1].trim();
const browser=await chromium.launch();
for(const [name,viewport] of [['desktop',{width:1448,height:1086}],['mobile',{width:430,height:932}]]){
const context=await browser.newContext({viewport});const login=await context.request.post('http://localhost:4000/api/v1/auth/login',{data:{email:'emma@taskflow.local',password}});if(!login.ok())throw Error(`QA login failed: ${login.status()}`);
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4173');await page.getByRole('heading',{name:'Task Progress',exact:true}).waitFor();await page.screenshot({path:`../.artifacts/${name}.png`,fullPage:true});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`${name} overflows`);
if(errors.length)throw Error(errors.join('\n'));console.log(`${name}: dashboard loaded without page errors or horizontal overflow.`);await context.close();}
await browser.close();
