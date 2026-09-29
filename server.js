const express=require('express'); const http=require('http'); const {Server}=require('socket.io'); const crypto=require('crypto');
const app=express(); const server=http.createServer(app); const io=new Server(server,{cors:{origin:'*'}}); app.use(express.static('public'));
const rooms=new Map(); let randomQueue=[];
const rid=()=>crypto.randomBytes(4).toString('hex').toUpperCase();
io.on('connection',s=>{
 s.on('create-room',({name,pin}={},cb=()=>{})=>{let id;do{id=rid()}while(rooms.has(id)); rooms.set(id,{pin:pin||'',members:new Set([s.id])}); s.join(id); s.data.room=id;s.data.name=(name||'Guest').slice(0,24); cb({ok:true,id});});
 s.on('join-room',({id,name,pin}={},cb=()=>{})=>{id=(id||'').toUpperCase();const r=rooms.get(id);if(!r)return cb({ok:false,error:'Room not found'});if(r.pin&&r.pin!==pin)return cb({ok:false,error:'Wrong PIN'});if(r.members.size>=2)return cb({ok:false,error:'Room is full'});r.members.add(s.id);s.join(id);s.data.room=id;s.data.name=(name||'Guest').slice(0,24);cb({ok:true,id});s.to(id).emit('peer-ready',{name:s.data.name});});
 s.on('signal',({toRoom,data})=>s.to(toRoom||s.data.room).emit('signal',{data,from:s.id,name:s.data.name}));
 s.on('game',({room,data})=>s.to(room||s.data.room).emit('game',data));
 s.on('random-find',({name}={})=>{s.data.name=(name||'Guest').slice(0,24);randomQueue=randomQueue.filter(x=>x!==s.id);const other=randomQueue.shift();if(other&&io.sockets.sockets.get(other)){const id='R-'+rid();rooms.set(id,{pin:'',members:new Set([other,s.id]),random:true});s.join(id);io.sockets.sockets.get(other).join(id);s.data.room=id;io.sockets.sockets.get(other).data.room=id;io.to(other).emit('random-match',{id,initiator:true,name:s.data.name});s.emit('random-match',{id,initiator:false,name:io.sockets.sockets.get(other).data.name||'Stranger'});}else{randomQueue.push(s.id);s.emit('random-wait');}});
 s.on('random-next',()=>{leave(s);s.emit('random-reset')});
 s.on('disconnect',()=>{randomQueue=randomQueue.filter(x=>x!==s.id);leave(s)});
 function leave(sock){const id=sock.data.room;if(!id)return;const r=rooms.get(id);if(r){r.members.delete(sock.id);sock.to(id).emit('peer-left');if(!r.members.size)rooms.delete(id);}sock.leave(id);delete sock.data.room;}
});
server.listen(process.env.PORT||3000,()=>console.log('TWOVYA running on http://localhost:'+(process.env.PORT||3000)));
