import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = process.env.CPRED_ANDROID_ATLAS ||
  'build-source/android/app/src/main/assets/web/app/atlas.js';
const src = fs.readFileSync(path,'utf8');
const match = src.match(/\n\s*renderToken\(\)\{\n([\s\S]*?)\n\s*\}/);
assert.ok(match,'Find production NightCityAtlas.renderToken in packaged source');

const clamp = (value,min,max)=>Math.max(min,Math.min(max,value));
const doc = {querySelector: selector => selector==='#tokenPreview'?{src:'data:token/png;base64,test'}:null};
const renderToken = new Function('clamp','document','return function renderToken(){\n'+match[1]+'\n}')(clamp,doc);
const manifest={sourceWidth:6400,sourceHeight:9600};
function mock(scale){
 const token={style:{},classList:{toggle(){}},src:''};
 const instance={scale,manifest,vp:{clientWidth:384,clientHeight:700},
   getPosition(){return {x:.32,y:.51}},token,
   getCharacter(){return {worldPosition:{travelMode:'walk'}}},
   travelMode:'walk',travelSelect:{value:''},status:{textContent:''},
   nearestDistrict(){return {name:'Watson'}}};
 renderToken.call(instance);
 return {token,screenSize:parseFloat(token.style.width)*scale,worldX:parseFloat(token.style.left),worldY:parseFloat(token.style.top)};
}

test('Night City token remains large at overview zoom and uses stable world coordinates',()=>{
 const overview=mock(.032);
 const fit=mock(.06);
 const close=mock(.2);
 assert.ok(overview.screenSize>=84 && overview.screenSize<=104, 'overview must be >=84px');
 assert.ok(fit.screenSize>=75 && fit.screenSize<=90,'fit should be near 84px');
 assert.ok(close.screenSize>=64 && close.screenSize<fit.screenSize,'close zoom smaller, but readable');
 assert.ok(overview.screenSize>close.screenSize+15,'zoom out makes the token significantly larger');
 for (const x of [overview,fit,close]){
   assert.equal(x.worldX,manifest.sourceWidth*.32);
   assert.equal(x.worldY,manifest.sourceHeight*.51);
   assert.equal(x.token.src,'data:token/png;base64,test');
 }
});

test('token stays >=64 and <=104 screen pixels at extreme zoom and layout widths',()=>{
 for (const zoom of [.001,.016,.025,.05,.2,1.6]){
   const x=mock(zoom);
   assert.ok(x.screenSize>=63.999 && x.screenSize<=104.001,'zoom '+zoom+' -> '+x.screenSize);
 }
});
