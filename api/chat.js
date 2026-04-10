<script>
let cnt=0,busy=false;

// Page switch
function showChat(){
  document.getElementById('landing').style.display='none';
  document.getElementById('chat').style.display='flex';
}
function showLanding(){
  document.getElementById('chat').style.display='none';
  document.getElementById('landing').style.display='flex';
}

// Send message
async function send(){
  const inp=document.getElementById('inp');
  const text=inp.value.trim();
  if(!text||busy)return;

  if(cnt>=20){
    alert('Limit khatam!');
    return;
  }

  inp.value='';
  busy=true;
  cnt++;
  document.getElementById('mc').textContent=cnt;

  addMsg('user',text);

  try{
    const res=await fetch('/api/chat',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({message:text})
    });

    const data=await res.json();
    addMsg('ai',data.reply);

  }catch(e){
    addMsg('ai','❌ Error aaya');
  }

  busy=false;
}

// Add message
function addMsg(type,text){
  const list=document.getElementById('mlist');

  const div=document.createElement('div');
  div.style.margin='10px';

  div.innerHTML = type==='ai'
    ? "🤖 "+text
    : "👤 "+text;

  list.appendChild(div);
}

// Enter key
document.addEventListener("DOMContentLoaded",()=>{
  const inp=document.getElementById("inp");
  inp.addEventListener("keypress",(e)=>{
    if(e.key==="Enter"){
      e.preventDefault();
      send();
    }
  });
});
</script>
