from pathlib import Path
import argparse, base64, csv, hashlib, io, zipfile


def replace_once(text, before, after):
    if before not in text:
        if after in text: return text
        raise RuntimeError('Unsupported source: '+before[:80])
    return text.replace(before,after,1)


def apply(root):
    root=Path(root)
    wheel=root/'app/wheels/motor_barbara-1.1.2-py3-none-any.whl'
    with zipfile.ZipFile(wheel) as z: files={n:z.read(n) for n in z.namelist()}
    files['barbara/state_budget.py']=(Path(__file__).parent/'python/state_budget.py').read_bytes()
    s=files['barbara/state.py'].decode()
    s=replace_once(s,'    def validate(self):\n','    def validate(self):\n        from .state_budget import compact_request_journal\n        compact_request_journal(self.request_log)\n')
    files['barbara/state.py']=s.encode()
    s=files['barbara/engine.py'].decode()
    before='def _fingerprint(self,state,text,mechanical,importance,resolution,input_channel=None,defer_narrative=False):return [state.campaign_id,state.system_id,text,mechanical,importance,deepcopy(resolution),input_channel,bool(defer_narrative)]'
    after='def _fingerprint(self,state,text,mechanical,importance,resolution,input_channel=None,defer_narrative=False):\n        from .state_budget import normalize_fingerprint\n        return normalize_fingerprint([state.campaign_id,state.system_id,text,mechanical,importance,deepcopy(resolution),input_channel,bool(defer_narrative)])'
    s=replace_once(s,before,after);files['barbara/engine.py']=s.encode()
    s=files['barbara/state_store.py'].decode()
    start=s.index('    def load(self, campaign_id: str) -> CampaignState:')
    end=s.index('    def load_contract(',start)
    s=s[:start]+'''    def load(self, campaign_id: str) -> CampaignState:
        from .state_budget import load_compacted
        return load_compacted(self, campaign_id)

'''+s[end:]
    s=replace_once(s,'        events=[]\n        for seq,count,sha,payload in rows:', '        events=[]\n        for seq,count,sha,payload in rows:')  # retained archive integrity checks
    # Loading can archive a prefix, so fetch archive rows after loading the live tail.
    s=replace_once(s,"            rows=self._db.execute('SELECT seq,event_count,sha256,payload FROM event_archives WHERE campaign_id=? ORDER BY seq',(campaign_id,)).fetchall()\n            state=self.load(campaign_id)","            state=self.load(campaign_id)\n            rows=self._db.execute('SELECT seq,event_count,sha256,payload FROM event_archives WHERE campaign_id=? ORDER BY seq',(campaign_id,)).fetchall()")
    s=replace_once(s,'        """Lossless canonical export including durable idempotency receipts."""\n', '        """Lossless canonical export including durable idempotency receipts."""\n        self.load(campaign_id)\n')
    files['barbara/state_store.py']=s.encode()
    rec=next(n for n in files if n.endswith('.dist-info/RECORD'));out=io.StringIO();writer=csv.writer(out,lineterminator='\n')
    for n,b in files.items(): writer.writerow([n,'sha256='+base64.urlsafe_b64encode(hashlib.sha256(b).digest()).decode().rstrip('=') if n!=rec else '',len(b) if n!=rec else ''])
    files[rec]=out.getvalue().encode()
    with zipfile.ZipFile(wheel,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in files.items(): z.writestr(n,b)
    app=root/'app/src/main/assets/web/app'
    s=(app/'sheets.js').read_text(encoding='utf-8-sig')
    # The entire start must be guarded, including persistence BEFORE the provider call.
    before="    const runtime=await this.geminiRuntimeStatus(),selection=this.adventureStartSelection(),module=this.adventureController?.getModule?.(selection.moduleId);"
    s=replace_once(s,before,"    const previousCharacter=structuredClone(c);\n    try {\n"+before)
    before="  async saveSession(c){"
    after='''    } catch(error) {
      // Prefer a durable readback if a prior stage committed before the failure.
      let restored=null;
      try{restored=await this.bridge.loadCharacter(c.characterId)}catch(readError){console.warn('[CPRED_START_READBACK]',readError)}
      const safe=restored||previousCharacter;
      for(const key of Object.keys(c))delete c[key];Object.assign(c,safe);
      const session=this.sessionState(c);
      if(session.narrationSource==='pending'||/GERANDO CENA/.test(session.currentNarration||'')){
        session.narrationSource='error';session.narrativeError=String(error.message||error);session.currentNarration='Não foi possível concluir o salvamento da aventura. A geração da cena foi interrompida; seus dados anteriores foram preservados. Tente novamente.';
      }
      this.setNarrationBadge('local');this.renderCharacter();this.render();
      this.toast('Falha ao salvar a aventura: '+String(error.message||error));
      return {ok:false,error:String(error.message||error)};
    }
  }
  async saveSession(c){'''
    # Remove the old method closing brace, so catch belongs to the outer guard.
    s=replace_once(s,"this.renderCharacter();this.render();\n  }\n  async saveSession(c){", "this.renderCharacter();this.render();\n"+after)
    (app/'sheets.js').write_text(s)
    # Recover the stale pending message left on disk by an older failed start.
    f=app/'app.js';s=f.read_text()
    before='    character=migrateCharacter(saved);'
    after=before+'''
    const session=character.campaignState?.session;
    if(session?.narrationSource==='pending'){
      session.narrationSource='interrupted';session.currentNarration='A geração anterior foi interrompida. Sua ficha foi restaurada. Use Continuar ou envie sua ação para retomar a cena.';
    }'''
    s=replace_once(s,before,after);f.write_text(s)
    f=app/'index.html';s=f.read_text().replace('R5.74','R5.75').replace('build=4174','build=4175');f.write_text(s)
    f=root/'app/build.gradle.kts';s=f.read_text().replace('versionCode = 4174','versionCode = 4175').replace('versionName = "4.1.74"','versionName = "4.1.75"');f.write_text(s)
    print('R5.75 lossless state-budget migration and start failure recovery installed')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('android_root');apply(p.parse_args().android_root)
