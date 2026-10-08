import test from 'node:test';
import assert from 'node:assert/strict';
import {CyberpunkAdventureController} from '../runtime/cyberpunk_adventure_controller_v2.js';
test('v2 narrator context hides GM-only information and preserves public state',()=>{
 const c=new CyberpunkAdventureController({getCharacter:()=>({campaignState:{worldSystems:{}}})});
 c.runtime=()=>({buildAiContext:()=>({currentScene:{id:'public'},gmKnowledge:{unrevealedSecrets:[{information:'sealed-test-marker'}]}}),
 contextBuilder:{toPromptFragment:ctx=>JSON.stringify(ctx)}});
 const ctx=c.buildContextObject();
 assert.equal(ctx.currentScene.id,'public');
 assert.equal('gmKnowledge' in ctx,false);
 assert.equal(c.buildContextText().includes('sealed-test-marker'),false);
});
