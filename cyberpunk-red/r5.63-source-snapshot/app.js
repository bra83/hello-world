import {ROLES,STATS,MASTER_SKILLS,BASIC_SKILLS,createCharacter,validateCharacter,serializeCharacter,deserializeCharacter,migrateCharacter,getSkillLabel,getRoleLabel,derive,skillCost} from '../adapter/character_rules.js';
import {BarbaraHostBridge} from '../core_bridge/barbara_host_bridge.js';
import {NightCityAtlas} from './atlas.js';
import {LivingNightCityUI} from './gameplay.js';
import {NetrunUI} from './netrun.js';
import {CharacterWorkbenchUI} from './sheets.js';
import {CyberpunkAudioDirector} from './audio.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const bind=(selector,event,handler)=>{const el=$(selector);if(el)el.addEventListener(event,handler);return el};
const bridge=new BarbaraHostBridge();
// Segurança: o segredo não é retornado à WebView; somente status/configurações públicas atravessam a bridge.
let character=createCharacter({method:'complete',role:'solo',name:'Razor'});
let importedAsset=false;
const atlas=new NightCityAtlas({bridge,getCharacter:()=>character,toast:t=>toast(t)});
atlas.init().catch(e=>toast(`Atlas: ${e.message}`));
const gameplay=new LivingNightCityUI({atlas,bridge,getCharacter:()=>character,setCharacter:c=>{character=c},renderCharacter:()=>{applyAssets();render()},toast:t=>toast(t)});
gameplay.init().catch(e=>toast(`Jogo: ${e.message}`));
const netrun=new NetrunUI({atlas,bridge,getCharacter:()=>character,toast:t=>toast(t)});
netrun.init();
const workbench=new CharacterWorkbenchUI({bridge,atlas,getCharacter:()=>character,setCharacter:c=>{character=c},renderCharacter:()=>{applyAssets();render()},saveCharacter:c=>bridge.saveCharacter(c),toast:t=>toast(t)});
workbench.init().catch(e=>toast(`Ficha: ${e.message}`));
const audio=new CyberpunkAudioDirector({button:$('#audioToggle'),toast:t=>toast(t)});audio.bind();

const methodText={
 streetrat:'Rato de Rua: role 1d10 uma vez e copie o bloco completo da tabela da Função. Os atributos e níveis de perícia do template não podem ser rearranjados.',
 edgerunner:'Edgerunner: role 1d10 separadamente para cada STAT na tabela da Função. Depois distribua exatamente 86 pontos entre as 20 perícias daquela Função.',
 complete:'Pacote Completo: distribua 62 pontos entre os dez STATs (mín. 2, máx. 8) e 86 pontos de perícias. Perícias ×2 custam o dobro.'
};
const PTBR_LABELS={
 culturalRegion:'Região cultural',culturalLanguage:'Idioma cultural',personality:'Personalidade',clothingStyle:'Estilo de roupa',hairstyle:'Cabelo',affectation:'Marca / afetação',value:'Valor',peopleView:'Visão sobre as pessoas',valuedPerson:'Pessoa valorizada',valuedPossession:'Posse valorizada',familyBackground:'Histórico familiar',environment:'Ambiente',familyCrisis:'Crise familiar',friends:'Amigos',enemies:'Inimigos',tragicLoveAffairs:'Amores trágicos',lifeGoal:'Objetivo de vida',role:'Função',streetrat:'Rato de Rua',edgerunner:'Edgerunner',complete:'Pacote Completo',gmVeto:'Veto do Mestre'
};
function displayLabel(value){const key=String(value??'');return PTBR_LABELS[key]||key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());}
const PTBR_VISIBLE_TERMS=[
 ['Stealth Netrunning','Netrunning furtivo'],['NET Action','Ação NET'],['NET Actions','Ações NET'],['Group IP','IP do Grupo'],['Jacked In','Conectado à NET'],['Watcher Pathfinder','Pathfinder do Vigia'],['Watcher','Vigia'],['Black ICE','Gelo Negro'],['Humanity','Humanidade'],['Athletics','Atletismo'],['Archery','Arquearia'],['Autofire','Tiro Automático'],['Brawling','Briga'],['Evasion','Evasão'],['Handgun','Armas Curtas'],['Heavy Weapons','Armas Pesadas'],['Martial Arts','Artes Marciais'],['Melee Weapon','Arma Corpo a Corpo'],['Shoulder Arms','Armas de Ombro'],['Crew','Equipe'],['Opposition','Oposição'],['Upgrade','Melhoria'],['Practice','Treino'],
 ['Chemical Analysis','Análise química'],['Digital Scavenging','Varredura digital'],['Combat Awareness','Percepção de Combate'],['Cyberware Enhancement','Aprimoramento de Cyberware'],['Hardened Mook','Capanga endurecido'],['Local Expert','Especialista Local'],['Medical Tech','Tecnologia Médica'],['Basic Tech','Tecnologia Básica'],['Interface Plug','Plugue de Interface'],['Linear Frame','Armação Linear'],['Street Drugs','Drogas de Rua'],['First Aid','Primeiros Socorros'],['Flash of Luck','Flash de Sorte'],['Opposed Check','Teste oposto'],['Net Architecture','Arquitetura NET'],['Net Actions','Ações NET'],['Option Slots','Vagas de opção'],['Street Stories Beat','Etapa de Street Stories'],
 ['Challenging','Desafiador'],['Difficult','Difícil'],['Legendary','Lendário'],['Average','Médio'],['Easy','Fácil'],['Observation','Observação'],['Research','Pesquisa'],['Gossip','Fofoca'],['Auditing','Auditoria'],['Autopsy','Autópsia'],['Deciphering','Decifração'],['Forensics','Forense'],['Interrogation','Interrogatório'],['Attachments','Acessórios'],['Ammunition','Munição'],['Poor','Ruim'],['Standard','Padrão'],['Excellent','Excelente'],['Lieutenant','Tenente'],['Morale','Moral'],['Malfunction','Falha'],['Round','Rodada'],['Floor','Andar'],['Floors','Andares'],['Beat','Etapa'],['Runtime','Mecânicas'],['Upgrade','Melhoria'],['Practice','Treino'],['Check','Teste'],['Action','Ação'],['Target','Alvo'],['Hostile','Hostil'],['Friendly','Aliado'],['Neutral','Neutro'],['Unknown','Desconhecido'],['Equipped','Equipado'],['Inventory','Inventário'],['Settings','Configurações'],['Source','Fonte'],['Status','Estado'],['External','Externo'],['Internal','Interno'],['Search','Buscar'],['Filter','Filtrar'],['Open','Abrir'],['Close','Fechar'],['Save','Salvar'],['Load','Carregar'],['Vehicle','Veículo'],['Armor','Armadura'],['Weapon','Arma'],['Gear','Equipamento'],['Consumable','Consumível'],['Ammo','Munição'],['App','Aplicativo'],['Pharmaceuticals','Fármacos']
].sort((a,b)=>b[0].length-a[0].length);
function translateVisibleText(value){
 let out=String(value??'');
 for(const [from,to] of PTBR_VISIBLE_TERMS){const escaped=from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');out=out.replace(new RegExp(`(^|[^A-Za-z0-9_])(${escaped})(?=$|[^A-Za-z0-9_])`,'gi'),(_,lead)=>lead+to)}
 return out;
}
function localizeVisibleUi(root=document.body){
 if(!root)return;const nodes=[];
 if(root.nodeType===Node.TEXT_NODE)nodes.push(root);else{const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode)}
 for(const node of nodes){const tag=node.parentElement?.tagName;if(['SCRIPT','STYLE','TEXTAREA'].includes(tag))continue;const before=node.nodeValue,after=translateVisibleText(before);if(after!==before)node.nodeValue=after}
}
let ptbrObserver=null;
function installPtBrObserver(){if(ptbrObserver||!document.body)return;localizeVisibleUi();ptbrObserver=new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')localizeVisibleUi(record.target);for(const node of record.addedNodes||[])localizeVisibleUi(node)}});ptbrObserver.observe(document.body,{subtree:true,childList:true,characterData:true})}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1600)}
function openDiceTray(){
 const tray=$('#diceTray');tray.classList.remove('hidden');$('#diceFormula').focus();
}
function closeDiceTray(){ $('#diceTray').classList.add('hidden'); }
function parseDiceFormula(formula){
 const m=String(formula||'').match(/^\s*(\d{1,2})d(4|6|8|10|12|20|100)\s*([+-]\s*\d{1,4})?\s*$/i);
 if(!m)throw new Error('Use Nd4/d6/d8/d10/d12/d20/d100, com modificador opcional.');
 const count=Number(m[1]),sides=Number(m[2]),modifier=Number(String(m[3]||'0').replace(/\s/g,''));
 if(count<1||count>40)throw new Error('Use entre 1 e 40 dados.');
 return{count,sides,modifier,normalized:`${count}d${sides}${modifier?`${modifier>0?'+':''}${modifier}`:''}`};
}
function digitalDiceFallback(parsed){
 const values=[];for(let i=0;i<parsed.count;i++){const word=new Uint32Array(1);crypto.getRandomValues(word);values.push(1+(word[0]%parsed.sides))}
 return{formula:parsed.normalized,values,sum:values.reduce((a,b)=>a+b,0),modifier:parsed.modifier,total:values.reduce((a,b)=>a+b,0)+parsed.modifier,authority:'web_crypto_fallback'};
}
function renderDiceResult(result){
 const out=$('#diceResult'),values=(result.values||[]).join(' • '),physical=result.authority==='physical_top_face_verified_native';
 out.classList.toggle('verified',physical);out.querySelector('b').textContent=String(result.total??'—');out.querySelector('span').textContent=`${result.formula||''} → ${values}${result.modifier?` ${result.modifier>0?'+':''}${result.modifier}`:''} • ${physical?'face superior verificada no Android':'fallback digital para prévia web'}`;
 $('#diceRollBtn').disabled=false;$('#diceRollBtn').textContent='ROLAR FISICAMENTE';
}
function rollDice3D(){
 try{
  const parsed=parseDiceFormula($('#diceFormula').value);$('#diceFormula').value=parsed.normalized;$('#diceRollBtn').disabled=true;$('#diceRollBtn').textContent='ROLANDO…';
  if(globalThis.AndroidDice3D?.roll){AndroidDice3D.roll(parsed.normalized,character.characterId||'',`cyberpunk-red-${character.role||'edgerunner'}`);return}
  const fallback=digitalDiceFallback(parsed);setTimeout(()=>renderDiceResult(fallback),260);toast('Prévia web: rolagem digital; física 3D exige o app Android.');
 }catch(error){toast(error.message);$('#diceRollBtn').disabled=false;$('#diceRollBtn').textContent='ROLAR FISICAMENTE'}
}
window.addEventListener('barbara:dice3d-result',event=>{renderDiceResult(event.detail||{});toast(`Dados 3D verificados: ${event.detail?.total??'—'}`)});
window.addEventListener('barbara:dice3d-error',event=>{$('#diceRollBtn').disabled=false;$('#diceRollBtn').textContent='ROLAR FISICAMENTE';toast(event.detail?.message||'Falha nos dados 3D.')});
function renderRuleCorpusStatus(detail){
 const out=$('#rulesImportStatus'),rows=detail?.index?.status||detail?.status||[],failed=rows.filter(x=>x.status==='failed'),ready=rows.filter(x=>['indexed','current','complete'].includes(x.status)),ok=detail?.ok!==false&&!failed.length;out.classList.toggle('bad',!ok);out.textContent=rows.length?`${ready.length} fonte(s) pronta(s)${failed.length?` • ${failed.length} falhou/falharam`:''}${detail?.revision?` • revisão ${String(detail.revision).slice(0,12)}`:''}`:'Nenhum corpus adicional importado.';$('#rulesImportBtn').disabled=false;$('#rulesImportBtn').textContent='ESCOLHER PDFs';
}
window.addEventListener('barbara:rules-import-progress',event=>{$('#rulesImportStatus').textContent=`Copiando e indexando ${event.detail?.count||0} PDF(s)…`;$('#rulesImportBtn').disabled=true;$('#rulesImportBtn').textContent='INDEXANDO…'});
window.addEventListener('barbara:rules-import-result',event=>{const detail=event.detail||{};renderRuleCorpusStatus(detail);toast(detail.ok?'Corpus de regras indexado no Motor Bárbara.':'O Motor rejeitou uma ou mais fontes; consulte o status.')});
window.addEventListener('barbara:rules-import-error',event=>{$('#rulesImportStatus').classList.add('bad');$('#rulesImportStatus').textContent=event.detail?.message||'Falha na importação.';$('#rulesImportBtn').disabled=false;$('#rulesImportBtn').textContent='ESCOLHER PDFs';toast(event.detail?.message||'Falha na importação.')});
window.addEventListener('barbara:rules-manifest-exported',event=>{const count=event.detail?.sources||0;$('#rulesImportStatus').classList.remove('bad');$('#rulesImportStatus').textContent=`Manifesto SHA-256 exportado • ${count} fonte(s)`;$('#rulesExportManifestBtn').disabled=false;$('#rulesExportManifestBtn').textContent='EXPORTAR HASHES';toast('Manifesto de hashes exportado pelo Android SAF.')});
window.addEventListener('barbara:rules-manifest-export-error',event=>{$('#rulesImportStatus').classList.add('bad');$('#rulesImportStatus').textContent=event.detail?.message||'Falha ao exportar o manifesto.';$('#rulesExportManifestBtn').disabled=false;$('#rulesExportManifestBtn').textContent='EXPORTAR HASHES';toast(event.detail?.message||'Falha ao exportar o manifesto.')});
function roleOptions(){ $('#roleSelect').innerHTML=ROLES.map(r=>`<option value="${r.id}">${r.label}</option>`).join(''); $('#roleSelect').value=character.role; }
function methodLabel(m){return {streetrat:'Rato de Rua',edgerunner:'Edgerunner',complete:'Pacote Completo'}[m]||m}
function recomputeDerived(){character.derived={...character.derived,...derive(character.stats)};}
function culturalSkillEntry(){return Object.entries(character.skills).find(([id])=>id.startsWith('language_cultural_'))}
function replaceCulturalLanguage(lang){ for(const id of Object.keys(character.skills)) if(id.startsWith('language_cultural_')) delete character.skills[id]; character.skills[`language_cultural_${lang.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\W+/g,'_')}`]=4; }
function syncIdentity(){character.name=$('#nameInput').value.trim()||'Sem Nome';const f=$('#footerName'),m=$('#mapName');if(f)f.textContent=character.name;if(m)m.textContent=character.name;}

function render(){
 roleOptions(); $('#nameInput').value=character.name; $('#methodSelect').value=character.method; $('#roleSelect').value=character.role;
 $('#methodHelp').textContent=methodText[character.method]; $('#hpOut').textContent=character.derived.maxHp; $('#humOut').textContent=character.derived.humanity;
 {const f=$('#footerName'),m=$('#mapName');if(f)f.textContent=character.name;if(m)m.textContent=character.name;}
 renderStats(); renderSkills(); renderLife(); renderValidation(); renderPrompt(); renderSchema();
 $('#coreBadge').textContent=bridge.isRealCore?'GEMINI • VERIFICANDO':'DEMO CORE'; $('#coreMode').textContent=bridge.isRealCore?'Conectado ao Motor Bárbara fornecido pelo host.':'O Motor Bárbara real não foi injetado nesta página HTML; usando fallback local explícito apenas para testar o fluxo de UI.'; gameplay?.renderAll?.();workbench?.render?.();localizeVisibleUi();
}
function renderStats(){
 const locked=character.method!=='complete';
 $('#statsGrid').innerHTML=STATS.map(k=>`<div class="stat ${locked?'locked':''}"><label>${k==='MOVE'?'MOV':k}</label><input data-stat="${k}" type="number" min="2" max="8" value="${character.stats[k]}" ${locked?'disabled':''}></div>`).join('');
 $$('#statsGrid [data-stat]').forEach(i=>i.oninput=()=>{character.stats[i.dataset.stat]=Math.max(2,Math.min(8,Number(i.value)||2));recomputeDerived();renderStatsHeader();renderValidation();renderPrompt()});
 renderStatsHeader();
}
function renderStatsHeader(){const total=STATS.reduce((s,k)=>s+character.stats[k],0);$('#statPool').textContent=character.method==='complete'?`${total} / 62`:`Tabela ${methodLabel(character.method)}`;$('#hpOut').textContent=character.derived.maxHp;$('#humOut').textContent=character.derived.humanity;}
function visibleSkillIds(){if(character.method==='streetrat') return Object.keys(character.skills).filter(id=>MASTER_SKILLS[id]); if(character.method==='edgerunner') return Object.keys(character.skills).filter(id=>MASTER_SKILLS[id]); return Object.keys(MASTER_SKILLS);}
function renderSkills(){
 const q=($('#skillSearch')?.value||'').toLowerCase(); const locked=character.method==='streetrat';
 const ids=visibleSkillIds().filter(id=>getSkillLabel(id).toLowerCase().includes(q));
 $('#skillsList').innerHTML=ids.map(id=>{const m=MASTER_SKILLS[id],v=character.skills[id]||0,basic=BASIC_SKILLS.includes(id);return `<div class="skill-row"><div class="name">${getSkillLabel(id)}${m[2]===2?' ×2':''}<small>${m[1]}${basic?' • básica':''}</small></div><input data-skill="${id}" type="number" min="${basic?2:0}" max="6" value="${v}" ${locked?'disabled':''}><div class="cost">custo ${(m[2]||1)*v}</div></div>`}).join('');
 $$('#skillsList [data-skill]').forEach(i=>i.oninput=()=>{const id=i.dataset.skill,min=BASIC_SKILLS.includes(id)?2:0; character.skills[id]=Math.max(min,Math.min(6,Number(i.value)||0)); renderSkillHeader(); renderValidation();}); renderSkillHeader();
}
function renderSkillHeader(){const coreSkills=Object.fromEntries(Object.entries(character.skills).filter(([id])=>MASTER_SKILLS[id]));$('#skillPool').textContent=character.method==='streetrat'?'Template fixo':`${skillCost(coreSkills)} / 86`;}
function lifeRows(obj,prefix=''){return Object.entries(obj||{}).map(([k,v])=>{let text=Array.isArray(v)?(v.length?v.map(x=>typeof x==='object'?Object.values(x).join(' • '):x).join(' | '):'Nenhum'):String(v);return `<div class="life-row"><span>${prefix}${displayLabel(k)}</span><b>${text}</b></div>`}).join('')}
function renderLife(){ $('#lifeList').innerHTML=lifeRows(character.lifepath)+`<div class="life-row"><span>Idioma cultural</span><b>${character.lifepath.culturalLanguage} • Grau 4 grátis</b></div>`; $('#roleLifeList').innerHTML=`<div class="life-row"><span>Função</span><b>${getRoleLabel(character.role)} • Habilidade Grau 4</b></div>`+lifeRows(character.roleLifepath); }
function renderValidation(){const v=validateCharacter(character),el=$('#validation');el.className=`validation panel ${v.ok?'ok':'bad'}`;el.innerHTML=v.ok?`✓ Ficha mecanicamente válida • STAT ${v.summary.statTotal} • Perícias ${v.summary.skillCost} • PV ${v.summary.hp} • HUM ${v.summary.humanity}`:`⚠ ${v.errors.slice(0,6).join('<br>')}`;return v}
function renderSchema(){const copy=structuredClone(character); if(copy.assets){copy.assets.portraitDataUrl=copy.assets.portraitDataUrl?'[imagem embutida]':null;copy.assets.tokenDataUrl=copy.assets.tokenDataUrl?'[token embutido]':null;} $('#schemaPreview').textContent=JSON.stringify({exportFormat:'barbara-character-json',exportVersion:1,character:copy},null,2)}
function renderPrompt(){
 const l=character.lifepath,s=character.stats,r=character.roleLifepath;
 $('#promptBox').value=`Crie um retrato de personagem para Cyberpunk RED, formato vertical 4:5, pronto para ser usado na ficha de um VTT Android.\n\nPERSONAGEM\nNome: ${character.name}\nFunção: ${getRoleLabel(character.role)}\nOrigem cultural: ${l.culturalRegion}\nPersonalidade: ${l.personality}\nEstilo de roupa: ${l.clothingStyle}\nCabelo: ${l.hairstyle}\nMarca/afetação: ${l.affectation}\nObjetivo de vida: ${l.lifeGoal}\nDetalhe da Função: ${Object.values(r||{}).slice(0,3).join('; ')}\n\nDIREÇÃO VISUAL\nRetrato semi-realista e crível, cyberpunk urbano de 2045, iluminação cinematográfica discreta, aparência de pessoa real do mundo de Night City. Não exagerar neon, hologramas ou implantes. Evitar fantasia, armaduras impossíveis e excesso de adereços. Roupa e visual devem refletir a descrição acima.\n\nENQUADRAMENTO OBRIGATÓRIO\nCabeça e parte superior do tronco; rosto bem visível; personagem aproximadamente centralizada; não cortar topo da cabeça; deixar margem lateral suficiente para que a MESMA imagem seja recortada depois em um token circular. Fundo urbano escuro simples, sem texto, sem logotipo, sem moldura.\n\nCONSISTÊNCIA PARA TOKEN\nA imagem será importada no app. O app NÃO vai gerar outro desenho: ele vai usar exatamente esta imagem para criar localmente um token 2D flat circular. Portanto, mantenha rosto, cabelo e elementos identificadores dentro da área central do retrato.\n\nFORMATO\nUma única personagem. Proporção 4:5. Sem interface, sem ficha, sem texto, sem token desenhado ao lado.`;
}

function regenerate(){syncIdentity();const oldName=character.name,method=$('#methodSelect').value,role=$('#roleSelect').value;character=createCharacter({method,role,name:oldName}); importedAsset=false; setDefaultAssets(); render();toast('Personagem gerado pelas regras');}
function guidedBase(){syncIdentity();const role=$('#roleSelect').value;character=createCharacter({method:'complete',role,name:character.name}); const pr={rockerboy:['EMP','COOL'],solo:['REF','DEX'],netrunner:['INT','TECH'],tech:['TECH','INT'],medtech:['TECH','EMP'],media:['INT','COOL'],lawman:['WILL','REF'],exec:['INT','COOL'],fixer:['COOL','INT'],nomad:['MOVE','REF']}[role]; character.stats=Object.fromEntries(STATS.map(k=>[k,6])); character.stats[pr[0]]++;character.stats[pr[1]]++;character.derived=derive(character.stats);$('#methodSelect').value='complete';render();toast('Base guiada válida criada');}
function rerollLife(){const temp=createCharacter({method:character.method,role:character.role,name:character.name});character.lifepath=temp.lifepath;character.roleLifepath=temp.roleLifepath;replaceCulturalLanguage(character.lifepath.culturalLanguage);render();toast('Caminho de Vida rolado novamente');}

async function imageToAssets(file){
 const data=await fileToDataUrl(file);const img=await loadImage(data);const portrait=drawPortrait(img,640,800);const token=drawToken(img,512);character.assets.portraitDataUrl=portrait;character.assets.tokenDataUrl=token;importedAsset=true;applyAssets();renderSchema();toast('Retrato e token gerados da mesma imagem');
}
function fileToDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
function cropParams(img,targetRatio){const sr=img.width/img.height;if(sr>targetRatio){const h=img.height,w=h*targetRatio;return {sx:(img.width-w)/2,sy:0,sw:w,sh:h}}const w=img.width,h=w/targetRatio;return {sx:0,sy:(img.height-h)/2,sw:w,sh:h}}
function drawPortrait(img,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),p=cropParams(img,w/h);x.drawImage(img,p.sx,p.sy,p.sw,p.sh,0,0,w,h);return c.toDataURL('image/jpeg',.92)}
function drawToken(img,size){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');x.clearRect(0,0,size,size);x.save();x.beginPath();x.arc(size/2,size/2,size*.47,0,Math.PI*2);x.clip();const p=cropParams(img,1);x.drawImage(img,p.sx,p.sy,p.sw,p.sh,0,0,size,size);x.restore();x.beginPath();x.arc(size/2,size/2,size*.47,0,Math.PI*2);x.lineWidth=size*.025;x.strokeStyle='#ff3b43';x.stroke();x.beginPath();x.arc(size/2,size/2,size*.445,0,Math.PI*2);x.lineWidth=size*.008;x.strokeStyle='#25cdea';x.globalAlpha=.75;x.stroke();return c.toDataURL('image/png')}
function setDefaultAssets(){character.assets.portraitDataUrl=null;character.assets.tokenDataUrl=null;applyAssets()}
function applyAssets(){const p=character.assets.portraitDataUrl||'assets/characters/razor/portrait.png',t=character.assets.tokenDataUrl||'assets/characters/razor/token.png';$('#portraitImg').src=p;$('#portraitPreview').src=p;$('#tokenPreview').src=t;$('#mapToken').src=t;atlas.syncCharacter?.()}

function download(name,text,type='application/json'){const b=new Blob([text],{type}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
async function exportJson(){syncIdentity();const v=renderValidation();if(!v.ok)return toast('Corrija a ficha antes de exportar');download(`${character.name.replace(/\W+/g,'_')}.cyberpunk-red.json`,serializeCharacter(character));toast('JSON exportado')}
async function importJson(file){try{const txt=await file.text();character=deserializeCharacter(txt); importedAsset=!!character.assets?.portraitDataUrl;applyAssets();render();toast('Ficha JSON importada e validada')}catch(e){toast(e.message)}}
async function saveCore(){syncIdentity();const v=renderValidation();if(!v.ok)return toast('Ficha inválida');await bridge.saveCharacter(character);await bridge.bindToken(character);await bridge.snapshot(`personagem:${character.characterId}`);toast(bridge.isRealCore?'Salvo no Motor Bárbara':'Salvo no fallback local')}
async function loadCore(){const c=await bridge.loadCharacter();if(!c)return toast('Nenhum personagem salvo');character=migrateCharacter(c);await bridge.saveCharacter(character);applyAssets();render();toast('Personagem restaurado e normalizado')}

async function restoreActiveCharacterOnBoot(){
  try{
    const saved=await bridge.loadCharacter();
    if(!saved)return false;
    character=migrateCharacter(saved);
    importedAsset=!!character.assets?.portraitDataUrl;
    applyAssets();render();
    try{workbench.render?.()}catch(error){console.warn('[CPRED_BOOT_RESTORE:workbench]',error)}
    try{gameplay.renderAll?.()}catch(error){console.warn('[CPRED_BOOT_RESTORE:gameplay]',error)}
    try{netrun.render?.()}catch(error){console.warn('[CPRED_BOOT_RESTORE:netrun]',error)}
    try{atlas.syncCharacter?.()}catch(error){console.warn('[CPRED_BOOT_RESTORE:atlas]',error)}
    document.dispatchEvent(new CustomEvent('barbara:character-restored',{detail:{characterId:character.characterId,campaignId:character.campaignState?.campaignId||null}}));
    return true;
  }catch(error){
    console.warn('[CPRED_BOOT_RESTORE]',error);
    return false;
  }
}

function activateTab(tab){
 const target=document.querySelector(`.tabs button[data-tab="${tab}"]`);if(!target)return false;
 document.body.dataset.activeTab=tab;
 const labels={table:'SESSÃO',game:'MUNDO',atlas:'MAPA',sheet:'FICHA',inventory:'MOCHILA',stories:'TRABALHO',combat:'COMBATE',net:'NET',vehicle:'VEÍCULO',library:'BIBLIOTECA'};document.documentElement.dataset.screenLabel=labels[tab]||tab.toUpperCase();
 $$('.tabs button[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
 $$('.tab').forEach(x=>x.classList.toggle('active',x.id===`tab-${tab}`));
 const more=$('#moreNavBtn');if(more)more.classList.toggle('active',target.classList.contains('secondary-tab'));
 closeMoreSheet();
 if(tab==='atlas')atlas.onVisible?.();
 if(['table','game','stories','vehicle','combat','library'].includes(tab))gameplay.renderAll();
 if(['sheet','inventory','journal','table'].includes(tab))workbench.render();
 if(tab==='net')netrun.render();
 document.querySelector('main')?.scrollIntoView({block:'start'});return true;
}
function openMoreSheet(){const el=$('#moreSheet');if(!el)return;el.classList.remove('hidden');document.body.classList.add('more-sheet-open');$('#moreNavBtn')?.classList.add('active');$('#moreSheetClose')?.focus()}
function closeMoreSheet(){const el=$('#moreSheet');if(!el)return;el.classList.add('hidden');document.body.classList.remove('more-sheet-open');const tab=document.body.dataset.activeTab;$$('.tabs button[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));const more=$('#moreNavBtn');if(more)more.classList.toggle('active',!!document.querySelector(`.tabs button[data-tab=\"${tab}\"].secondary-tab`))}
$$('.tabs button[data-tab]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.tab)));
$$('[data-session-open]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.sessionOpen)));
bind('#moreNavBtn','click',openMoreSheet);bind('#moreSheetClose','click',closeMoreSheet);
bind('#moreSheet','click',e=>{if(e.target===$('#moreSheet'))closeMoreSheet()});
$$('[data-sheet-anchor]').forEach(btn=>btn.addEventListener('click',()=>{
  $$('[data-sheet-anchor]').forEach(x=>x.classList.toggle('active',x===btn));
  const key=btn.dataset.sheetAnchor;
  if(key==='bio'){activateTab('life');return}
  const target=key==='general'?$('.sheet-identity'):key==='attributes'?$('#sheetStats')?.closest('.panel'):$('#sheetRoleAbility')?.closest('.panel');
  target?.scrollIntoView({behavior:'smooth',block:'start'});
}));
$$('[data-map-anchor]').forEach(btn=>btn.addEventListener('click',()=>{
  $$('[data-map-anchor]').forEach(x=>x.classList.toggle('active',x===btn));
  const key=btn.dataset.mapAnchor;
  if(key==='night'){ $('#atlasFit')?.click(); $('#atlasViewport')?.scrollIntoView({behavior:'smooth',block:'start'}); return }
  if(key==='districts'){ $('#atlasFit')?.click(); $('#atlasViewport')?.scrollIntoView({behavior:'smooth',block:'start'}); return }
  if(key==='points'){ $('#atlasPoiList')?.scrollIntoView({behavior:'smooth',block:'start'}); return }
  ($('#atlasPoiDetail:not(.hidden)')||$('.atlas-toolbar'))?.scrollIntoView({behavior:'smooth',block:'start'});
}));
function openHowToPlay(){$('#howToPlay')?.classList.remove('hidden');$('#howToPlayClose')?.focus()}
function closeHowToPlay(){$('#howToPlay')?.classList.add('hidden')}
function normalizeHelpTitle(value){return String(value||'').replace(/[•|].*$/,'').trim().toUpperCase()}
const CONTEXT_HELP={
 'MESTRE':`O Mestre conduz a ficção. Comece ou continue a aventura, leia/escute a narração e diga livremente o que seu personagem faz. O Motor resolve consequências, movimenta NPCs e o Mundo Vivo e controla o avanço de tempo quando a ficção exigir.`,
 'ILUSTRAÇÃO DA CENA':`Gere um prompt fiel ao estado atual, abra o Gemini e importe a imagem de volta. A ilustração fica vinculada à cena; ela não substitui o mapa tático.`,
 'SITUAÇÃO':`Resumo do que está imediatamente relevante para seu personagem: local, ameaça, atividades do mundo e sistemas que podem entrar em jogo.`,
 'MUNDO VIVO':`Simula acontecimentos fora da tela, NPCs persistentes, pressões e consequências. Você não precisa operar o simulador: o Mestre usa isso para fazer Night City continuar existindo enquanto você age.`,
 'INVENTÁRIO':`Consulte, compre, equipe e use recursos. Cartões oficiais individuais são preservados; recortes de páginas de manual foram substituídos por ícones limpos do app.`,
 'CATÁLOGO MECÂNICO':`Catálogo das entradas implementadas. A imagem deve corresponder à própria entrada; não use ícone genérico silenciosamente.`,
 'COMBATE':`No modo tático, siga a iniciativa. Em regra, seu turno dispõe de 1 Ação e movimento; o painel mostra o estado atual e o Motor valida os efeitos.`,
 'NETRUNNING':`Netrunning usa Ações NET e Arquitetura NET. O painel mostra as ações disponíveis; o Motor aplica as regras e mantém o estado.`,
 'ARQUITETURA NET':`Mostra os andares da Arquitetura NET ativa. Entre em uma cena tática com arquitetura válida para interagir.`,
 'ATLAS':`Mostra posição, locais e deslocamento. Viajar pode avançar tempo e acionar Mundo Vivo, encontros e consequências.`,
 'ATRIBUTOS':`Valores-base do personagem. Consulte aqui; alterações válidas devem passar pelas regras de criação/evolução.`,
 'PERÍCIAS':`Perícias e níveis do personagem. Testes são resolvidos pelo Motor quando a ação exige uma rolagem.`,
 'CORPUS DE REGRAS DO MESTRE':`Importe PDFs autorizados para o RAG local. A fonte é registrada com SHA-256; a chave Gemini não entra nos arquivos de campanha.`,
 'GEMINI / VOZ':`Configure separadamente modelo de texto, modelo TTS, voz e idioma. A chave API fica no Android Keystore e não é devolvida à WebView.`,
 'PERSISTÊNCIA / INTERCÂMBIO':`Salve/carregue pelo Motor Bárbara ou exporte/importa JSON do personagem. A chave Gemini fica fora desses arquivos.`,
 'SALVAR / CARREGAR':`Cria e restaura slots de campanha. Use também exportação JSON quando precisar transportar dados.`,
 'VEÍCULO ATIVO':`Controles do veículo atual. Manobras e danos usam o estado do veículo e podem consumir ações/tempo conforme a regra.`,
 'HOT PURSUIT':`Subsistema de perseguição. Distância, faixa e manobras são resolvidas por rodada; o Mestre narra o resultado na ficção.`
};
function helpTextFor(title){const key=normalizeHelpTitle(title);for(const [name,text] of Object.entries(CONTEXT_HELP))if(key.includes(name))return text;return `Esta área reúne controles e informações de “${String(title||'jogo').trim()}”. Use os comandos visíveis; mudanças de estado relevantes só são confirmadas quando o Motor Bárbara aceita a transição.`}
function openContextHelp(title){const sheet=$('#contextHelp'),heading=$('#contextHelpTitle'),body=$('#contextHelpBody');if(!sheet||!body)return;if(heading)heading.textContent=String(title||'SOBRE ESTA ÁREA').trim();body.innerHTML=`<p>${helpTextFor(title)}</p><p><b>Fluxo geral:</b> Mestre narra → você declara a ação → o Motor resolve → tempo/mundo/estado são atualizados → o Mestre apresenta a nova situação.</p>`;sheet.classList.remove('hidden');$('#contextHelpClose')?.focus()}
function closeContextHelp(){$('#contextHelp')?.classList.add('hidden')}
function installContextHelp(){document.querySelectorAll('.panel,.scene-illustration-panel').forEach(panel=>{const title=panel.querySelector(':scope > .panel-title');if(!title||title.querySelector('.context-help-btn'))return;const raw=[...title.childNodes].map(n=>n.textContent||'').join(' ').trim();const button=document.createElement('button');button.type='button';button.className='context-help-btn';button.textContent='ⓘ';button.setAttribute('aria-label',`Informações: ${raw}`);button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openContextHelp(raw)});title.appendChild(button)});}
$('#howToPlayBtn')?.addEventListener('click',openHowToPlay);$('#howToPlayClose')?.addEventListener('click',closeHowToPlay);$('#howToPlay')?.addEventListener('click',e=>{if(e.target===$('#howToPlay'))closeHowToPlay()});
$('#contextHelpClose')?.addEventListener('click',closeContextHelp);$('#contextHelp')?.addEventListener('click',e=>{if(e.target===$('#contextHelp'))closeContextHelp()});
$$('[data-open-tab]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.openTab)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('#moreSheet')?.classList.contains('hidden'))closeMoreSheet();if(!$('#howToPlay')?.classList.contains('hidden'))closeHowToPlay();if(!$('#contextHelp')?.classList.contains('hidden'))closeContextHelp()}});
document.addEventListener('click',e=>{const b=e.target.closest?.('button,.fake-btn,.file-btn');if(!b||b.disabled)return;b.classList.add('tap-ok');setTimeout(()=>b.classList.remove('tap-ok'),120);try{navigator.vibrate?.(6)}catch{}},{passive:true});
bind('#nameInput','input',()=>{syncIdentity();renderPrompt();renderSchema()});
bind('#methodSelect','change',regenerate);bind('#roleSelect','change',regenerate);bind('#generateBtn','click',regenerate);bind('#guidedBtn','click',guidedBase);bind('#rerollLifeBtn','click',rerollLife);bind('#skillSearch','input',renderSkills);
bind('#portraitFile','change',e=>e.target.files[0]&&imageToAssets(e.target.files[0]));
bind('#copyPromptBtn','click',async()=>{const box=$('#promptBox');if(!box)return;await navigator.clipboard.writeText(box.value);toast('Prompt copiado')});
bind('#downloadPromptBtn','click',()=>{const box=$('#promptBox');if(box)download('prompt_gemini_retrato_personagem.txt',box.value,'text/plain;charset=utf-8')});
bind('#exportBtn','click',exportJson);bind('#jsonFile','change',e=>e.target.files[0]&&importJson(e.target.files[0]));bind('#saveCoreBtn','click',saveCore);bind('#loadCoreBtn','click',loadCore);bind('#snapshotBtn','click',async()=>{await bridge.snapshot('manual-character-studio');toast('Snapshot solicitado')});bind('#validateBtn','click',()=>{const v=renderValidation();toast(v.ok?'Ficha válida':'Há erros na ficha')});
$('#tableDiceBtn')?.addEventListener('click',openDiceTray);$('#combatDiceBtn')?.addEventListener('click',openDiceTray);$('#diceTrayClose')?.addEventListener('click',closeDiceTray);$('#diceRollBtn')?.addEventListener('click',rollDice3D);$('#diceTray')?.addEventListener('click',e=>{if(e.target===$('#diceTray'))closeDiceTray()});$$('[data-dice]').forEach(button=>button.onclick=()=>{const f=$('#diceFormula');if(f)f.value=button.dataset.dice;rollDice3D()});$('#diceFormula')?.addEventListener('keydown',e=>{if(e.key==='Enter')rollDice3D()});
bind('#rulesImportBtn','click',()=>{if(!globalThis.AndroidContent?.pickRuleDocuments)return toast('A importação RAG exige o app Android.');AndroidContent.pickRuleDocuments()});
bind('#rulesExportManifestBtn','click',()=>{if(!globalThis.AndroidContent?.exportRuleManifest)return toast('A exportação do manifesto exige o app Android.');const b=$('#rulesExportManifestBtn');if(b){b.disabled=true;b.textContent='ESCOLHA DESTINO…'}AndroidContent.exportRuleManifest()});
bind('#ruleAskBtn','click',()=>{const search=$('#librarySearch'),channel=$('#sessionChannel'),input=$('#sessionActionInput'),tab=$('.tabs button[data-tab="table"]'),send=$('#sessionActionSend');const text=search?.value?.trim()||'';if(!text)return toast('Digite a regra que deseja consultar.');if(channel)channel.value='GM_HELP';if(input)input.value=text;tab?.click();send?.click()});
if(globalThis.AndroidContent?.ruleCorpusStatus){try{renderRuleCorpusStatus(JSON.parse(AndroidContent.ruleCorpusStatus()))}catch{renderRuleCorpusStatus({ok:false,status:[]})}}


let geminiSettingsDirty=false;
function populateAndroidVoices(rows=[],selected=''){
 const select=$('#androidTtsVoice');if(!select)return;const values=Array.isArray(rows)?rows:[],preferred=values.filter(v=>String(v.locale||'').toLowerCase().startsWith('pt')),pool=preferred.length?preferred:values;
 select.innerHTML='<option value="">Melhor voz pt-BR disponível</option>'+pool.map(v=>`<option value="${String(v.name||'').replace(/"/g,'&quot;')}">${String(v.locale||'—')} • ${String(v.name||'voz')} • ${v.networkRequired?'rede':'offline'} • qualidade ${Number(v.quality||0)}</option>`).join('');
 if(selected&&[...select.options].some(o=>o.value===selected))select.value=selected;
}
async function loadGeminiSettings(preserveEdits=false){
 const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.settings){$('#geminiStatus').textContent='Configuração segura disponível apenas no app Android.';return}
 try{
  const out=await voice.settings(),editing=['geminiTextModel','geminiTtsModel','geminiVoice','geminiLanguage','ttsEngine','androidTtsVoice'].some(id=>document.activeElement===$(`#${id}`));
  if(!(preserveEdits&&(geminiSettingsDirty||editing))){
   $('#geminiTextModel').value=out.textModel||'gemini-3.8-flash';$('#geminiTtsModel').value=out.ttsModel||'gemini-3.1-flash-tts-preview';$('#geminiVoice').value=out.voice||'Charon';$('#geminiLanguage').value=out.language||'pt-BR';$('#ttsEngine').value=out.ttsEngine||'android';populateAndroidVoices(out.androidVoices||[],out.androidVoice||'');
  }
  $('#geminiStatus').className=`rule-note ${out.configured?'ok':''}`;
  const androidReady=out.tts?.android?.ready?'Android TTS pronto':'Android TTS inicializando/indisponível';
  const badge=$('#coreBadge');if(badge){badge.textContent=out.configured?'GEMINI • CHAVE OK':(bridge.isRealCore?'MODO • LOCAL':'DEMO CORE');badge.classList.toggle('online',!!out.configured)}
  const provider=out.configured?`Chave pronta • modelo ${out.textModel}. A etiqueta ATIVO só aparece depois de uma geração realmente aceita pelo Motor.`:'modo local sem Gemini';
  $('#geminiStatus').textContent=`${out.configured?'Chave Gemini configurada no Android Keystore.':'Chave Gemini não configurada.'} ${provider} • motor de voz: ${out.ttsEngine||'android'} • ${androidReady}.`;
  renderTtsStatus(out.tts)
 }catch(e){const badge=$('#coreBadge');if(badge){badge.textContent='GEMINI • ERRO';badge.classList.add('provider-failed')}$('#geminiStatus').textContent=e.message||'Falha ao ler configuração.'}
}
function renderTtsStatus(tts){
 if(!tts)return;const el=$('#ttsStatus'),engine=tts.selectedEngine||$('#ttsEngine')?.value||'android',status=engine==='gemini'?tts.gemini:tts.android;
 el.className=`rule-note ${status?.state==='error'?'bad':status?.state==='idle'?'ok':''}`;
 el.textContent=status?.state==='error'?`TTS ${engine}: ${status.error||'erro'}`:`TTS ${engine}: ${status?.state||'—'}${engine==='android'?' • voz instalada no aparelho':' • Gemini 24 kHz'}`;
}
async function saveGeminiSettings(){
 const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.saveSettings)return toast('Configuração de voz exige o app Android.');
 const payload={textModel:$('#geminiTextModel').value.trim(),ttsModel:$('#geminiTtsModel').value.trim(),voice:$('#geminiVoice').value,language:$('#geminiLanguage').value.trim(),ttsEngine:$('#ttsEngine').value,androidVoice:$('#androidTtsVoice').value};
 const out=await voice.saveSettings(payload);if(out?.ok===false)return toast(out.error||'Falha ao salvar configuração.');geminiSettingsDirty=false;await loadGeminiSettings();toast('Modelos e motor de voz salvos e persistidos.');
}
function configureGeminiKey(){if(!globalThis.AndroidSecrets?.configureGeminiKey)return toast('A chave só pode ser configurada no app Android.');AndroidSecrets.configureGeminiKey()}
function removeGeminiKey(){if(!globalThis.AndroidSecrets?.clearGeminiKey)return toast('A chave só pode ser removida no app Android.');AndroidSecrets.clearGeminiKey()}
window.addEventListener('barbara:gemini-key-updated',event=>{loadGeminiSettings();toast(event.detail?.ok===false?(event.detail?.error||'Falha no Keystore'):(event.detail?.configured?'Chave Gemini salva no Keystore.':'Chave Gemini removida.'))});
async function speakGemini(){const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.speak)return toast('Voz exige o app Android.');const text=$('#ttsText').value.trim();if(!text)return toast('Digite o texto para narrar.');const engine=$('#ttsEngine')?.value||'android',out=await voice.speak({text,style:$('#ttsStyle').value,engine});if(out?.ok===false)return toast(out.error||'Falha ao iniciar TTS.');$('#ttsStatus').textContent=`TTS ${out.engine||engine}: na fila…`;toast(`Narração solicitada via ${out.engine||engine}.`);}
async function stopGemini(){const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.stop)return;await voice.stop();$('#ttsStatus').textContent='TTS: parado.';}

bind('#geminiKeyBtn','click',configureGeminiKey);bind('#geminiSaveBtn','click',saveGeminiSettings);bind('#geminiRemoveBtn','click',removeGeminiKey);bind('#ttsSpeakBtn','click',speakGemini);bind('#ttsStopBtn','click',stopGemini);
['geminiTextModel','geminiTtsModel','geminiVoice','geminiLanguage','ttsEngine','androidTtsVoice'].forEach(id=>$(`#${id}`)?.addEventListener('input',()=>{geminiSettingsDirty=true;$('#geminiStatus').textContent='Alterações de modelo/voz ainda não salvas.'}));
setInterval(()=>{if($('#tab-audio')?.classList.contains('active'))loadGeminiSettings(true)},2500);

applyAssets();render();loadGeminiSettings();installPtBrObserver();installContextHelp();
restoreActiveCharacterOnBoot().finally(()=>{
  setTimeout(()=>{
    try{workbench.render?.();gameplay.renderAll?.();atlas.syncCharacter?.()}catch(error){console.warn('[CPRED_BOOT_REFRESH]',error)}
  },120);
});
setTimeout(()=>workbench.importIncomingSceneImage?.(),350);
window.addEventListener('barbara:shared-image-available',()=>workbench.importIncomingSceneImage?.());
['barbara:scene-enter','barbara:scene-exit','barbara:travel'].forEach(name=>document.addEventListener(name,()=>workbench.renderSession?.()));
window.__cpredUiReady=true;document.documentElement.classList.add('ui-ready');document.documentElement.classList.remove('ui-boot-failed');
