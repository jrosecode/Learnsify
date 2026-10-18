import {html} from './portable.js';

// Keep the complete printable document in memory, never in storage or a share URL.
export async function printGuide(doc) {
  const frame = document.createElement('iframe');
  frame.title = 'Printable guide';
  frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-10000px;border:0';
  const loaded = new Promise(resolve => { frame.onload = resolve; });
  frame.srcdoc = html(doc);
  document.body.append(frame);
  try {
    await loaded;
    await Promise.all([...frame.contentDocument.images].map(img => img.decode()));
    const cleanup = () => frame.remove();
    frame.contentWindow.addEventListener('afterprint', cleanup, {once:true});
    frame.contentWindow.focus();
    frame.contentWindow.print();
    // Some browsers omit afterprint on cancellation.
    setTimeout(cleanup, 120000);
  } catch (error) {
    frame.remove();
    throw new Error('Could not prepare all guide images for printing. Please try again.');
  }
}
