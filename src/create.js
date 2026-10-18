import {createWorkflow} from './model.js';
const form=document.querySelector('#create-guide-form');
form.addEventListener('submit',event=>{
  event.preventDefault();
  const workflow=createWorkflow(document.querySelector('#guide-title').value,document.querySelector('#guide-category').value);
  const stored=localStorage.getItem('pathira-workflows')||localStorage.getItem('learnsify-workflows');
  const workflows=stored?JSON.parse(stored):[];
  workflows.unshift(workflow);
  localStorage.setItem('pathira-workflows',JSON.stringify(workflows));
  location.href=`index.html#guide/${workflow.id}`;
});
