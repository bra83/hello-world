export const ECONOMY_SOURCE='Cyberpunk RED Core Rulebook Digital v1.25 pp.385; character generation note pp.95-96';
export const CORE_MARKET_REFERENCE={
 highFashionJewelry:{id:'highFashionJewelry',label:'High Fashion Jewelry',price:5000,priceCategory:'luxury',source:'Core v1.25 p.102/356 + Errata v1.25 p.2'},
 luxuryPenthouse:{id:'luxuryPenthouse',label:'Luxury Penthouse',purchasePrice:150000,monthlyRent:15000,source:'Core v1.25 p.378 + Errata v1.25 p.4'}
};
export function coreMarketReference(id){const row=CORE_MARKET_REFERENCE[id];return row?JSON.parse(JSON.stringify(row)):null}
export const PRICE_CATEGORIES=[
 {id:'cheap',label:'Cheap',marketPrice:10,rank:1},
 {id:'everyday',label:'Everyday',marketPrice:20,rank:2},
 {id:'costly',label:'Costly',marketPrice:50,rank:3},
 {id:'premium',label:'Premium',marketPrice:100,rank:4},
 {id:'expensive',label:'Expensive',marketPrice:500,rank:5},
 {id:'very_expensive',label:'Very Expensive',marketPrice:1000,rank:6},
 {id:'luxury',label:'Luxury',marketPrice:5000,rank:7},
 {id:'super_luxury',label:'Super Luxury',marketPrice:10000,rank:8},
];
function n(v,d=0){const x=Number(v);return Number.isFinite(x)?x:d}
function copy(v){return JSON.parse(JSON.stringify(v??{}))}
export function priceCategoryFor(price){const p=Math.max(0,n(price));if(p<=10)return PRICE_CATEGORIES[0];if(p<=20)return PRICE_CATEGORIES[1];if(p<=50)return PRICE_CATEGORIES[2];if(p<=100)return PRICE_CATEGORIES[3];if(p<=500)return PRICE_CATEGORIES[4];if(p<=1000)return PRICE_CATEGORIES[5];if(p<=5000)return PRICE_CATEGORIES[6];return PRICE_CATEGORIES[7]}
export function fixerReachRank(roleAbilityRank,{nightMarketActive=false}={}){const r=Math.max(0,Math.trunc(n(roleAbilityRank)));if(r<1)return 4;if(r<=2)return 2;if(r<=4)return 5;if(r<=6)return nightMarketActive?8:5;if(r<=8)return 6;if(r===9)return 7;return 8}
export function marketAccess({role,roleAbilityRank,nightMarketActive=false}={}){const fixer=String(role||'').toLowerCase()==='fixer';return{fixer,maxCategoryRank:fixer?fixerReachRank(roleAbilityRank,{nightMarketActive}):4,nightMarketActive:Boolean(nightMarketActive),source:ECONOMY_SOURCE}}
export function canSourceItem({role,roleAbilityRank,nightMarketActive=false,price}={}){const category=priceCategoryFor(price),access=marketAccess({role,roleAbilityRank,nightMarketActive});return{ok:category.rank<=access.maxCategoryRank,category,access,source:ECONOMY_SOURCE}}
export function planPurchase({character,item,quantity=1}={}){
 if(!character||!item?.id)return{ok:false,reason:'character-and-item-required'};const q=Math.max(1,Math.trunc(n(quantity,1))),unitPrice=Math.max(0,n(item.price)),total=unitPrice*q,economy=character.economy||{},budget=Math.max(0,n(economy.equipmentBudget)),cash=Math.max(0,n(economy.eurobucks));
 if(budget>=total)return{ok:true,quantity:q,unitPrice,total,currencySource:'equipmentBudget',category:priceCategoryFor(unitPrice),source:ECONOMY_SOURCE};
 const access=canSourceItem({role:character.role,roleAbilityRank:character.roleAbilityRank,nightMarketActive:Boolean(character.campaignState?.market?.nightMarketActive),price:unitPrice});if(!access.ok)return{ok:false,reason:'market-access-required',...access,quantity:q,unitPrice,total};
 if(cash<total)return{ok:false,reason:'insufficient-eurobucks',needed:total,available:cash,category:access.category,access:access.access};
 return{ok:true,quantity:q,unitPrice,total,currencySource:'eurobucks',category:access.category,access:access.access,source:ECONOMY_SOURCE};
}
export function applyPurchase({character,item,quantity=1}={}){
 const plan=planPurchase({character,item,quantity});if(!plan.ok)return plan;const out=copy(character);out.economy=out.economy||{equipmentBudget:0,eurobucks:0};if(plan.currencySource==='equipmentBudget')out.economy.equipmentBudget=Math.max(0,n(out.economy.equipmentBudget)-plan.total);else out.economy.eurobucks=Math.max(0,n(out.economy.eurobucks)-plan.total);
 out.inventory=Array.isArray(out.inventory)?out.inventory:[];const stackable=['ammo','consumable'].includes(item.category);let row=stackable?out.inventory.find(x=>x.itemId===item.id&&!x.equipped):null;if(row)row.quantity=n(row.quantity,1)+n(item.quantity,1)*plan.quantity;else out.inventory.push({itemId:item.id,quantity:n(item.quantity,1)*plan.quantity,equipped:false,ammo:item.magazine??null,acquiredAt:new Date(0).toISOString()});
 return{ok:true,plan,character:out,source:ECONOMY_SOURCE};
}


export function haggleDealForRank(rank,{direction='buy',quantity=1,marketPrice=0}={}){
 const r=Math.max(0,Math.trunc(n(rank))),q=Math.max(1,Math.trunc(n(quantity,1))),price=Math.max(0,n(marketPrice));
 if(r<=0)return{kind:'none',rank:r};
 if(r<=2)return{kind:'percent',percent:10,direction,rules:'buy-or-sell'};
 if(r<=4)return{kind:'bulk_free',minimumQuantity:5,paidQuantity:q,receivedQuantity:q>=5?q+1:q,direction:'buy'};
 if(r<=6)return{kind:'job_pay_percent',percent:20,direction:'job'};
 if(r<=8)return{kind:'deferred_half',eligible:price>=5000,firstPayment:Math.ceil(price/2),secondPayment:Math.floor(price/2),dueDays:30,direction:'buy'};
 if(r===9)return{kind:'percent',percent:20,direction,rules:'buy-or-sell'};
 return{kind:'dangerous_job_double',multiplier:2,direction:'job'};
}
export function resolveHaggle({fixerCool=0,fixerTrading=0,fixerOperatorRank=0,fixerRoll=0,opponentCool=0,opponentTrading=0,opponentOperatorRank=0,opponentRoll=0}={}){
 const fixerTotal=n(fixerCool)+n(fixerTrading)+n(fixerOperatorRank)+n(fixerRoll),opponentTotal=n(opponentCool)+n(opponentTrading)+n(opponentOperatorRank)+n(opponentRoll);
 return{success:fixerTotal>opponentTotal,fixerTotal,opponentTotal,operatorRank:Math.max(0,Math.trunc(n(fixerOperatorRank))),source:ECONOMY_SOURCE};
}
export function planSale({character,item,quantity=1,haggle=null}={}){
 if(!character||!item?.id)return{ok:false,reason:'character-and-item-required'};
 const q=Math.max(1,Math.trunc(n(quantity,1))),unitBundle=Math.max(1,Math.trunc(n(item.quantity,1))),owned=(character.inventory||[]).filter(x=>x.itemId===item.id).reduce((s,x)=>s+n(x.quantity,1),0),needed=unitBundle*q;
 if(owned<needed)return{ok:false,reason:'insufficient-owned-quantity',needed,owned};
 const unitPrice=Math.max(0,n(item.price)),baseTotal=unitPrice*q;let total=baseTotal,deal=null;
 if(haggle?.success&&String(character.role||'').toLowerCase()==='fixer'){
   deal=haggleDealForRank(character.roleAbilityRank,{direction:'sell',quantity:q,marketPrice:unitPrice});
   if(deal.kind==='percent'&&deal.direction==='sell')total=Math.round(baseTotal*(1+deal.percent/100));
 }
 return{ok:true,quantity:q,unitQuantity:unitBundle,removeQuantity:needed,unitPrice,baseTotal,total,deal,source:ECONOMY_SOURCE};
}
export function applySale({character,item,quantity=1,haggle=null}={}){
 const plan=planSale({character,item,quantity,haggle});if(!plan.ok)return plan;const out=copy(character);out.economy=out.economy||{equipmentBudget:0,eurobucks:0};out.economy.eurobucks=Math.max(0,n(out.economy.eurobucks))+plan.total;
 let remaining=plan.removeQuantity;out.inventory=Array.isArray(out.inventory)?out.inventory:[];
 for(let i=out.inventory.length-1;i>=0&&remaining>0;i--){const row=out.inventory[i];if(row.itemId!==item.id)continue;if(row.equipped)return{ok:false,reason:'equipped-item'};const have=Math.max(0,n(row.quantity,1)),take=Math.min(have,remaining);row.quantity=have-take;remaining-=take;if(row.quantity<=0)out.inventory.splice(i,1)}
 if(remaining>0)return{ok:false,reason:'sale-quantity-drift'};
 return{ok:true,plan,character:out,source:ECONOMY_SOURCE};
}
