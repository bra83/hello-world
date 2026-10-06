/* Deterministic reusable registry for Elflines Online Expansion Pack 1.
 * This is source content, not an adventure railroad. Hooks are discoverable seeds only.
 */
const freezeRows=rows=>Object.freeze(rows.map(x=>Object.freeze(x)));
export const ELO_EP1_VERSION=1;
export const ELO_EP1_NIGHT_CITY_PLAYERS=freezeRows([
{id:1,name:'Minnie',kind:'REAL_PLAYER',hook:'upscale restaurant waitress; hardcore raider; rival-Elfline tension'},
{id:2,name:'Tony',kind:'REAL_PLAYER',hook:'retired grandfather; plays with grandchildren and grinds at night'},
{id:3,name:'Hayabusa',kind:'REAL_PLAYER',hook:'retired sharpshooter; ELO raiding echoes former corporate raids'},
{id:4,name:'Ami',kind:'REAL_PLAYER',hook:'moe-aesthetic poserganger; growing ELO obsession strains gang ties'},
{id:5,name:'Ben',kind:'REAL_PLAYER',hook:'awkward teenager; strong ELO player seeking genuine acceptance'},
{id:6,name:'Mountain',kind:'REAL_PLAYER',hook:'medical-clinic orderly; plays ELO with an RN friend'},
{id:7,name:'Edna / Granny Ed',kind:'REAL_PLAYER',hook:'popular Garden influencer; newbie guide and skilled anti-PKer'},
{id:8,name:'John Doe / The Man with No Past',kind:'REAL_PLAYER',hook:'Tech/freelancer; multiboxer; identity-information hook at Segotari'},
{id:9,name:'Lapin and Kirk',kind:'REAL_PLAYER_PAIR',hook:'newlyweds and Sweetheart Bandits; robberies finance ELO binges'},
{id:10,name:'Dallas',kind:'REAL_PLAYER',hook:'competitive PvP player; virtual hits; targeted by offline PK'}
]);
export const ELO_EP1_SERVER_PCS=freezeRows([
{id:1,name:'Nyx',kind:'ELO_PC',title:'Bladedancer',hook:'obnoxious PKer; real-world retaliation bounty exists'},
{id:2,name:'Bur',kind:'ELO_PC',title:'Wayfarer aspirant',hook:'Rank 2 noob trapped in Razorfire Caverns; optional escort seed'},
{id:3,name:'Wormwood',kind:'ELO_PC',title:'Bowmaster',hook:'veteran leading a newbie-friendly Elfline and dungeon escorts'},
{id:4,name:'Tira',kind:'ELO_PC',hook:'resource gatherer and legitimate virtual entrepreneur'},
{id:5,name:'Salmistra, Mistress of the Winds',kind:'ELO_PC',hook:'exclusive roleplay Elfline leader; hunts cosmetic imitators'},
{id:6,name:'Jinx',kind:'ELO_PC',title:'Barkshield',hook:'poor raid leader constantly recruiting replacements'},
{id:7,name:'Moonshadow',kind:'ELO_PC',title:'Warmheart',hook:'high-value healer caught between rival Elflines'},
{id:8,name:'Sorrel',kind:'ELO_PC',title:'Druid',hook:'casual, patient and newbie-friendly raid companion'},
{id:9,name:'xxBlackrockxx',kind:'ELO_PC',title:'Wildblood',hook:'extreme damage specialist; strong output with aggro/teamplay risk'},
{id:10,name:'Lunchbox / Ameryssian',kind:'ELO_PC',title:'Quickhand',hook:'freelance raid tank with famous enhanced plate armor'}
]);
export function getEp1Entry(table,id){const rows=table==='real'?ELO_EP1_NIGHT_CITY_PLAYERS:table==='elo'?ELO_EP1_SERVER_PCS:null;if(!rows)throw new Error('unknown EP1 table');const entry=rows.find(x=>x.id===Number(id));if(!entry)throw new Error('EP1 entry not found');return entry}
export function selectEp1Entry(table,roll){const n=Number(roll);if(!Number.isInteger(n)||n<1||n>10)throw new Error('EP1 d10 result must be 1..10');return getEp1Entry(table,n)}
export function buildEp1AiContext({knownRealIds=[],knownEloIds=[]}={}){const real=new Set(knownRealIds.map(Number)),elo=new Set(knownEloIds.map(Number));return Object.freeze({source:'ELFLINES_ONLINE_EP1',readOnly:true,knownRealPlayers:ELO_EP1_NIGHT_CITY_PLAYERS.filter(x=>real.has(x.id)),knownEloPcs:ELO_EP1_SERVER_PCS.filter(x=>elo.has(x.id)),authority:'REGISTRY_ONLY',forbidden:['invent_identity','invent_stats','mutate_state','force_hook','decide_player_choices','fabricate_rolls']})}
