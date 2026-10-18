import test from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnPath,loginURL} from '../src/navigation.js';
import {reconcileGuides} from '../src/reconcile.js';
test('login keeps invitations and shared-guide destinations',()=>{
 const origin='https://pathira.com';
 assert.equal(safeReturnPath('/workspace.html?invite=token',origin),'/workspace.html?invite=token');
 assert.equal(safeReturnPath('/view.html?share=token',origin),'/view.html?share=token');
 assert.equal(loginURL({pathname:'/view.html',search:'?share=token',hash:''}),'login.html?next=%2Fview.html%3Fshare%3Dtoken');
});
test('login rejects external and unexpected destinations',()=>{
 for(const path of ['//evil.example','https://evil.example/view.html','javascript:alert(1)','/privacy.html'])assert.equal(safeReturnPath(path,'https://pathira.com'),'index.html');
});
test('cloud refresh preserves unsynced edits and hydrated images at the same revision',()=>{
 const local=[{id:'dirty',revision:1,dirty:true,title:'Local'},{id:'clean',revision:1,screenshot:'cached'},{id:'draft',revision:0}];
 const remote=[{id:'dirty',revision:2,title:'Remote'},{id:'clean',revision:1},{id:'new',revision:1}];
 const result=reconcileGuides(local,remote);
 assert.equal(result.find(g=>g.id==='dirty').title,'Local');assert.equal(result.find(g=>g.id==='clean').screenshot,'cached');assert.equal(result.length,4);
});
test('cloud refresh replaces clean stale revisions and removes deleted cloud guides',()=>{
 assert.deepEqual(reconcileGuides([{id:'old',revision:1},{id:'deleted',revision:1}],[{id:'old',revision:2}]),[{id:'old',revision:2}]);
});
