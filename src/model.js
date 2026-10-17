export function createWorkflow(title, category='Operations') {
  return { id: crypto.randomUUID(), title: title.trim() || 'Untitled guide', category, status:'Draft', views:0, completions:0, updated:'Just now', steps:[{id:crypto.randomUUID(), title:'Start here', description:'Add the first action your learner should take.'}] };
}
export function filterWorkflows(rows, query='', category='All', status='All') {
  const q=query.toLowerCase().trim();
  return rows.filter(x=>(!q || `${x.title} ${x.category}`.toLowerCase().includes(q)) && (category==='All'||x.category===category) && (status==='All'||x.status===status));
}
export function moveStep(steps, from, direction) { const out=[...steps]; const to=from+direction; if(to<0||to>=out.length)return out; [out[from],out[to]]=[out[to],out[from]]; return out; }
export function progressPercent(index,total){ return total ? Math.round(((index+1)/total)*100) : 0; }
