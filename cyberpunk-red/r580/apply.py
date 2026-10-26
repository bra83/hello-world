from pathlib import Path
import sys,zipfile,base64,csv,hashlib,io

def one(s,a,b):
    if s.count(a)!=1:raise RuntimeError('Unsupported source: '+a[:110])
    return s.replace(a,b,1)

def apply(root):
    root=Path(root);here=Path(__file__).parent;java=root/'app/src/main/java/com/braseiro/cyberpunkred';app=root/'app/src/main/assets/web/app'
    for p in (here/'native').glob('*.java'):
        dest=java/('dice' if p.name in {'PhysicalDiceEngine.java','DiceRollSpec.java','DiceAppearance.java','Dice3DView.java','BraseiroDice3DOverlay.java'} else '')/p.name
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(p.read_bytes())
    p=java/'MainActivity.kt';s=p.read_text();s=one(s,'val verified = Dice3DProtocol.verify(request, raw)','val verified = diceController.verify(request, raw)')
    s=one(s,'contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }','contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds); Unit }')
    s=one(s,'                    "com.google.android.googlequicksearchbox",\n','')
    s=s.replace('diceOverlay.postDelayed({ diceOverlay.visibility = View.GONE }, 950L)','diceOverlay.visibility = View.GONE')
    s=one(s,'''            val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
            clipboard.setPrimaryClip(ClipData.newPlainText("Prompt da cena Cyberpunk RED", clean))
            runOnUiThread {''','''            runOnUiThread {
                val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("Prompt da cena Cyberpunk RED", clean))
                android.util.Log.i("CPRED_SCENE", "Opening Gemini prompt intent; chars=${clean.length}")''')
    p.write_text(s)
    p=root/'app/src/main/AndroidManifest.xml';s=p.read_text();s=one(s,'    <queries>','    <queries>\n        <package android:name="com.google.android.apps.bard" />\n        <intent><action android:name="android.intent.action.SEND" /><data android:mimeType="text/plain" /></intent>')
    s=one(s,'android:windowSoftInputMode="adjustResize"','android:windowSoftInputMode="adjustResize"\n            android:launchMode="singleTop"');p.write_text(s)
    p=java/'BarbaraJsBridge.kt';s=p.read_text()
    s=one(s,'    @Volatile private var closed = false','    private val audioControl = Executors.newSingleThreadExecutor()\n    @Volatile private var closed = false')
    s=s.replace('else worker\n','else if (method == "stopGeminiTts") audioControl else worker\n').replace('        worker.shutdownNow()','        audioControl.shutdownNow()\n        worker.shutdownNow()');p.write_text(s)
    p=java/'GeminiTtsService.kt';s=p.read_text();a=s.index('            val systemMeta =');b=s.index('\n            conn.outputStream.use',a)
    s=s[:a]+'''            val body = GeminiSpeechWire.request(model, voice, language, styleNote, voiceProfile, text)
'''+s[b:]
    a=s.index('            val root = JSONObject(raw)');b=s.index('\n        } finally {',a)
    s=s[:a]+'''            val audio = GeminiSpeechWire.audioData(JSONObject(raw))
            val mime = audio.optString("mimeType", audio.optString("mime_type", "audio/l16;rate=24000"))
            return GeminiSpeechWire.pcm(Base64.decode(audio.getString("data"), Base64.DEFAULT), mime)
'''+s[b:]
    s=s.replace('if (stripTags) AndroidTtsService.stripVocalTags(raw).ifBlank { raw } else raw','AndroidTtsService.stripVocalTags(raw)')
    s=one(s,'val key = "$model|$voice|$language|$style|$voiceProfile|$text"','val key = "speech-wire-v2|$model|$voice|$language|$style|$voiceProfile|$text"') if 'val key = "$model|' in s else s.replace('val digest = MessageDigest','val digest = MessageDigest')
    # New cache namespace cannot reuse old WAV-as-PCM entries.
    s=s.replace('"gemini-tts/','"gemini-tts-wire-v2/').replace('"gemini_tts"','"gemini_tts_wire_v2"')
    p.write_text(s)
    (java/'AndroidTtsService.kt').write_bytes((here/'native/AndroidTtsService.kt').read_bytes())
    p=java/'BarbaraRuntime.kt';s=p.read_text().replace('payload.optInt("maxChunkChars", 140)','payload.optInt("maxChunkChars", 650)')
    s=one(s,'            "kokoro" -> {\n                ttsService.stop()', '''            "kokoro" -> {
                val exact = explicitEnginePkg ?: kokoroPkg ?: error("Braseiro Kokoro/Sherpa não está instalado. Escolha um motor local instalado nas configurações.")
                require(androidTtsService.isKokoroEngine(exact)) { "O pacote selecionado não é o Kokoro/Sherpa do Forbidden Lands" }
                ttsService.stop()''')
    s=one(s,'style, speed, stripTags, preferredEnginePkg, maxChunkChars)\n                    .put("engine", "kokoro")','style, speed, stripTags, exact, maxChunkChars)')
    s=one(s,'            runCatching { androidTtsService.ensureEnginePackage(effectiveAndroidPkg.takeIf { it.isNotBlank() }) }','            check(androidTtsService.ensureEnginePackage(effectiveAndroidPkg.takeIf { it.isNotBlank() })) { "Motor TTS local indisponível" }')
    a=s.index('            else -> {\n                runCatching {',s.index('    fun speakGeminiTts'));b=s.index('\n        }\n    }',a)
    s=s[:a]+'''            else -> {
                ttsService.stop()
                androidTtsService.speakAsync(text, secretStore.androidTtsVoice(), secretStore.ttsLanguage(), style, speed, stripTags, explicitEnginePkg ?: secretStore.androidTtsEnginePackage().takeIf { it.isNotBlank() }, maxChunkChars)
            }'''+s[b:];p.write_text(s)
    p=java/'BarbaraRuntime.kt';s=p.read_text()
    s=one(s,'    fun geminiSettings(): JSONObject {','''    fun geminiSettings(): JSONObject {
        val installed=androidTtsService.installedEngines()
        val found=(0 until installed.length()).map { installed.getJSONObject(it).getString("packageName") }
        val previous=secretStore.androidTtsEnginePackage()
        val migrated=BraseiroAndroidTtsPolicy.migrate(previous,found)
        if (migrated!=previous) secretStore.savePublicSettings(null,null,null,null,androidEnginePackage=migrated,androidVoice="")''')
    s=s.replace('            rawPkg != null -> rawPkg','''            requestedEngine?.lowercase() == "kokoro" -> rawPkg?.takeIf { BraseiroAndroidTtsPolicy.isKokoro(it) } ?: kokoroPkg ?: error("Kokoro/Sherpa não instalado")
            rawPkg != null -> rawPkg''')
    s=s.replace('if (effectiveAndroidPkg != null) {','if (effectiveAndroidPkg != null && requestedEngine?.lowercase() != "gemini") {')
    s=one(s,'            androidVoice = if (payload.has("androidVoice")) payload.optString("androidVoice") else null,','            androidVoice = selectedAndroidVoice,')
    s=one(s,'        secretStore.savePublicSettings(\n            textModel = payload.optString("textModel")','''        val packageChanged = effectiveAndroidPkg != null && effectiveAndroidPkg != secretStore.androidTtsEnginePackage()
        val selectedAndroidVoice = if (packageChanged) "" else if (payload.has("androidVoice")) payload.optString("androidVoice") else null
        if (effectiveAndroidPkg != null && requestedEngine?.lowercase() != "gemini") androidTtsService.validateVoice(selectedAndroidVoice)
        secretStore.savePublicSettings(
            textModel = payload.optString("textModel")''')
    p.write_text(s)
    p=app/'mobile_shell.js';s=p.read_text();s=one(s,"[$('.session-player-state'), $('#sessionRecommended'), $('#sessionFlowGuide')], master);","[$('.session-player-state'), $('#sessionFlowGuide')], master);\n    const actions=$('#sessionRecommended');if(actions)master.insertBefore(actions,$('.free-action-block'));" )
    s=one(s,"      fold('Imagem da cena · gerar ou importar', [media, $('#scenePrompt')], scene);", "      stack.insertBefore(scene,master);\n      // Image actions remain visible; only the optional editable prompt is folded.\n      fold('Editar prompt da imagem', [$('#scenePrompt')], scene);")
    p.write_text(s)
    p=app/'sheets.js';s=p.read_text();s=one(s,'  async init(){','  async init(){\n    this.bind();')
    s=one(s,'  bind(){','  bind(){\n    if(this.bound)return;this.bound=true;')
    s=s.replace("JSON.parse(native(prompt))","JSON.parse(globalThis.AndroidScene.openGemini(prompt))")
    s=one(s,"const prompt=$('#scenePrompt')?.value.trim()||this.scenePromptText(this.character());", "const prompt=$('#scenePrompt')?.value.trim()||this.scenePromptText(this.character());if($('#scenePrompt'))$('#scenePrompt').value=prompt;")
    # Import errors used to be discarded silently when consumeSharedImage returned {ok:false}.
    s=one(s,"const out=JSON.parse(globalThis.AndroidScene.consumeSharedImage());if(out?.dataUrl)","const out=JSON.parse(globalThis.AndroidScene.consumeSharedImage());if(out?.ok===false){if(out.error!=='Nenhuma imagem compartilhada')this.toast(out.error||'Falha na importação da imagem');return}if(out?.dataUrl)")
    # Capture where the picker was opened; async file decode must not attach to a later character.
    s=one(s,"  async importSceneImage(file){if(!file", "  async importSceneImage(file){const importCharacter=this.character(),importKey=this.sessionKey(importCharacter);if(!file")
    s=one(s,"const c=this.character(),s=this.sessionState(c);s.sceneImages[this.sessionKey(c)]={dataUrl:canvas.toDataURL('image/jpeg',.86)","const c=importCharacter,s=this.sessionState(c);s.sceneImages[importKey]={dataUrl:canvas.toDataURL('image/jpeg',.86)")
    s=one(s,"if(out?.dataUrl){const c=this.character(),s=this.sessionState(c);", "if(out?.dataUrl){const c=this.character(),s=this.sessionState(c);")
    # Scroll to the now visible media card once a decoded image is attached.
    s=s.replace("this.toast('Imagem da cena importada e persistida.')","$('#sceneIllustration')?.scrollIntoView({block:'center',behavior:'smooth'});this.toast('Imagem da cena importada e persistida.')")
    s=s.replace("this.toast('Imagem compartilhada importada e persistida.')","$('#sceneIllustration')?.scrollIntoView({block:'center',behavior:'smooth'});this.toast('Imagem compartilhada importada e persistida.')")
    # Above replacement in an expression arrow requires a block.
    s=s.replace(".then(()=>$('#sceneIllustration')?.scrollIntoView({block:'center',behavior:'smooth'});this.toast('Imagem compartilhada importada e persistida.'))", ".then(()=>{$('#sceneIllustration')?.scrollIntoView({block:'center',behavior:'smooth'});this.toast('Imagem compartilhada importada e persistida.');})")
    for marker in ['  async newAdventureUniversal(){','  async sendSession(){']:
        s=one(s,marker,marker+"\n    await globalThis.MotorBarbaraCore?.voice?.stop?.();")
    s=one(s,"{text,style:'narration',engine:engine||selector?.value||'android'}", "{text,style:$('#geminiVoiceStyle')?.value||'narration',voiceProfile:$('#geminiVoiceProfile')?.value||'',engine:engine||selector?.value||'android',androidEnginePackage:$('#androidTtsEnginePkg')?.value||undefined}")
    s=one(s,"this.toast(`Narração solicitada via ${out.engine||engine||'voz'}.`);return", "this.toast(`Narração solicitada via ${out.engine||engine||'voz'}.`);globalThis.BraseiroWatchSpeech?.(out.engine||engine||selector?.value);return")
    # Prompt now includes the real accepted scene, instead of generic Night City decoration.
    s=one(s,'\\nMomento: ${String(s?.lastAction', '\\nCena aceita pelo Mestre: ${String(s?.currentNarration||\'\').slice(0,8000)}.\\nMomento: ${String(s?.lastAction')
    s=s.replace("try{await navigator.clipboard.writeText(prompt)}catch{};const native=", "const native=")
    s=s.replace("if(out?.ok)return this.toast('Prompt copiado. Gemini aberto; cole se o app não aceitar preenchimento automático.')}catch{}", "if(out?.ok)return this.toast('Prompt enviado ao Android para abrir no Gemini.');throw new Error(out?.error||'Falha ao abrir o aplicativo')}catch(error){console.error('[CPRED_GEMINI_OPEN]',error.message);return this.toast('Não foi possível abrir Gemini: '+error.message)}")
    s=s.replace("    this.toast('Prompt copiado. Abra o Gemini e cole o texto.')", "    try{await navigator.clipboard.writeText(prompt)}catch{};this.toast('Prompt copiado. Abra o Gemini e cole o texto.')")
    p.write_text(s)
    p=app/'app.js';s=p.read_text()
    s=one(s,'setTimeout(()=>workbench.importIncomingSceneImage?.(),350);',"const importSharedWhenReady=()=>bootCharacterReady.then(()=>workbench.importIncomingSceneImage?.());setTimeout(importSharedWhenReady,350);")
    s=s.replace("window.addEventListener('barbara:shared-image-available',()=>workbench.importIncomingSceneImage?.());","window.addEventListener('barbara:shared-image-available',importSharedWhenReady);")
    s=s.replace('workbench.init().catch(e=>toast(`Ficha: ${e.message}`));',"workbench.init().catch(e=>{console.error('[CPRED_WORKBENCH_INIT]',e.message);toast(`Ficha: ${e.message}`)});")
    a=s.index(" const base=",s.index('function populateAndroidEngines('));b=s.index('\n}',a)
    s=s[:a]+''' const base='<option value="">Padrão local do aparelho</option>';
 const extras=values.filter(e=>e.packageName).map(e=>`<option value="${String(e.packageName).replace(/"/g,'&quot;')}">${String(e.label||e.packageName)} (${String(e.packageName)})</option>`).join('');
 select.innerHTML=base+extras;
 if(selected){if(![...select.options].some(o=>o.value===selected)){const missing=new Option(selected+' (não instalado)',selected);missing.disabled=true;select.add(missing)}select.value=selected;}'''+s[b:]
    s += "\nfor(const id of ['characterSelect','newCharacterBtn','characterImportFile']){document.getElementById(id)?.addEventListener(id==='newCharacterBtn'?'click':'change',()=>{globalThis.MotorBarbaraCore?.voice?.stop?.();},{capture:true});}\n"
    s += "\ndocument.querySelector('#androidTtsEnginePkg')?.addEventListener('change',()=>{const v=document.querySelector('#androidTtsVoice');if(v)v.innerHTML='<option value=\"\">Salvar motor para carregar suas vozes PT-BR</option>';});\n"
    p.write_text(s)
    p=app/'index.html';s=p.read_text().replace('>ABRIR GEMINI</button>','>GERAR NO GEMINI</button>').replace('>IMPORTAR</button>','>IMPORTAR IMAGEM</button>')
    s=s.replace('<option value="com.k2fsa.sherpa.onnx.tts.engine">Braseiro Kokoro PT-BR • neural (com.k2fsa.sherpa.onnx.tts.engine)</option>','').replace('Detectar automaticamente (Kokoro / Sistema)','Padrão do aparelho (escolha um motor instalado)').replace('Automático (Kokoro/Android → Gemini)','Padrão local do aparelho').replace('Android / voz do aparelho','Android / motor local selecionado')
    s=s.replace('build=4179','build=4180');s=one(s,'</body>', '<script type="module" src="./media_voice_580.js"></script>\n</body>');p.write_text(s)
    p=app/'mobile_shell.css';p.write_text(p.read_text()+'''\n/* Scene image and choices are primary play controls. */
#cpredMobile .session-scene-card{order:0!important;scroll-margin-top:78px}
#cpredMobile .scene-media-actions button{flex:1 1 130px!important;min-height:44px!important;white-space:normal!important}
#cpredMobile .scene-media-frame{height:auto!important;min-height:86px!important;max-height:none!important}
#cpredMobile .scene-illustration{height:auto!important;max-height:48vh!important;object-fit:contain!important;display:block!important}
#cpredMobile .scene-illustration.hidden{display:none!important}
#cpredMobile #sessionRecommended{display:block!important;margin:12px 0!important}
#cpredMobile #sessionRecommended>div{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
#cpredMobile #sessionRecommended button{width:100%!important;text-align:left!important;white-space:normal!important;min-height:44px!important;line-height:1.4!important}
''')
    (app/'media_voice_580.js').write_bytes((here/'web/media_voice.js').read_bytes())
    # Optional scene choices are presentation data, never canonical actions.
    wheel=root/'app/wheels/motor_barbara-1.1.2-py3-none-any.whl'
    with zipfile.ZipFile(wheel) as z:files={n:z.read(n) for n in z.namelist()}
    src=files['barbara/gemini.py'].decode()
    src=one(src,"'coverage':{'type':'ARRAY','items':{'type':'STRING'}},", "'coverage':{'type':'ARRAY','items':{'type':'STRING'}},\n                        'recommendedActions':{'type':'ARRAY','items':{'type':'STRING'}},")
    src=one(src,"'Return only the requested JSON object.'", "'Offer 2–4 distinct optional actions grounded in this actual scene in presentation.recommendedActions. They are proposals for the player to choose, not performed actions, rules, outcomes or state mutations.','Return only the requested JSON object.'")
    files['barbara/gemini.py']=src.encode()
    src=files['barbara/engine.py'].decode()
    src=one(src,"            presentation={'coverage':presentation.get('coverage',[])}", "            actions=presentation.get('recommendedActions',[])\n            actions=list(dict.fromkeys(x.strip()[:320] for x in actions if isinstance(x,str) and x.strip()))[:4] if isinstance(actions,list) else []\n            presentation={'coverage':presentation.get('coverage',[]),'recommendedActions':actions}")
    files['barbara/engine.py']=src.encode()
    record=next(n for n in files if n.endswith('.dist-info/RECORD'));out=io.StringIO();writer=csv.writer(out,lineterminator='\n')
    for name,data in files.items():writer.writerow([name,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(data).digest()).decode().rstrip('=') if name!=record else '',len(data) if name!=record else ''])
    files[record]=out.getvalue().encode()
    with zipfile.ZipFile(wheel,'w',zipfile.ZIP_DEFLATED) as z:
        for name,data in files.items():z.writestr(name,data)
    p=root/'app/build.gradle.kts';s=p.read_text().replace('versionCode = 4179','versionCode = 4180').replace('versionName = "4.1.79"','versionName = "4.1.80"');p.write_text(s)
    p=root/'app/build.gradle.kts';s=p.read_text().replace('versionCode = 4180','versionCode = 4180\n        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"').replace('dependencies {','dependencies {\n    androidTestImplementation("androidx.test:runner:1.6.2")\n    androidTestImplementation("androidx.test:core:1.6.1")\n    androidTestImplementation("androidx.test.ext:junit:1.2.1")');p.write_text(s)
    target=root/'app/src/androidTest';(target/'java/com/braseiro/cyberpunkred').mkdir(parents=True,exist_ok=True)
    for source in (here/'androidTest').iterdir():
        dest=target/'res/xml/tts_engine.xml' if source.name=='tts_engine.xml' else target/source.name if source.suffix=='.xml' else target/'java/com/braseiro/cyberpunkred'/source.name
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(source.read_bytes())
    print('Applied 4.1.80 media, actions, native FL dice and corrected speech contracts')

if __name__=='__main__':apply(sys.argv[1])
