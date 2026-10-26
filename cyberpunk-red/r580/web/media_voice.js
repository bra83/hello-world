// Playback status is separate from editable settings: polling cannot overwrite drafts.
let speechTimer=null,speechEpoch=0;
const statusNode=()=>{
 let el=document.getElementById('sceneVoiceStatus');
 if(!el){el=document.createElement('p');el.id='sceneVoiceStatus';el.setAttribute('role','status');el.style.cssText='font-size:13px;line-height:1.5;color:#9bd9e3';document.querySelector('.session-tool-row')?.after(el)}
 return el;
};
globalThis.BraseiroWatchSpeech=(engine=document.querySelector('#ttsEngine')?.value||'android')=>{
 clearTimeout(speechTimer);const epoch=++speechEpoch,started=Date.now();
 const poll=async()=>{
  try{
   const out=await globalThis.MotorBarbaraCore?.voice?.settings?.();if(epoch!==speechEpoch||!out)return;
   const g=out.tts?.gemini||{},a=out.tts?.android||{};
   const target=engine==='gemini'?g:a;
   const error=target.error;
   const active=[target].find(s=>/queued|generating|playing/.test(s.state||'')||s.speaking);
   const message=error?`Falha na voz: ${error}`:active?`Voz: ${active.state||'reproduzindo'}${active.activeEnginePackage?' · '+active.activeEnginePackage:''}`:'Leitura concluída ou parada.';
   const node=statusNode();if(node)node.textContent=message;const audio=document.getElementById('ttsStatus');if(audio)audio.textContent=message;
   if(active&&Date.now()-started<240000)speechTimer=setTimeout(poll,1000);
  }catch(e){if(epoch===speechEpoch){const node=statusNode();if(node)node.textContent='Não foi possível consultar a reprodução: '+e.message}}
 };
 speechTimer=setTimeout(poll,250);
};
const bind=()=>{
 document.getElementById('ttsSpeakBtn')?.addEventListener('click',()=>setTimeout(globalThis.BraseiroWatchSpeech,100));
 for(const id of ['ttsStopBtn','sessionStopVoiceBtn'])document.getElementById(id)?.addEventListener('click',()=>{clearTimeout(speechTimer);++speechEpoch;const n=statusNode();if(n)n.textContent='Leitura parada.'});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
