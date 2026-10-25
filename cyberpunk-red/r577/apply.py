from pathlib import Path
import sys


def replace_once(s,before,after):
    if s.count(before)!=1:raise RuntimeError('Unsupported source: '+before[:90])
    return s.replace(before,after,1)


def apply(root):
    root=Path(root);app=root/'app/src/main/assets/web/app'
    p=root/'app/src/main/java/com/braseiro/cyberpunkred/SecureSecretStore.kt'
    s=p.read_text()
    s=replace_once(s,'if (!migrated && (saved.isNullOrBlank() || saved == "gemini-2.5-flash-lite")) {','if (!migrated && saved.isNullOrBlank()) {')
    before='''        val selectedEngine = engine?.trim()?.lowercase()?.takeIf {'''
    after='''        fun modelId(value: String?, fallback: String, label: String): String {
            if (value == null) return fallback
            val id = value.trim().removePrefix("models/")
            require(id.length in 1..120 && id.matches(Regex("[A-Za-z0-9._-]+"))) {
                "Modelo $label inválido. Use o identificador do modelo, sem espaços."
            }
            return id
        }
        // Resolve and validate BEFORE opening the editor. Never silently replace
        // the requested model with the previous value, or migrate an explicit save.
        val selectedTextModel = modelId(textModel, textModel(), "de texto")
        val selectedTtsModel = modelId(ttsModel, ttsModel(), "TTS")
        val selectedEngine = engine?.trim()?.lowercase()?.takeIf {'''
    s=replace_once(s,before,after)
    s=replace_once(s,'.putString(TEXT_MODEL, clean(textModel, textModel()))','.putString(TEXT_MODEL, selectedTextModel)\n            .putBoolean("text_model_migrated_r549", true)')
    s=replace_once(s,'.putString(TTS_MODEL, clean(ttsModel, ttsModel()))','.putString(TTS_MODEL, selectedTtsModel)\n            .putBoolean("tts_model_migrated_r572", true)')
    # Only the settings transaction changes: secret encryption and key storage remain intact.
    s=replace_once(s,'        prefs.edit()\n            .putString(TEXT_MODEL, selectedTextModel)','        val saved = prefs.edit()\n            .putString(TEXT_MODEL, selectedTextModel)')
    s=replace_once(s,'.putBoolean(TTS_STRIP_TAGS, safeStripTags)\n            .apply()', '.putBoolean(TTS_STRIP_TAGS, safeStripTags)\n            .commit()\n        check(saved) { "Não foi possível gravar as configurações no aparelho." }')
    p.write_text(s)
    p=app/'app.js';s=p.read_text(encoding='utf-8-sig')
    s=replace_once(s,'let geminiSettingsDirty=false;', 'let geminiSettingsDirty=false,geminiSettingsEditVersion=0,geminiSettingsLoadVersion=0,geminiSettingsSaving=false;')
    s=replace_once(s,'async function loadGeminiSettings(preserveEdits=false){','async function loadGeminiSettings(preserveEdits=true){\n const loadVersion=++geminiSettingsLoadVersion,editVersion=geminiSettingsEditVersion;')
    s=replace_once(s,"  if(!(preserveEdits&&(geminiSettingsDirty||editing))){",'''  if(!out||out.ok===false)throw new Error(out?.error||'Falha ao ler as configurações.');
  // A poll started before an edit/save must never restore its old snapshot.
  if(loadVersion!==geminiSettingsLoadVersion||editVersion!==geminiSettingsEditVersion||geminiSettingsSaving)return;
  if(geminiSettingsDirty||editing){renderTtsStatus(out.tts);return;}
  if(!(geminiSettingsDirty||editing)){''')
    s=replace_once(s," }catch(e){const badge=$('#coreBadge');if(badge){badge.textContent='GEMINI • ERRO';badge.classList.add('provider-failed')}$('#geminiStatus').textContent=e.message||'Falha ao ler configuração.'}"," }catch(e){if(loadVersion!==geminiSettingsLoadVersion||editVersion!==geminiSettingsEditVersion||geminiSettingsSaving||geminiSettingsDirty)return;const badge=$('#coreBadge');if(badge){badge.textContent='GEMINI • ERRO';badge.classList.add('provider-failed')}$('#geminiStatus').textContent=e.message||'Falha ao ler configuração.'}")
    s=replace_once(s,'async function saveGeminiSettings(){','async function saveGeminiSettings(){\n if(geminiSettingsSaving)return;')
    s=replace_once(s,"textModel:$('#geminiTextModel')?.value?.trim()||'gemini-3.8-flash',","textModel:$('#geminiTextModel')?.value?.trim()||'',")
    s=replace_once(s,"ttsModel:$('#geminiTtsModel')?.value?.trim()||'gemini-3.8-flash-tts',","ttsModel:$('#geminiTtsModel')?.value?.trim()||'',")
    before=" const out=await voice.saveSettings(payload);if(out?.ok===false)return toast(out.error||'Falha ao salvar configuração.');geminiSettingsDirty=false;await loadGeminiSettings();toast('Modelos, estilo, perfil e motor de voz salvos.');"
    after=''' const normalize=id=>id.replace(/^models\\//,'');
 const expectedText=normalize(payload.textModel),expectedTts=normalize(payload.ttsModel);
 const status=$('#geminiStatus'),button=$('#geminiSaveBtn');
 if(!/^[A-Za-z0-9._-]{1,120}$/.test(expectedText)||!/^[A-Za-z0-9._-]{1,120}$/.test(expectedTts)){
  geminiSettingsDirty=true;status.className='rule-note bad';status.textContent='Modelo inválido. Use o identificador sem espaços (o prefixo models/ é aceito). Sua edição foi mantida.';toast(status.textContent);return;
 }
 const editVersion=geminiSettingsEditVersion;
 geminiSettingsSaving=true;++geminiSettingsLoadVersion;if(button)button.disabled=true;
 status.textContent='Salvando e conferindo o modelo no aparelho…';
 try{
  const out=await voice.saveSettings(payload);if(!out||out.ok===false)throw new Error(out?.error||'Falha ao salvar configuração.');
  const confirmed=await voice.settings();
  if(!confirmed||confirmed.ok===false)throw new Error(confirmed?.error||'Não foi possível conferir o salvamento.');
  if(confirmed.textModel!==expectedText||confirmed.ttsModel!==expectedTts)throw new Error('O aparelho não confirmou o modelo solicitado. Sua edição foi mantida; tente salvar novamente.');
  geminiSettingsSaving=false;
  if(editVersion===geminiSettingsEditVersion){
   geminiSettingsDirty=false;$('#geminiTextModel').value=expectedText;
   await loadGeminiSettings();
   if(editVersion===geminiSettingsEditVersion){status.className='rule-note ok';status.textContent='Configurações salvas e conferidas no aparelho • modelo de texto: '+confirmed.textModel;}
   else{status.textContent='Salvo: '+confirmed.textModel+'. Há novas alterações ainda não salvas.';}
  }else{geminiSettingsDirty=true;status.textContent='Salvo: '+confirmed.textModel+'. Há novas alterações ainda não salvas.';}
  toast('Modelo de texto salvo: '+confirmed.textModel);
 }catch(error){geminiSettingsDirty=true;status.className='rule-note bad';status.textContent=error.message||'Falha ao salvar configuração.';toast(status.textContent);}
 finally{geminiSettingsSaving=false;if(button)button.disabled=false;}'''
    s=replace_once(s,before,after)
    s=replace_once(s,"()=>{geminiSettingsDirty=true;$('#geminiStatus').textContent='Alterações de modelo/voz ainda não salvas.'}","()=>{geminiSettingsDirty=true;++geminiSettingsEditVersion;$('#geminiStatus').textContent='Alterações de modelo/voz ainda não salvas.'}")
    p.write_text(s)
    p=root/'app/build.gradle.kts';s=p.read_text().replace('versionCode = 4176','versionCode = 4177').replace('versionName = "4.1.76"','versionName = "4.1.77"');p.write_text(s)
    p=app/'index.html';p.write_text(p.read_text().replace('build=4176','build=4177'))
    print('Applied R5.77: explicit model IDs, durable settings commit/readback, edit-safe asynchronous settings UI')

if __name__=='__main__':apply(sys.argv[1])
