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
    p.write_text(s)
    p=root/'app/src/main/AndroidManifest.xml';s=p.read_text();s=one(s,'    <queries>','    <queries>\n        <package android:name="com.google.android.apps.bard" />\n        <intent><action android:name="android.intent.action.SEND" /><data android:mimeType="text/plain" /></intent>')
    s=one(s,'android:windowSoftInputMode="adjustResize"','android:windowSoftInputMode="adjustResize"\n            android:launchMode="singleTop"');p.write_text(s)
    p=java/'GeminiTtsService.kt';s=p.read_text();a=s.index('            val systemMeta =');b=s.index('\n            conn.outputStream.use',a)
    s=s[:a]+'''            val body = GeminiSpeechWire.request(model, voice, language, styleNote, voiceProfile, text)
'''+s[b:]
    a=s.index('            val root = JSONObject(raw)');b=s.index('\n        } finally {',a)
    s=s[:a]+'''            val audio = GeminiSpeechWire.audioData(JSONObject(raw))
            val mime = audio.optString("mimeType", audio.optString("mime_type", "audio/l16;rate=24000"))
            return GeminiSpeechWire.pcm(Base64.decode(audio.getString("data"), Base64.DEFAULT), mime)
'''+s[b:]
    s=one(s,'val key = "$model|$voice|$language|$style|$voiceProfile|$text"','val key = "speech-wire-v2|$model|$voice|$language|$style|$voiceProfile|$text"') if 'val key = "$model|' in s else s.replace('val digest = MessageDigest','val digest = MessageDigest')
    # New cache namespace cannot reuse old WAV-as-PCM entries.
    s=s.replace('"gemini-tts/','"gemini-tts-wire-v2/').replace('"gemini_tts"','"gemini_tts_wire_v2"')
    p.write_text(s)
    patch_android_tts(java)
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
    p=app/'mobile_shell.js';s=p.read_text();s=one(s,"[$('.session-player-state'), $('#sessionRecommended'), $('#sessionFlowGuide')], master);","[$('.session-player-state'), $('#sessionFlowGuide')], master);\n    const actions=$('#sessionRecommended');if(actions)master.insertBefore(actions,$('.free-action-block'));" )
    s=one(s,"      fold('Imagem da cena · gerar ou importar', [media, $('#scenePrompt')], scene);", "      stack.insertBefore(scene,master);\n      // Image actions remain visible; only the optional editable prompt is folded.\n      fold('Editar prompt da imagem', [$('#scenePrompt')], scene);")
    p.write_text(s)
    p=app/'sheets.js';s=p.read_text();s=s.replace("JSON.parse(native(prompt))","JSON.parse(globalThis.AndroidScene.openGemini(prompt))")
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
    s=one(s,"{text,style:'narration',engine:engine||selector?.value||'android'}", "{text,style:$('#geminiVoiceStyle')?.value||'narration',voiceProfile:$('#geminiVoiceProfile')?.value||'',engine:engine||selector?.value||'android',androidEnginePackage:$('#androidTtsEnginePkg')?.value||undefined}")
    s=one(s,"this.toast(`Narração solicitada via ${out.engine||engine||'voz'}.`);return", "this.toast(`Narração solicitada via ${out.engine||engine||'voz'}.`);globalThis.BraseiroWatchSpeech?.(out.engine||engine||selector?.value);return")
    # Prompt now includes the real accepted scene, instead of generic Night City decoration.
    s=one(s,'\\nMomento: ${String(s?.lastAction', '\\nCena aceita pelo Mestre: ${String(s?.currentNarration||\'\').slice(0,8000)}.\\nMomento: ${String(s?.lastAction')
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
        (target/source.name if source.suffix=='.xml' else target/'java/com/braseiro/cyberpunkred'/source.name).write_bytes(source.read_bytes())
    print('Applied 4.1.80 media, actions, native FL dice and corrected speech contracts')

def patch_android_tts(java):
    p=java/'AndroidTtsService.kt';s=p.read_text().replace('            "com.braseiro.kokoro.ptbr",\n','').replace('            "com.braseiro.kokoro.tts",\n','')
    s=s.replace('            "com.k2fsa.sherpa.onnx.tts.engine",\n','')
    s=s.replace(' || p.contains("kokoro", ignoreCase = true) || p.contains("sherpa.onnx", ignoreCase = true)','')
    s=one(s,'val target = rawTarget ?: detectKokoroPackage()','val target = rawTarget\n        if (target != null) require(installedEngines().let { list -> (0 until list.length()).any { list.getJSONObject(it).optString("packageName") == target } }) { "Motor TTS selecionado não está instalado: $target" }')
    a=s.index('        if (rawTarget == null) {');b=s.index('        return ready',a);s=s[:a]+s[b:]
    s=one(s,'if (target != activeEnginePackage || !ready) {','if ((target != null && target != activeEnginePackage) || (target == null && activeEnginePackage != null && activeEnginePackage != tts.defaultEngine) || !ready) {')
    # Never label an arbitrary saved Android engine as Kokoro.
    s=s.replace('v.locale?.language == "pt"','v.locale?.language in listOf("pt", "por")').replace('it.locale?.language == "pt"','it.locale?.language in listOf("pt", "por")')
    s=s.replace('?: voicesSet?.maxByOrNull(::voiceScore)','?: if (!isKokoro) voicesSet?.maxByOrNull(::voiceScore) else null')
    s=one(s,'        when (style.lowercase()) {','        if (isKokoro) { tts.setSpeechRate(clampedSpeed);tts.setPitch(1.0f) } else when (style.lowercase()) {')
    s=s.replace('maxChunkChars: Int = 140','maxChunkChars: Int = 650').replace('maxChars: Int = 140','maxChars: Int = 650')
    s=s.replace('maxChunkChars.coerceIn(40, 3400)','maxChunkChars.coerceIn(350, 800)')
    # Confirm actual engine just as the reference plugin does; only default selection
    # may use getDefaultEngine when framework reflection is unavailable.
    s=s.replace('        if (awaitReady()) return true', '''        if (awaitReady()) {
            val actual = runCatching { TextToSpeech::class.java.getMethod("getCurrentEngine").invoke(tts) as? String }.getOrNull()
                ?: runCatching { TextToSpeech::class.java.getDeclaredField("mCurrentEngine").apply { isAccessible=true }.get(tts) as? String }.getOrNull()
                ?: if (target == null || target == tts.defaultEngine) tts.defaultEngine else null
            if (target != null && actual != target) { ready=false;state="error";lastError="Android não confirmou o motor selecionado: $target";error(lastError!!) }
            activeEnginePackage=actual
            return true
        }''')
    s=s.replace(' || pkg.contains("kokoro", ignoreCase = true) || pkg.contains("sherpa.onnx", ignoreCase = true)','')
    s=s.replace('pkg.contains("kokoro", ignoreCase = true) || pkg.contains("sherpa.onnx", ignoreCase = true)','pkg in KOKORO_PACKAGES')
    s=s.replace(' || activeEnginePackage!!.contains("kokoro") || activeEnginePackage!!.contains("sherpa")','')
    s=one(s,'override fun onStop(utteranceId: String?, interruptedFlag: Boolean) {','override fun onStop(utteranceId: String?, interruptedFlag: Boolean) {\n                if (utteranceId?.startsWith("cpred-${generation.get()}-") != true) return')
    s=one(s,'override fun onError(utteranceId: String?) {','override fun onError(utteranceId: String?) {\n                if (utteranceId != null && !utteranceId.startsWith("cpred-${generation.get()}-")) return')
    s=one(s,'override fun onError(utteranceId: String?, errorCode: Int) {','override fun onError(utteranceId: String?, errorCode: Int) {\n                if (utteranceId != null && !utteranceId.startsWith("cpred-${generation.get()}-")) return')
    p.write_text(s)

if __name__=='__main__':apply(sys.argv[1])
