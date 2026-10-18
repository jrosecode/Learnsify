import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuidesHandler} from '../server/guides-api.mjs';
import {bodyJSON} from '../server/auth.mjs';
import {PathiraClient} from '../integrations/client.mjs';
import {createMcpServer} from '../integrations/mcp.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
test('API rejects missing authentication and invalid revision writes',async()=>{
 assert.equal((await createGuidesHandler()(new Request('https://pathira.com/api'))).status,401);
 const handler=createGuidesHandler(async()=>({client:{}}));assert.equal((await handler(new Request('https://pathira.com/api',{method:'PUT',body:JSON.stringify({document:{}})}))).status,400);
});
test('API enforces streaming request size',async()=>{await assert.rejects(bodyJSON(new Request('https://example.com',{method:'POST',body:'x'.repeat(101)}),100),/too large/)});
test('SDK preserves conflicts and sends user credentials only in headers',async()=>{
 const client=new PathiraClient({token:'test-token',fetchImpl:async(url,options)=>{assert.ok(!url.includes('test-token'));assert.equal(options.headers.Authorization,'Bearer test-token');return Response.json({error:'REVISION_CONFLICT'},{status:409})}});
 await assert.rejects(client.saveGuide({},1),e=>e.status===409);
});
test('MCP protocol lists read-only tools and returns guide results',async()=>{
 const server=createMcpServer({listGuides:async()=>({guides:[{id:'example',title:'Guide'}]}),getGuide:async()=>({})});const client=new Client({name:'test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await Promise.all([server.connect(a),client.connect(b)]);
 const tools=await client.listTools();assert.equal(tools.tools.length,2);assert.ok(tools.tools.every(t=>t.annotations.readOnlyHint));const result=await client.callTool({name:'list_guides',arguments:{offset:0}});assert.match(result.content[0].text,/Guide/);await client.close();await server.close();
});
