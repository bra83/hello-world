#!/usr/bin/env python3
"""R5.72 UI, Single Shot Pack Playable Pregens, TTS Universal V3 + Kokoro, JSON Adventure Import & Continuity, and In-App Updater."""
from pathlib import Path
import shutil
import sys

HERE = Path(__file__).resolve().parent
RUNTIME_SRC = HERE.parent / "adventure-engine" / "runtime"


def patch_index_html(app_dir: Path) -> None:
    index_path = app_dir / "index.html"
    html = index_path.read_text(encoding="utf-8")

    # 1. Single Shot Pack Playable Character Selector in #tab-create
    create_anchor = '<section class="tab" id="tab-create">\n<div class="panel info"><div class="panel-title">MÉTODO DE CRIAÇÃO</div>'
    single_shot_panel = """<section class="tab" id="tab-create">
<div class="panel info" id="singleShotPregenPanel"><div class="panel-title"><span>SINGLE SHOT PACK v1.1 • PERSONAGENS PRONTOS</span><span>PDF VERIFICADO</span></div><p class="rule-note">10 Edgerunners canônicos conferidos página a página no PDF oficial (pp. 4–22), com STATs, 20 perícias, Habilidade da Função Grau 4, Light Armorjack SP11, armas, munições exatas, cyberware instalado, perda de Humanidade e 500eb.</p><div class="settings-grid"><label>PERSONAGEM PRONTO<select id="singleShotPregenSelect" aria-label="Personagem pronto Single Shot Pack"></select></label></div><div class="action-row"><button class="primary" id="loadSingleShotPregenBtn" type="button">CARREGAR PERSONAGEM PRONTO</button></div><p class="rule-note" id="singleShotPregenStatus">Selecione um dos 10 personagens prontos do Single Shot Pack para carregar na ficha e salvar.</p></div>
<div class="panel info"><div class="panel-title">MÉTODO DE CRIAÇÃO</div>"""
    if 'id="singleShotPregenSelect"' not in html:
        if create_anchor not in html:
            raise RuntimeError("Could not find #tab-create anchor in index.html")
        html = html.replace(create_anchor, single_shot_panel, 1)

    # 2. Adventure JSON Import (braseiro.adventure/v1) & Cross-Adventure Continuity (braseiro.legacy/v1) in #tab-table
    campaign_actions_anchor = """<div aria-label="Campanha" class="campaign-mini-actions">
<button id="sessionNewBtn" type="button">NOVA AVENTURA</button>
<button id="sessionContinueBtn" type="button">CONTINUAR</button>
<button class="danger" id="sessionRestartBtn" type="button">REINICIAR</button>
</div>"""
    import_panel = campaign_actions_anchor + """
<details class="adventure-import-panel" id="adventureImportDetails">
<summary>IMPORTAR AVENTURA (.JSON) E CONTINUIDADE ENTRE AVENTURAS</summary>
<div class="settings-grid">
<label>ARQUIVO DE AVENTURA (.JSON)<input accept="application/json,.json" id="adventureJsonFileInput" type="file"/></label>
<label>DESFECHO DA AVENTURA ATUAL<input id="adventureLegacyOutcomeInput" placeholder="Resumo do desfecho para o legado" value="Missão concluída com sucesso em Night City"/></label>
</div>
<textarea id="adventureJsonTextInput" placeholder="Ou cole aqui o JSON no formato braseiro.adventure/v1…" rows="4"></textarea>
<div class="action-row">
<button class="primary" id="importAdventureJsonBtn" type="button">VALIDAR E IMPORTAR AVENTURA</button>
<button id="completeAdventureLegacyBtn" type="button">CONCLUIR E PRESERVAR LEGADO</button>
</div>
<p class="rule-note" id="adventureContinuityStatus">Suporta pacotes braseiro.adventure/v1 com isolamento de segredos do Mestre e continuidade braseiro.legacy/v1.</p>
</details>"""
    if 'id="importAdventureJsonBtn"' not in html:
        if campaign_actions_anchor not in html:
            raise RuntimeError("Could not find campaign-mini-actions anchor in index.html")
        html = html.replace(campaign_actions_anchor, import_panel, 1)

    # 3. TTS Universal V3 + Kokoro + In-App Updater in #tab-audio
    old_audio_section_start = '<section class="tab" id="tab-audio">'
    old_audio_section_end = '</section>\n<section class="tab" id="tab-portrait">'
    new_audio_section = """<section class="tab" id="tab-audio">
<div class="panel"><div class="panel-title"><span>GEMINI / VOZ UNIVERSAL V3</span><span>ANDROID KEYSTORE + KOKORO</span></div>
<div class="settings-grid">
<label>MODELO TEXTO<input id="geminiTextModel" value="gemini-3.8-flash"/></label>
<label>MODELO TTS<select id="geminiTtsModel"><option selected="" value="gemini-3.8-flash-tts">gemini-3.8-flash-tts (Padrão)</option><option value="gemini-3.8-flash-lite-tts">gemini-3.8-flash-lite-tts (Baixa latência)</option><option value="gemini-3.1-flash-tts-preview">gemini-3.1-flash-tts-preview (Compatibilidade)</option></select></label>
<label>MOTOR DE VOZ<select id="ttsEngine"><option value="kokoro">Braseiro Kokoro PT-BR • neural</option><option selected="" value="android">Android / voz do aparelho</option><option value="auto">Automático (Kokoro/Android → Gemini)</option><option value="gemini">Gemini TTS</option></select></label>
<label>PACOTE MOTOR LOCAL<select id="androidTtsEnginePkg"><option value="">Detectar automaticamente (Kokoro / Sistema)</option><option value="com.k2fsa.sherpa.onnx.tts.engine">Braseiro Kokoro PT-BR • neural (com.k2fsa.sherpa.onnx.tts.engine)</option></select></label>
<label>VOZ ANDROID / KOKORO<select id="androidTtsVoice"><option value="">Melhor voz pt-BR disponível</option></select></label>
<label>VOZ GEMINI (30 VOZES)<select id="geminiVoice"><option value="Charon">Charon</option><option value="Kore">Kore</option><option value="Puck">Puck</option><option value="Zephyr">Zephyr</option><option value="Fenrir">Fenrir</option><option value="Leda">Leda</option><option value="Orus">Orus</option><option value="Aoede">Aoede</option><option value="Callirrhoe">Callirrhoe</option><option value="Autonoe">Autonoe</option><option value="Enceladus">Enceladus</option><option value="Iapetus">Iapetus</option><option value="Umbriel">Umbriel</option><option value="Algieba">Algieba</option><option value="Despina">Despina</option><option value="Erinome">Erinome</option><option value="Algenib">Algenib</option><option value="Rasalgethi">Rasalgethi</option><option value="Laomedeia">Laomedeia</option><option value="Achernar">Achernar</option><option value="Alnilam">Alnilam</option><option value="Schedar">Schedar</option><option value="Gacrux">Gacrux</option><option value="Pulcherrima">Pulcherrima</option><option value="Achird">Achird</option><option value="Zubenelgenubi">Zubenelgenubi</option><option value="Vindemiatrix">Vindemiatrix</option><option value="Sadachbia">Sadachbia</option><option value="Sadaltager">Sadaltager</option><option value="Sulafat">Sulafat</option></select></label>
<label>IDIOMA<input id="geminiLanguage" value="pt-BR"/></label>
<label>VELOCIDADE TTS (0.5x – 2.0x)<input id="ttsSpeedInput" max="2.0" min="0.5" step="0.05" type="number" value="1.0"/></label>
<label>MODO VOCAL<select id="ttsVocalMode"><option selected="" value="distinct-voices">Vozes distintas para NPCs (distinct-voices)</option><option value="single-actor">Ator único modulando personagens (single-actor)</option></select></label>
<label><input checked="" id="ttsStripVocalTags" type="checkbox"/> LIMPAR MARCAÇÕES VOCAIS ([pausa], [sussurro], etc.)</label>
</div>
<div class="settings-grid">
<label>ESTILO DE NARRAÇÃO (METADADO DE DIREÇÃO)<textarea id="geminiVoiceStyle" rows="2">Narração cyberpunk noir em português do Brasil, ritmo tenso, claro e imersivo.</textarea></label>
<label>PERFIL VOCAL DO MESTRE (METADADO DE DIREÇÃO)<textarea id="geminiVoiceProfile" rows="2">Mestre de mesa experiente de Night City; diferencia NPCs com sutileza sem ler rubricas em voz alta.</textarea></label>
</div>
<div class="action-row"><button class="primary" id="geminiKeyBtn">CONFIGURAR CHAVE API</button><button id="geminiSaveBtn">SALVAR MODELOS/VOZ</button><button id="geminiRemoveBtn">REMOVER CHAVE</button></div>
<p class="rule-note" id="geminiStatus">A chave nunca é devolvida à WebView, logs, JSON de personagem ou backup de World.</p>
</div>
<div class="panel"><div class="panel-title"><span>TESTE DE VOZ</span><span>KOKORO / ANDROID / GEMINI</span></div>
<textarea id="ttsText" rows="5">Night City nunca dorme. As luzes vermelhas cortam a chuva enquanto a cidade segue respirando.</textarea>
<div class="settings-grid"><label>ESTILO DE CENA<select id="ttsStyle"><option value="narration">Narração</option><option value="dialogue">Diálogo</option><option value="urgent">Urgente</option></select></label></div>
<div class="action-row"><button class="primary" id="ttsSpeakBtn">TOCAR NARRAÇÃO</button><button id="ttsStopBtn">PARAR VOZ</button></div>
<p class="rule-note" id="ttsStatus">Kokoro PT-BR / Android TTS iniciam localmente; Gemini TTS usa systemInstruction separada do texto falado.</p>
</div>
<div class="panel" id="inAppUpdaterPanel"><div class="panel-title"><span>ATUALIZADOR DO APLICATIVO</span><span id="updaterStatusBadge">braseiro.update/v1</span></div>
<p class="rule-note">Verifica integridade SHA-256, compatibilidade de sistema/versão, cria ponto de restauração automático, aplica atualização em staging → active e preserva 100% dos saves SQLite/Room.</p>
<textarea id="updatePackageJsonInput" placeholder="Cole o manifesto/pacote JSON braseiro.update/v1 para aplicar atualização segura…" rows="4"></textarea>
<div class="action-row"><button class="primary" id="applyUpdateBtn" type="button">VERIFICAR E APLICAR ATUALIZAÇÃO</button><button class="danger" id="rollbackUpdateBtn" type="button">RESTAURAR VERSÃO ANTERIOR (ROLLBACK)</button></div>
<p class="rule-note" id="updaterStatusText">Nenhuma atualização incremental ativa.</p>
</div>
</section>
<section class="tab" id="tab-portrait">"""
    if 'id="inAppUpdaterPanel"' not in html:
        start_idx = html.find(old_audio_section_start)
        end_idx = html.find(old_audio_section_end)
        if start_idx == -1 or end_idx == -1:
            raise RuntimeError("Could not find #tab-audio section boundaries in index.html")
        html = html[:start_idx] + new_audio_section + html[end_idx + len(old_audio_section_end):]

    index_path.write_text(html, encoding="utf-8")


def patch_app_js(app_dir: Path) -> None:
    app_js_path = app_dir / "app.js"
    src = app_js_path.read_text(encoding="utf-8")

    import_line = "import {CyberpunkAudioDirector} from './audio.js';"
    new_imports = """import {CyberpunkAudioDirector} from './audio.js';
import {SINGLE_SHOT_PDF_VERIFIED_SPECS,promoteSingleShotPlayableCharacter,promoteAllSingleShotPlayableCharacters,applySingleShotPregenToWebCharacter,getSingleShotNetArchitecture} from './single_shot_pregen_factory.js';
import {runR572EmulatorE2E} from './r572_e2e_harness.js';"""
    if "single_shot_pregen_factory.js" not in src:
        if import_line not in src:
            raise RuntimeError("Could not find audio.js import in app.js")
        src = src.replace(import_line, new_imports, 1)
    elif "r572_e2e_harness.js" not in src:
        src = src.replace(
            "import {SINGLE_SHOT_PDF_VERIFIED_SPECS,promoteSingleShotPlayableCharacter,promoteAllSingleShotPlayableCharacters,applySingleShotPregenToWebCharacter,getSingleShotNetArchitecture} from './single_shot_pregen_factory.js';",
            new_imports.split("\n", 1)[1],
            1,
        )

    # Replace TTS functions block in app.js with enhanced V3 + Kokoro + Single Shot + Updater logic
    old_tts_block = """let geminiSettingsDirty=false;
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
['geminiTextModel','geminiTtsModel','geminiVoice','geminiLanguage','ttsEngine','androidTtsVoice'].forEach(id=>$(`#${id}`)?.addEventListener('input',()=>{geminiSettingsDirty=true;$('#geminiStatus').textContent='Alterações de modelo/voz ainda não salvas.'}));"""

    new_tts_and_features_block = """let geminiSettingsDirty=false;
function populateAndroidEngines(rows=[],selected=''){
 const select=$('#androidTtsEnginePkg');if(!select)return;const values=Array.isArray(rows)?rows:[];
 const base='<option value="">Detectar automaticamente (Kokoro / Sistema)</option><option value="com.k2fsa.sherpa.onnx.tts.engine">Braseiro Kokoro PT-BR • neural (com.k2fsa.sherpa.onnx.tts.engine)</option>';
 const extras=values.filter(e=>e.packageName&&e.packageName!=='com.k2fsa.sherpa.onnx.tts.engine').map(e=>`<option value="${String(e.packageName).replace(/"/g,'&quot;')}">${String(e.label||e.packageName)} (${String(e.packageName)})</option>`).join('');
 select.innerHTML=base+extras;
 if(selected&&[...select.options].some(o=>o.value===selected))select.value=selected;
}
function populateAndroidVoices(rows=[],selected=''){
 const select=$('#androidTtsVoice');if(!select)return;const values=Array.isArray(rows)?rows:[],preferred=values.filter(v=>String(v.locale||'').toLowerCase().startsWith('pt')),pool=preferred.length?preferred:values;
 select.innerHTML='<option value="">Melhor voz pt-BR disponível</option>'+pool.map(v=>`<option value="${String(v.name||'').replace(/"/g,'&quot;')}">${String(v.locale||'—')} • ${String(v.name||'voz')} • ${v.networkRequired?'rede':'offline'} • qualidade ${Number(v.quality||0)}</option>`).join('');
 if(selected&&[...select.options].some(o=>o.value===selected))select.value=selected;
}
async function loadGeminiSettings(preserveEdits=false){
 const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.settings){$('#geminiStatus').textContent='Configuração segura disponível apenas no app Android.';return}
 try{
  const out=await voice.settings(),editIds=['geminiTextModel','geminiTtsModel','geminiVoice','geminiLanguage','ttsEngine','androidTtsEnginePkg','androidTtsVoice','geminiVoiceStyle','geminiVoiceProfile','ttsSpeedInput','ttsVocalMode','ttsStripVocalTags'],editing=editIds.some(id=>document.activeElement===$(`#${id}`));
  if(!(preserveEdits&&(geminiSettingsDirty||editing))){
   if($('#geminiTextModel'))$('#geminiTextModel').value=out.textModel||'gemini-3.8-flash';
   if($('#geminiTtsModel'))$('#geminiTtsModel').value=out.ttsModel||'gemini-3.8-flash-tts';
   if($('#geminiVoice'))$('#geminiVoice').value=out.voice||'Charon';
   if($('#geminiLanguage'))$('#geminiLanguage').value=out.language||'pt-BR';
   if($('#ttsEngine'))$('#ttsEngine').value=out.ttsEngine||'android';
   if($('#geminiVoiceStyle'))$('#geminiVoiceStyle').value=out.voiceStyle??'';
   if($('#geminiVoiceProfile'))$('#geminiVoiceProfile').value=out.voiceProfile??'';
   if($('#ttsSpeedInput'))$('#ttsSpeedInput').value=String(out.ttsSpeed??1.0);
   if($('#ttsVocalMode'))$('#ttsVocalMode').value=out.vocalMode||'distinct-voices';
   if($('#ttsStripVocalTags'))$('#ttsStripVocalTags').checked=out.stripVocalTags!==false;
   populateAndroidEngines(out.installedEngines||out.tts?.android?.installedEngines||[],out.androidEnginePackage||'');
   populateAndroidVoices(out.androidVoices||[],out.androidVoice||'');
  }
  $('#geminiStatus').className=`rule-note ${out.configured?'ok':''}`;
  const kokoroTag=out.kokoroAvailable?'Kokoro PT-BR instalado':'Kokoro opcional';
  const androidReady=out.tts?.android?.ready?`Android TTS pronto (${kokoroTag})`:'Android TTS inicializando/indisponível';
  const badge=$('#coreBadge');if(badge){badge.textContent=out.configured?'GEMINI • CHAVE OK':(bridge.isRealCore?'MODO • LOCAL':'DEMO CORE');badge.classList.toggle('online',!!out.configured)}
  const provider=out.configured?`Chave pronta • modelo ${out.textModel}.`:'modo local sem Gemini';
  $('#geminiStatus').textContent=`${out.configured?'Chave Gemini configurada no Android Keystore.':'Chave Gemini não configurada.'} ${provider} • motor de voz: ${out.ttsEngine||'android'} • ${androidReady}.`;
  renderTtsStatus(out.tts)
 }catch(e){const badge=$('#coreBadge');if(badge){badge.textContent='GEMINI • ERRO';badge.classList.add('provider-failed')}$('#geminiStatus').textContent=e.message||'Falha ao ler configuração.'}
}
function renderTtsStatus(tts){
 if(!tts)return;const el=$('#ttsStatus'),engine=tts.selectedEngine||$('#ttsEngine')?.value||'android',status=engine==='gemini'?tts.gemini:tts.android;
 el.className=`rule-note ${status?.state==='error'?'bad':status?.state==='idle'?'ok':''}`;
 const label=engine==='kokoro'?'Braseiro Kokoro PT-BR • neural':engine==='android'?'voz instalada no aparelho':'Gemini 24 kHz';
 el.textContent=status?.state==='error'?`TTS ${engine}: ${status.error||'erro'}`:`TTS ${engine}: ${status?.state||'—'} • ${label}`;
}
async function saveGeminiSettings(){
 const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.saveSettings)return toast('Configuração de voz exige o app Android.');
 const payload={
  textModel:$('#geminiTextModel')?.value?.trim()||'gemini-3.8-flash',
  ttsModel:$('#geminiTtsModel')?.value?.trim()||'gemini-3.8-flash-tts',
  voice:$('#geminiVoice')?.value||'Charon',
  language:$('#geminiLanguage')?.value?.trim()||'pt-BR',
  ttsEngine:$('#ttsEngine')?.value||'android',
  androidEnginePackage:$('#androidTtsEnginePkg')?.value||'',
  androidVoice:$('#androidTtsVoice')?.value||'',
  voiceStyle:$('#geminiVoiceStyle')?.value||'',
  voiceProfile:$('#geminiVoiceProfile')?.value||'',
  ttsSpeed:Number($('#ttsSpeedInput')?.value||1.0),
  vocalMode:$('#ttsVocalMode')?.value||'distinct-voices',
  stripVocalTags:$('#ttsStripVocalTags')?Boolean($('#ttsStripVocalTags').checked):true
 };
 const out=await voice.saveSettings(payload);if(out?.ok===false)return toast(out.error||'Falha ao salvar configuração.');geminiSettingsDirty=false;await loadGeminiSettings();toast('Modelos, estilo, perfil e motor de voz salvos.');
}
function configureGeminiKey(){if(!globalThis.AndroidSecrets?.configureGeminiKey)return toast('A chave só pode ser configurada no app Android.');AndroidSecrets.configureGeminiKey()}
function removeGeminiKey(){if(!globalThis.AndroidSecrets?.clearGeminiKey)return toast('A chave só pode ser removida no app Android.');AndroidSecrets.clearGeminiKey()}
window.addEventListener('barbara:gemini-key-updated',event=>{loadGeminiSettings();toast(event.detail?.ok===false?(event.detail?.error||'Falha no Keystore'):(event.detail?.configured?'Chave Gemini salva no Keystore.':'Chave Gemini removida.'))});
async function speakGemini(){
 const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.speak)return toast('Voz exige o app Android.');
 const text=$('#ttsText')?.value?.trim()||'';if(!text)return toast('Digite o texto para narrar.');
 const engine=$('#ttsEngine')?.value||'android';
 const out=await voice.speak({
  text,
  style:$('#ttsStyle')?.value||'narration',
  engine,
  voice:$('#geminiVoice')?.value||'Charon',
  voiceStyle:$('#geminiVoiceStyle')?.value||'',
  voiceProfile:$('#geminiVoiceProfile')?.value||'',
  ttsSpeed:Number($('#ttsSpeedInput')?.value||1.0),
  vocalMode:$('#ttsVocalMode')?.value||'distinct-voices',
  stripVocalTags:$('#ttsStripVocalTags')?Boolean($('#ttsStripVocalTags').checked):true,
  androidEnginePackage:$('#androidTtsEnginePkg')?.value||''
 });
 if(out?.ok===false)return toast(out.error||'Falha ao iniciar TTS.');
 $('#ttsStatus').textContent=`TTS ${out.engine||engine}: na fila…`;toast(`Narração solicitada via ${out.engine||engine}.`);
}
async function stopGemini(){const voice=globalThis.MotorBarbaraCore?.voice;if(!voice?.stop)return;await voice.stop();$('#ttsStatus').textContent='TTS: parado.';}

function initSingleShotPregenSelector(){
 const select=$('#singleShotPregenSelect');if(!select)return;
 const specs=Object.values(SINGLE_SHOT_PDF_VERIFIED_SPECS);
 select.innerHTML=specs.map(s=>`<option value="${s.id}">${s.handle} • ${s.role} (${s.roleAbility} ${s.roleRank}) • p.${s.pdfPage} • 500eb</option>`).join('');
}
async function loadSelectedSingleShotPregen(pregenIdOverride=null){
 const pregenId=pregenIdOverride||$('#singleShotPregenSelect')?.value||'ssp_pregen_01';
 const spec=SINGLE_SHOT_PDF_VERIFIED_SPECS[pregenId];
 if(!spec)return toast('Personagem Single Shot não encontrado.');
 const base=createCharacter({method:'streetrat',role:spec.role.toLowerCase(),name:spec.handle});
 character=applySingleShotPregenToWebCharacter(base,pregenId);
 importedAsset=false;
 applyAssets();
 render();
 const saved=await bridge.saveCharacter(character);
 const statusEl=$('#singleShotPregenStatus');
 if(statusEl){
  statusEl.textContent=`Carregado: ${character.name} (${spec.role} • ${spec.roleAbility} Grau ${spec.roleRank}) • PV ${character.derived.hp}/${character.derived.maxHp} • HUM ${character.derived.humanity}/${character.derived.maxHumanity} • SP 11 • ${character.economy.eurobucks}eb • PDF p.${spec.pdfPage} verificado.`;
 }
 toast(`${character.name} (${spec.role}) carregado e salvo.`);
 return {ok:saved?.ok!==false,character,saved};
}
globalThis.BraseiroSingleShotPack={
 listPregens:()=>promoteAllSingleShotPlayableCharacters(),
 promotePregen:(id,opts)=>promoteSingleShotPlayableCharacter(id,opts),
 loadPregen:(id)=>loadSelectedSingleShotPregen(id),
 getNetArchitecture:(archId)=>getSingleShotNetArchitecture(archId)
};

async function refreshUpdaterStatus(){
 try{
  const st=await bridge.updaterStatus();
  const badge=$('#updaterStatusBadge'),text=$('#updaterStatusText');
  if(badge)badge.textContent=st?.activeManifest?.version?`ATIVO v${st.activeManifest.version}`:`APP v${st?.currentAppVersion||'4.1.72'}`;
  if(text)text.textContent=st?.activeManifest?`Pacote ativo: ${st.activeManifest.version} (${st.activeFilesCount||0} arquivos) • rollback disponível: ${st.hasRollbackBackup?'SIM':'NÃO'}`:`Versão base ${st?.currentAppVersion||'4.1.72'} (${st?.currentVersionCode||4172}) • rollback disponível: ${st?.hasRollbackBackup?'SIM':'NÃO'}`;
  return st;
 }catch(e){return {ok:false,error:e.message}}
}
async function applyInAppUpdateFromUi(){
 const raw=$('#updatePackageJsonInput')?.value?.trim()||'';
 if(!raw)return toast('Cole o JSON do pacote braseiro.update/v1.');
 const out=await bridge.applyUpdatePackage(raw);
 if(out?.ok===false){
  if($('#updaterStatusText'))$('#updaterStatusText').textContent=`Atualização recusada: ${out.error||'erro'}`;
  return toast(`Atualização recusada: ${out.error||'erro'}`);
 }
 await refreshUpdaterStatus();
 toast(`Atualização v${out.appliedVersion} aplicada com sucesso (${out.filesWritten} arquivo(s)).`);
 return out;
}
async function rollbackInAppUpdateFromUi(){
 const out=await bridge.rollbackUpdatePackage();
 if(out?.ok===false){
  if($('#updaterStatusText'))$('#updaterStatusText').textContent=`Rollback indisponível: ${out.error||'sem backup'}`;
  return toast(`Rollback: ${out.error||'indisponível'}`);
 }
 await refreshUpdaterStatus();
 toast('Versão anterior restaurada com sucesso.');
 return out;
}
globalThis.BraseiroInAppUpdater={
 status:()=>refreshUpdaterStatus(),
 apply:(pkg)=>bridge.applyUpdatePackage(pkg).then(async r=>{await refreshUpdaterStatus();return r}),
 rollback:()=>bridge.rollbackUpdatePackage().then(async r=>{await refreshUpdaterStatus();return r})
};

bind('#loadSingleShotPregenBtn','click',()=>loadSelectedSingleShotPregen());
bind('#applyUpdateBtn','click',applyInAppUpdateFromUi);
bind('#rollbackUpdateBtn','click',rollbackInAppUpdateFromUi);
bind('#geminiKeyBtn','click',configureGeminiKey);bind('#geminiSaveBtn','click',saveGeminiSettings);bind('#geminiRemoveBtn','click',removeGeminiKey);bind('#ttsSpeakBtn','click',speakGemini);bind('#ttsStopBtn','click',stopGemini);
['geminiTextModel','geminiTtsModel','geminiVoice','geminiLanguage','ttsEngine','androidTtsEnginePkg','androidTtsVoice','geminiVoiceStyle','geminiVoiceProfile','ttsSpeedInput','ttsVocalMode','ttsStripVocalTags'].forEach(id=>$(`#${id}`)?.addEventListener('input',()=>{geminiSettingsDirty=true;$('#geminiStatus').textContent='Alterações de modelo/voz ainda não salvas.'}));
initSingleShotPregenSelector();
refreshUpdaterStatus();"""

    if "BraseiroSingleShotPack" not in src:
        if old_tts_block not in src:
            raise RuntimeError("Could not find old_tts_block in app.js")
        src = src.replace(old_tts_block, new_tts_and_features_block, 1)

    e2e_hook = """
const e2eMode=new URLSearchParams(location.search).get('e2e');
if(e2eMode){
 setTimeout(()=>runR572EmulatorE2E({mode:e2eMode,bridge,getCharacter:()=>character,setCharacter:c=>{character=c;applyAssets();render()},validateCharacter,workbench,singleShotApi:globalThis.BraseiroSingleShotPack,adventureImportApi:globalThis.BraseiroAdventureImport,updaterApi:globalThis.BraseiroInAppUpdater}),900);
}"""
    if "runR572EmulatorE2E({" not in src:
        src = src + "\n" + e2e_hook + "\n"

    app_js_path.write_text(src, encoding="utf-8")


def patch_sheets_js(app_dir: Path) -> None:
    sheets_path = app_dir / "sheets.js"
    src = sheets_path.read_text(encoding="utf-8")

    # 1. Bind JSON adventure import & continuity buttons in bind()
    bind_anchor = "$('#sessionRestartBtn')?.addEventListener('click',()=>this.restartAdventure());"
    bind_replacement = """$('#sessionRestartBtn')?.addEventListener('click',()=>this.restartAdventure());
    $('#importAdventureJsonBtn')?.addEventListener('click',()=>this.importAdventureFromUi());
    $('#adventureJsonFileInput')?.addEventListener('change',e=>e.target.files?.[0]&&this.loadAdventureJsonFile(e.target.files[0]));
    $('#completeAdventureLegacyBtn')?.addEventListener('click',()=>this.completeAdventureWithLegacyFromUi());"""
    if "importAdventureFromUi" not in src:
        if bind_anchor not in src:
            raise RuntimeError("Could not find sessionRestartBtn bind in sheets.js")
        src = src.replace(bind_anchor, bind_replacement, 1)

    # 2. Include untrusted envelope in sessionWorldContext when imported adventure is active, and add import/legacy methods
    context_anchor = "const base=livingWorldMasterContext(w.livingWorld,{clock,locationId,weather:w.weather,playerName:c.name||'Edgerunner'}),adventure=this.adventureController?.buildContextText(c)||'';return adventure?base+'\\n\\n'+adventure:base}"
    context_replacement = """const base=livingWorldMasterContext(w.livingWorld,{clock,locationId,weather:w.weather,playerName:c.name||'Edgerunner'}),adventure=this.adventureController?.buildContextText(c)||'';return [base,adventure].filter(Boolean).join('\\n\\n')}
  async loadAdventureJsonFile(file){
    try{const text=await file.text();const area=$('#adventureJsonTextInput');if(area)area.value=text;await this.importAdventureFromUi(text)}catch(e){this.toast(e.message||'Falha ao ler arquivo JSON de aventura.')}
  }
  async importAdventureFromUi(rawOverride=null){
    const raw=rawOverride??($('#adventureJsonTextInput')?.value?.trim()||'');
    if(!raw)return this.toast('Selecione um arquivo .json ou cole o pacote braseiro.adventure/v1.');
    try{
      const c=this.character();
      const res=await this.adventureController.importAdventureJson(raw,{character:c});
      if(c)await this.saveCharacter(c);
      const moduleEl=$('#adventureModuleSelect');
      if(moduleEl)moduleEl.dataset.signature='';
      this.renderAdventureStartControls();
      if(moduleEl)moduleEl.value=res.adventureId;
      const statusEl=$('#adventureContinuityStatus');
      if(statusEl)statusEl.textContent=`Aventura importada: ${res.module.title} (${res.adventureId}) • início em ${res.module.startDefinition?.startingLocation||res.module.startPoint||'Night City'} • segredos do Mestre isolados.`;
      this.toast(`Aventura "${res.module.title}" validada e importada.`);
      return res;
    }catch(e){
      const statusEl=$('#adventureContinuityStatus');
      if(statusEl)statusEl.textContent=`Erro na importação: ${e.message}`;
      this.toast(`Importação recusada: ${e.message}`);
      return {ok:false,error:e.message};
    }
  }
  async completeAdventureWithLegacyFromUi(outcomeOverride=null){
    try{
      const c=this.character();if(!c)return;
      const summary=outcomeOverride||$('#adventureLegacyOutcomeInput')?.value?.trim()||'Aventura concluída';
      const legacy=await this.adventureController.completeActiveAdventureWithLegacy({
        outcome:'completed',
        summary,
        deed:summary,
        reputationDelta:1,
        majorDeeds:[summary]
      });
      await this.saveCharacter(c);
      const statusEl=$('#adventureContinuityStatus');
      if(statusEl)statusEl.textContent=`Legado preservado (${legacy.schema||legacy.format}): ${legacy.completedAdventures.length} aventura(s) concluída(s) • última: ${legacy.lastAdventureId||'—'}.`;
      this.render();
      this.toast('Aventura concluída e legado preservado para a próxima aventura.');
      return {ok:true,legacy};
    }catch(e){
      this.toast(e.message||'Falha ao concluir aventura.');
      return {ok:false,error:e.message};
    }
  }"""
    if "async completeAdventureWithLegacyFromUi" not in src:
        context_anchor_alt = "const base=livingWorldMasterContext(w.livingWorld,{clock,locationId,weather:w.weather,playerName:c.name||'Edgerunner'}),adventure=this.adventureController?.buildContextText(c)||'';return [base,adventure].filter(Boolean).join('\\n\\n')}"
        if context_anchor in src:
            src = src.replace(context_anchor, context_replacement, 1)
        elif context_anchor_alt in src:
            src = src.replace(context_anchor_alt, context_replacement, 1)
        else:
            raise RuntimeError("Could not find sessionWorldContext anchor in sheets.js")

    # Expose BraseiroAdventureImport in render()
    render_anchor = "render(){globalThis.BraseiroAdventureDebug=()=>this.adventureController?.debugState(this.character())||{};"
    render_replacement = """render(){globalThis.BraseiroAdventureDebug=()=>this.adventureController?.debugState(this.character())||{};globalThis.BraseiroAdventureImport={importJson:(raw)=>this.importAdventureFromUi(raw),completeWithLegacy:(summary)=>this.completeAdventureWithLegacyFromUi(summary),controller:this.adventureController};"""
    if "BraseiroAdventureImport" not in src and render_anchor in src:
        src = src.replace(render_anchor, render_replacement, 1)

    sheets_path.write_text(src, encoding="utf-8")


def patch_chromium83_webview_compat(android_root: Path) -> None:
    web_root = android_root / "app" / "src" / "main" / "assets" / "web"
    bootstrap_path = web_root / "app" / "android_bridge_bootstrap.js"
    b_src = bootstrap_path.read_text(encoding="utf-8")
    polyfills = """  if (typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = (v) => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }
  if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(s, r) { return typeof s === 'string' ? this.split(s).join(r) : this.replace(s, r); };
  }
  if (!Array.prototype.at) {
    Array.prototype.at = function(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return (n < 0 || n >= this.length) ? undefined : this[n]; };
  }
  if (!String.prototype.at) {
    String.prototype.at = function(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return (n < 0 || n >= this.length) ? undefined : this.charAt(n); };
  }
  if (!Object.hasOwn) {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  }
  if (globalThis.crypto && !globalThis.crypto.randomUUID) {
    globalThis.crypto.randomUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
"""
    if "globalThis.structuredClone = " not in b_src:
        b_src = b_src.replace("(function(){\n", "(function(){\n" + polyfills, 1)
        bootstrap_path.write_text(b_src, encoding="utf-8")

    # Replace ES2021 logical assignment operators (||=, ??=) in adapter files for Chromium 83 WebView compatibility
    rabbit_path = web_root / "adapter" / "cpred_chasing_rabbit.js"
    if rabbit_path.is_file():
        r_src = rabbit_path.read_text(encoding="utf-8")
        r_src = r_src.replace(
            "const p=s.players[player]??={penalties:0,boxRounds:0,ejected:false};",
            "const p=(s.players[player]=s.players[player]||{penalties:0,boxRounds:0,ejected:false});",
        )
        rabbit_path.write_text(r_src, encoding="utf-8")

    combat_path = web_root / "adapter" / "cpred_combat.js"
    if combat_path.is_file():
        c_src = combat_path.read_text(encoding="utf-8")
        c_src = (
            c_src.replace("out.cannotDodge||=!!row.cannotDodge;", "out.cannotDodge=Boolean(out.cannotDodge||row.cannotDodge);")
            .replace("out.cannotSpeak||=!!row.cannotSpeak;", "out.cannotSpeak=Boolean(out.cannotSpeak||row.cannotSpeak);")
            .replace("out.skipNextAction||=!!row.skipNextAction;", "out.skipNextAction=Boolean(out.skipNextAction||row.skipNextAction);")
            .replace("out.dropHeld||=!!row.dropHeld;", "out.dropHeld=Boolean(out.dropHeld||row.dropHeld);")
            .replace("out.moveLocksNext||=!!row.moveLocksNext;", "out.moveLocksNext=Boolean(out.moveLocksNext||row.moveLocksNext);")
        )
        combat_path.write_text(c_src, encoding="utf-8")

    dg_path = web_root / "adapter" / "cpred_danger_gal.js"
    if dg_path.is_file():
        dg_src = dg_path.read_text(encoding="utf-8")
        dg_src = dg_src.replace(
            "(byFaction[c.faction]??=[]).push(c)",
            "(byFaction[c.faction]=byFaction[c.faction]||[]).push(c)",
        )
        dg_path.write_text(dg_src, encoding="utf-8")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: r572_ui_tts_pregens_updater.py <android_root>")
        sys.exit(1)
    android_root = Path(sys.argv[1]).resolve()
    app_dir = android_root / "app" / "src" / "main" / "assets" / "web" / "app"
    if not app_dir.is_dir():
        raise RuntimeError(f"Web app directory not found: {app_dir}")

    # Copy updated runtime modules
    for name in ("single_shot_pregen_factory.js", "braseiro_adventure_import_v1.js", "r572_e2e_harness.js"):
        shutil.copy2(RUNTIME_SRC / name, app_dir / name)

    patch_chromium83_webview_compat(android_root)
    patch_index_html(app_dir)
    patch_app_js(app_dir)
    patch_sheets_js(app_dir)
    print("R5_72_UI_TTS_PREGENS_UPDATER_APPLIED")


if __name__ == "__main__":
    main()
