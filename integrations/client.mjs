export class PathiraClient {
 constructor({token,origin='https://pathira.com',fetchImpl=fetch}){this.token=token;this.origin=origin.replace(/\/$/,'');this.fetch=fetchImpl;if(!this.origin.startsWith('https://')&&!this.origin.startsWith('http://127.0.0.1:'))throw Error('Use HTTPS for Pathira credentials');}
 async request(query='',body){const response=await this.fetch(this.origin+'/.netlify/functions/guides'+query,{method:body?'PUT':'GET',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok)throw Object.assign(Error(result.error||'API request failed'),{status:response.status});return result;}
 listGuides(offset=0){return this.request('?offset='+offset)}
 getGuide(id){return this.request('?id='+encodeURIComponent(id))}
 saveGuide(document,expected_revision){return this.request('',{document,expected_revision})}
}
