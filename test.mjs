import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { call, serve, tools } from './nanobot-mcp.mjs';
const key = 'sk-bayleaf-synthetic-nanobot';
process.env.BAYLEAF_API_KEY = key;
const seen=[];
globalThis.fetch = async (url, init) => {
  assert.equal(new URL(url).origin, 'https://api.bayleaf.dev');
  assert.equal(init.headers.Authorization, 'Bearer '+key); assert.equal(init.redirect,'error');
  seen.push({url,init});
  if (url.endsWith('/usage')) return Response.json({observed_at:'now',budgets:{standard:3},private:'omit'});
  if (url.endsWith('/web/search')) return Response.json({results:[{title:'title',url:'https://example.test',snippet:'text',private:'omit'}]});
  if (url.endsWith('/web/fetch')) return Response.json({results:[{content:'untrusted page'}]});
  if (init.method === 'DELETE') return new Response(null,{status:204});
  return Response.json({url:'https://owner-private-example.bayleaf-proxies.dev/', expires_at:'2026-12-01T00:00:00Z',private:'omit'});
};
const signal = new AbortController().signal;
for (const [name,args] of [['usage',{}],['search',{query:'test'}],['fetch',{url:'https://example.test'}],['expose',{port:8888}],['unexpose',{port:8888}]]) {
  const result = await call(name,args,signal);assert(!JSON.stringify(result).includes(key));assert(!JSON.stringify(result).includes('omit'));
}
assert.deepEqual(JSON.parse(seen[3].init.body),{port:8888,access:'private'});
assert.equal(seen[4].init.method,'DELETE');
const before = seen.length;
for (const [name,args] of [['expose',{port:3100}],['expose',{port:8792}],['expose',{port:8793}],['expose',{port:8888,access:'public'}],
    ['expose',{port:8888,upstream_headers:{Authorization:key}}],['fetch',{url:'https://user:password@example.test'}],['usage',{token:key}]]) {
  await assert.rejects(call(name,args,signal));
}
assert.equal(seen.length,before);
const guide=await readFile(new URL('./skills/bayleaf-sandboxes/SKILL.md',import.meta.url),'utf8');
for(const tool of tools)assert(guide.includes('mcp_bayleaf_'+tool.name));
assert(!guide.includes('schedule.create'));
// The independent transport owns these invariants, not another harness's tests.
let requests=0;
globalThis.fetch=async()=>{requests++;return Response.json({budgets:{remaining:1}});};
for(const credential of ['', 'sk-bayleaf-grant-synthetic']) {
  process.env.BAYLEAF_API_KEY=credential;await assert.rejects(call('usage',{},signal));
}
assert.equal(requests,0);process.env.BAYLEAF_API_KEY=key;
globalThis.fetch=async()=>Response.json({budgets:{reflected:key}});
await assert.rejects(call('usage',{},signal),/Unexpected/);
globalThis.fetch=async()=>new Response(key,{status:302,headers:{Location:'https://evil.test/'}});
await assert.rejects(call('usage',{},signal),error=>!error.message.includes(key));
let cancelled=false;
globalThis.fetch=async()=>new Response(new ReadableStream({
  start(controller){controller.enqueue(new Uint8Array(2*1024*1024+1));},
  cancel(){cancelled=true;},
}));
await assert.rejects(call('usage',{},signal));assert.equal(cancelled,true);
const controller=new AbortController();controller.abort();
globalThis.fetch=async(_,init)=>{assert.equal(init.signal.aborted,true);throw new Error('private transport');};
await assert.rejects(call('usage',{},controller.signal),/cancelled/);
globalThis.fetch=async()=>Response.json({results:[{title:'valid',url:'https://example.test',snippet:42}]});
await assert.rejects(call('search',{query:'test'},signal));
globalThis.fetch=async()=>{throw new Error(key+' synthetic private transport');};
const input=new PassThrough(), output=new PassThrough();let wire='';output.on('data',data=>wire+=data);
serve(input,output);
input.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18'}})+'\n');
input.write(JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list'})+'\n');
input.write(JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'usage',arguments:{}}})+'\n');
await new Promise(resolve=>setTimeout(resolve,25));
const responses=wire.trim().split('\n').map(JSON.parse);
assert.equal(responses[0].result.protocolVersion,'2025-06-18');assert.deepEqual(responses[1].result.tools,tools);
assert.equal(responses[2].result.isError,true);assert(!wire.includes(key));assert(!wire.includes('private transport'));
input.end();
console.log('PASS MCP protocol, fixed transport, private-only exposure, reserved ports, argument/output bounds and secret-free failure');
