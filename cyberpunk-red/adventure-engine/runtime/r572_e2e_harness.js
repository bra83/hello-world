// R5.72 End-to-End Real Host & Emulator Verification Harness
// Executes against live BarbaraRuntime (SQLite/Room + Android Keystore + WebView)
export async function runR572EmulatorE2E({
  mode,
  bridge,
  getCharacter,
  setCharacter,
  validateCharacter,
  workbench,
  singleShotApi,
  adventureImportApi,
  updaterApi
}) {
  if (!mode) return null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Wait for workbench and atlas initialization
  for (let i = 0; i < 40; i++) {
    if (workbench?.adventureController?.ready && workbench?.atlas?.poiCatalog?.length) break;
    await sleep(150);
  }

  if (mode === 'phase1') {
    const report = { phase: 'phase1', ok: false, steps: {} };
    try {
      // 1. Verify all 10 Single Shot Pack playable characters & load Mover (ssp_pregen_03)
      const allPregens = singleShotApi.listPregens();
      if (allPregens.length !== 10 || !allPregens.every((p) => p.imageVerified === true && p.playable === true)) {
        throw new Error('SINGLE_SHOT_PREGENS_NOT_ALL_VERIFIED');
      }
      const netArch6 = singleShotApi.getNetArchitecture('ssp_net_arch_06');
      const loadOut = await singleShotApi.loadPregen('ssp_pregen_03');
      const c = getCharacter();
      const validation = validateCharacter(c);
      if (!validation.ok) {
        throw new Error('SINGLE_SHOT_WEB_VALIDATION_FAILED:' + validation.errors.join(','));
      }
      report.steps.singleShot = {
        totalPregens: allPregens.length,
        allImageVerified: true,
        loadedCharacterId: c.characterId,
        loadedName: c.name,
        role: c.role,
        roleRank: c.roleAbilityRank,
        hp: c.derived.hp,
        humanity: `${c.derived.humanity}/${c.derived.maxHumanity}`,
        effectiveEmp: c.derived.currentEmp,
        armorSp: c.combatState?.armor?.bodySp,
        eurobucks: c.economy?.eurobucks,
        netArch6Floors: netArch6.floors.length,
        sheetValid: validation.ok
      };

      // 2. Prove Real Host Storage Rollback on Save Failure after moveCharacter
      const initialPos = {
        atlasId: 'night-city-2045',
        poiCode: 'W1',
        district: 'Watson',
        mode: 'street',
        travelMode: 'walk',
        x: 820,
        y: 640
      };
      const moveInit = await bridge.moveCharacter(c.characterId, initialPos);
      c.worldPosition = moveInit.worldPosition || initialPos;
      await bridge.saveCharacter(c);

      const dbBeforeFail = await bridge.loadCharacter(c.characterId);
      const origSaveFn = workbench.adventureController.saveCharacter;
      let moveHappenedBeforeSaveFail = false;
      workbench.adventureController.saveCharacter = async () => {
        // Verify that at the moment saveCharacter is called, host storage already has the new position
        const midDb = await bridge.loadCharacter(c.characterId);
        moveHappenedBeforeSaveFail = midDb?.worldPosition?.poiCode !== 'W1';
        return { ok: false, error: 'SIMULATED_SAVE_FAILURE_AFTER_MOVE' };
      };

      let saveFailCaught = false;
      try {
        const targetPoi = workbench.atlas.poiCatalog.find((p) => p.code && p.code !== 'W1') || { code: 'A1', position: { x: 0.359645, y: 0.398617 } };
        await workbench.adventureController.start('red_chrome_cargo', {
          mode: 'OFFICIAL_ADVENTURE',
          locationId: targetPoi.code
        });
      } catch (err) {
        const msg = String(err?.message || err);
        saveFailCaught = msg.includes('START_SAVE_CHARACTER_FAILED') || msg.includes('ADVENTURE_SAVE_FAILED');
      } finally {
        workbench.adventureController.saveCharacter = origSaveFn;
      }

      const dbAfterRollback = await bridge.loadCharacter(c.characterId);
      if (!saveFailCaught || !moveHappenedBeforeSaveFail || dbAfterRollback?.worldPosition?.poiCode !== 'W1') {
        throw new Error(
          `HOST_STORAGE_ROLLBACK_FAILED:caught=${saveFailCaught},movedMid=${moveHappenedBeforeSaveFail},afterPoi=${dbAfterRollback?.worldPosition?.poiCode}`
        );
      }
      report.steps.atlasHostRollback = {
        saveFailCaught,
        movePersistedBeforeFailure: moveHappenedBeforeSaveFail,
        dbPoiBeforeAttempt: dbBeforeFail?.worldPosition?.poiCode,
        dbPoiAfterRollback: dbAfterRollback?.worldPosition?.poiCode,
        dbCoordsAfterRollback: { x: dbAfterRollback?.worldPosition?.x, y: dbAfterRollback?.worldPosition?.y },
        memoryAdventureStateAfterRollback: c.campaignState?.adventureState || null
      };

      // 3. Import JSON Adventure (braseiro.adventure/v1), verify untrusted envelope, complete & preserve legacy (braseiro.legacy/v1)
      const targetPoi = workbench.atlas.poiCatalog.find((p) => p.code && p.code !== 'W1') || { code: 'H2', position: { x: 1420, y: 1880 }, district: 'Heywood' };
      const customAdvJson = JSON.stringify({
        format: 'braseiro.adventure/v1',
        id: 'kabuki_biochip_heist',
        systemId: 'cyberpunk-red',
        title: 'Roubo do Biochip em Kabuki',
        summary: 'Infiltrar o entreposto clandestino em Kabuki e extrair o protótipo neural.',
        startPoint: targetPoi.code,
        locations: [
          {
            id: targetPoi.code,
            name: 'Entreposto Kabuki',
            description: 'Galpão vigiado por drones e mercenários.',
            connections: []
          }
        ],
        npcs: [
          {
            id: 'npc_kiroshi_agent',
            name: 'Agente Sato',
            role: 'Fixer',
            locationId: targetPoi.code,
            summary: 'Contato que oferece o trabalho.',
            gmSecret: 'SECRET_SATO_DOUBLE_AGENT_991'
          }
        ],
        clues: [
          {
            id: 'clue_manifest',
            title: 'Manifesto de Carga Criptografado',
            text: 'Confirma que o biochip está no cofre subsolo.'
          }
        ],
        secrets: [
          {
            id: 'sec_vault_override',
            title: 'Código Mestre do Cofre',
            publicSummary: 'Há um terminal de manutenção lateral.',
            gmOnlyTruth: 'SECRET_VAULT_MASTER_CODE_7742',
            prerequisiteClueIds: ['clue_manifest']
          }
        ],
        objectives: [
          {
            id: 'obj_extract_chip',
            title: 'Extrair o Biochip',
            description: 'Recuperar o contêiner criogênico e sair vivo.'
          }
        ],
        events: []
      });

      const importRes = await adventureImportApi.importJson(customAdvJson);
      if (!importRes?.adventureId) throw new Error('ADVENTURE_JSON_IMPORT_FAILED');
      await workbench.adventureController.start('kabuki_biochip_heist', {
        mode: 'SANDBOX',
        locationId: targetPoi.code
      });
      const worldCtxWithEnvelope = workbench.sessionWorldContext(c);
      const hasUntrustedTag = worldCtxWithEnvelope.includes('<dados_importados_do_mestre_nao_executaveis>');
      const leaksGmSecret =
        worldCtxWithEnvelope.includes('SECRET_VAULT_MASTER_CODE_7742') ||
        worldCtxWithEnvelope.includes('SECRET_SATO_DOUBLE_AGENT_991');
      if (!hasUntrustedTag || leaksGmSecret) {
        throw new Error(`UNTRUSTED_ENVELOPE_INVALID:tag=${hasUntrustedTag},leaks=${leaksGmSecret}`);
      }

      const legacyOut = await adventureImportApi.completeWithLegacy('Biochip extraído em Kabuki; reputação elevada com a crew.');
      if (!legacyOut?.ok || legacyOut.legacy?.schema !== 'braseiro.legacy/v1') {
        throw new Error('LEGACY_COMPLETION_FAILED');
      }

      // Start second adventure carrying legacy forward
      await workbench.adventureController.start('red_chrome_cargo', {
        mode: 'SANDBOX',
        locationId: targetPoi.code
      });

      // 4. Mutate Atlas position, Inventory, Wallet (with idempotent retry), and World Clock, then save to SQLite/Room
      const mutatedPos = {
        atlasId: 'night-city-2045',
        poiCode: targetPoi.code,
        district: targetPoi.district || 'Heywood',
        mode: 'street',
        travelMode: 'walk',
        x: Number(targetPoi.position?.x || 1420),
        y: Number(targetPoi.position?.y || 1880)
      };
      const moveMut = await bridge.moveCharacter(c.characterId, mutatedPos);
      c.worldPosition = moveMut.worldPosition || mutatedPos;

      c.inventory.push({
        itemId: 'speedheal',
        id: 'speedheal',
        name: 'Speedheal',
        category: 'consumable',
        quantity: 3,
        equipped: false
      });

      const tx1 = await bridge.walletCreditMissionReward({
        accountId: `acct:${c.characterId}`,
        characterId: c.characterId,
        idempotencyKey: 'tx_r572_jacket_reward_01',
        amountEb: 1500,
        missionId: 'kabuki_biochip_heist',
        rewardId: 'kabuki_biochip_reward'
      });
      const tx2 = await bridge.walletCreditMissionReward({
        accountId: `acct:${c.characterId}`,
        characterId: c.characterId,
        idempotencyKey: 'tx_r572_jacket_reward_01',
        amountEb: 1500,
        missionId: 'kabuki_biochip_heist',
        rewardId: 'kabuki_biochip_reward'
      });
      if (!tx1?.ok || !tx2?.ok || Boolean(tx1.replayed) !== false || tx2.replayed !== true || tx1.balanceAfterEb !== tx2.balanceAfterEb) {
        throw new Error(`WALLET_IDEMPOTENCY_FAILED:${JSON.stringify({ tx1, tx2 })}`);
      }
      c.economy.eurobucks = tx2.balanceAfterEb;
      c.eurobucks = tx2.balanceAfterEb;

      const worldAdv = await bridge.verifyWorldTimeAdvance({
        characterId: c.characterId,
        days: 2,
        reason: 'Deslocamento e operação em Kabuki/Heywood'
      });
      if (!worldAdv?.ok || !worldAdv?.resolved) {
        throw new Error('WORLD_TIME_ADVANCE_FAILED');
      }
      c.campaignState.worldClock = c.campaignState.worldClock || {};
      c.campaignState.worldClock.day = worldAdv.currentDay;
      c.campaignState.worldClock.elapsedMinutes = Number(c.campaignState.worldClock.elapsedMinutes || 0) + 2880;

      const finalSave = await bridge.saveCharacter(c);
      if (!finalSave?.ok || !finalSave?.resolved) {
        throw new Error('FINAL_CHARACTER_SAVE_FAILED');
      }

      report.steps.mutatedStateSaved = {
        characterId: c.characterId,
        name: c.name,
        activeAdventureId: c.campaignState?.adventureState?.adventureId,
        completedAdventuresInLegacy: (c.campaignState?.braseiroLegacy?.completedAdventures || c.continuityLegacy?.completedAdventures || []).map((a) => a?.adventureId || a),
        worldPosition: { poiCode: c.worldPosition.poiCode, x: c.worldPosition.x, y: c.worldPosition.y },
        inventoryCount: c.inventory.length,
        speedhealQty: c.inventory.find((i) => i.itemId === 'speedheal')?.quantity,
        walletEurobucks: c.economy.eurobucks,
        walletTxIdempotentReplay: tx2.replayed === true,
        worldClockElapsedMinutes: c.campaignState.worldClock.elapsedMinutes,
        stateVersion: c.stateVersion
      };

      // 5. TTS Universal V3 + Kokoro persistence and execution
      const voice = globalThis.MotorBarbaraCore?.voice;
      const ttsSave = await voice.saveSettings({
        textModel: 'gemini-3.8-flash',
        ttsModel: 'gemini-3.8-flash-tts',
        voice: 'Fenrir',
        language: 'pt-BR',
        ttsEngine: 'kokoro',
        androidEnginePackage: 'com.k2fsa.sherpa.onnx.tts.engine',
        voiceStyle: 'Noir cyberpunk tenso e cinematográfico',
        voiceProfile: 'Mestre veterano de Night City',
        ttsSpeed: 1.25,
        vocalMode: 'distinct-voices',
        stripVocalTags: true
      });
      const ttsSpeak = await voice.speak({
        text: '[sussurro] Mover observa o comboio da Red Chrome sob a chuva ácida.',
        engine: 'kokoro',
        ttsSpeed: 1.25,
        stripVocalTags: true
      });
      const ttsCfg = await voice.settings();
      report.steps.ttsUniversalV3 = {
        savedOk: ttsSave?.ok === true,
        speakOk: ttsSpeak?.ok !== false,
        ttsEngine: ttsCfg.ttsEngine,
        ttsModel: ttsCfg.ttsModel,
        voice: ttsCfg.voice,
        ttsSpeed: ttsCfg.ttsSpeed,
        vocalMode: ttsCfg.vocalMode,
        stripVocalTags: ttsCfg.stripVocalTags,
        voiceStyle: ttsCfg.voiceStyle,
        voiceProfile: ttsCfg.voiceProfile,
        installedEnginesCount: (ttsCfg.installedEngines || []).length
      };

      // 6. In-App Updater (braseiro.update/v1): reject bad SHA-256, apply valid package, rollback, and re-apply
      const badPkg = await updaterApi.apply({
        format: 'braseiro.update/v1',
        systemId: 'cyberpunk-red',
        updateId: 'upd_bad_sha',
        versionName: '4.1.72-bad',
        minVersionCode: 4100,
        maxVersionCode: 4200,
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        files: { 'web/app/ota_marker.json': '{"ota":"4.1.72-ota.1","verified":true}' }
      });
      const computedSha = badPkg?.computedSha256 || '';
      const goodPkgWithHash = {
        format: 'braseiro.update/v1',
        systemId: 'cyberpunk-red',
        updateId: 'upd_r572_ota_1',
        versionName: '4.1.72-ota.1',
        minVersionCode: 4100,
        maxVersionCode: 4200,
        sha256: computedSha,
        files: { 'web/app/ota_marker.json': '{"ota":"4.1.72-ota.1","verified":true}' }
      };

      const applyRes1 = await updaterApi.apply(goodPkgWithHash);
      const rollbackRes = await updaterApi.rollback();
      const applyRes2 = await updaterApi.apply(goodPkgWithHash);
      const dbAfterUpdate = await bridge.loadCharacter(c.characterId);

      if (badPkg?.ok !== false || !applyRes1?.ok || !rollbackRes?.ok || !applyRes2?.ok || dbAfterUpdate?.economy?.eurobucks !== 2000) {
        throw new Error(`UPDATER_VERIFICATION_FAILED:${JSON.stringify({ badPkg, applyRes1, rollbackRes, applyRes2 })}`);
      }
      report.steps.inAppUpdater = {
        badShaRejected: badPkg.error === 'UPDATE_SHA256_MISMATCH',
        appliedVersion: applyRes2.activeUpdate?.versionName || applyRes2.appliedVersion || '4.1.72-ota.1',
        sha256Verified: applyRes2.sha256,
        rollbackTestedOk: rollbackRes.ok === true,
        savesPreservedAfterUpdateAndRollback: dbAfterUpdate?.economy?.eurobucks === 2000
      };

      report.ok = true;
      console.log('CPRED_R572_E2E_PHASE1_PASS:' + JSON.stringify(report));
      return report;
    } catch (err) {
      report.error = String(err?.message || err);
      console.error('CPRED_R572_E2E_PHASE1_FAIL:' + JSON.stringify(report));
      return report;
    }
  }

  if (mode === 'phase2') {
    // Wait a moment for restoreActiveCharacterOnBoot() to finish
    await sleep(600);
    const report = { phase: 'phase2', ok: false, restored: {} };
    try {
      const c = getCharacter();
      const dbChar = await bridge.loadCharacter(c?.characterId || null);
      const txLookup = await bridge.walletGetTransaction({ idempotencyKey: 'tx_r572_jacket_reward_01' });
      const voiceCfg = await globalThis.MotorBarbaraCore?.voice?.settings?.();
      const updStatus = await updaterApi.status();

      const legacyObj = c?.campaignState?.braseiroLegacy || c?.continuityLegacy || c?.campaignState?.continuityLegacy || null;
      const activeUpdVersion = updStatus?.activeUpdate?.versionName || updStatus?.activeManifest?.version || null;
      const checks = {
        characterRestored: c?.characterId === 'char_ssp_pregen_03' && c?.name === 'Mover',
        adventureRestored: c?.campaignState?.adventureState?.adventureId === 'red_chrome_cargo',
        legacyPreserved:
          (legacyObj?.schema === 'braseiro.legacy/v1' || legacyObj?.format === 'braseiro.legacy/v1') &&
          (legacyObj?.completedAdventures || []).some((a) => (a?.adventureId || a) === 'kabuki_biochip_heist'),
        positionRestored: Boolean(c?.worldPosition?.poiCode && c?.worldPosition?.poiCode !== 'W1' && Number.isFinite(Number(c?.worldPosition?.x))),
        inventoryRestored: c?.inventory?.some((i) => i.itemId === 'speedheal' && Number(i.quantity) === 3),
        walletRestored: Number(c?.economy?.eurobucks) === 2000 && txLookup?.found === true && Number(txLookup?.amountEb ?? txLookup?.transaction?.amount) === 1500,
        worldClockRestored: Number(c?.campaignState?.worldClock?.elapsedMinutes) >= 180,
        ttsSettingsRestored:
          voiceCfg?.ttsEngine === 'kokoro' &&
          voiceCfg?.ttsModel === 'gemini-3.8-flash-tts' &&
          voiceCfg?.voice === 'Fenrir' &&
          Number(voiceCfg?.ttsSpeed) === 1.25 &&
          Boolean(voiceCfg?.voiceStyle) &&
          Boolean(voiceCfg?.voiceProfile),
        updaterActiveRestored: activeUpdVersion === '4.1.72-ota.1'
      };

      report.restored = {
        checks,
        characterId: c?.characterId,
        name: c?.name,
        role: c?.role,
        activeAdventureId: c?.campaignState?.adventureState?.adventureId,
        legacyCompletedAdventures: (legacyObj?.completedAdventures || []).map((a) => a?.adventureId || a),
        worldPosition: { poiCode: c?.worldPosition?.poiCode, x: c?.worldPosition?.x, y: c?.worldPosition?.y },
        speedhealQty: c?.inventory?.find((i) => i.itemId === 'speedheal')?.quantity,
        walletEurobucks: c?.economy?.eurobucks,
        walletTransactionVerified: txLookup,
        worldClockElapsedMinutes: c?.campaignState?.worldClock?.elapsedMinutes,
        stateVersion: dbChar?.stateVersion,
        ttsEngine: voiceCfg?.ttsEngine,
        ttsModel: voiceCfg?.ttsModel,
        voice: voiceCfg?.voice,
        ttsSpeed: voiceCfg?.ttsSpeed,
        updaterActiveVersion: activeUpdVersion
      };

      if (!Object.values(checks).every(Boolean)) {
        throw new Error('PHASE2_RESTORE_MISMATCH:' + JSON.stringify(checks));
      }
      report.ok = true;
      console.log('CPRED_R572_E2E_PHASE2_PASS:' + JSON.stringify(report));
      return report;
    } catch (err) {
      report.error = String(err?.message || err);
      console.error('CPRED_R572_E2E_PHASE2_FAIL:' + JSON.stringify(report));
      return report;
    }
  }
  return null;
}
