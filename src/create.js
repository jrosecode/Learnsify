const form=document.querySelector('#create-guide-form');
form.addEventListener('submit',event=>{
 event.preventDefault();
 const params=new URLSearchParams({new:'1',title:document.querySelector('#guide-title').value});
 location.href='index.html?'+params;
});
