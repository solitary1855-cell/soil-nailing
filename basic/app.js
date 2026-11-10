(function(){
"use strict";
var DRAFT="soilnail-basic-draft-v1", CASES="soilnail-basic-cases-v1";
var EXAMPLE={name:"範例：BREAK OUT _MODIFY A（H = 10 m）",unit:"kN",
  H:10,face:80,beta:0,q:10,gt:20,gs:20,phi:28,gw:9.81,gwN:"",gwS:"",drained:false,
  method:"grout",Ddh:100,qu:100,kdelta:0.6667,fy:412.02,taR:0.55,excelTrib:false,
  nails:[{z:1.8,sh:2,L:13,ang:15,bar:"D29"},{z:3.4,sh:1.6,L:13,ang:15,bar:"D29"},{z:4.8,sh:1.6,L:13,ang:15,bar:"D29"},
         {z:6.2,sh:1.4,L:13,ang:15,bar:"D29"},{z:7.6,sh:1.2,L:13,ang:15,bar:"D29"},{z:9,sh:1.2,L:13,ang:15,bar:"D29"}]};
var FIELDS={H:"L",face:"A",beta:"A",q:"P",gt:"G",gs:"G",phi:"A",gw:"G",gwN:"L",gwS:"L",Ddh:"-",qu:"P",kdelta:"-",fy:"S",taR:"-"};
var OPTIONAL={gwN:1,gwS:1,beta:1,q:1};
var SELECTS=["method"], CHECKS=["drained","excelTrib"];
var GACC=9.81, KGF=1/0.0981;
var UNITS={t:{key:"t",name:"公噸制",F:"t",P:"t/m²",G:"t/m³",S:"kgf/cm²",FL:"t/m",M:"t·m/m"},kN:{key:"kN",name:"SI 制",F:"kN",P:"kPa",G:"kN/m³",S:"MPa",FL:"kN/m",M:"kN·m/m"}};
function U(){return UNITS[state&&state.unit==="t"?"t":"kN"];}
function clone(o){return JSON.parse(JSON.stringify(o));}
function $(id){return document.getElementById(id);}
function num(v){if(v===null||v===undefined||v==="")return NaN; var x=parseFloat(String(v).replace(/,/g,"")); return isFinite(x)?x:NaN;}
function fmt(x,n){if(x===null||x===undefined||!isFinite(x))return "—"; return x.toFixed(n===undefined?2:n);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function cF(v){return state.unit==="t"?v/GACC:v;}
function fF(v,n){return fmt(cF(v),n===undefined?2:n);}
var fFL=fF, fP=fF;
function fS(v,n){return fmt(state.unit==="t"?v*KGF:v,n===undefined?1:n);}
var SUBRE=/(?<=[A-Za-z0-9'σφγδτΔ)])_\{([^}]*)\}|(?<=[A-Za-z0-9'σφγδτΔ)])_([A-Za-z0-9',]+)/g;
function subH(h){return h.replace(SUBRE,function(m,a,b){return "<sub>"+(a!==undefined?a:b)+"</sub>";});}
/* ---------- storage ---------- */
var storageOK=true;
function lsGet(k){try{return localStorage.getItem(k);}catch(e){storageOK=false;return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){storageOK=false;return false;}}
function normalize(s){
  if(!s||!Array.isArray(s.nails))return null;
  var o=clone(EXAMPLE); Object.keys(o).forEach(function(k){if(s[k]!==undefined)o[k]=s[k];});
  o.nails=s.nails.map(function(n){return {z:n.z,sh:n.sh,L:n.L,ang:n.ang,bar:(SN.BARS[n.bar]?n.bar:"D29")};});
  if(typeof o.name!=="string")o.name="";
  o.unit=s.unit==="t"?"t":"kN"; if(!o.fsCustom||typeof o.fsCustom!=="object")o.fsCustom={};
  return o;
}
var state=null, currentId=null, savedSnap=null;
(function boot(){
  var raw=lsGet(DRAFT), d=null; try{d=raw?JSON.parse(raw):null;}catch(e){d=null;}
  if(d&&d.state){state=normalize(d.state);currentId=d.currentId||null;savedSnap=d.savedSnap||null;}
  if(!state)state=clone(EXAMPLE);
})();
function saveDraft(){lsSet(DRAFT,JSON.stringify({state:state,currentId:currentId,savedSnap:savedSnap}));}
function readCases(){var raw=lsGet(CASES); try{var c=raw?JSON.parse(raw):null; return (c&&Array.isArray(c.cases))?c.cases:[];}catch(e){return [];}}
function writeCases(list){return lsSet(CASES,JSON.stringify({cases:list}));}
function snap(){return JSON.stringify(state);}
function updateSaveChip(){
  var c=$("savestate");
  if(!currentId){c.textContent="尚未儲存";c.className="chip";}
  else if(snap()===savedSnap){c.textContent="已儲存";c.className="chip saved";}
  else{c.textContent="有未儲存的變更";c.className="chip dirty";}
}
var ctT=null;
function caseToast(msg,err){var t=$("casetoast");t.textContent=msg;t.className="toast"+(err?" err":"");clearTimeout(ctT);ctT=setTimeout(function(){t.textContent="";},4500);}
function newId(){return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function stamp(t){var d=new Date(t);function p(n){return (n<10?"0":"")+n;} return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes());}
function doSave(asNew){
  var nm=(state.name||"").trim();
  if(!nm){$("casename").classList.add("bad");$("casename").focus();caseToast("請先輸入案件名稱再儲存。",true);return;}
  var list=readCases(), now=Date.now(), id=currentId, found=null;
  if(!asNew&&id){list.forEach(function(c){if(c.id===id)found=c;});}
  if(asNew){var names=list.map(function(c){return c.name;});
    if(names.indexOf(nm)>=0){var k=2;while(names.indexOf(nm+"（"+k+"）")>=0)k++;nm=nm+"（"+k+"）";state.name=nm;$("casename").value=nm;}}
  if(found){found.name=nm;found.savedAt=now;found.data=clone(state);}
  else{id=newId();list.unshift({id:id,name:nm,savedAt:now,data:clone(state)});}
  if(!writeCases(list)){caseToast("這個瀏覽器不允許本機儲存，請改用「備份檔」匯出。",true);return;}
  currentId=id; savedSnap=snap(); saveDraft(); updateSaveChip(); renderCaseList();
  caseToast("已儲存「"+nm+"」 "+stamp(now));
}
$("btn-save").addEventListener("click",function(){doSave(false);});
$("btn-saveas").addEventListener("click",function(){doSave(true);});
$("casename").addEventListener("input",function(e){state.name=e.target.value;e.target.classList.remove("bad");saveDraft();updateSaveChip();});
function loadState(s,id){state=normalize(s)||clone(EXAMPLE); currentId=id||null; savedSnap=id?snap():null; fillAll(); run();}
function renderCaseList(){
  var ul=$("caselist"), list=readCases(); ul.innerHTML="";
  if(!storageOK){ul.innerHTML='<li class="empty">這個瀏覽器不允許本機儲存，請改用備份檔。</li>';return;}
  if(!list.length){ul.innerHTML='<li class="empty">還沒有儲存的案件。輸入案件名稱後按「儲存」。</li>';return;}
  list.sort(function(a,b){return b.savedAt-a.savedAt;}).forEach(function(c){
    var li=document.createElement("li"); if(c.id===currentId)li.className="cur";
    li.innerHTML='<span class="ci"><b>'+esc(c.name)+'</b><small>'+stamp(c.savedAt)+'</small></span><button type="button" data-a="open" data-id="'+c.id+'">開啟</button><button type="button" class="ghost" data-a="del" data-id="'+c.id+'">刪除</button>';
    ul.appendChild(li);
  });
}
$("caselist").addEventListener("click",function(e){
  var b=e.target.closest("button[data-a]"); if(!b)return;
  var id=b.dataset.id, list=readCases(), c=list.filter(function(x){return x.id===id;})[0]; if(!c)return;
  if(b.dataset.a==="open"){loadState(c.data,c.id);$("menu-open").open=false;caseToast("已開啟「"+c.name+"」");}
  else{
    if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent="確定刪除？";setTimeout(function(){if(b.isConnected){b.classList.remove("armed");b.textContent="刪除";}},3500);return;}
    writeCases(list.filter(function(x){return x.id!==id;}));
    if(currentId===id){currentId=null;savedSnap=null;saveDraft();updateSaveChip();}
    renderCaseList(); caseToast("已刪除「"+c.name+"」");
  }
});
$("menu-open").addEventListener("toggle",function(e){if(e.target.open){renderCaseList();$("menu-file").open=false;}});
$("menu-file").addEventListener("toggle",function(e){if(e.target.open)$("menu-open").open=false;});
document.addEventListener("click",function(e){["menu-open","menu-file"].forEach(function(id){var m=$(id);if(m.open&&!m.contains(e.target))m.open=false;});});
function safeName(s){return (s||"土釘計算").replace(/[\\\/:*?"<>|]+/g,"_").trim()||"土釘計算";}
function download(blob,name){var a=document.createElement("a"), url=URL.createObjectURL(blob); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(url);a.remove();},1500);}
$("btn-exjson").addEventListener("click",function(){
  var data={app:"soil-nailing-basic",version:1,exportedAt:new Date().toISOString(),cases:[{name:state.name||"",data:clone(state)}]};
  download(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),safeName(state.name)+".json"); $("menu-file").open=false; caseToast("已匯出目前案件備份檔。");
});
$("btn-exall").addEventListener("click",function(){
  var list=readCases(); if(!list.length){caseToast("還沒有儲存的案件可以匯出。",true);return;}
  var data={app:"soil-nailing-basic",version:1,exportedAt:new Date().toISOString(),cases:list.map(function(c){return {name:c.name,savedAt:c.savedAt,data:c.data};})};
  download(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),"土釘抗拉拉拔_全部案件_"+stamp(Date.now()).slice(0,10)+".json"); $("menu-file").open=false; caseToast("已匯出 "+list.length+" 個案件。");
});
$("btn-imjson").addEventListener("click",function(){$("file-json").click();});
$("file-json").addEventListener("change",function(e){
  var f=e.target.files&&e.target.files[0]; if(!f)return; var rd=new FileReader();
  rd.onload=function(){
    var obj=null; try{obj=JSON.parse(rd.result);}catch(err){caseToast("無法讀取這個檔案，請確認是本工具匯出的 .json 備份檔。",true);return;}
    var items=[]; if(obj&&Array.isArray(obj.cases))items=obj.cases; else if(obj&&obj.nails)items=[{name:obj.name,data:obj}];
    items=items.map(function(c){var d=normalize(c.data||c);if(d&&c.name&&!d.name)d.name=c.name;return d?{name:(c.name||d.name||"匯入案件"),data:d}:null;}).filter(Boolean);
    if(!items.length){caseToast("檔案中沒有可用的案件資料。",true);return;}
    var list=readCases(), now=Date.now(); items.forEach(function(c,i){list.unshift({id:newId(),name:c.name,savedAt:now-i,data:c.data});});
    var stored=writeCases(list), first=list[0]; loadState(first.data,stored?first.id:null); $("menu-file").open=false;
    caseToast(stored?("已匯入 "+items.length+" 個案件，並開啟「"+first.name+"」。"):"已載入檔案，但此瀏覽器無法本機儲存。",!stored);
  };
  rd.readAsText(f); e.target.value="";
});

/* ---------- 單位 ---------- */
function applyUnitLabels(){
  var u=U(); Array.prototype.forEach.call(document.querySelectorAll("[data-u]"),function(el){el.textContent=u[el.dataset.u];});
  Array.prototype.forEach.call(document.querySelectorAll('input[name="unit"]'),function(r){r.checked=(r.value===u.key);});
}
function convVal(v,f){var n=num(v); if(!isFinite(n))return v; return Math.round(n*f*10000)/10000;}
function switchUnit(to){
  var from=state.unit==="t"?"t":"kN"; if(to===from)return;
  var fPG=to==="kN"?GACC:1/GACC, fS_=to==="kN"?1/KGF:KGF;
  Object.keys(FIELDS).forEach(function(k){var c=FIELDS[k]; if(c==="P"||c==="G")state[k]=convVal(state[k],fPG); else if(c==="S"){state[k]=convVal(state[k],fS_); var nn=num(state[k]); if(isFinite(nn))state[k]=Math.round(nn*100)/100;}});
  state.unit=to; fillAll(); run();
  caseToast("已切換為"+U().name+"（"+U().F+"、"+U().P+"、"+U().S+"），輸入值已依 1 t = 9.81 kN 換算。");
}
Array.prototype.forEach.call(document.querySelectorAll('input[name="unit"]'),function(r){r.addEventListener("change",function(){if(r.checked)switchUnit(r.value);});});

/* ---------- 輸入 ---------- */
function fillAll(){
  Object.keys(FIELDS).forEach(function(k){var el=$(k); var v=state[k]; el.value=(v===undefined||v===null||(typeof v==="number"&&!isFinite(v)))?"":v; el.classList.remove("bad");});
  SELECTS.forEach(function(k){$(k).value=state[k];}); CHECKS.forEach(function(k){$(k).checked=!!state[k];});
  $("casename").value=state.name||""; applyUnitLabels(); buildNails(); fillBond(); showMethod();
}
Object.keys(FIELDS).forEach(function(k){
  $(k).addEventListener("input",function(e){var v=e.target.value; state[k]=v===""?"":num(v); e.target.classList.toggle("bad",v!==""&&!isFinite(num(v))); if(k==="qu")$("bondpick").value=""; run();});
});
SELECTS.forEach(function(k){$(k).addEventListener("change",function(e){state[k]=e.target.value; if(k==="method")showMethod(); run();});});
CHECKS.forEach(function(k){$(k).addEventListener("change",function(e){state[k]=e.target.checked; run();});});
function showMethod(){Array.prototype.forEach.call(document.querySelectorAll("[data-m]"),function(el){el.hidden=el.dataset.m!==state.method;});}
/* GEC 7（FHWA-NHI-14-007, 2015）表 4.4a、4.4b、4.5，psi → kPa（1 psi = 6.895 kPa） */
var BONDT=[
  {id:"4.4a",title:"表 4.4a　粗粒土之握裹強度估計值",rows:SN.BOND.slice(0,11).map(function(b){return {m:b.m,s:b.s,lo:b.lo,hi:b.hi};})},
  {id:"4.4b",title:"表 4.4b　細粒土之握裹強度估計值",rows:SN.BOND.slice(11).map(function(b){return {m:b.m,s:b.s,lo:b.lo,hi:b.hi};})},
  {id:"4.5",title:"表 4.5　岩盤之握裹強度估計值（旋轉鑽孔）",rows:[["泥灰岩／石灰岩",44,58],["千枚岩",15,44],["白堊",73,87],["軟白雲岩",58,87],["裂隙白雲岩",87,145],["風化砂岩",29,44],["風化頁岩",15,22],["風化片岩",15,25],["玄武岩",73,87],["板岩／硬頁岩",44,58]].map(function(r){return {m:"旋轉鑽孔",s:r[0],lo:Math.round(r[1]*6.895),hi:Math.round(r[2]*6.895),plo:r[1],phi:r[2]};})}
];
/* SN.BOND 的英文原表順序：4.4a 為前 12 列（含粉土質砂回填等螺旋鑽 3 列），4.4b 為後 7 列 */
(function(){var A=SN.BOND, aIdx=[0,1,2,3,4,6,7,8,9,11,12,13], bIdx=[5,10,14,15,16,17,18];
  function mk(i){var b=A[i]; return {m:b.m,s:b.s,lo:b.lo,hi:b.hi,plo:Math.round(b.lo/6.895),phi:Math.round(b.hi/6.895)};}
  BONDT[0].rows=aIdx.map(mk); BONDT[1].rows=bIdx.map(mk);})();
var BONDALL=[]; BONDT.forEach(function(t){t.rows.forEach(function(r){r.tab=t.id; BONDALL.push(r);});});
function fillBond(){
  var u=U(), d=state.unit==="t"?1:0;
  $("bondpick").innerHTML='<option value="">GEC 7 表 4.4／4.5 參考值（帶入下限）…</option>'+BONDT.map(function(t){
    return '<optgroup label="'+esc(t.title)+'">'+t.rows.map(function(r){var i=BONDALL.indexOf(r);
      return '<option value="'+i+'">'+esc(r.m+"・"+r.s+"："+fmt(cF(r.lo),d)+"～"+fmt(cF(r.hi),d)+" "+u.P)+'</option>';}).join("")+'</optgroup>';}).join("");
  renderBondRef();
}
function renderBondRef(){
  var u=U(), d=state.unit==="t"?1:0;
  $("bondref").innerHTML='<div class="bt">'+BONDT.map(function(t){
    var rock=t.id==="4.5";
    return '<div><h3 class="sub3">'+esc(t.title)+'</h3><div class="tbl-scroll"><table><thead><tr>'+(rock?'':'<th class="l">鑽孔方式</th>')+'<th class="l">'+(rock?'岩性':'土壤種類')+'</th><th>q<sub>u</sub><br>psi</th><th>q<sub>u</sub><br>'+u.P+'</th><th></th></tr></thead><tbody>'+
      t.rows.map(function(r){var i=BONDALL.indexOf(r);
        return '<tr>'+(rock?'':'<td class="l t">'+esc(r.m)+'</td>')+'<td class="l t">'+esc(r.s)+'</td><td>'+r.plo+'～'+r.phi+'</td><td>'+fmt(cF(r.lo),d)+'～'+fmt(cF(r.hi),d)+'</td><td><button type="button" class="ghost" data-bond="'+i+'">帶入下限</button></td></tr>';}).join("")+
      '</tbody></table></div></div>';}).join("")+'</div>'+
    '<p class="hint" style="margin-top:8px">資料來源：FHWA GEC No.7（FHWA-NHI-14-007, 2015）表 4.4a、4.4b、4.5，原表修改自 Elias and Juran（1991）。原表單位為 psi，換算 1 psi = 6.895 kPa。表 4.4a 中「打入套管」為鑽孔成孔方式，低／高覆土以有效覆土壓力小於／大於 1.5 tsf（約 144 kPa）區分。表列為估計值，設計值應以現場拉拔試驗驗證。</p>';
}
function useBond(i){var b=BONDALL[+i]; if(!b)return; state.qu=state.unit==="t"?Math.round(b.lo/GACC*100)/100:b.lo; $("qu").value=state.qu; $("qu").classList.remove("bad"); run(); caseToast("已帶入表 "+b.tab+"「"+b.m+"・"+b.s+"」下限值。實際設計請以拉拔試驗驗證。");}
$("bondpick").addEventListener("change",function(e){var i=e.target.value; if(i==="")return; useBond(i);});
document.addEventListener("click",function(e){var b=e.target.closest("[data-bond]"); if(!b)return; useBond(b.dataset.bond); $("bondpick").value="";});
var armT=null;
$("btn-example").addEventListener("click",function(e){
  var b=e.currentTarget;
  if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent="再按一次以覆蓋目前輸入";clearTimeout(armT);armT=setTimeout(function(){b.classList.remove("armed");b.textContent="載入範例";},3500);return;}
  b.classList.remove("armed"); b.textContent="載入範例"; var u=state.unit; state=clone(EXAMPLE); currentId=null; savedSnap=null;
  fillAll(); if(u==="t")switchUnit("t"); else run(); caseToast("已載入範例（原 Excel「BREAK OUT _MODIFY A」配置）。");
});
var nbody=document.querySelector("#nails tbody");
function buildNails(){
  var bars=Object.keys(SN.BARS);
  nbody.innerHTML=state.nails.map(function(n,i){
    function inp(k){return '<input data-i="'+i+'" data-nk="'+k+'" inputmode="decimal" value="'+esc(n[k]===undefined?"":n[k])+'" aria-label="第 '+(i+1)+' 排 '+k+'">';}
    return '<tr><td class="idx">'+(i+1)+'</td><td>'+inp("z")+'</td><td>'+inp("sh")+'</td><td>'+inp("L")+'</td><td>'+inp("ang")+'</td><td class="l"><select data-i="'+i+'" data-nk="bar">'+bars.map(function(b){return '<option'+(b===n.bar?" selected":"")+'>'+b+'</option>';}).join("")+'</select></td><td class="as">'+fmt(SN.BARS[n.bar].As,2)+'</td><td><button type="button" class="ghost" data-del="'+i+'" aria-label="刪除第 '+(i+1)+' 排">刪除</button></td></tr>';
  }).join("");
}
nbody.addEventListener("input",function(e){var t=e.target, i=+t.dataset.i, k=t.dataset.nk; if(!k)return;
  if(k==="bar"){state.nails[i].bar=t.value; t.closest("tr").querySelector(".as").textContent=fmt(SN.BARS[t.value].As,2);}
  else{var v=t.value; state.nails[i][k]=v===""?"":num(v); t.classList.toggle("bad",!isFinite(num(v)));}
  run();});
nbody.addEventListener("change",function(e){if(e.target.tagName==="SELECT")nbody.dispatchEvent(new Event("input",{bubbles:true}));});
nbody.addEventListener("click",function(e){var b=e.target.closest("[data-del]"); if(!b)return; if(state.nails.length<=1){caseToast("至少需要一排土釘。",true);return;} state.nails.splice(+b.dataset.del,1); buildNails(); run();});
$("btn-addnail").addEventListener("click",function(){
  var last=state.nails[state.nails.length-1]||{z:1,sh:1.5,L:8,ang:15,bar:"D29"};
  var z=Math.min(num(last.z)+1.4,num(state.H)-0.5); state.nails.push({z:Math.round(z*100)/100,sh:last.sh,L:last.L,ang:last.ang,bar:last.bar}); buildNails(); run();
});

/* ---------- SI ---------- */
function toSI(){
  var s={c:0,fh:10,fc:20.6,fym:274.68,asv:3.55,ash:3.55,lbp:20,CF:0,overdig:0.5}, errs=[];
  Object.keys(FIELDS).forEach(function(k){
    var v=num(state[k]), c=FIELDS[k];
    if(!isFinite(v)){ if(OPTIONAL[k]){ v=(k==="gwN"||k==="gwS")?null:0; } else { errs.push(k); v=NaN; } }
    else if(state.unit==="t"){ if(c==="P"||c==="G")v=v*GACC; else if(c==="S")v=v/KGF; }
    s[k]=v;
  });
  SELECTS.forEach(function(k){s[k]=state[k];}); CHECKS.forEach(function(k){s[k]=!!state[k];});
  s.fsCustom=state.fsCustom;
  s.nails=state.nails.map(function(n){return {z:num(n.z),sh:num(n.sh),L:num(n.L),ang:num(n.ang),bar:n.bar};});
  if(!(s.H>0))errs.push("H"); if(!(s.face>30&&s.face<=90))errs.push("face"); if(!(s.phi>0&&s.phi<60))errs.push("phi");
  if(!(s.taR>0&&s.taR<=1))errs.push("taR");
  ["gt","gs","gw","fy"].forEach(function(k){if(!(s[k]>0))errs.push(k);});
  if(s.method==="grout"&&!(s.Ddh>0&&s.qu>0))errs.push("qu");
  if(s.method==="driven"&&!(s.kdelta>0))errs.push("kdelta");
  if(s.gwN!==null&&s.gwN<0)errs.push("gwN"); if(s.gwS!==null&&s.gwS<0)errs.push("gwS");
  if(s.nails.some(function(n){return !(n.z>0&&n.z<s.H&&n.sh>0&&n.L>0&&n.ang>=0&&n.ang<60);}))errs.push("nails");
  return {s:s,errs:errs};
}
var NAMES={H:"開挖高度",face:"牆面傾角",phi:"摩擦角",gt:"單位重",gs:"飽和單位重",gw:"水單位重",fy:"鋼筋 fy",taR:"容許拉力比（0～1）",qu:"鑽孔直徑或握裹強度",kdelta:"摩擦折減 k",gwN:"常時水位",gwS:"暴雨水位",nails:"土釘配置（深度須在 0～H 之間）"};

/* ---------- 計算與呈現 ---------- */
var LAST=null;
function run(){
  saveDraft(); updateSaveChip();
  var t=toSI(), s=t.s;
  if(t.errs.length){LAST=null; $("checks").innerHTML=""; $("alerts").innerHTML='<li>請確認輸入：'+t.errs.map(function(k){return NAMES[k]||k;}).join("、")+'</li>'; $("big-fs").textContent="—"; $("big-ok").textContent="—"; return;}
  var I=SN.internal(s);
  I.rows.forEach(function(r){r.Ta=s.taR*r.Rt; r.Tah=r.Ta*Math.cos(r.n.ang*Math.PI/180); r.rT=r.Tah/r.Th; r.okT=r.Tah>=r.Th-1e-9; r.okP=r.FSpo>=1-1e-9; r.ok=r.okT&&r.okP;});
  LAST={s:s,I:I};
  renderSummary(); renderTension(); renderPullout(); drawFig();
}
function renderSummary(){
  var I=LAST.I, s=LAST.s;
  var a=I.rows.reduce(function(m,r){return r.rT<m.rT?r:m;}), b=I.rows.reduce(function(m,r){return r.FSpo<m.FSpo?r:m;});
  var nok=I.rows.filter(function(r){return r.ok;}).length;
  var items=[{t:"鋼筋抗拉 T_a·cosψ / T_h（最小）",v:a.rT,note:"第 "+a.i+" 排",lab:"≥ 1.00"},{t:"拉拔 SF = R_po / T（最小）",v:b.FSpo,note:"第 "+b.i+" 排",lab:"≥ 1.00"}];
  I.rows.forEach(function(r){items.push({t:"第 "+r.i+" 排（z = "+fmt(r.n.z,2)+" m）",v:Math.min(r.rT,r.FSpo),note:"抗拉 "+fmt(r.rT,3)+"・拉拔 SF "+fmt(r.FSpo,2),lab:"取小值 ≥ 1.00"});});
  $("checks").innerHTML=items.map(function(it){var ok=it.v>=1-1e-9;
    return '<li><span>'+subH(esc(it.t))+'<small>'+esc(it.note)+'</small></span><b>'+fmt(it.v,3)+' <small style="display:inline">'+it.lab+'</small></b><span class="tag '+(ok?"ok":"ng")+'">'+(ok?"OK":"NG")+'</span></li>';}).join("");
  $("big-fs").textContent=fmt(b.FSpo,2); $("big-req").textContent="≥ 1.00 OK"; $("bb1").classList.toggle("ngbox",!b.okP);
  $("big-ok").textContent=nok+" / "+I.rows.length; $("bb2").classList.toggle("ngbox",nok<I.rows.length);
  var al=[];
  if(s.method==="driven")al.push("打入式以鋼筋周長計算拉拔，阻抗通常很小。若現場為鑽孔灌漿，請改選「鑽孔灌漿式」。");
  if(s.excelTrib)al.push("目前採原 Excel 點值法分配土壓，第一排偏大、各排總和不等於 Rankine 總土壓。");
  if(s.gwN===null&&s.gwS===null)al.push("未輸入地下水位，需求拉力以乾燥狀態計算。");
  if(I.rows.some(function(r){return r.Lp<=0.5;}))al.push("有土釘在 Rankine 破壞面以外的長度不足 0.5 m，請加長土釘。");
  al.push("判定方式依原 Excel：抗拉 T_a·cosψ ≥ T_h（T_a = "+fmt(s.taR,2)+" f_y·A_s），拉拔 SF = R_po / T ≥ 1.0。");
  $("alerts").innerHTML=al.map(function(t,i){return '<li'+(i===al.length-1?' class="ok"':'')+'>'+subH(esc(t))+'</li>';}).join("");
}
function okCell(ok){return ok?'<span class="ok">OK</span>':'<span class="ng">NG</span>';}
function renderTension(){
  var I=LAST.I, s=LAST.s, u=U();
  $("ka-note").innerHTML="K<sub>a</sub> = "+fmt(I.Ka,4)+"　破壞面 "+fmt(I.theta,1)+"°";
  var h='<thead><tr><th>#</th><th>z<br>m</th><th>σ<sub>h</sub>(z)<br>'+u.P+'</th><th>S<sub>V</sub><br>m</th><th>P<br>'+u.FL+'</th><th>S<sub>H</sub><br>m</th><th>T<sub>h</sub><br>'+u.F+'</th><th class="l">鋼筋</th><th>A<sub>s</sub><br>cm²</th><th>T<sub>a</sub> = '+fmt(s.taR,2)+'f<sub>y</sub>A<sub>s</sub><br>'+u.F+'</th><th>T<sub>a</sub>·cosψ<br>'+u.F+'</th><th>T<sub>a</sub>cosψ / T<sub>h</sub></th><th>判定</th></tr></thead><tbody>';
  I.rows.forEach(function(r){
    h+='<tr class="'+(r.okT?"":"ng")+'"><td>'+r.i+'</td><td>'+fmt(r.n.z,2)+'</td><td>'+fP(r.pz)+'</td><td>'+fmt(r.sv,2)+'</td><td>'+fFL(r.P)+'</td><td>'+fmt(r.n.sh,2)+'</td><td>'+fF(r.Th)+'</td><td class="l t">'+r.n.bar+'</td><td>'+fmt(r.bar.As,2)+'</td><td>'+fF(r.Ta)+'</td><td>'+fF(r.Tah)+'</td><td>'+fmt(r.rT,3)+'</td><td>'+okCell(r.okT)+'</td></tr>';});
  $("tten").innerHTML=h+'</tbody>';
  var tot=I.rows.reduce(function(a,r){return a+r.P;},0);
  $("ten-notes").innerHTML='<p>各排土壓合力加總 '+fFL(tot)+' '+u.FL+'；Rankine 總土壓（常時水位）'+fFL(I.Ptot)+' '+u.FL+(s.excelTrib?'（點值法不會相等）':'')+'。'+(I.cases.length>1?'各排取常時與暴雨水位之大值。':'')+'</p><p>依原 Excel：容許拉力 T<sub>a</sub> = '+fmt(s.taR,2)+' × f<sub>y</sub> × A<sub>s</sub>，取水平分量 T<sub>a</sub>·cosψ 與水平需求拉力 T<sub>h</sub>（T requirement）比較，T<sub>a</sub>·cosψ ≥ T<sub>h</sub> 為 OK。</p>';
  var td="";
  I.rows.forEach(function(r){
    var gw=r.wcase==="S"?s.gwS:s.gwN;
    td+='<div class="eqs"><b>第 '+r.i+' 排（z = '+fmt(r.n.z,2)+' m，'+r.n.bar+'，'+(r.wcase==="S"?"暴雨":"常時")+'水位控制）</b>\n'+
      'K_a = '+fmt(I.Ka,4)+(s.beta?'，K_a·cosβ = '+fmt(I.kh,4):'')+'；水位深 '+(gw===null?'無':fmt(gw,2)+' m')+(s.drained?'（面版排水，不計水壓）':'')+'\n'+
      '負擔範圍 '+fmt(r.top,2)+'～'+fmt(r.bot,2)+' m，S_V = '+fmt(r.bot,2)+' − '+fmt(r.top,2)+' = '+fmt(r.sv,2)+' m\n'+
      'σ_h(z) = K_a'+(s.beta?'·cosβ':'')+'·(q + σ\'_v) + u = '+fmt(I.kh,4)+' × ('+fP(s.q)+' + '+fP(SN.sigV(r.n.z,s,gw))+') + '+fP(s.drained?0:SN.uAt(r.n.z,s,gw))+' = '+fP(r.pz)+' '+u.P+'\n'+
      'σ_h(頂) = '+fP(r.ptop)+'，σ_h(底) = '+fP(r.pbot)+' '+u.P+'\n'+
      (s.excelTrib?'P = σ_h(z) × S_V = '+fP(r.pz)+' × '+fmt(r.sv,2):'P = ∫σ_h dz（'+fmt(r.top,2)+'～'+fmt(r.bot,2)+' m，Simpson）')+' = '+fFL(r.P)+' '+u.FL+'\n'+
      'T_h = P × S_H = '+fFL(r.P)+' × '+fmt(r.n.sh,2)+' = '+fF(r.Th)+' '+u.F+'（T requirement）\n'+
      'T_a = '+fmt(s.taR,2)+' × f_y × A_s = '+fmt(s.taR,2)+' × '+fS(s.fy)+' '+u.S+' × '+fmt(r.bar.As,2)+' cm² = '+fF(r.Ta)+' '+u.F+'\n'+
      'T_a·cosψ = '+fF(r.Ta)+' × cos'+fmt(r.n.ang,1)+'° = '+fF(r.Tah)+' '+u.F+'　'+(r.okT?'≥':'<')+' T_h = '+fF(r.Th)+' '+u.F+'　'+(r.okT?'OK':'NG')+'</div>';
  });
  $("tendet").innerHTML=subH(td);
}
function renderPullout(){
  var I=LAST.I, s=LAST.s, u=U(), drv=s.method==="driven";
  var h='<thead><tr><th>#</th><th>T 軸力<br>'+u.F+'</th><th>L<br>m</th><th>L<sub>a</sub><br>m</th><th>L<sub>p</sub><br>m</th>'+(drv?'<th>σ\'<sub>v</sub>(中點)<br>'+u.P+'</th>':'')+'<th>拉拔率<br>'+u.FL+'</th><th>R<sub>po</sub><br>'+u.F+'</th><th>SF<br>= R<sub>po</sub>/T</th><th>判定</th></tr></thead><tbody>';
  I.rows.forEach(function(r){var ok=r.okP;
    h+='<tr class="'+(ok?"":"ng")+'"><td>'+r.i+'</td><td>'+fF(r.T)+'</td><td>'+fmt(r.n.L,2)+'</td><td>'+fmt(r.La,2)+'</td><td>'+fmt(r.Lp,2)+'</td>'+(drv?'<td>'+fP(r.sigmid,1)+'</td>':'')+'<td>'+fFL(r.rate)+'</td><td>'+fF(r.Rpo)+'</td><td>'+fmt(r.FSpo,2)+'</td><td>'+okCell(ok)+'</td></tr>';});
  $("tpo").innerHTML=h+'</tbody>';
  $("po-notes").innerHTML='<p>'+(drv?'打入式：拉拔率 = π·d<sub>b</sub>·σ\'<sub>v</sub>·tan('+fmt(s.kdelta,3)+'·φ\')，σ\'<sub>v</sub> 取 L<sub>p</sub> 中點之有效覆土應力（不計超載）。':'鑽孔灌漿式：拉拔率 = π·D<sub>DH</sub>·q<sub>u</sub> = π × '+fmt(s.Ddh/1000,3)+' × '+fP(s.qu)+' = '+fFL(I.rows[0].rate)+' '+u.FL+'。')+'L<sub>a</sub> 為牆面至 Rankine 破壞面之土釘長度（沿土釘），L<sub>p</sub> = L − L<sub>a</sub>。</p>';
  var dd="";
  I.rows.forEach(function(r){
    var g=SN.nailGeom(s,r.n);
    dd+='<div class="eqs"><b>第 '+r.i+' 排（z = '+fmt(r.n.z,2)+' m，L = '+fmt(r.n.L,2)+' m，ψ = '+fmt(r.n.ang,1)+'°）</b>\n'+
      '需求軸力 T = '+fF(r.T)+' '+u.F+'（見 05）\n'+
      '釘頭座標 (x, y) = ('+fmt(g.xh,2)+', '+fmt(g.yh,2)+') m；破壞面 y = x·tan'+fmt(I.theta,1)+'°\n'+
      'L_a = (y_h − x_h·tanθ) / (sinψ + cosψ·tanθ) = '+fmt(r.La,2)+' m\n'+
      'L_p = L − L_a = '+fmt(r.n.L,2)+' − '+fmt(r.La,2)+' = '+fmt(r.Lp,2)+' m\n'+
      (drv?'σ\'_v(L_p 中點，深 '+fmt(r.zmid,2)+' m) = '+fP(r.sigmid)+' '+u.P+'\n拉拔率 = π·d_b·σ\'_v·tan(k·φ\') = π × '+fmt(r.bar.d/1000,4)+' × '+fP(r.sigmid)+' × tan('+fmt(s.kdelta,3)+' × '+fmt(s.phi,1)+'°) = '+fFL(r.rate)+' '+u.FL+'\n'
         :'拉拔率 = π·D_DH·q_u = π × '+fmt(s.Ddh/1000,3)+' × '+fP(s.qu)+' = '+fFL(r.rate)+' '+u.FL+'\n')+
      'R_po = 拉拔率 × L_p = '+fFL(r.rate)+' × '+fmt(r.Lp,2)+' = '+fF(r.Rpo)+' '+u.F+'\n'+
      'SF = R_po / T = '+fF(r.Rpo)+' / '+fF(r.T)+' = '+fmt(r.FSpo,2)+'　'+(r.okP?'≥':'<')+' 1.00　'+(r.okP?'OK':'NG')+'</div>';
  });
  $("intdet").innerHTML=subH(dd);
}

/* ---------- 斷面圖 ---------- */
var EXC={bg:"#ffffff",ink:"#1b2427",muted:"#5a676b",line:"#cdd5d1",accent:"#1d5f86",stress:"#a2561c",warn:"#b4541a",soil:"#efe6cc",dot:"#c8b47e",face:"#7d8a86",warnSoft:"#f7e6d8"};
function figSvg(W,exp){
  var s=LAST.s, I=LAST.I, H=s.H, xcr=SN.faceX(H,s), Lh=0, tb=Math.tan((s.beta||0)*Math.PI/180);
  s.nails.forEach(function(n){Lh=Math.max(Lh,n.L*Math.cos(n.ang*Math.PI/180));});
  function sh(z,gwd){return I.kh*(s.q+SN.sigV(z,s,gwd))+(s.drained?0:SN.uAt(z,s,gwd));}
  var smax=0, k; for(k=0;k<=50;k++){var z=H*k/50; smax=Math.max(smax,sh(z,s.gwN)); if(s.gwS!==null)smax=Math.max(smax,sh(z,s.gwS));}
  var pw=0.38*H, ks=pw/Math.max(smax,1e-6);
  var xmin=-pw-0.25*H, xmax=xcr+Lh+0.3*H, ymin=-0.35*H, ymax=H*1.12+Math.max(0,(xmax-xcr)*tb);
  var pad=26, sc=(W-2*pad)/(xmax-xmin), Ht=Math.round((ymax-ymin)*sc+2*pad);
  function X(x){return (pad+(x-xmin)*sc).toFixed(1);} function Y(y){return (pad+(ymax-y)*sc).toFixed(1);}
  var col=exp?EXC:{bg:"var(--surface)",ink:"var(--ink)",muted:"var(--muted)",line:"var(--line)",accent:"var(--accent)",stress:"var(--stress)",warn:"var(--warn)",soil:"var(--sand)",dot:"var(--sand-ink)",face:"var(--hard-ink)",warnSoft:"var(--warn-soft)"};
  var T='style="font-family:sans-serif;font-size:11px"', TM='style="font-family:monospace;font-size:10.5px"';
  var o='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+Ht+'" width="'+W+'" height="'+Ht+'" role="img" aria-label="土釘斷面、土壓分佈與有效錨定長度">';
  o+='<defs><pattern id="psoil" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="'+col.soil+'" opacity="'+(exp?1:0.55)+'"/><circle cx="2" cy="2" r="0.9" fill="'+col.dot+'"/><circle cx="6.5" cy="6.5" r="0.7" fill="'+col.dot+'"/></pattern></defs>';
  o+='<rect width="'+W+'" height="'+Ht+'" fill="'+col.bg+'"/>';
  var far=xmax, yfar=H+(far-xcr)*tb;
  o+='<path d="M'+X(xmin)+' '+Y(0)+' L'+X(0)+' '+Y(0)+' L'+X(xcr)+' '+Y(H)+' L'+X(far)+' '+Y(yfar)+' L'+X(far)+' '+Y(ymin)+' L'+X(xmin)+' '+Y(ymin)+'Z" fill="url(#psoil)"/>';
  o+='<path d="M'+X(xmin)+' '+Y(0)+' L'+X(0)+' '+Y(0)+' M'+X(xcr)+' '+Y(H)+' L'+X(far)+' '+Y(yfar)+'" stroke="'+col.ink+'" stroke-width="1.5" fill="none"/>';
  o+='<path d="M'+X(0)+' '+Y(0)+' L'+X(xcr)+' '+Y(H)+'" stroke="'+col.face+'" stroke-width="4.5" fill="none"/>';
  // 土壓分佈（畫在牆前，以鉛直基準線 x = −0.12H）
  var x0=-0.12*H;
  function prof(gwd){var p=[]; for(var j=0;j<=60;j++){var z=H*j/60; p.push([x0-sh(z,gwd)*ks,H-z]);} return p;}
  var pN=prof(s.gwN);
  o+='<path d="M'+X(x0)+' '+Y(H)+' L'+pN.map(function(p){return X(p[0])+' '+Y(p[1]);}).join(" L")+' L'+X(x0)+' '+Y(0)+'Z" fill="'+col.warn+'" opacity="0.12"/>';
  o+='<path d="M'+pN.map(function(p){return X(p[0])+' '+Y(p[1]);}).join(" L")+'" stroke="'+col.warn+'" stroke-width="1.8" fill="none"/>';
  if(s.gwS!==null){var pS=prof(s.gwS); o+='<path d="M'+pS.map(function(p){return X(p[0])+' '+Y(p[1]);}).join(" L")+'" stroke="'+col.warn+'" stroke-width="1.3" stroke-dasharray="5 3" fill="none"/>';}
  o+='<path d="M'+X(x0)+' '+Y(H)+' L'+X(x0)+' '+Y(0)+'" stroke="'+col.ink+'" stroke-width="1"/>';
  o+='<text x="'+(+X(x0-sh(H,s.gwN)*ks)-4)+'" y="'+(+Y(0)+14)+'" text-anchor="start" fill="'+col.warn+'" '+TM+'>'+fP(sh(H,s.gwN),1)+'</text>';
  o+='<text x="'+X(x0)+'" y="'+(+Y(H)-6)+'" text-anchor="end" fill="'+col.warn+'" '+T+'>σ<tspan baseline-shift="sub" font-size="80%">h</tspan>（'+U().P+'）</text>';
  // 負擔帶
  I.rows.forEach(function(r){[r.top,r.bot].forEach(function(z){o+='<path d="M'+X(x0-pw-0.05*H)+' '+Y(H-z)+' L'+X(x0)+' '+Y(H-z)+'" stroke="'+col.muted+'" stroke-width="0.7" stroke-dasharray="2 3"/>';});
    o+='<text x="'+X(x0-pw-0.05*H)+'" y="'+(+Y(H-r.n.z)+4)+'" fill="'+col.muted+'" '+TM+'>'+r.i+'</text>';});
  // Rankine 破壞面
  var th=I.theta*Math.PI/180; o+='<path d="M'+X(0)+' '+Y(0)+' L'+X(H/Math.tan(th))+' '+Y(H)+'" stroke="'+col.stress+'" stroke-width="1.3" stroke-dasharray="6 4" fill="none"/>';
  // 水位
  function wline(gwd,dash,lab){ if(gwd===null||!isFinite(gwd))return; var yw=H-gwd; if(yw<0)return; var xs=SN.faceX(yw,s);
    o+='<path d="M'+X(xs)+' '+Y(yw)+' L'+X(far)+' '+Y(yw)+'" stroke="'+col.accent+'" stroke-width="1.3"'+(dash?' stroke-dasharray="7 4"':'')+' fill="none"/>';
    var xt=xcr+Lh+0.12*H; o+='<path d="M'+(+X(xt)-5)+' '+(+Y(yw)-9)+' h10 l-5 8z" fill="'+col.accent+'"/><text x="'+(+X(xt)+8)+'" y="'+(+Y(yw)-3)+'" fill="'+col.accent+'" '+T+'>'+lab+'</text>'; }
  wline(s.gwN,false,"常時"); wline(s.gwS,true,"暴雨");
  // 土釘
  I.rows.forEach(function(r){var g=SN.nailGeom(s,r.n), xa=g.xh+r.La*g.cx, ya=g.yh+r.La*g.cy, x2=g.xh+g.L*g.cx, y2=g.yh+g.L*g.cy;
    var ok=r.ok;
    o+='<path d="M'+X(g.xh)+' '+Y(g.yh)+' L'+X(xa)+' '+Y(ya)+'" stroke="'+col.ink+'" stroke-width="1.3"/>';
    o+='<path d="M'+X(xa)+' '+Y(ya)+' L'+X(x2)+' '+Y(y2)+'" stroke="'+(ok?col.accent:col.warn)+'" stroke-width="3.2"/>';
    o+='<rect x="'+(+X(g.xh)-2.5)+'" y="'+(+Y(g.yh)-5)+'" width="5" height="10" fill="'+col.ink+'"/>';
    o+='<circle cx="'+X(xa)+'" cy="'+Y(ya)+'" r="3" fill="'+col.bg+'" stroke="'+col.stress+'" stroke-width="1.5"/>';
    o+='<text x="'+(+X(x2)+5)+'" y="'+(+Y(y2)+4)+'" fill="'+(ok?col.muted:col.warn)+'" '+TM+'>'+r.i+'  Lp '+fmt(r.Lp,2)+'</text>';
  });
  o+='<text x="'+(+X(xcr)+6)+'" y="'+(+Y(H)-6)+'" fill="'+col.ink+'" '+T+'>牆頂</text>';
  o+='<text x="'+(+X(0)+6)+'" y="'+(+Y(0)+14)+'" fill="'+col.ink+'" '+T+'>牆趾</text>';
  var step=H>12?5:2, bx=pad+6, by=Ht-10;
  o+='<path d="M'+bx+' '+by+' h'+(step*sc).toFixed(1)+'" stroke="'+col.ink+'" stroke-width="2"/><text x="'+(bx+step*sc+6)+'" y="'+(by+4)+'" fill="'+col.muted+'" '+TM+'>'+step+' m</text>';
  return o+'</svg>';
}
function drawFig(){ if(!LAST)return; var W=Math.max(Math.min($("fig").clientWidth||900,1200),320); $("fig").innerHTML=figSvg(W,false); }
var rzT=null; window.addEventListener("resize",function(){clearTimeout(rzT);rzT=setTimeout(drawFig,150);});
/* ---------- Word (.docx) ---------- */
var CRC=(function(){var t=new Uint32Array(256);for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){var c=0xFFFFFFFF;for(var i=0;i<u.length;i++)c=CRC[(c^u[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zip(files){
  var enc=new TextEncoder(), parts=[], central=[], off=0, d=new Date();
  var dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF, dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  files.forEach(function(f){
    var name=enc.encode(f.name), data=typeof f.data==="string"?enc.encode(f.data):f.data, crc=crc32(data);
    var h=new DataView(new ArrayBuffer(30));
    h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);
    h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),name,data);
    var c=new DataView(new ArrayBuffer(46));
    c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);
    c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint16(30,0,true);c.setUint16(32,0,true);
    c.setUint16(34,0,true);c.setUint16(36,0,true);c.setUint32(38,0,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),name); off+=30+name.length+data.length;
  });
  var csize=central.reduce(function(s,a){return s+a.length;},0), e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csize,true);e.setUint32(16,off,true);
  return new Blob(parts.concat(central,[new Uint8Array(e.buffer)]),{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
function x(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
/* 下標語法：X_{ab} 或 X_ab（英數） */
function symParts(s){s=String(s); var out=[], re=/(?<=[A-Za-z0-9'σφγδτΔ)])_\{([^}]*)\}|(?<=[A-Za-z0-9'σφγδτΔ)])_([A-Za-z0-9',]+)/g, last=0, m;
  while((m=re.exec(s))){ if(m.index>last)out.push([s.slice(last,m.index),0]); out.push([m[1]!==undefined?m[1]:m[2],1]); last=re.lastIndex; }
  if(last<s.length)out.push([s.slice(last),0]); return out;}
function run_(t,o){o=o||{};var rp="";if(o.b)rp+="<w:b/><w:bCs/>";if(o.color)rp+='<w:color w:val="'+o.color+'"/>';if(o.sz)rp+='<w:sz w:val="'+o.sz+'"/><w:szCs w:val="'+o.sz+'"/>';
  return symParts(t).map(function(p){if(!p[0])return ""; var r=rp+(p[1]?'<w:vertAlign w:val="subscript"/>':"");
    return "<w:r>"+(r?"<w:rPr>"+r+"</w:rPr>":"")+'<w:t xml:space="preserve">'+x(p[0])+"</w:t></w:r>";}).join("");}
function para(content,o){o=o||{};var pp="";if(o.style)pp+='<w:pStyle w:val="'+o.style+'"/>';if(o.keep)pp+="<w:keepNext/>";if(o.jc)pp+='<w:jc w:val="'+o.jc+'"/>';if(o.sp)pp+='<w:spacing w:before="'+(o.sp[0]||0)+'" w:after="'+(o.sp[1]||0)+'"/>';if(o.ind)pp+='<w:ind w:left="'+o.ind+'" w:hanging="'+(o.hang||0)+'"/>';
  var runs=Array.isArray(content)?content.map(function(c){return typeof c==="string"?run_(c,o):run_(c.t,Object.assign({},o,c));}).join(""):run_(content,o);
  return "<w:p>"+(pp?"<w:pPr>"+pp+"</w:pPr>":"")+runs+"</w:p>";}
function table(widths,rows,o){
  o=o||{}; var sz=o.sz||18, b='w:val="single" w:sz="4" w:space="0" w:color="8C9894"';
  var s='<w:tbl><w:tblPr><w:tblW w:w="'+widths.reduce(function(a,c){return a+c;},0)+'" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top '+b+'/><w:left '+b+'/><w:bottom '+b+'/><w:right '+b+'/><w:insideH '+b+'/><w:insideV '+b+'/></w:tblBorders><w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>';
  widths.forEach(function(w){s+='<w:gridCol w:w="'+w+'"/>';}); s+="</w:tblGrid>";
  rows.forEach(function(row,ri){
    var head=ri===0&&o.header!==false;
    s+="<w:tr>"+(head?'<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>':'<w:trPr><w:cantSplit/></w:trPr>');
    row.forEach(function(cell,ci){
      var c=(cell&&typeof cell==="object")?cell:{t:cell}; var jc=c.jc||(head?"center":((o.align&&o.align[ci])||"center"));
      var fill=head?"DCE6EC":(c.fill||"");
      s+='<w:tc><w:tcPr><w:tcW w:w="'+widths[ci]+'" w:type="dxa"/>'+(fill?'<w:shd w:val="clear" w:color="auto" w:fill="'+fill+'"/>':"")+'<w:vAlign w:val="center"/></w:tcPr>'+
        para(c.t===undefined||c.t===null?"":String(c.t),{jc:jc,sp:[0,0],sz:sz,b:head||c.b,color:c.color})+"</w:tc>";
    });
    s+="</w:tr>";
  });
  return s+"</w:tbl>";
}
function imagePara(rid,cx,cy,pid){
  return '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+pid+'" name="fig'+pid+'"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+pid+'" name="fig'+pid+'.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rid+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}
function svgPng(svg){
  return new Promise(function(resolve){
    try{
      var m=svg.match(/width="(\d+)" height="(\d+)"/), W=+m[1], H=+m[2], img=new Image(), scale=2;
      var url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
      img.onload=function(){try{var c=document.createElement("canvas"); c.width=W*scale; c.height=H*scale; var g=c.getContext("2d"); g.fillStyle="#fff"; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url);
        c.toBlob(function(b){if(!b){resolve(null);return;} b.arrayBuffer().then(function(ab){resolve({data:new Uint8Array(ab),w:W,h:H});},function(){resolve(null);});},"image/png");}catch(e){resolve(null);}};
      img.onerror=function(){URL.revokeObjectURL(url);resolve(null);}; img.src=url;
    }catch(e){resolve(null);}
  });
}
function okc(v,req){return v>=req-1e-9?{t:"OK",color:"2C7A4B",b:true}:{t:"NG",color:"B4541A",b:true};}
function buildDocx(imgs){
  var s=LAST.s, I=LAST.I, u=U(), body=[], today=stamp(Date.now()).slice(0,10), drv=s.method==="driven";
  function H1(t){body.push(para(t,{style:"Heading1"}));} function H2(t){body.push(para(t,{b:true,sp:[160,60],keep:true}));}
  function P(t,o){body.push(para(t,Object.assign({sp:[0,60]},o||{})));} function B(t){body.push(para("•　"+t,{ind:360,hang:360,sp:[0,40],sz:20}));}
  function NOTE(t){body.push(para(t,{sz:18,color:"5A676B",sp:[60,60]}));}
  var OK={t:"OK",color:"2C7A4B",b:true}, NG={t:"NG",color:"B4541A",b:true};
  body.push(para("土釘抗拉與拉拔檢核計算書",{style:"Title"}));
  body.push(para([{t:"案件名稱："},{t:state.name||"（未命名）",b:true}],{jc:"center",sp:[0,0]}));
  body.push(para("計算日期："+today+"　　單位："+u.name+"（"+u.F+"、"+u.P+"、"+u.G+"、"+u.S+"）　　檢核階段：完工",{jc:"center",sp:[0,240],sz:20,color:"5A676B"}));

  H1("一、設計條件");
  var rows=[["項目","數值","單位"],
    ["開挖高度 H",fmt(s.H,2),"m"],["牆面傾角（與水平）",fmt(s.face,1),"°"],["牆頂背坡角 β",fmt(s.beta,1),"°"],["牆頂均布超載 q",fP(s.q),u.P],
    ["單位重 γ_t／γ_{sat}",fmt(cF(s.gt),2)+" / "+fmt(cF(s.gs),2),u.G],["有效摩擦角 φ'",fmt(s.phi,1),"°"],
    ["常時水位深度（牆頂下）",s.gwN===null?"不考慮":fmt(s.gwN,2),"m"],["暴雨（高水位）深度",s.gwS===null?"不檢核":fmt(s.gwS,2),"m"],["水單位重 γ_w",fmt(cF(s.gw),2),u.G],
    ["面版排水（需求拉力不計水壓）",s.drained?"是":"否","—"],["土釘型式",drv?"打入式":"鑽孔灌漿式","—"]];
  if(drv)rows.push(["介面摩擦 tan δ = tan(k·φ')，k",fmt(s.kdelta,3),"—"]); else {rows.push(["鑽孔直徑 D_{DH}",fmt(s.Ddh,0),"mm"]); rows.push(["極限握裹強度 q_u",fP(s.qu),u.P]);}
  rows.push(["土釘鋼筋 f_y",fS(s.fy),u.S],["容許拉力 T_a = k·f_y·A_s，k",fmt(s.taR,2),"—"],["土壓分配",s.excelTrib?"原 Excel 點值法":"面積積分","—"]);
  body.push(table([4200,2600,2838],rows,{align:["left","center","center"],sz:20}));
  var nr=[["排","深度 z m","S_H m","S_V m","長度 L m","傾角 ψ °","鋼筋","A_s cm²"]];
  I.rows.forEach(function(r){nr.push([r.i,fmt(r.n.z,2),fmt(r.n.sh,2),fmt(r.sv,2),fmt(r.n.L,2),fmt(r.n.ang,1),r.n.bar,fmt(r.bar.As,2)]);});
  P("土釘配置：",{b:true,sp:[120,40]}); body.push(table([800,1300,1100,1100,1300,1200,1200,1200],nr,{sz:18}));

  H1("二、分析方法");
  ["主動土壓：Rankine，σ_h = K_a·cosβ·(q + σ'_v) + u"+(s.drained?"（面版排水，不計 u）":"")+"，K_a = "+fmt(I.Ka,4)+"。",
   "各排垂直負擔高度 S_V 取上下兩排之中點，第一排由牆頂起算，最後一排算至牆底。"+(s.excelTrib?"土壓合力 P = σ_h(z)·S_V（原 Excel 點值法）。":"土壓合力 P = ∫σ_h dz（面積積分）。")+(I.cases.length>1?"各排取常時與暴雨水位之大值。":""),
   "水平拉力 T_h = P·S_H；沿土釘軸力 T = T_h / cosψ。",
   "鋼筋抗拉（依原 Excel）：容許拉力 T_a = "+fmt(s.taR,2)+" × f_y × A_s，取水平分量 T_a·cosψ 與水平需求拉力 T_h 比較，T_a·cosψ ≥ T_h 為 OK。",
   "拉拔：Rankine 破壞面通過牆趾，與水平夾 45° + φ'/2 = "+fmt(I.theta,1)+"°；L_a 為牆面至破壞面之土釘長度（沿土釘），有效錨定長度 L_p = L − L_a。"+(drv?"打入式拉拔率 = π·d_b·σ'_v·tanδ，σ'_v 取 L_p 中點之有效覆土應力（不計超載）。":"鑽孔灌漿式拉拔率 = π·D_{DH}·q_u。")+"R_{po} = 拉拔率 × L_p，拉拔 SF = R_{po} / T ≥ 1.0 為 OK。"
  ].forEach(B);

  H1("三、需求拉力與鋼筋抗拉");
  var tr=[["排","z m","σ_h(z) "+u.P,"S_V m","P "+u.FL,"S_H m","T_h "+u.F,"鋼筋","T_a "+u.F,"T_a·cosψ "+u.F,"T_acosψ/T_h","判定"]];
  I.rows.forEach(function(r){tr.push([r.i,fmt(r.n.z,2),fP(r.pz),fmt(r.sv,2),fFL(r.P),fmt(r.n.sh,2),fF(r.Th),r.n.bar,fF(r.Ta),fF(r.Tah),fmt(r.rT,3),r.okT?OK:NG]);});
  body.push(table([500,700,900,700,900,700,900,700,900,1000,1000,738],tr,{sz:16}));
  NOTE("各排土壓合力加總 "+fFL(I.rows.reduce(function(a,r){return a+r.P;},0))+" "+u.FL+"；Rankine 總土壓（常時）"+fFL(I.Ptot)+" "+u.FL+"。T_h 即原 Excel 之 T requirement。");

  H1("四、拉拔阻抗");
  var pr=[["排","T "+u.F,"L m","L_a m","L_p m"].concat(drv?["σ'_v "+u.P]:[]).concat(["拉拔率 "+u.FL,"R_{po} "+u.F,"SF","判定"])];
  I.rows.forEach(function(r){pr.push([r.i,fF(r.T),fmt(r.n.L,2),fmt(r.La,2),fmt(r.Lp,2)].concat(drv?[fP(r.sigmid,1)]:[]).concat([fFL(r.rate),fF(r.Rpo),fmt(r.FSpo,2),r.okP?OK:NG]));});
  body.push(table(drv?[600,1000,900,900,900,1100,1200,1100,1000,938]:[600,1100,1000,1000,1000,1300,1300,1200,1138],pr,{sz:17}));
  imgs.forEach(function(im,i){ if(!im.png)return; var cx=6120000, cy=Math.round(cx*im.png.h/im.png.w); body.push(imagePara("rIdImg"+(i+1),cx,cy,i+1)); body.push(para("圖 "+(i+1)+"　"+im.cap,{jc:"center",sz:18,color:"5A676B",sp:[0,120]})); im.rid="rIdImg"+(i+1); });

  H1("五、算例");
  I.rows.forEach(function(r){
    var g=SN.nailGeom(s,r.n);
    P("第 "+r.i+" 排（z = "+fmt(r.n.z,2)+" m，"+r.n.bar+"，"+(r.wcase==="S"?"暴雨":"常時")+"水位控制）",{b:true,sp:[100,20],keep:true});
    ["負擔範圍 "+fmt(r.top,2)+"～"+fmt(r.bot,2)+" m，S_V = "+fmt(r.sv,2)+" m；σ_h(頂) = "+fP(r.ptop)+"、σ_h(z) = "+fP(r.pz)+"、σ_h(底) = "+fP(r.pbot)+" "+u.P,
     (s.excelTrib?"P = σ_h(z) × S_V = "+fP(r.pz)+" × "+fmt(r.sv,2):"P = ∫σ_h dz")+" = "+fFL(r.P)+" "+u.FL+"；T_h = "+fFL(r.P)+" × "+fmt(r.n.sh,2)+" = "+fF(r.Th)+" "+u.F+"；T = "+fF(r.Th)+" / cos"+fmt(r.n.ang,1)+"° = "+fF(r.T)+" "+u.F,
     "T_a = "+fmt(s.taR,2)+" × "+fS(s.fy)+" "+u.S+" × "+fmt(r.bar.As,2)+" cm² = "+fF(r.Ta)+" "+u.F+"；T_a·cosψ = "+fF(r.Tah)+" "+u.F+(r.okT?" ≥ ":" < ")+"T_h = "+fF(r.Th)+" "+u.F+"（"+(r.okT?"OK":"NG")+"）",
     "釘頭 ("+fmt(g.xh,2)+", "+fmt(g.yh,2)+") m；L_a = "+fmt(r.La,2)+" m；L_p = "+fmt(r.n.L,2)+" − "+fmt(r.La,2)+" = "+fmt(r.Lp,2)+" m",
     (drv?"σ'_v = "+fP(r.sigmid)+" "+u.P+"（L_p 中點深 "+fmt(r.zmid,2)+" m）；拉拔率 = π × "+fmt(r.bar.d/1000,4)+" × "+fP(r.sigmid)+" × tan("+fmt(s.kdelta*s.phi,2)+"°) = "+fFL(r.rate)+" "+u.FL
         :"拉拔率 = π × "+fmt(s.Ddh/1000,3)+" × "+fP(s.qu)+" = "+fFL(r.rate)+" "+u.FL)+"；R_{po} = "+fFL(r.rate)+" × "+fmt(r.Lp,2)+" = "+fF(r.Rpo)+" "+u.F+"；SF = R_{po} / T = "+fmt(r.FSpo,2)+"（"+(r.okP?"OK":"NG")+"）"
    ].forEach(B);
  });

  H1("六、結論");
  var cr=[["排","T_a·cosψ / T_h","抗拉判定","拉拔 SF","拉拔判定","綜合"]];
  I.rows.forEach(function(r){cr.push([r.i,fmt(r.rT,3),r.okT?OK:NG,fmt(r.FSpo,2),r.okP?OK:NG,r.ok?OK:NG]);});
  body.push(table([1200,1700,1500,1700,1500,2038],cr,{sz:20}));

  H1("七、備註");
  ["本計算書只檢核完工階段之鋼筋抗拉與拉拔阻抗，未含面版、加勁體滑動、整體穩定及施工階段檢核。",
   "單一均質土層、水平地下水位，未考慮地震力。",
   "本計算不套用規範安全係數：鋼筋抗拉依原 Excel 之容許拉力 "+fmt(s.taR,2)+" f_y 檢核，拉拔以 SF = R_{po} / T ≥ 1.0 判定。",
   (drv?"打入式土釘以鋼筋周長及介面摩擦計算拉拔，未計入灌漿體。":"極限握裹強度 q_u 應以現場驗證拉拔試驗確認，試驗結果低於設計值時應修正設計。"),
   "本計算書由土釘抗拉與拉拔檢核網頁產生，供初步設計與自我檢核使用。"
  ].forEach(B);
  var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+
    body.join("")+'<w:sectPr><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var W_NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  var styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+W_NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="標楷體" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="160"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style></w:styles>';
  var footer='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+W_NS+'><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:t xml:space="preserve">'+x(state.name||"土釘抗拉與拉拔檢核計算書")+'　第 </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t xml:space="preserve"> 頁</w:t></w:r></w:p></w:ftr>';
  var REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
  var rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="'+REL+'styles" Target="styles.xml"/><Relationship Id="rIdFtr" Type="'+REL+'footer" Target="footer1.xml"/>'+
    imgs.filter(function(im){return im.rid;}).map(function(im,i){return '<Relationship Id="'+im.rid+'" Type="'+REL+'image" Target="media/image'+(i+1)+'.png"/>';}).join("")+'</Relationships>';
  var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
  var root='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+REL+'officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
  var iso=new Date().toISOString().replace(/\.\d+Z$/,"Z");
  var core='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+x("土釘抗拉與拉拔檢核計算書 "+(state.name||""))+'</dc:title><dc:creator>土釘抗拉與拉拔檢核</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+iso+'</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">'+iso+'</dcterms:modified></cp:coreProperties>';
  var files=[{name:"[Content_Types].xml",data:ct},{name:"_rels/.rels",data:root},{name:"docProps/core.xml",data:core},{name:"word/document.xml",data:doc},{name:"word/styles.xml",data:styles},{name:"word/footer1.xml",data:footer},{name:"word/_rels/document.xml.rels",data:rels}];
  imgs.filter(function(im){return im.rid;}).forEach(function(im,i){files.push({name:"word/media/image"+(i+1)+".png",data:im.png.data});});
  return zip(files);
}
$("btn-word").addEventListener("click",function(){
  var b=$("btn-word");
  if(!LAST){caseToast("請先輸入完整的設計條件。",true);return;}
  b.disabled=true; b.textContent="產生中…";
  svgPng(figSvg(900,true)).then(function(png){
    var imgs=[{cap:"斷面、主動土壓分佈與有效錨定長度",png:png}];
    download(buildDocx(imgs),safeName(state.name)+"_土釘抗拉拉拔計算書.docx");
    caseToast(png?"已匯出 Word 計算書。":"已匯出 Word 計算書（此瀏覽器無法產生圖形，已略過）。");
  }).catch(function(err){console.error(err);caseToast("匯出失敗，請再試一次。",true);}).then(function(){b.disabled=false;b.textContent="匯出 Word 計算書";});
});

fillAll(); run();
if(!storageOK)caseToast("這個瀏覽器不允許本機儲存，請改用「備份檔」保存案件。",true);
})();
