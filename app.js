const $ = id => document.getElementById(id);
let socket = null, currentRoom = '', pc = null, dc = null, stream = null, isInitiator = false;
let deferredInstall = null;

function show(id){
  document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));
  const el=$(id); if(el) el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
window.show=show;

function setRealtimeNotice(msg){
  ['roomInfo','randomStatus'].forEach(id=>{const el=$(id); if(el&&!el.textContent) el.textContent=msg;});
}
function connectSocket(){
  if(typeof window.io!=='function'){
    setRealtimeNotice('Live rooms need the TWOVYA signaling server. The website and offline games still work here.');
    return;
  }
  socket=window.io();
  socket.on('connect_error',()=>setRealtimeNotice('Live server is offline. Solo features still work.'));
  socket.on('peer-ready',()=>{if(isInitiator&&pc) makeOffer();});
  socket.on('peer-left',()=>{if($('status')) $('status').textContent='Peer left'; try{dc?.close()}catch{}});
  socket.on('signal',handleSignal);
  socket.on('random-wait',()=>{$('randomStatus').textContent='Waiting for another online person…'});
  socket.on('random-match',async r=>{currentRoom=r.id;isInitiator=r.initiator;enterChat();await setupPeer(isInitiator);if(isInitiator)setTimeout(makeOffer,250)});
}
connectSocket();

$('create').onclick=()=>{
  if(!socket)return $('roomInfo').textContent='Live server is not connected yet.';
  socket.emit('create-room',{name:$('nick').value,pin:$('pin').value},r=>{if(r.ok){currentRoom=r.id;isInitiator=true;$('roomInfo').textContent='Room '+r.id+' — share this code';enterChat();setupPeer(true)}else $('roomInfo').textContent=r.error||'Could not create room';});
};
$('join').onclick=()=>{
  if(!socket)return $('roomInfo').textContent='Live server is not connected yet.';
  socket.emit('join-room',{id:$('roomCode').value,name:$('nick').value,pin:$('pin').value},r=>{if(!r.ok)return $('roomInfo').textContent=r.error;currentRoom=r.id;isInitiator=false;enterChat();setupPeer(false)});
};
function enterChat(){show('chat');$('chatTitle').textContent=currentRoom.startsWith('R-')?'Random Connect':'Room '+currentRoom;$('status').textContent='Waiting for peer…'}
async function setupPeer(init){
  pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  pc.onicecandidate=e=>e.candidate&&socket?.emit('signal',{toRoom:currentRoom,data:{candidate:e.candidate}});
  pc.ontrack=e=>{$('remote').srcObject=e.streams[0]};
  pc.onconnectionstatechange=()=>{$('status').textContent=pc.connectionState};
  if(init) bindDC(pc.createDataChannel('twovya')); else pc.ondatachannel=e=>bindDC(e.channel);
}
function bindDC(c){dc=c;dc.onopen=()=>{$('status').textContent='Private peer connection ready'};dc.onmessage=e=>{try{const d=JSON.parse(e.data);if(d.type==='msg')bubble(d.text,false);if(d.type==='ttt'){tttState=d.board;tttTurn=d.turn;renderTTT()}}catch{}}}
async function makeOffer(){if(!pc||!socket)return;const o=await pc.createOffer();await pc.setLocalDescription(o);socket.emit('signal',{toRoom:currentRoom,data:{sdp:pc.localDescription}})}
async function handleSignal({data}){if(!pc)await setupPeer(false);if(data.sdp){await pc.setRemoteDescription(data.sdp);if(data.sdp.type==='offer'){const a=await pc.createAnswer();await pc.setLocalDescription(a);socket.emit('signal',{toRoom:currentRoom,data:{sdp:pc.localDescription}})}}else if(data.candidate){try{await pc.addIceCandidate(data.candidate)}catch{}}}

$('send').onclick=send;$('msg').onkeydown=e=>{if(e.key==='Enter')send()};
function send(){const t=$('msg').value.trim();if(!t)return;if(!dc||dc.readyState!=='open')return alert('Peer connection is not ready yet.');dc.send(JSON.stringify({type:'msg',text:t}));bubble(t,true);$('msg').value=''}
function bubble(t,m){const d=document.createElement('div');d.className='bubble '+(m?'mine':'');d.textContent=t;$('messages').appendChild(d);$('messages').scrollTop=1e9}

$('findRandom').onclick=()=>{if(!socket)return $('randomStatus').textContent='Live server is not connected yet.';socket.emit('random-find',{name:$('rnick').value});$('randomStatus').textContent='Looking for someone…'};
$('nextRandom').onclick=()=>socket?.emit('random-next');

$('callBtn').onclick=async()=>{if(!pc)return alert('Connect with someone first.');try{stream=await navigator.mediaDevices.getUserMedia({audio:true,video:true});$('local').srcObject=stream;stream.getTracks().forEach(t=>pc.addTrack(t,stream));$('call').classList.remove('hidden');if(isInitiator)await makeOffer()}catch{alert('Camera/microphone permission is required for calls.')}};
$('hang').onclick=()=>{stream?.getTracks().forEach(t=>t.stop());$('call').classList.add('hidden')};
$('mute').onclick=()=>stream?.getAudioTracks().forEach(t=>t.enabled=!t.enabled);
$('cam').onclick=()=>stream?.getVideoTracks().forEach(t=>t.enabled=!t.enabled);

let tttState=Array(9).fill(''),tttTurn='X',myMark='X';
function startTTT(){show(currentRoom?'chat':'games');$('ttt').classList.remove('hidden');renderTTT()}window.startTTT=startTTT;
function renderTTT(){$('ttt').innerHTML='';tttState.forEach((v,i)=>{const b=document.createElement('button');b.textContent=v;b.onclick=()=>{if(v||tttTurn!==myMark)return;tttState[i]=myMark;tttTurn=myMark==='X'?'O':'X';renderTTT();if(dc?.readyState==='open')dc.send(JSON.stringify({type:'ttt',board:tttState,turn:tttTurn}))};$('ttt').appendChild(b)})}

const funs=['Truth: What is something you have never told me?','Dare: Send your funniest selfie 😄','Would you rather travel to the past or future?','Describe your mood using only 3 emojis.','Rapid fire: Tea or coffee? Night or morning? Call or text?','Give the other person a funny 30-second challenge.'];
window.fun=()=>{$('funCard').textContent=funs[Math.floor(Math.random()*funs.length)]};

let board2048=[];
function add2048(){const empty=board2048.map((v,i)=>v?null:i).filter(v=>v!==null);if(empty.length)board2048[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4}
function start2048(){board2048=Array(16).fill(0);add2048();add2048();render2048()}window.start2048=start2048;
function slide(line){const a=line.filter(Boolean);for(let i=0;i<a.length-1;i++)if(a[i]===a[i+1]){a[i]*=2;a.splice(i+1,1)}while(a.length<4)a.push(0);return a}
function move2048(dir){let b=board2048.slice(),n=Array(16).fill(0);for(let r=0;r<4;r++){let line=[];for(let c=0;c<4;c++){const i=(dir==='up'||dir==='down')?c*4+r:r*4+c;line.push(b[i])}if(dir==='right'||dir==='down')line.reverse();line=slide(line);if(dir==='right'||dir==='down')line.reverse();for(let c=0;c<4;c++){const i=(dir==='up'||dir==='down')?c*4+r:r*4+c;n[i]=line[c]}}if(n.some((v,i)=>v!==b[i])){board2048=n;add2048();render2048()}}
function render2048(){const a=$('gameArea');a.innerHTML=`<div class="tile2048">${board2048.map(x=>`<div>${x||''}</div>`).join('')}</div><div class="pad2048"><button onclick="move2048('up')">↑</button><span><button onclick="move2048('left')">←</button><button onclick="move2048('down')">↓</button><button onclick="move2048('right')">→</button></span></div>`}window.move2048=move2048;

$('install').onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null}else alert('Browser menu → Add to Home screen / Install app')};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
