from pathlib import Path
import base64,csv,hashlib,io,sys,zipfile

def one(s,a,b):
    if s.count(a)!=1:raise RuntimeError('Unsupported source: '+a[:100])
    return s.replace(a,b,1)

def apply(root):
    root=Path(root);here=Path(__file__).parent;wheel=root/'app/wheels/motor_barbara-1.1.2-py3-none-any.whl'
    with zipfile.ZipFile(wheel) as z:f={n:z.read(n) for n in z.namelist()}
    s=f['barbara/opening_contract.py'].decode().replace('import hashlib,json,re','import hashlib,json,re,unicodedata').replace("'narrative_meta_language','opening_repetitive'","'opening_repetitive'");start=s.index('def validate_complete(');end=s.index('\ndef repairable(',start)
    s=s[:start]+(here/'python/presentation_policy.py').read_text()+s[end:]
    f['barbara/opening_contract.py']=s.encode()
    s=f['barbara/engine.py'].decode()
    s=one(s,"        if len(narration)<self.narrative.minimum_acceptable_chars(importance):", "        from .opening_contract import advisory_style\n        advisory=advisory_style(state,plan)\n        if not advisory and len(narration)<self.narrative.minimum_acceptable_chars(importance):")
    s=one(s,"self.narrative.validate_response_coverage(user_text,narration); self.narrative.validate_scene_ending(narration,importance)","self.narrative.validate_response_coverage(user_text,narration)\n            if not advisory:self.narrative.validate_scene_ending(narration,importance)")
    s=one(s,"if getattr(self.provider,'enforce_story_contract',False):self.narrative.validate_story_obligation", "if not advisory and getattr(self.provider,'enforce_story_contract',False):self.narrative.validate_story_obligation")
    s=one(s,"if isinstance(obligation,dict) and self.strict_world_introductions:","if not advisory and isinstance(obligation,dict) and self.strict_world_introductions:")
    s=one(s,'        claims=self.grounding.validate(claims,state,evidence,self.world.visible_rumors(state),public_context=context)',"        if advisory:\n            # Only coverage is a presentation hint. Never prefer a second, unvalidated\n            # narration hidden inside this dictionary over the validated scene.\n            presentation={'coverage':presentation.get('coverage',[])}\n        claims=self.grounding.validate(claims,state,evidence,self.world.visible_rumors(state),public_context=context)")
    s=one(s,'Se a ocasião é campaign_opening, escreva de 5.000 a 6.000 caracteres, no mínimo 5.000, em pelo menos oito parágrafos substanciais e diferentes.','Para campaign_opening, busque cerca de 5.000 a 6.000 caracteres em 8 a 12 parágrafos substanciais e diferentes, sem transformar tamanho em motivo para outra chamada.')
    f['barbara/engine.py']=s.encode()
    s=f['barbara/pipeline.py'].decode();s=s.replace("        occasion=(result.get('turn_plan') or {}).get('story_obligation','continuation')", "        occasion=(result.get('turn_plan') or {}).get('story_obligation','continuation')\n        from .opening_contract import advisory_style,assess_style\n        advisory=advisory_style(state,result.get('turn_plan'))",1)
    a=s.index('                self.consistency.validate_depth(',s.index('    def _finalize_narration'));b=s.index("                self.continuity.validate",a)
    block=s[a:b];s=s[:a]+"                if not advisory:\n"+''.join('    '+line+'\n' for line in block.rstrip().split('\n'))+s[b:]
    s=one(s,'                self.narrative_policy.validate_story_obligation(narration,occasion)', '                if not advisory:self.narrative_policy.validate_story_obligation(narration,occasion)')
    s=one(s,"                if getattr(self.engine,'strict_world_introductions',False) and self.world_intro_validator is not None and isinstance(obligation,dict):", "                if not advisory and getattr(self.engine,'strict_world_introductions',False) and self.world_intro_validator is not None and isinstance(obligation,dict):")
    s=one(s,"                quality = self.quality.inspect(narration)", "                quality = self.quality.inspect(narration)\n                if advisory:quality.update(assess_style(narration,result.get('turn_plan') or {}))")
    f['barbara/pipeline.py']=s.encode()
    s=f['barbara/gemini.py'].decode();s=one(s,'its target_chars, minimum_paragraphs and required_coverage are mandatory engine constraints.', 'its target_chars and minimum_paragraphs guide narrative depth, not mechanical validity. Cover supported sections naturally; never invent missing facts to fill a checklist.')
    s=one(s,'For meaningful or climax scenes, end narration with an explicit contextual invitation to the player, using O que você faz? or Como você reage? in PT-BR; never select the action for them.', 'Leave a concrete decision available to the player. Do not end every scene with a formulaic question; never select the action for them.')
    s=one(s,'A campaign_opening needs 5,000–6,000 characters, at least 5,000, in eight or more substantial distinct paragraphs.', 'For campaign_opening, aim for approximately 5,000–6,000 characters in 8–12 substantial, distinct paragraphs. Review Portuguese, agency, continuity and concrete playability silently before returning this single response. Do not ask for another refinement request.')
    f['barbara/gemini.py']=s.encode()
    rec=next(n for n in f if n.endswith('.dist-info/RECORD'));buf=io.StringIO();w=csv.writer(buf,lineterminator='\n')
    for n,b in f.items():w.writerow([n,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(b).digest()).decode().rstrip('=') if n!=rec else '',len(b) if n!=rec else ''])
    f[rec]=buf.getvalue().encode()
    with zipfile.ZipFile(wheel,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in f.items():z.writestr(n,b)
    app=root/'app/src/main/assets/web/app';p=app/'sheets.js';s=p.read_text();s=one(s,'Escreva uma abertura de 5.000 a 6.000 caracteres, no mínimo 5.000, em pelo menos oito parágrafos substanciais e distintos.', 'Busque uma abertura de aproximadamente 5.000 a 6.000 caracteres em 8 a 12 parágrafos substanciais e distintos. Revise a cena nesta única resposta, sem solicitar uma chamada adicional de refinamento.')
    s=one(s,'Exiba apenas a abertura que cumpra todo o contrato narrativo; enriquecimento visual/TTS vem depois.', 'Entregue a primeira cena válida; enriquecimento visual/TTS vem depois.')
    if s.count("        if(cleanRemote.length<5000)throw new Error('opening_narration_too_short');")!=2:raise RuntimeError('Missing UI length gates')
    s=s.replace("        if(cleanRemote.length<5000)throw new Error('opening_narration_too_short');\n",'')
    old="return 'A abertura ainda não atingiu o padrão de 5.000–6.000 caracteres com uma cena completa, mesmo após a correção automática. Ela continua pendente; a campanha foi preservada. Peça ao Mestre para apresentar a cena atual, sem reiniciar a aventura.';"
    s=one(s,old,"return 'A tentativa anterior foi interrompida pelo controle de qualidade antigo. A campanha está preservada. Envie uma ação ou peça a apresentação da cena atual; a extensão do texto não bloqueia mais uma resposta válida.';")
    p.write_text(s)
    p=root/'app/build.gradle.kts';p.write_text(one(one(p.read_text(),'versionCode = 4178','versionCode = 4179'),'versionName = "4.1.78"','versionName = "4.1.79"'))
    p=app/'index.html';p.write_text(p.read_text().replace('build=4178','build=4179'))
    print('Applied R5.79: Forbidden Lands presentation pattern; first valid scene retained; advisory style and protected canonical state')
if __name__=='__main__':apply(sys.argv[1])
