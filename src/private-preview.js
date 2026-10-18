// Draft previews travel only through a short-lived same-origin channel.
// They are never placed in browser storage or published to the server.
export function openPrivatePreview(document) {
  const id = crypto.randomUUID();
  const channel = new BroadcastChannel('pathira-preview-' + id);
  const snapshot = structuredClone(document);
  const close = () => { clearTimeout(timer); channel.close(); };
  const timer = setTimeout(close, 30000);
  channel.onmessage = event => {
    if (event.data?.type === 'ready') channel.postMessage({type:'document', document:snapshot});
    if (event.data?.type === 'received') close();
  };
  const popup = window.open('view.html?preview=' + id, '_blank');
  if (!popup) { close(); throw Error('Allow pop-ups for Pathira to open a private preview.'); }
  // The preview uses BroadcastChannel, so no opener access is needed.
  popup.opener = null;
  return popup;
}
export function receivePrivatePreview(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return Promise.reject(Error('Reopen this preview from your workspace.'));
  return new Promise((resolve, reject) => {
    const channel = new BroadcastChannel('pathira-preview-' + id);
    const timer = setTimeout(() => { channel.close(); reject(Error('Preview expired. Reopen it from your workspace.')); }, 5000);
    channel.onmessage = event => {
      if (event.data?.type !== 'document') return;
      clearTimeout(timer);
      channel.postMessage({type:'received'});
      channel.close();
      resolve(event.data.document);
    };
    channel.postMessage({type:'ready'});
  });
}
