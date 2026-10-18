export function transient(error) {
  const status=Number(error?.status||error?.statusCode);
  return [408,429,500,502,503,504].includes(status)||/failed to fetch|network|load failed|offline|timeout/i.test(error?.message||'');
}
export async function retrySync(operation,{sleep=ms=>new Promise(r=>setTimeout(r,ms)),onRetry=()=>{}}={}) {
  for(let attempt=0;;attempt++)try{return await operation()}catch(error){
    if(attempt>=2||!transient(error))throw error;
    onRetry(attempt+1);await sleep(1000*2**attempt);
  }
}
