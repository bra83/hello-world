from pathlib import Path
import zipfile, io, re

def apply(root):
    root=Path(root)
    dao=root/'app/src/main/java/com/braseiro/cyberpunkred/CyberpunkCharacterStore.kt'
    s=dao.read_text(encoding='utf-8-sig')
    if 'suspend fun list()' not in s:
        s=s.replace('    /** Called only', '    @Query("SELECT * FROM cpred_characters ORDER BY updatedAtEpochMs DESC")\n    suspend fun list(): List<CyberpunkCharacterEntity>\n\n    /** Called only')
    dao.write_text(s)
    runtime=root/'app/src/main/java/com/braseiro/cyberpunkred/BarbaraRuntime.kt'
    s=runtime.read_text(encoding='utf-8-sig')
    if 'fun listCharacters()' not in s:
        idx=s.index('    fun loadCharacter(characterId: String?)')
        s=s[:idx]+NATIVE_ROSTER+s[idx:]
    s=s.replace('.put("signatureVerified", true)', '.put("signatureVerified", true)\n            .put("installedBaseVersionCode", BuildConfig.VERSION_CODE)')
    s=s.replace('if (character.optString("characterId").isNotBlank()) restored', 'if (!character.optBoolean("deleted", false) && character.optString("characterId").isNotBlank()) restored')
    s=s.replace('Não determine sentimentos, pensamentos ou decisões internas do personagem do jogador.', 'Não determine sentimentos, pensamentos ou decisões internas do personagem do jogador. Termine a cena com uma abertura explícita e contextual para a decisão do jogador, como “O que você faz?”, sem decidir por ele.')
    runtime.write_text(s)
    sheets=root/'app/src/main/assets/web/app/sheets.js'
    sheet=sheets.read_text(encoding='utf-8-sig')
    sheet=sheet.replace("    const map={provider_missing:", "    if(reason==='cena_sem_abertura_para_decisao')return 'A cena gerada não deixou espaço para sua decisão, mesmo após uma nova tentativa automática. Sua aventura foi preservada. Envie sua ação ou peça ao Mestre para descrever a situação atual.';\n    const map={provider_missing:")
    sheet=sheet.replace('em Mais → Áudio', 'em Menu → Configurações')
    sheets.write_text(sheet)
    # The narrative gate must recognize natural PT-BR invitations, retaining agency and all mechanical validators.
    wheel=root/'app/wheels/motor_barbara-1.1.2-py3-none-any.whl'
    with zipfile.ZipFile(wheel) as z: entries={n:z.read(n) for n in z.namelist()}
    name='barbara/narrative.py'
    s=entries[name].decode()
    old="if not any(x in tail for x in decision_markers):raise ValueError('cena_sem_abertura_para_decisao')"
    new="if not any(x in tail for x in decision_markers) and not re.search(r'(?:o que (?:voce|pretende|fara|vai fazer)|como voc[eê]|voc[eê] pode|cabe a voc[eê]|aguarda (?:sua|a sua)|[àa] espera (?:da sua|de sua)|fica a seu crit[eé]rio|qual (?:ser[aá]|caminho|a sua)|que (?:atitude|caminho|resposta))', tail):raise ValueError('cena_sem_abertura_para_decisao')"
    if old not in s and new not in s: raise RuntimeError('Unknown scene-ending gate')
    entries[name]=s.replace(old,new).encode()
    # Strengthen provider instructions, without adding canned prose to model output.
    name='barbara/gemini.py';s=entries[name].decode()
    s=s.replace("'Choices and suggestions may follow the scene, but never substitute for the story itself.'", "'Choices and suggestions may follow the scene, but never substitute for the story itself. For meaningful or climax scenes, end narration with an explicit contextual invitation to the player, using O que você faz? or Como você reage? in PT-BR; never select the action for them.'")
    entries[name]=s.encode()
    name='barbara/engine.py';engine=entries[name].decode()
    original='validated=self._validate_provider_output(raw,state,evidence,context,text,importance,plan,resolution)'
    replacement='validated=self._validate_with_scene_repair(raw,state,evidence,context,text,importance,plan,resolution,provider_state)'
    if original not in engine and replacement not in engine: raise RuntimeError('Unknown narrative validation call')
    engine=engine.replace(original,replacement)
    if '    def _validate_with_scene_repair(' not in engine:
        idx=engine.index('    def _validate_provider_output(')
        engine=engine[:idx]+SCENE_REPAIR+engine[idx:]
    entries[name]=engine.encode()
    # Keep wheel RECORD hashes valid after the source edit.
    import hashlib,base64,csv
    rec=next(n for n in entries if n.endswith('.dist-info/RECORD'))
    out=io.StringIO();writer=csv.writer(out,lineterminator='\n')
    for n,b in entries.items():
        writer.writerow([n,('sha256='+base64.urlsafe_b64encode(hashlib.sha256(b).digest()).decode().rstrip('=')) if n!=rec else '',len(b) if n!=rec else ''])
    entries[rec]=out.getvalue().encode()
    with zipfile.ZipFile(wheel,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in entries.items():z.writestr(n,b)

NATIVE_ROSTER = r'''
    fun listCharacters(): JSONObject = synchronized(canonicalTurnLock) {
        val rows = runBlocking(Dispatchers.IO) { characters.list() }
        val items = JSONArray()
        rows.forEach { row ->
            val c = JSONObject(row.characterJson)
            if (!c.optBoolean("deleted", false)) items.put(c)
        }
        JSONObject().put("ok", true).put("characters", items)
    }

    fun deleteCharacter(characterId: String): JSONObject = synchronized(canonicalTurnLock) {
        require(!storedCharacter(characterId).isNullOrBlank()) { "Personagem inexistente" }
        val next = runBlocking(Dispatchers.IO) { characters.list() }.firstOrNull { it.characterId != characterId }?.characterId
        val requestId = "delete-character-${UUID.randomUUID()}"
        val effects = JSONArray()
            .put(JSONObject().put("type", "player_state_set").put("path", "characters.${canonicalCharacterKey(characterId)}")
                .put("value", JSONObject().put("characterId", characterId).put("deleted", true)))
        if (activeCharacterId() == characterId) effects.put(JSONObject().put("type", "player_state_set").put("path", "activeCharacterId").put("value", next ?: JSONObject.NULL))
        canonicalTurn(JSONObject().put("text", "Excluir ficha canônica").put("request_id", requestId)
            .put("mechanical", true).put("input_channel", "GM_HELP").put("defer_narrative", true)
            .put("resolution", canonicalResolution(requestId, "character_state", "delete_character", "committed", JSONArray().put("barbara://cyberpunk-red/character/v1"), effects)))
        runBlocking(Dispatchers.IO) { characters.delete(characterId) }
        if (activeCharacterId() == characterId) prefs.edit().apply { if(next == null) remove("activeCharacterId") else putString("activeCharacterId", next) }.commit()
        JSONObject().put("ok", true).put("characterId", characterId)
    }

'''

SCENE_REPAIR = '''    def _validate_with_scene_repair(self,raw,state,evidence,context,text,importance,plan,resolution,provider_state):
        try:
            return self._validate_provider_output(raw,state,evidence,context,text,importance,plan,resolution)
        except ValueError as error:
            if str(error) != 'cena_sem_abertura_para_decisao' or not getattr(self.provider,'enforce_story_contract',False):
                raise
            # Presentation-only retry. Reuse the same authorized context and snapshot;
            # do not execute another turn or duplicate time, rewards, dice or effects.
            instruction = "\\n\\nA resposta anterior não deixou uma abertura explícita para a ação. Reescreva a mesma cena a partir dos fatos autorizados, preservando o jogador como autor da decisão. Encerre a narração com uma pergunta contextual, como O que você faz? Não avance o mundo nem invente consequências."
            repaired = self.provider.generate(text[:19000]+instruction,context,provider_state)
            return self._validate_provider_output(repaired,state,evidence,context,text,importance,plan,resolution)

'''
