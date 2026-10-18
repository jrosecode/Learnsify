import {createWorkflow} from './model.js';
import {requireUser,loadLibrary,saveLibrary} from './cloud.js';
const user=await requireUser();
const form=document.querySelector('#create-guide-form');
form.addEventListener('submit',async event=>{
 event.preventDefault();const button=form.querySelector('button');button.disabled=true;
 try{const workflow=createWorkflow(document.querySelector('#guide-title').value,document.querySelector('#guide-category').value);
 const workflows=await loadLibrary(user);workflows.unshift(workflow);await saveLibrary(user,workflows);
 location.href=`index.html#guide/${workflow.id}`;
 }catch(error){alert('Unable to create guide: '+error.message);button.disabled=false;}
});
