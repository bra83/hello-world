import {createWorldClock} from './cpred_world_clock.mjs';
import {cyberwareById} from './cpred_cyberware_catalog.mjs';
import {humanityProfile} from './cpred_humanity.mjs';
import {initialRoleAbilityState,validateRoleAbilityState} from './cpred_role_abilities.mjs';
export const SCHEMA_VERSION = 1;
export const SYSTEM_ID = 'cyberpunk-red';
export const ADAPTER_VERSION = '3.4.0';

export const STATS = ['INT','REF','DEX','TECH','COOL','WILL','LUCK','MOVE','BODY','EMP'];
export const ROLES = [
  ['rockerboy','Rockerboy'],['solo','Solo'],['netrunner','Netrunner'],['tech','Tech'],['medtech','Medtech'],
  ['media','Media'],['lawman','Lawman'],['exec','Exec'],['fixer','Fixer'],['nomad','Nomad']
].map(([id,label])=>({id,label}));

export const ROLE_STAT_TEMPLATES = {
  rockerboy:[[7,6,6,5,6,8,7,7,3,8],[3,7,7,7,7,6,7,7,5,8],[4,5,7,7,6,6,7,7,5,8],[4,5,7,7,6,8,7,6,3,8],[3,7,7,7,6,8,6,5,4,7],[5,6,7,5,7,8,5,7,3,7],[5,6,6,7,7,8,7,6,3,6],[5,7,7,5,6,6,6,6,4,8],[3,5,5,6,7,8,7,5,5,7],[4,5,6,5,8,8,7,6,4,7]],
  solo:[[6,7,7,3,8,6,5,5,6,5],[7,8,6,3,6,6,7,5,6,6],[5,8,7,4,7,7,6,7,8,5],[5,8,6,4,6,7,6,5,7,6],[6,6,7,5,7,6,7,6,8,4],[7,7,6,5,7,6,6,7,7,5],[7,7,6,5,6,7,7,6,6,6],[7,8,7,5,6,6,5,6,8,4],[7,7,6,4,6,6,6,5,6,5],[6,6,8,5,6,6,5,6,6,5]],
  netrunner:[[5,8,7,7,7,4,8,7,7,4],[5,6,7,5,8,3,8,7,5,5],[5,6,8,6,6,4,7,6,7,4],[5,7,7,7,7,5,8,6,5,5],[5,8,8,5,7,3,7,5,5,6],[6,6,6,7,8,4,7,7,6,6],[6,6,6,7,6,5,7,7,7,6],[5,7,8,6,8,4,8,5,7,4],[7,6,7,7,6,3,6,5,6,5],[7,8,6,6,6,4,7,7,5,6]],
  tech:[[6,7,7,8,4,4,5,5,7,6],[7,6,6,7,5,3,7,7,5,5],[8,6,5,7,5,4,7,7,5,7],[7,8,7,8,4,4,6,5,6,7],[6,6,7,6,4,3,7,7,6,6],[8,7,5,6,3,3,7,6,6,7],[8,6,7,8,4,4,7,6,7,6],[8,8,7,8,5,4,6,5,6,6],[6,6,7,8,3,3,5,7,7,7],[8,8,5,6,4,4,6,5,6,6]],
  medtech:[[7,5,6,7,5,3,8,5,5,7],[6,7,7,7,4,4,6,7,7,7],[6,5,5,8,5,3,8,5,7,8],[8,7,6,8,3,5,6,6,5,7],[6,7,5,7,5,5,8,7,6,8],[8,5,5,8,5,5,6,6,5,6],[8,6,5,8,5,4,8,5,7,7],[6,5,7,7,3,5,8,5,5,8],[6,6,7,7,5,4,6,6,5,6],[8,7,6,6,3,4,8,7,6,7]],
  media:[[6,6,5,5,8,7,5,7,5,7],[8,7,7,3,6,6,6,5,6,8],[6,7,7,5,6,8,5,5,5,7],[6,5,7,5,6,7,5,5,6,6],[6,6,7,4,8,7,6,7,5,8],[7,5,5,4,8,7,6,7,5,8],[8,5,6,3,7,6,6,5,6,7],[6,5,6,5,6,8,6,6,7,8],[7,7,5,4,6,7,6,5,6,7],[7,6,6,3,7,6,7,6,7,6]],
  lawman:[[5,6,7,5,7,8,5,6,5,6],[6,6,6,5,6,8,5,7,5,5],[5,7,7,7,6,7,5,5,7,6],[6,6,7,6,6,8,5,7,7,6],[6,6,7,6,7,7,6,5,5,6],[7,6,5,5,7,8,5,6,7,4],[7,8,7,5,6,8,7,6,5,4],[5,6,6,5,6,8,5,7,6,4],[7,7,5,5,7,7,6,5,5,6],[6,6,5,6,8,7,5,7,6,6]],
  exec:[[8,5,5,3,8,6,6,5,5,7],[8,6,6,4,7,6,7,7,5,7],[8,7,6,3,8,6,7,6,4,5],[8,5,7,5,6,5,6,5,5,7],[7,7,6,5,8,5,7,7,5,6],[5,7,7,3,6,7,6,5,5,7],[6,6,7,5,8,7,6,7,4,6],[6,7,7,3,7,5,7,5,5,7],[7,6,7,5,7,5,7,6,5,5],[7,7,5,5,8,6,6,7,4,7]],
  fixer:[[8,5,7,4,6,5,8,5,5,8],[8,5,5,5,6,7,8,7,5,7],[6,6,6,4,5,6,8,6,3,8],[7,7,5,5,7,6,7,7,5,8],[8,6,6,3,6,5,8,7,5,6],[8,7,5,5,6,7,7,5,3,6],[8,6,6,5,6,5,6,7,5,8],[6,6,7,4,7,6,7,7,4,7],[8,7,7,5,5,5,7,6,5,7],[6,5,6,5,5,6,8,6,4,7]],
  nomad:[[6,6,8,3,6,7,6,6,6,4],[5,7,6,5,8,8,8,7,5,4],[5,8,6,3,8,7,6,5,6,5],[5,8,7,4,8,6,7,7,7,5],[6,6,6,3,6,7,6,7,7,4],[7,6,8,4,6,7,6,5,6,5],[6,7,8,4,6,6,7,5,7,5],[5,7,8,3,8,6,7,5,5,5],[6,7,6,4,8,6,6,6,6,6],[5,6,7,4,7,8,7,7,7,4]]
};

const B='BASIC';
export const MASTER_SKILLS = {
  concentration:['Concentração','WILL',1,B], conceal:['Ocultar/Revelar Objeto','INT',1], lipread:['Leitura Labial','INT',1], perception:['Percepção','INT',1,B], tracking:['Rastreamento','INT',1],
  athletics:['Atletismo','DEX',1,B], contortionist:['Contorcionismo','DEX',1], dance:['Dança','DEX',1], endurance:['Resistência','WILL',1], resist:['Resistir Tortura/Drogas','WILL',1], stealth:['Furtividade','DEX',1,B],
  drive_land:['Condução Terrestre','REF',1], pilot_air:['Pilotar Veículo Aéreo','REF',2], pilot_sea:['Pilotar Veículo Marítimo','REF',1], riding:['Montaria','REF',1],
  accounting:['Contabilidade','INT',1], animal:['Lidar com Animais','INT',1], bureaucracy:['Burocracia','INT',1], business:['Negócios','INT',1], composition:['Composição','INT',1], criminology:['Criminologia','INT',1], cryptography:['Criptografia','INT',1], deduction:['Dedução','INT',1], education:['Educação','INT',1,B], gamble:['Jogatina','INT',1], language_street:['Idioma (Streetslang)','INT',1,B], library:['Pesquisa em Biblioteca','INT',1], local_home:['Especialista Local (Seu Bairro)','INT',1,B], science:['Ciência','INT',1], tactics:['Tática','INT',1], wilderness:['Sobrevivência no Ermo','INT',1],
  brawling:['Briga','DEX',1,B], evasion:['Evasão','DEX',1,B], martial:['Artes Marciais','DEX',2], melee:['Arma Corpo a Corpo','DEX',1],
  acting:['Atuação','COOL',1], instrument:['Tocar Instrumento','TECH',1],
  archery:['Arco e Flecha','REF',1], autofire:['Fogo Automático','REF',2], handgun:['Pistolas','REF',1], heavy_weapons:['Armas Pesadas','REF',2], shoulder:['Armas de Ombro','REF',1],
  bribery:['Suborno','COOL',1], conversation:['Conversa','EMP',1,B], human_perception:['Percepção Humana','EMP',1,B], interrogation:['Interrogatório','COOL',1], persuasion:['Persuasão','COOL',1,B], grooming:['Cuidados Pessoais','COOL',1], streetwise:['Manha das Ruas','COOL',1], trading:['Negociação','COOL',1], wardrobe:['Vestuário e Estilo','COOL',1],
  air_tech:['Tecnologia de Veículos Aéreos','TECH',1], basic_tech:['Tecnologia Básica','TECH',1], cybertech:['Cybertech','TECH',1], demolitions:['Demolições','TECH',2], electronics:['Eletrônica/Segurança','TECH',2], first_aid:['Primeiros Socorros','TECH',1,B], forgery:['Falsificação','TECH',1], land_tech:['Tecnologia de Veículos Terrestres','TECH',1], art:['Pintar/Desenhar/Esculpir','TECH',1], paramedic:['Paramédico','TECH',2], photo:['Fotografia/Filme','TECH',1], pick_lock:['Arrombamento','TECH',1], pick_pocket:['Bater Carteira','TECH',1], sea_tech:['Tecnologia de Veículos Marítimos','TECH',1], weaponstech:['Tecnologia de Armas','TECH',1]
};
export const BASIC_SKILLS = Object.entries(MASTER_SKILLS).filter(([,v])=>v[3]===B).map(([k])=>k);

const roleExtra = {
  rockerboy:['composition','handgun','melee','grooming','instrument','streetwise','wardrobe'],
  solo:['autofire','handgun','interrogation','melee','resist','shoulder','tactics'],
  netrunner:['basic_tech','conceal','cryptography','cybertech','electronics','handgun','library'],
  tech:['basic_tech','cybertech','electronics','land_tech','science','weaponstech','shoulder'],
  medtech:['basic_tech','cybertech','deduction','paramedic','resist','science','shoulder'],
  media:['bribery','composition','deduction','handgun','library','lipread','photo'],
  lawman:['autofire','criminology','deduction','handgun','interrogation','shoulder','tracking'],
  exec:['accounting','bureaucracy','business','deduction','handgun','lipread','grooming'],
  fixer:['bribery','business','forgery','handgun','pick_lock','streetwise','trading'],
  nomad:['animal','drive_land','handgun','melee','tracking','trading','wilderness']
};
export const EDGERUNNER_ROLE_SKILLS = Object.fromEntries(Object.entries(roleExtra).map(([r,x])=>[r,[...BASIC_SKILLS,...x]]));

export const STREETRAT_SKILLS = {
  rockerboy:{athletics:2,brawling:6,concentration:2,conversation:2,education:2,evasion:6,first_aid:6,human_perception:6,language_street:2,local_home:4,perception:2,persuasion:6,stealth:2,composition:6,handgun:6,melee:6,grooming:4,instrument:6,streetwise:6,wardrobe:4},
  solo:{athletics:2,brawling:2,concentration:2,conversation:2,education:2,evasion:6,first_aid:6,human_perception:2,language_street:2,local_home:2,perception:6,persuasion:2,stealth:2,autofire:6,handgun:6,interrogation:6,melee:6,resist:6,shoulder:6,tactics:6},
  netrunner:{athletics:2,brawling:2,concentration:2,conversation:2,education:6,evasion:6,first_aid:2,human_perception:2,language_street:2,local_home:2,perception:2,persuasion:2,stealth:6,basic_tech:6,conceal:6,cryptography:6,cybertech:6,electronics:6,handgun:6,library:6},
  tech:{athletics:2,brawling:2,concentration:2,conversation:2,education:6,evasion:6,first_aid:6,human_perception:2,language_street:2,local_home:2,perception:2,persuasion:2,stealth:2,basic_tech:6,cybertech:6,electronics:6,land_tech:6,science:6,weaponstech:6,shoulder:6},
  medtech:{athletics:2,brawling:2,concentration:2,conversation:6,education:6,evasion:6,first_aid:2,human_perception:6,language_street:2,local_home:2,perception:2,persuasion:2,stealth:2,basic_tech:6,cybertech:4,deduction:6,paramedic:6,resist:4,science:6,shoulder:6},
  media:{athletics:2,brawling:2,concentration:2,conversation:6,education:2,evasion:6,first_aid:2,human_perception:6,language_street:2,local_home:6,perception:6,persuasion:6,stealth:2,bribery:6,composition:6,deduction:6,handgun:6,library:4,lipread:4,photo:4},
  lawman:{athletics:2,brawling:6,concentration:2,conversation:6,education:2,evasion:6,first_aid:2,human_perception:2,language_street:2,local_home:2,perception:2,persuasion:2,stealth:2,autofire:6,criminology:6,deduction:6,handgun:6,interrogation:6,shoulder:6,tracking:6},
  exec:{athletics:2,brawling:2,concentration:2,conversation:6,education:6,evasion:6,first_aid:2,human_perception:6,language_street:2,local_home:2,perception:2,persuasion:6,stealth:2,accounting:6,bureaucracy:6,business:6,deduction:6,handgun:6,lipread:6,grooming:4},
  fixer:{athletics:2,brawling:2,concentration:2,conversation:6,education:2,evasion:6,first_aid:2,human_perception:6,language_street:4,local_home:6,perception:2,persuasion:4,stealth:2,bribery:6,business:6,forgery:6,handgun:6,pick_lock:4,streetwise:6,trading:6},
  nomad:{athletics:2,brawling:6,concentration:2,conversation:2,education:2,evasion:6,first_aid:6,human_perception:2,language_street:2,local_home:2,perception:4,persuasion:2,stealth:6,animal:6,drive_land:6,handgun:6,melee:6,tracking:6,trading:6,wilderness:6}
};

const cultures = [
  ['Norte-Americana',['Chinês','Cree','Crioulo','Inglês','Francês','Navajo','Espanhol']],
  ['Sul/Centro-Americana',['Crioulo','Inglês','Alemão','Guarani','Maia','Português','Quechua','Espanhol']],
  ['Europa Ocidental',['Holandês','Inglês','Francês','Alemão','Italiano','Norueguês','Português','Espanhol']],
  ['Europa Oriental',['Inglês','Finlandês','Polonês','Romeno','Russo','Ucraniano']],
  ['Oriente Médio/Norte da África',['Árabe','Berbere','Inglês','Farsi','Francês','Hebraico','Turco']],
  ['África Subsaariana',['Árabe','Inglês','Francês','Hausa','Lingala','Oromo','Português','Suaíli','Twi','Iorubá']],
  ['Sul da Ásia',['Bengali','Dari','Inglês','Hindi','Nepalês','Cingalês','Tâmil','Urdu']],
  ['Sudeste Asiático',['Árabe','Birmanês','Inglês','Filipino','Hindi','Indonésio','Khmer','Malaio','Vietnamita']],
  ['Leste Asiático',['Cantonês','Inglês','Japonês','Coreano','Mandarim','Mongol']],
  ['Oceania/Ilhas do Pacífico',['Inglês','Francês','Havaiano','Maori','Pama-Nyungan','Taitiano']]
];
const personality=['Tímida e reservada','Rebelde, antissocial e violenta','Arrogante, orgulhosa e distante','Temperamental, impetuosa e teimosa','Exigente, nervosa e detalhista','Estável e séria','Boba e cabeça-de-vento','Ardilosa e enganadora','Intelectual e distante','Amigável e extrovertida'];
const clothing=['Chique Genérico','Lazer','Flash Urbano','Executivo','Alta Costura','Boêmio','Chique Mendigo','Cores de Gangue','Couros Nômades','Asia Pop'];
const hair=['Moicano','Longo e desgrenhado','Curto e espetado','Selvagem','Careca','Listrado','Cores selvagens','Curto e bem cuidado','Curto e cacheado','Longo e liso'];
const affect=['Tatuagens','Óculos espelhados','Cicatrizes rituais','Luvas com espinhos','Piercing no nariz','Piercings na língua ou outros','Implantes estranhos nas unhas','Botas ou saltos com espinhos','Luvas sem dedos','Lentes de contato estranhas'];
const values=['Dinheiro','Honra','Sua palavra','Honestidade','Conhecimento','Vingança','Amor','Poder','Família','Amizade'];
const people=['Mantém neutralidade','Mantém neutralidade','Gosta de quase todo mundo','Odeia quase todo mundo','Pessoas são ferramentas: use e descarte','Cada pessoa é um indivíduo valioso','Pessoas são obstáculos a destruir se cruzarem seu caminho','Pessoas não são confiáveis; não dependa de ninguém','Que todos desapareçam e deixem as baratas','Pessoas são maravilhosas'];
const valuedPerson=['Um dos pais','Um irmão ou irmã','Um amor','Um amigo','Você mesma','Um animal de estimação','Um professor ou mentor','Uma figura pública','Um herói pessoal','Ninguém'];
const valuedPoss=['Uma arma','Uma ferramenta','Uma peça de roupa','Uma fotografia','Um livro ou diário','Uma gravação','Um instrumento musical','Uma joia','Um brinquedo','Uma carta'];
const family=['Executivos corporativos','Gerentes corporativos','Técnicos corporativos','Família nômade','“Família” de gangue','Moradores de Zona de Combate','Sem-teto urbanos','Ratos de megaestrutura','Reclamadores','Edgerunners'];
const environment=['Rua sem supervisão adulta','Zona Corporativa segura e murada','Comboio nômade em movimento','Comboio nômade ligado a transporte','Bairro decadente antes nobre','Coração da Zona de Combate','Megaestrutura controlada por Corp/Cidade','Ruínas ocupadas por Reclamadores','Nação Flutuante','Arranha-céu corporativo de luxo'];
const crisis=['Família perdeu tudo por traição','Família perdeu tudo por má administração','Família foi exilada ou expulsa','Família está presa; só você escapou','Família desapareceu; você é a única restante','Família foi morta; você foi a única sobrevivente','Família envolvida numa conspiração/organização de longo prazo','Família foi dispersada por infortúnio','Família carrega uma rixa hereditária','Você herdou uma dívida familiar'];
const friendRel=['Como um irmão mais velho','Como um irmão mais novo','Professor ou mentor','Parceiro ou colega de trabalho','Ex-amante','Antigo inimigo','Como um pai/mãe','Amigo de infância','Conhecido da Rua','Interesse ou objetivo em comum'];
const enemyWho=['Ex-amigo','Ex-amante','Parente afastado','Inimigo de infância','Pessoa que trabalha para você','Pessoa para quem você trabalha','Parceiro ou colega','Executivo corporativo','Autoridade governamental','Boosterganger'];
const enemyCause=['Fez o outro perder status','Causou perda de amante/amigo/parente','Humilhou publicamente','Acusou o outro de covardia ou grande falha','Desertou ou traiu o outro','Recusou trabalho ou envolvimento romântico','Vocês simplesmente se odeiam','Rivalidade romântica','Rivalidade comercial','Armou para o outro por um crime que não cometeu'];
const revenge=['Evitar a pessoa','Evitar a pessoa','Entrar em fúria e tentar partir para a violência','Entrar em fúria e tentar partir para a violência','Trair indiretamente','Trair indiretamente','Atacar verbalmente','Atacar verbalmente','Armar uma acusação falsa','Tentar matar ou mutilar'];
const love=['Morreu em acidente','Desapareceu misteriosamente','Simplesmente não deu certo','Um objetivo ou vendeta separou vocês','Foi sequestrado(a)','Ficou insano(a) ou cyberpsicótico(a)','Cometeu suicídio','Foi morto(a) numa luta','Um rival tirou você do caminho','Está preso(a) ou exilado(a)'];
const goals=['Livrar-se de má reputação','Ganhar poder e controle','Sair da Rua custe o que custar','Causar dor a quem cruzar você','Enterrar o passado','Caçar os responsáveis por sua vida miserável','Conseguir o que é seu por direito','Salvar alguém envolvido em seu passado','Ganhar fama e reconhecimento','Tornar-se temido(a) e respeitado(a)'];

const roleLife = {
  rockerboy:{tipo:['Músico','Poeta slam','Artista de rua','Artista performático','Comediante','Orador','Político','Rap artist','DJ','Idoru'],local:['Cafés alternativos','Clubes privados','Bares de má fama','Performances de guerrilha','Boates da cidade','Data Pool'],ameaca:['Ex-integrante do grupo','Grupo ou artista rival','Inimigos corporativos','Crítico/influenciador','Estrela antiga ameaçada por sua fama','Interesse romântico ou figura da mídia em busca de vingança']},
  solo:{tipo:['Guarda-costas','Músculo de rua para aluguel','Executor corporativo com bicos','Agente de operações negras','Vigilante local','Assassino profissional'],territorio:['Zona Corporativa','Zonas de Combate','Cidade inteira','Território de uma Corporação','Território de um Fixer/contato','Onde o dinheiro levar'],ameaca:['Corporação irritada','Boostergang antiga','Lawmen corruptos ou enganados','Solo rival corporativo','Fixer que vê você como ameaça','Solo rival que te vê como nêmesis'],moral:['Sempre tenta fazer o bem','Poupa inocentes','Raramente cruza limites éticos','Implacável e focado em lucro','Dobra regras e lei para concluir o trabalho','Totalmente maligno']},
  netrunner:{tipo:['Freelancer por contrato','Runner corporativo','Hacktivista','Cracker por diversão','Parte de equipe fixa de freelancers','Trabalha para Media/político/Lawman'],workspace:['Telas por toda parte','Parece melhor em Virtuality','Cama suja coberta de fios','Corporativo, modular e utilitário','Minimalista, limpo e organizado','Tomou todo o espaço de moradia'],clientes:['Fixers locais','Gangers locais que protegem a área','Executivos com projetos negros','Solos locais','Nômades e Fixers','Trabalha por conta e vende dados'],programas:['Ruínas de zonas abandonadas','Rouba de Netrunners derrotados','Fixer fornece em troca de serviço','Execs fornecem por serviços','Backdoors em armazéns corporativos','Night Markets'],ameaca:['IA rebelde ou NET Ghost','Netrunners rivais','Corporativos querendo exclusividade','Lawmen caçando “black hats”','Clientes antigos ressentidos','Fixer/cliente querendo exclusividade']},
  tech:{tipo:['Técnico de cyberware','Mecânico de veículos','Pau para toda obra','Técnico de pequenos eletrônicos','Armeiro','Inventor maluco','Mecânico de robôs e drones','Mecânico de máquinas pesadas','Sucateiro','Mecânico náutico'],workspace:['Bagunça coberta de projetos','Tudo colorido, ainda um pesadelo','Totalmente digital e com backup diário','Projeta tudo no Agente','Guarda tudo para “um dia”','Só você entende o sistema'],clientes:['Fixers locais','Gangers locais','Execs com projetos negros','Solos locais','Nômades e Fixers','Trabalha por conta própria'],suprimentos:['Sucata em zonas abandonadas','Retira de corpos após tiroteios','Fixer fornece em troca de reparos','Execs fornecem por serviços','Backdoors em armazéns corporativos','Night Markets'],ameaca:['Gangers querendo exclusividade','Tech rival','Corporativos querendo exclusividade','Fabricante maior ameaçado pelos seus mods','Cliente antigo ressentido','Tech rival disputando recursos']},
  medtech:{tipo:['Cirurgião','Clínico geral','Médico de trauma','Psiquiatra','Terapeuta de cyberpsicose','Ripperdoc','Operador de criossistemas','Farmacêutico','Bodysculptor','Patologista forense'],workspace:['Esterilizado toda manhã','Antigo, mas confortável','Crio também refrigera bebidas','Descartáveis compactados','Menos limpo do que pacientes esperavam','Meticulosamente organizado e esterilizado'],clientes:['Fixers locais','Gangers locais','Execs com projetos negros','Solos e combatentes','Nômades e Fixers','Trauma Team'],suprimentos:['Estoques abandonados','Retira peças após tiroteios','Fixer fornece em troca de serviço','Execs/Trauma Team fornecem','Backdoors em armazéns/hospitais','Night Markets']},
  media:{tipo:['Blogger','Escritor','Videógrafo','Documentarista','Repórter investigativo','Cronista de rua'],etica:['Verificável e honesto','Honesto mas usa rumor se preciso','Às vezes quebra ética','Dobra regras para pegar os vilões','Implacável e disposto a quebrar a lei','Totalmente corrupto'],publico:['Revista mensal','Blog','Feed mainstream','Canal de notícias','Venda de livros','Screamsheets'],historias:['Intriga política','Impacto ecológico','Notícias de celebridades','Derrubar corporações','Editoriais','Propaganda']},
  exec:{corp:['Financeira','Mídia e comunicações','Cybertech e medicina','Fármacos e biotecnologia','Bens de consumo','Energia','Eletrônicos e robótica','Serviços corporativos','Serviços ao consumidor','Imóveis e construção'],divisao:['Compras','Produção','P&D','RH','Relações públicas/Publicidade','Fusões e aquisições'],etica:['Sempre ética','Justa e honesta','Às vezes escorrega','Dobra regras','Implacável e orientada a lucro','Totalmente criminosa'],chefe:['Mentor, mas com inimigos','Dá liberdade e não quer saber detalhes','Microgerenciador','Psicótico e paranoico','Protege você de rivais','Ameaçado por sua ascensão'],alcance:['Uma cidade','Várias cidades','Estadual','Nacional','Internacional em poucas cidades','Internacional em todo lugar'],ameaca:['Corp rival','Polícia observando','Mídia local','Divisões internas em guerra','Governo local','Corporação internacional visando takeover']},
  lawman:{posicao:['Guarda','Patrulha padrão','Investigação criminal','SWAT','Patrulha motorizada','Assuntos internos'],jurisdicao:['Zonas corporativas','Zona urbana padrão','Zonas de Combate','Cidade exterior','Zonas de recuperação','Rodovias'],corrupcao:['Honesta e ética','Honesta porém dura','Às vezes escorrega','Dobra regras para pegar vilões','Implacável e controladora','Totalmente corrupta'],ameaca:['Crime organizado','Boostergangs','Grupo de fiscalização policial','Políticos corruptos','Contrabandistas','Criminosos de rua'],alvo:['Crime organizado','Boostergangs','Traficantes','Políticos corruptos','Contrabandistas','Crime de rua']},
  fixer:{tipo:['Intermedia gangues rivais','Busca recursos raros','Agencia serviços de Solos/Techs','Fornece recurso regular para Night Markets','Busca recursos altamente ilegais','Fornece recursos para Techs/Medtechs','Opera vários Night Markets','Intermedia máquinas/veículos/aeronaves','Age como receptador de saqueadores','Agente exclusivo de Media/Rockerboy/Nômades'],office:['Sem escritório; móvel','Cabine em bar local','Mensagens Data Pool e dead drops','Sala em armazém/loja/clínica','Prédio abandonado','Lobby de cube hotel'],clientes:['Rockerboys ou Medias','Gangers locais','Execs com projetos negros','Solos locais','Nômades e Fixers','Políticos ou Execs'],ameaca:['Gangers querendo exclusividade','Fixers rivais','Execs querendo exclusividade','Inimigo de cliente antigo','Cliente antigo ressentido','Fixer rival disputando recursos']},
  nomad:{pack:['Tribo/família estendida','Algumas dezenas','Quarenta ou cinquenta','Cem ou mais','Blood Family','Família afiliada'],base:['Terra','Ar','Mar'],trabalho:['Batedor/negociador','Outrider/proteção','Piloto/motorista de transporte','Loadmaster/carga pesada','Contrabandista solo','Compras e combustível'],ameaca:['Crime organizado','Boostergangs','Traficantes','Políticos corruptos','Packs rivais','Policiais corruptos'],filosofia:['Sempre para o bem','Negócio familiar honesto','Às vezes antiético','Dobra regras quando necessário','Implacável e autocentrado','Totalmente maligno']}
};

const names=['Razor','Vega','Nyx','Juno','Kira','Mako','Lótus','Zero','Mira','Ash','Nova','Rin','Sable','Kestrel','Echo','Lux'];
const surnames=['Kowalski','Sato','Mendes','Okafor','Navarro','Vega','Silva','Chen','Kobayashi','Martins','Reyes','Volkov'];
const d10=rng=>Math.floor(rng()*10)+1, d6=rng=>Math.floor(rng()*6)+1, pick=(a,rng)=>a[Math.floor(rng()*a.length)];

function statObj(row){ return Object.fromEntries(STATS.map((k,i)=>[k,row[i]])); }
export function skillCost(skills){ return Object.entries(skills).reduce((s,[id,l])=>s + (MASTER_SKILLS[id]?.[2]||1)*l,0); }
function allocateSkills(poolIds,budget,rng){
  const skills={}; for(const id of poolIds) skills[id]=2;
  let cost=skillCost(skills);
  const candidates=[...poolIds];
  while(cost<budget){
    const eligible=candidates.filter(id=>skills[id]<6 && cost+(MASTER_SKILLS[id]?.[2]||1)<=budget);
    if(!eligible.length) break;
    const id=pick(eligible,rng), m=MASTER_SKILLS[id]?.[2]||1; skills[id]++; cost+=m;
  }
  if(cost!==budget){
    // deterministic repair; x1 skills guarantee exact budget for official pools
    for(const id of candidates){ while(skills[id]<6 && cost<budget && (MASTER_SKILLS[id]?.[2]||1)===1){ skills[id]++; cost++; } if(cost===budget) break; }
  }
  return skills;
}
function allocateCompleteStats(rng){
  const s=Object.fromEntries(STATS.map(k=>[k,2])); let remaining=42;
  while(remaining){ const eligible=STATS.filter(k=>s[k]<8); const k=pick(eligible,rng); s[k]++; remaining--; }
  return s;
}
function allocateCompleteSkills(rng){
  const skills=Object.fromEntries(BASIC_SKILLS.map(id=>[id,2])); let cost=skillCost(skills);
  const ids=Object.keys(MASTER_SKILLS);
  while(cost<86){ const eligible=ids.filter(id=>(skills[id]||0)<6 && cost+(MASTER_SKILLS[id][2]||1)<=86); const id=pick(eligible,rng); skills[id]=(skills[id]||0)+1; cost+=MASTER_SKILLS[id][2]||1; }
  return skills;
}
export function derive(stats){
  const hp=10 + 5*Math.ceil((stats.BODY+stats.WILL)/2);
  return {maxHp:hp,hp,seriouslyWounded:Math.ceil(hp/2),deathSave:stats.BODY,maxHumanity:stats.EMP*10,humanity:stats.EMP*10};
}
function generalLifepath(rng){
  const c=cultures[d10(rng)-1], friends=Math.max(0,d10(rng)-7), enemies=Math.max(0,d10(rng)-7), loves=Math.max(0,d10(rng)-7);
  return {
    culturalRegion:c[0],culturalLanguage:pick(c[1],rng),personality:personality[d10(rng)-1],clothingStyle:clothing[d10(rng)-1],hairstyle:hair[d10(rng)-1],affectation:affect[d10(rng)-1],
    value:values[d10(rng)-1],peopleView:people[d10(rng)-1],valuedPerson:valuedPerson[d10(rng)-1],valuedPossession:valuedPoss[d10(rng)-1],familyBackground:family[d10(rng)-1],environment:environment[d10(rng)-1],familyCrisis:crisis[d10(rng)-1],
    friends:Array.from({length:friends},()=>pick(friendRel,rng)), enemies:Array.from({length:enemies},()=>({who:pick(enemyWho,rng),cause:pick(enemyCause,rng),revenge:pick(revenge,rng)})), tragicLoveAffairs:Array.from({length:loves},()=>pick(love,rng)), lifeGoal:goals[d10(rng)-1]
  };
}
function roleLifepath(role,rng){ const t=roleLife[role]; if(!t) return {}; return Object.fromEntries(Object.entries(t).map(([k,a])=>[k,pick(a,rng)])); }

const STARTING_CYBERWARE={
  rockerboy:[['cyberaudio_suite'],['audio_recorder'],['chemskin'],['techhair']],
  solo:[['biomonitor'],['neural_link'],['sandevistan','wolvers']],
  netrunner:[['neural_link'],['interface_plugs'],['shift_tacts']],
  tech:[['cybereye'],['microoptics'],['skinwatch'],['tool_hand']],
  medtech:[['biomonitor'],['cybereye'],['nasal_filters','toxin_binders'],['teleoptics']],
  media:[['cyberaudio_suite'],['amplified_hearing','voice_stress_analyzer'],['light_tattoo']],
  lawman:[['hidden_holster'],['subdermal_pocket']],
  exec:[['cyberaudio_suite'],['internal_agent'],['biomonitor','techhair'],['toxin_binders','nasal_filters']],
  fixer:[['cyberaudio_suite'],['internal_agent'],['subdermal_pocket'],['voice_stress_analyzer','amplified_hearing']],
  nomad:[['neural_link'],['interface_plugs','wolvers']],
};
export function startingCyberwareForRole(role,rng=Math.random){
  const groups=STARTING_CYBERWARE[role]||[],rows=[];let seq=1;
  for(const group of groups){const id=group[Math.floor(rng()*group.length)],base=cyberwareById(id);if(!base)continue;const item={...base,instanceId:`start-${id}-${seq++}`,installed:true,humanityLossApplied:Number(base.humanityLossPreset||0)};
    const foundationId=base.cyberwareCategory==='neuralware'&&!base.foundation?'neural_link':base.cyberwareCategory==='cyberoptics'&&!base.foundation?'cybereye':base.cyberwareCategory==='cyberaudio'&&!base.foundation?'cyberaudio_suite':null;
    if(foundationId){const f=rows.find(x=>x.id===foundationId);if(f)item.targetFoundationInstanceId=f.instanceId}
    rows.push(item);
  }
  return rows;
}

export function createCharacter({method='complete',role='solo',rng=Math.random,name}={}){
  if(!ROLE_STAT_TEMPLATES[role]) throw new Error('Função inválida');
  let stats, skills, audit={};
  if(method==='streetrat'){
    const roll=d10(rng); stats=statObj(ROLE_STAT_TEMPLATES[role][roll-1]); skills={...STREETRAT_SKILLS[role]}; audit={streetratTemplateRoll:roll};
  } else if(method==='edgerunner'){
    const rolls=STATS.map(()=>d10(rng)); stats=Object.fromEntries(STATS.map((k,i)=>[k,ROLE_STAT_TEMPLATES[role][rolls[i]-1][i]])); skills=allocateSkills(EDGERUNNER_ROLE_SKILLS[role],86,rng); audit={edgerunnerStatRolls:rolls};
  } else if(method==='complete'){
    stats=allocateCompleteStats(rng); skills=allocateCompleteSkills(rng); audit={statPool:62,skillPool:86};
  } else throw new Error('Método inválido');
  const life=generalLifepath(rng); skills[`language_cultural_${life.culturalLanguage.toLowerCase().replace(/\W+/g,'_')}`]=4;
  let derived=derive(stats);const cyberware=(method==='streetrat'||method==='edgerunner')?startingCyberwareForRole(role,rng):[];if(cyberware.length){const loss=cyberware.reduce((sum,x)=>sum+Number(x.humanityLossApplied||0),0),profile=humanityProfile({baseEmp:stats.EMP,currentHumanity:stats.EMP*10-loss,cyberware});derived={...derived,baseEmp:stats.EMP,humanity:profile.humanity,maxHumanity:profile.maxHumanity,currentEmp:profile.emp,cyberpsychosis:profile.level,gmControl:profile.gmControl}}
  const char={
    schemaVersion:SCHEMA_VERSION,systemId:SYSTEM_ID,adapterVersion:ADAPTER_VERSION,characterId:crypto.randomUUID?.()||`char-${Date.now()}-${Math.floor(rng()*1e6)}`,
    name:name||`${pick(names,rng)} ${pick(surnames,rng)}`,method,role,roleAbilityRank:4,roleAbilityState:initialRoleAbilityState({role,rank:4,rng}),roleHistory:[{role,rank:4,active:true}],improvementPoints:0,reputation:{level:0,event:'',negative:false},stats,skills,derived,lifepath:life,roleLifepath:roleLifepath(role,rng),
    economy:{equipmentBudget:2550,fashionBudget:800,eurobucks:0},inventory:[],cyberware,assets:{portraitDataUrl:null,tokenDataUrl:null,portraitAspect:'4:5',tokenFormat:'circle-flat-2d-512'},worldPosition:null,campaignState:{worldClock:createWorldClock(),streetDrugs:{active:[],addictions:{},history:[]},contentModules:{black_chrome:false,interface_red:false}},generationAudit:audit,createdAt:new Date().toISOString()
  };
  return char;
}

export function validateCharacter(char){
  const errors=[];
  if(char?.systemId!==SYSTEM_ID) errors.push('systemId incompatível');
  if(!ROLE_STAT_TEMPLATES[char?.role]) errors.push('Função inválida');
  if(!['streetrat','edgerunner','complete'].includes(char?.method)) errors.push('Método inválido');
  if(char?.roleAbilityRank!==4) errors.push('A Habilidade da Função deve começar em Grau 4.');
  for(const k of STATS){ const v=char?.stats?.[k]; if(!Number.isInteger(v)||v<2||v>8) errors.push(`${k} deve estar entre 2 e 8.`); }
  if(char?.method==='complete' && STATS.reduce((s,k)=>s+(char?.stats?.[k]||0),0)!==62) errors.push('Pacote Completo inicial deve usar 62 pontos de STAT.');
  const mainSkills=Object.fromEntries(Object.entries(char?.skills||{}).filter(([id])=>MASTER_SKILLS[id]));
  if(char?.method==='streetrat'){
    const expected=STREETRAT_SKILLS[char.role]||{}; for(const [id,v] of Object.entries(expected)) if(mainSkills[id]!==v) errors.push(`Streetrat: ${MASTER_SKILLS[id]?.[0]||id} deveria ser ${v}.`);
  } else {
    for(const id of BASIC_SKILLS) if((mainSkills[id]||0)<2) errors.push(`${MASTER_SKILLS[id][0]} deve começar em pelo menos 2.`);
    for(const [id,v] of Object.entries(mainSkills)) if(v<0||v>6) errors.push(`${MASTER_SKILLS[id]?.[0]||id} deve ficar entre 0 e 6 na criação.`);
    if(skillCost(mainSkills)!==86) errors.push(`Custo de perícias deve ser 86, atual: ${skillCost(mainSkills)}.`);
    if(char.method==='edgerunner') for(const id of Object.keys(mainSkills)) if(!EDGERUNNER_ROLE_SKILLS[char.role].includes(id)) errors.push(`Edgerunner não pode gastar pontos fora da lista da Função: ${id}.`);
  }
  const d=derive(char.stats||{}); if(char?.derived?.maxHp!==d.maxHp) errors.push('PV derivados incorretos.'); const hp=humanityProfile({baseEmp:Number(char?.stats?.EMP||0),currentHumanity:Number(char?.derived?.humanity??Number(char?.stats?.EMP||0)*10),cyberware:Array.isArray(char?.cyberware)?char.cyberware:[]}); if(Number(char?.derived?.maxHumanity)!==hp.maxHumanity) errors.push('Humanidade máxima derivada incorreta.'); if(Number(char?.derived?.currentEmp??hp.emp)!==hp.emp) errors.push('EMP atual derivado incorreto.');
  const rav=validateRoleAbilityState(char); if(!rav.ok) errors.push('Role Ability inicial inválida.');
  if(!Number.isInteger(char?.improvementPoints)||char.improvementPoints<0) errors.push('Improvement Points devem ser um inteiro não negativo.');
  if(!Number.isInteger(char?.reputation?.level)||char.reputation.level<0||char.reputation.level>10) errors.push('Reputation deve ficar entre 0 e 10.');
  const roleHistory=Array.isArray(char?.roleHistory)?char.roleHistory:[];const activeRoles=roleHistory.filter(x=>x?.active);if(activeRoles.length!==1) errors.push('Histórico de Funções deve ter exatamente uma Função ativa.');else if(activeRoles[0].role!==char.role||Number(activeRoles[0].rank)!==Number(char.roleAbilityRank)) errors.push('Função/Grau ativos divergem do histórico de Funções.');
  if(!char?.lifepath?.culturalLanguage) errors.push('Idioma cultural ausente.');
  const cultural=Object.entries(char?.skills||{}).find(([id])=>id.startsWith('language_cultural_')); if(!cultural||cultural[1]!==4) errors.push('Idioma cultural deve começar em Grau 4 sem custo do pool.');
  return {ok:errors.length===0,errors,summary:{statTotal:STATS.reduce((s,k)=>s+(char?.stats?.[k]||0),0),skillCost:skillCost(mainSkills),hp:d.maxHp,humanity:d.maxHumanity}};
}

function migrationRngFor(character){
  const seedText=String(character?.characterId||character?.name||character?.role||'legacy-cpred');
  let state=2166136261>>>0;for(const ch of seedText){state^=ch.charCodeAt(0);state=Math.imul(state,16777619)>>>0}
  return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
}
export function migrateCharacter(input){
  if(!input||typeof input!=='object')throw new Error('Personagem legado inválido.');
  if(input.systemId&&input.systemId!==SYSTEM_ID)throw new Error('Personagem pertence a outro sistema.');
  if(Number(input.schemaVersion||0)>SCHEMA_VERSION)throw new Error(`Schema futuro incompatível: ${input.schemaVersion}.`);
  const c=structuredClone(input),rng=migrationRngFor(c);
  c.schemaVersion=SCHEMA_VERSION;c.systemId=SYSTEM_ID;c.adapterVersion=ADAPTER_VERSION;
  c.method=['streetrat','edgerunner','complete'].includes(c.method)?c.method:'complete';
  c.role=ROLE_STAT_TEMPLATES[c.role]?c.role:'solo';
  c.roleAbilityRank=Number.isInteger(c.roleAbilityRank)?Math.max(1,Math.min(10,c.roleAbilityRank)):4;
  c.stats=c.stats&&typeof c.stats==='object'?c.stats:{};for(const k of STATS)c.stats[k]=Math.max(2,Math.min(8,Number(c.stats[k])||2));
  c.skills=c.skills&&typeof c.skills==='object'?c.skills:{};
  c.inventory=Array.isArray(c.inventory)?c.inventory:[];c.cyberware=Array.isArray(c.cyberware)?c.cyberware:[];
  c.assets={portraitDataUrl:null,tokenDataUrl:null,portraitAspect:'4:5',tokenFormat:'circle-flat-2d-512',...(c.assets||{})};
  c.economy={equipmentBudget:0,fashionBudget:0,eurobucks:0,...(c.economy||{})};
  c.improvementPoints=Math.max(0,Math.trunc(Number(c.improvementPoints)||0));
  c.reputation={level:Math.max(0,Math.min(10,Math.trunc(Number(c.reputation?.level)||0))),event:String(c.reputation?.event||''),negative:!!c.reputation?.negative};
  c.roleHistory=Array.isArray(c.roleHistory)?c.roleHistory.map(x=>({role:String(x?.role||''),rank:Math.max(1,Math.min(10,Math.trunc(Number(x?.rank)||1))),active:!!x?.active})).filter(x=>ROLE_STAT_TEMPLATES[x.role]):[{role:c.role,rank:c.roleAbilityRank,active:true}];
  if(!c.roleHistory.length)c.roleHistory=[{role:c.role,rank:c.roleAbilityRank,active:true}];
  if(!c.roleHistory.some(x=>x.active))c.roleHistory[c.roleHistory.length-1].active=true;
  let activeRoleSeen=false;for(const row of c.roleHistory){if(row.active&&!activeRoleSeen)activeRoleSeen=true;else if(row.active)row.active=false}
  const activeRole=c.roleHistory.find(x=>x.active);if(activeRole){c.role=activeRole.role;c.roleAbilityRank=activeRole.rank}
  if(!c.roleAbilityState||typeof c.roleAbilityState!=='object')c.roleAbilityState=initialRoleAbilityState({role:c.role,rank:c.roleAbilityRank,rng});
  c.campaignState=c.campaignState&&typeof c.campaignState==='object'?c.campaignState:{};
  if(!c.campaignState.worldClock)c.campaignState.worldClock=createWorldClock();
  c.campaignState.streetDrugs={active:[],addictions:{},history:[],...(c.campaignState.streetDrugs||{})};
  c.campaignState.contentModules={black_chrome:false,interface_red:false,...(c.campaignState.contentModules||{})};
  const base=derive(c.stats),old=c.derived&&typeof c.derived==='object'?c.derived:{};
  const currentHumanity=Number.isFinite(Number(old.humanity))?Number(old.humanity):c.stats.EMP*10;
  const hpProfile=humanityProfile({baseEmp:c.stats.EMP,currentHumanity,cyberware:c.cyberware});
  c.derived={...base,...old,baseEmp:c.stats.EMP,humanity:hpProfile.humanity,maxHumanity:hpProfile.maxHumanity,currentEmp:hpProfile.emp,cyberpsychosis:hpProfile.level,gmControl:hpProfile.gmControl};
  if(!Number.isFinite(Number(c.derived.hp)))c.derived.hp=c.derived.maxHp;
  c.worldPosition=c.worldPosition??null;c.loadout=c.loadout&&typeof c.loadout==='object'?c.loadout:{};
  c.createdAt=c.createdAt||new Date(0).toISOString();
  return c;
}

export function toExportObject(char){
  const v=validateCharacter(char); if(!v.ok) throw new Error(`Ficha inválida: ${v.errors.join(' | ')}`);
  return {exportFormat:'barbara-character-json',exportVersion:1,systemId:SYSTEM_ID,adapterVersion:ADAPTER_VERSION,schemaVersion:SCHEMA_VERSION,exportedAt:new Date().toISOString(),character:char};
}
export function serializeCharacter(char){ return JSON.stringify(toExportObject(char),null,2); }
export function deserializeCharacter(text){
  const obj=typeof text==='string'?JSON.parse(text):text;
  if(obj?.exportFormat!=='barbara-character-json') throw new Error('Formato JSON não reconhecido.');
  if(obj.systemId&&obj.systemId!==SYSTEM_ID) throw new Error('JSON pertence a outro sistema.');
  if(Number(obj.schemaVersion||0)>SCHEMA_VERSION) throw new Error(`Schema futuro incompatível: ${obj.schemaVersion}.`);
  const migrated=migrateCharacter(obj.character);
  const v=validateCharacter(migrated); if(!v.ok) throw new Error(`Ficha importada inválida após migração: ${v.errors.join(' | ')}`); return migrated;
}
export function getSkillLabel(id){ return MASTER_SKILLS[id]?.[0] || id.replace(/^language_cultural_/,'Idioma cultural: ').replaceAll('_',' '); }
export function getRoleLabel(id){ return ROLES.find(r=>r.id===id)?.label||id; }
