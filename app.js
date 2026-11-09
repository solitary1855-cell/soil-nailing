(function(){
"use strict";
var DRAFT="soilnail-draft-v1", CASES="soilnail-cases-v1";
var EXAMPLE={name:"範例：BREAK OUT _MODIFY A（H = 10 m）",unit:"kN",
  H:10,face:80,beta:0,q:10,gt:20,gs:20,phi:28,c:0,gw:9.81,gwN:"",gwS:"",drained:false,
  method:"grout",Ddh:100,qu:100,kdelta:0.6667,fy:412.02,fh:10,fc:20.601,fym:274.68,asv:3.55,ash:3.55,lbp:20,CF:"",
  code:"bldg",fsCustom:{},slopeMethod:"bishop",nailRes:"allow",nailMode:"passive",doStages:true,overdig:0.5,excelTrib:false,
  nails:[{z:1.8,sh:2,L:13,ang:15,bar:"D29"},{z:3.4,sh:1.6,L:13,ang:15,bar:"D29"},{z:4.8,sh:1.6,L:13,ang:15,bar:"D29"},
         {z:6.2,sh:1.4,L:13,ang:15,bar:"D29"},{z:7.6,sh:1.2,L:13,ang:15,bar:"D29"},{z:9,sh:1.2,L:13,ang:15,bar:"D29"}]};
var FIELDS={H:"L",face:"A",beta:"A",q:"P",gt:"G",gs:"G",phi:"A",c:"P",gw:"G",gwN:"L",gwS:"L",Ddh:"-",qu:"P",kdelta:"-",fy:"S",fh:"-",fc:"S",fym:"S",asv:"-",ash:"-",lbp:"-",CF:"-",overdig:"L"};
var OPTIONAL={gwN:1,gwS:1,CF:1,beta:1,c:1,q:1};
var SELECTS=["method","code","slopeMethod","nailRes","nailMode"], CHECKS=["drained","doStages","excelTrib"];
var GACC=9.81, KGF=1/0.0981; // 1 MPa = 10.194 kgf/cm²（與 1 t = 9.81 kN 一致）
var UNITS={t:{key:"t",name:"公噸制",F:"t",P:"t/m²",G:"t/m³",S:"kgf/cm²",FL:"t/m",M:"t·m/m"},kN:{key:"kN",name:"SI 制",F:"kN",P:"kPa",G:"kN/m³",S:"MPa",FL:"kN/m",M:"kN·m/m"}};
function U(){return UNITS[state&&state.unit==="t"?"t":"kN"];}
function clone(o){return JSON.parse(JSON.stringify(o));}
function $(id){return document.getElementById(id);}
function num(v){if(v===null||v===undefined||v==="")return NaN; var x=parseFloat(String(v).replace(/,/g,"")); return isFinite(x)?x:NaN;}
function fmt(x,n){if(x===null||x===undefined||!isFinite(x))return "—"; return x.toFixed(n===undefined?2:n);}
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
/* 顯示換算：SI → 目前單位 */
function cF(v){return state.unit==="t"?v/GACC:v;}           // kN → t
function fF(v,n){return fmt(cF(v),n===undefined?2:n);}
function fFL(v,n){return fmt(cF(v),n===undefined?2:n);}    // kN/m
function fP(v,n){return fmt(cF(v),n===undefined?2:n);}
function fM(v,n){return fmt(cF(v),n===undefined?2:n);}
function fS(v,n){return fmt(state.unit==="t"?v*KGF:v,n===undefined?1:n);}

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
  var data={app:"soil-nailing",version:1,exportedAt:new Date().toISOString(),cases:[{name:state.name||"",data:clone(state)}]};
  download(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),safeName(state.name)+".json"); $("menu-file").open=false; caseToast("已匯出目前案件備份檔。");
});
$("btn-exall").addEventListener("click",function(){
  var list=readCases(); if(!list.length){caseToast("還沒有儲存的案件可以匯出。",true);return;}
  var data={app:"soil-nailing",version:1,exportedAt:new Date().toISOString(),cases:list.map(function(c){return {name:c.name,savedAt:c.savedAt,data:c.data};})};
  download(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),"土釘計算_全部案件_"+stamp(Date.now()).slice(0,10)+".json"); $("menu-file").open=false; caseToast("已匯出 "+list.length+" 個案件。");
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
  $("casename").value=state.name||""; applyUnitLabels(); buildNails(); fillBond(); showMethod(); renderFSGrid();
}
Object.keys(FIELDS).forEach(function(k){
  $(k).addEventListener("input",function(e){var v=e.target.value; state[k]=v===""?"":num(v); e.target.classList.toggle("bad",v!==""&&!isFinite(num(v))); if(k==="qu")syncBondPick(); run();});
});
SELECTS.forEach(function(k){$(k).addEventListener("change",function(e){state[k]=e.target.value; if(k==="method")showMethod(); if(k==="code")renderFSGrid(); run();});});
CHECKS.forEach(function(k){$(k).addEventListener("change",function(e){state[k]=e.target.checked; run();});});
function showMethod(){Array.prototype.forEach.call(document.querySelectorAll("[data-m]"),function(el){el.hidden=el.dataset.m!==state.method;});}
function fillBond(){
  var sel=$("bondpick"), u=U(); sel.innerHTML='<option value="">GEC 7 表 4.4 參考值（帶入下限）…</option>'+SN.BOND.map(function(b,i){
    return '<option value="'+i+'">'+esc(b.m+"・"+b.s+"："+fmt(cF(b.lo),state.unit==="t"?1:0)+"～"+fmt(cF(b.hi),state.unit==="t"?1:0)+" "+u.P)+'</option>';}).join("");
}
function syncBondPick(){$("bondpick").value="";}
$("bondpick").addEventListener("change",function(e){var i=e.target.value; if(i==="")return; var b=SN.BOND[+i]; state.qu=state.unit==="t"?Math.round(b.lo/GACC*100)/100:b.lo; $("qu").value=state.qu; $("qu").classList.remove("bad"); run(); caseToast("已帶入 "+b.m+"・"+b.s+" 下限值。實際設計請以拉拔試驗驗證。");});
var armT=null;
$("btn-example").addEventListener("click",function(e){
  var b=e.currentTarget;
  if(!b.classList.contains("armed")){b.classList.add("armed");b.textContent="再按一次以覆蓋目前輸入";clearTimeout(armT);armT=setTimeout(function(){b.classList.remove("armed");b.textContent="載入範例";},3500);return;}
  b.classList.remove("armed"); b.textContent="載入範例"; var u=state.unit; state=clone(EXAMPLE); currentId=null; savedSnap=null;
  fillAll(); if(u==="t")switchUnit("t"); else run(); caseToast("已載入範例（原 Excel「BREAK OUT _MODIFY A」配置）。");
});

/* 安全係數表 */
function renderFSGrid(){
  var g=$("fsgrid"), code=state.code, C=SN.CODES[code]||SN.CODES.gec7, fs=code==="custom"?null:C.fs, h="";
  SN.FS_KEYS.forEach(function(k){
    var v=fs?fs[k]:(isFinite(num(state.fsCustom[k]))?state.fsCustom[k]:SN.CODES.gec7.fs[k]);
    h+='<label for="fs-'+k+'">'+SN.FS_LABEL[k]+'</label>'+(fs?'<output id="fs-'+k+'">'+fmt(v,2)+'</output>':'<input id="fs-'+k+'" data-fs="'+k+'" inputmode="decimal" value="'+esc(v)+'">');
    if(fs&&C.src[k])h+='<span class="src">'+esc(C.src[k])+'</span>';
  });
  g.innerHTML=h;
}
$("fsgrid").addEventListener("input",function(e){var k=e.target.dataset.fs; if(!k)return; var v=num(e.target.value); state.fsCustom[k]=isFinite(v)?v:""; e.target.classList.toggle("bad",!(v>0)); run();});

/* 土釘表 */
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

/* ---------- 轉換為 SI 與驗證 ---------- */
function toSI(){
  var s={}, errs=[];
  Object.keys(FIELDS).forEach(function(k){
    var v=num(state[k]), c=FIELDS[k];
    if(!isFinite(v)){ if(OPTIONAL[k]){ v=(k==="gwN"||k==="gwS"||k==="CF")?null:0; } else { errs.push(k); v=NaN; } }
    else if(state.unit==="t"){ if(c==="P"||c==="G")v=v*GACC; else if(c==="S")v=v/KGF; }
    s[k]=v;
  });
  SELECTS.forEach(function(k){s[k]=state[k];}); CHECKS.forEach(function(k){s[k]=!!state[k];});
  s.fsCustom=state.fsCustom; s.CF=s.CF||0;
  s.nails=state.nails.map(function(n){return {z:num(n.z),sh:num(n.sh),L:num(n.L),ang:num(n.ang),bar:n.bar};});
  if(!(s.H>0))errs.push("H");
  if(!(s.face>30&&s.face<=90))errs.push("face");
  if(!(s.phi>0&&s.phi<60))errs.push("phi");
  ["gt","gs","gw","fy","fh","fc","fym","lbp"].forEach(function(k){if(!(s[k]>0))errs.push(k);});
  if(s.method==="grout"&&!(s.Ddh>0&&s.qu>0))errs.push("qu");
  if(s.method==="driven"&&!(s.kdelta>0))errs.push("kdelta");
  if(s.gwN!==null&&s.gwN<0)errs.push("gwN"); if(s.gwS!==null&&s.gwS<0)errs.push("gwS");
  var badN=s.nails.some(function(n){return !(n.z>0&&n.z<s.H&&n.sh>0&&n.L>0&&n.ang>=0&&n.ang<60);});
  if(badN)errs.push("nails");
  return {s:s,errs:errs};
}

/* ---------- 計算 ---------- */
var LAST=null, GRES={}, gToken=0, gTimer=null, gKey="", selKey="N";
function run(){
  saveDraft(); updateSaveChip();
  var t=toSI(), s=t.s;
  if(t.errs.length){
    LAST=null; $("checks").innerHTML=""; $("alerts").innerHTML='<li>請確認輸入：'+t.errs.map(function(k){return k==="nails"?"土釘配置（深度須在 0～H 之間）":({qu:"握裹強度",kdelta:"摩擦折減 k"}[k]||k);}).join("、")+'</li>';
    $("big-fs").textContent="—"; $("big-ok").textContent="—"; return;
  }
  var I=SN.internal(s), SL=SN.sliding(s), FS=SN.getFS(s);
  LAST={s:s,I:I,SL:SL,FS:FS};
  renderInternal(); renderFacing(); renderSliding();
  var key=JSON.stringify(s);
  if(key!==gKey){gKey=key; GRES={}; scheduleGlobal(s);} else {renderGlobal(); renderSummary();}
  renderSummary();
}
function scheduleGlobal(s){
  clearTimeout(gTimer); var tok=++gToken; $("prog").className="prog run"; $("prog").textContent="等待計算…";
  gTimer=setTimeout(function(){
    var list=SN.globalList(s), i=0;
    if(!list.some(function(x){return x.key===selKey;}))selKey="N";
    function step(){
      if(tok!==gToken)return;
      if(i>=list.length){$("prog").className="prog";$("prog").textContent="圓弧搜尋完成（"+list.length+" 個工況）";renderGlobal();renderSummary();return;}
      $("prog").textContent="圓弧搜尋 "+(i+1)+"/"+list.length+"："+list[i].label;
      setTimeout(function(){ if(tok!==gToken)return; var r=SN.runGlobal(s,list[i]); GRES[list[i].key]=r; r.order=i; i++; renderGlobal(); renderSummary(); step(); },16);
    }
    step();
  },350);
}

/* ---------- 結果呈現 ---------- */
function okTag(v,req){var ok=v>=req-1e-9; return '<span class="'+(ok?"ok":"ng")+'">'+(ok?"OK":"NG")+'</span>';}
function renderSummary(){
  if(!LAST)return; var FS=LAST.FS, I=LAST.I, items=[];
  function minBy(arr,f){var m=null; arr.forEach(function(r){var v=f(r); if(m===null||v<m.v)m={v:v,r:r};}); return m;}
  var gN=GRES.N, gS=GRES.S, st=Object.keys(GRES).filter(function(k){return k.charAt(0)==="E";}).map(function(k){return GRES[k];});
  items.push({t:"整體穩定・完工常時",v:gN&&gN.best?gN.best.F:null,req:FS.gStatic,note:gN?(gN.best?methodName(LAST.s.slopeMethod):"找不到有效圓弧"):"計算中…"});
  if(LAST.s.gwS!==null)items.push({t:"整體穩定・暴雨（高水位）",v:gS&&gS.best?gS.best.F:null,req:FS.gHigh,note:gS?"":"計算中…"});
  if(LAST.s.doStages){var ms=minBy(st.filter(function(r){return r.best;}),function(r){return r.best.F;}); items.push({t:"整體穩定・施工階段（最小）",v:ms?ms.v:null,req:FS.gStage,note:ms?ms.r.label:(st.length?"":"計算中…")});}
  var a=minBy(I.rows,function(r){return r.FSt;}), b=minBy(I.rows,function(r){return r.FSpo;}), c=minBy(I.rows,function(r){return r.FSff;}), d=minBy(I.rows,function(r){return r.FSfp;}), e=minBy(LAST.SL,function(r){return r.FS;});
  items.push({t:"鋼筋抗拉（最小）",v:a.v,req:FS.tensile,note:"第 "+a.r.i+" 排"});
  items.push({t:"拉拔阻抗（最小）",v:b.v,req:FS.pullout,note:"第 "+b.r.i+" 排"});
  items.push({t:"面版撓曲（最小）",v:c.v,req:FS.fFlex,note:"第 "+c.r.i+" 排"});
  items.push({t:"面版穿孔剪力（最小）",v:d.v,req:FS.fPunch,note:"第 "+d.r.i+" 排"});
  items.push({t:"加勁體滑動",v:e.v,req:FS.slide,note:e.r.key==="S"?"暴雨工況":"常時工況"});
  var nok=0, nall=0;
  $("checks").innerHTML=items.map(function(it){
    var has=it.v!==null&&isFinite(it.v), ok=has&&it.v>=it.req-1e-9; if(has){nall++; if(ok)nok++;}
    return '<li><span>'+esc(it.t)+(it.note?'<small>'+esc(it.note)+'</small>':"")+'</span><b>'+(has?fmt(it.v,2):"—")+' <small style="display:inline">≥ '+fmt(it.req,2)+'</small></b>'+(has?'<span class="tag '+(ok?"ok":"ng")+'">'+(ok?"OK":"NG")+'</span>':'<span class="tag" style="color:var(--muted)">…</span>')+'</li>';
  }).join("");
  $("big-fs").textContent=gN&&gN.best?fmt(gN.best.F,3):"—"; $("big-req").textContent="需求 ≥ "+fmt(FS.gStatic,2);
  $("bb1").classList.toggle("ngbox",!!(gN&&gN.best&&gN.best.F<FS.gStatic));
  $("big-ok").textContent=nok+" / "+nall; $("bb2").classList.toggle("ngbox",nok<nall);
  var al=[], s=LAST.s;
  if(s.method==="driven")al.push("打入式以鋼筋周長計算拉拔，阻抗通常很小。若現場為鑽孔灌漿，請改選「鑽孔灌漿式」。");
  if(s.c===0&&s.doStages&&st.some(function(r){return r.best&&r.best.F<FS.gStage;}))al.push("c' = 0 時無支撐開挖面理論上無法自立，施工階段 FS 偏低屬正常結果；實務上依賴視凝聚力，請依地質資料輸入 c'，或縮小每階開挖高度。");
  if(s.excelTrib)al.push("目前採原 Excel 點值法分配土壓（各排壓力取土釘深度處之值乘負擔高度），第一排偏大、總和不等於 Rankine 總土壓。");
  if(s.gwN===null&&s.gwS===null)al.push("未輸入地下水位，整體穩定與需求拉力皆以乾燥狀態計算。");
  if(s.nailRes==="nominal")al.push("整體穩定採土釘標稱抗力，整體 FS 已包含土釘的安全餘裕，請確認審查單位接受此做法。");
  if(I.rows.some(function(r){return r.Lp<=0.5;}))al.push("有土釘在 Rankine 破壞面以外的長度不足 0.5 m，請加長土釘。");
  $("alerts").innerHTML=al.map(function(t){return '<li>'+esc(t)+'</li>';}).join("")||'<li class="ok">輸入完整。</li>';
}
function methodName(m){return {bishop:"簡化 Bishop",spencer:"Spencer",mp:"Morgenstern-Price"}[m]||m;}

/* 計算過程：X_{ab}／X_ab → 下標 */
var SUBRE=/(?<=[A-Za-z0-9'σφγδτΔ)])_\{([^}]*)\}|(?<=[A-Za-z0-9'σφγδτΔ)])_([A-Za-z0-9',]+)/g;
function subH(h){return h.replace(SUBRE,function(m,a,b){return "<sub>"+(a!==undefined?a:b)+"</sub>";});}
function renderInternal(){
  var I=LAST.I, FS=LAST.FS, s=LAST.s, u=U(), drv=s.method==="driven";
  $("ka-note").innerHTML="K<sub>a</sub> = "+fmt(I.Ka,4)+"　破壞面 "+fmt(I.theta,1)+"°";
  var h='<thead><tr><th>#</th><th>z<br>m</th><th>S<sub>V</sub><br>m</th><th>S<sub>H</sub><br>m</th><th>水位<br>工況</th><th>土壓合力<br>'+u.FL+'</th><th>T 軸力<br>'+u.F+'</th><th>R<sub>t</sub><br>'+u.F+'</th><th>FS<sub>t</sub><br>≥'+fmt(FS.tensile,2)+'</th><th>L<sub>a</sub><br>m</th><th>L<sub>p</sub><br>m</th>'+(drv?'<th>σ\'v<br>'+u.P+'</th>':'')+'<th>拉拔率<br>'+u.FL+'</th><th>R<sub>po</sub><br>'+u.F+'</th><th>FS<sub>po</sub><br>≥'+fmt(FS.pullout,2)+'</th><th>判定</th></tr></thead><tbody>';
  I.rows.forEach(function(r){
    var ok=r.FSt>=FS.tensile&&r.FSpo>=FS.pullout;
    h+='<tr class="'+(ok?"":"ng")+'"><td>'+r.i+'</td><td>'+fmt(r.n.z,2)+'</td><td>'+fmt(r.sv,2)+'</td><td>'+fmt(r.n.sh,2)+'</td><td class="t">'+(r.wcase==="S"?"暴雨":"常時")+'</td><td>'+fFL(r.P)+'</td><td>'+fF(r.T)+'</td><td>'+fF(r.Rt)+'</td><td>'+fmt(r.FSt,2)+'</td><td>'+fmt(r.La,2)+'</td><td>'+fmt(r.Lp,2)+'</td>'+(drv?'<td>'+fP(r.sigmid,1)+'</td>':'')+'<td>'+fFL(r.rate)+'</td><td>'+fF(r.Rpo)+'</td><td>'+fmt(r.FSpo,2)+'</td><td>'+(ok?'<span class="ok">OK</span>':'<span class="ng">NG</span>')+'</td></tr>';
  });
  var tot=I.rows.reduce(function(a,r){return a+r.P;},0);
  h+='</tbody>'; $("tint").innerHTML=h;
  $("int-notes").innerHTML='<p>各排土壓合力加總 '+fFL(tot)+' '+u.FL+'；Rankine 總土壓（常時水位）'+fFL(I.Ptot)+' '+u.FL+(s.excelTrib?'（點值法不會相等）':'')+'。</p><p>R<sub>t</sub> = A<sub>s</sub>·f<sub>y</sub>；原 Excel 容許拉力 0.55 f<sub>y</sub> 相當於 FS<sub>t</sub> = 1.82。L<sub>a</sub> 為牆面至破壞面之土釘長度，L<sub>p</sub> 為破壞面以外之有效錨定長度。</p>';
  var r=I.rows[0], dd="";
  I.rows.forEach(function(r){
    var g=SN.nailGeom(s,r.n);
    dd+='<div class="eqs"><b>第 '+r.i+' 排（z = '+fmt(r.n.z,2)+' m，'+r.n.bar+'，'+(r.wcase==="S"?"暴雨":"常時")+'水位控制）</b>\n'+
      '負擔範圍 '+fmt(r.top,2)+'～'+fmt(r.bot,2)+' m，S_V = '+fmt(r.sv,2)+' m\n'+
      'σ_h(頂) = '+fP(r.ptop)+'，σ_h(z) = '+fP(r.pz)+'，σ_h(底) = '+fP(r.pbot)+' '+u.P+'\n'+
      (s.excelTrib?'P = σ_h(z) × S_V = '+fP(r.pz)+' × '+fmt(r.sv,2):'P = ∫σ_h dz（Simpson）')+' = '+fFL(r.P)+' '+u.FL+'\n'+
      'T_h = P × S_H = '+fFL(r.P)+' × '+fmt(r.n.sh,2)+' = '+fF(r.Th)+' '+u.F+'；T = T_h / cos'+fmt(r.n.ang,0)+'° = '+fF(r.T)+' '+u.F+'\n'+
      'R_t = '+fmt(r.bar.As,2)+' cm² × '+fS(s.fy)+' '+u.S+' = '+fF(r.Rt)+' '+u.F+'；FS_t = '+fmt(r.FSt,2)+'\n'+
      '釘頭 ('+fmt(g.xh,2)+', '+fmt(g.yh,2)+')；破壞面交點 L_a = '+fmt(r.La,2)+' m，L_p = '+fmt(r.n.L,2)+' − '+fmt(r.La,2)+' = '+fmt(r.Lp,2)+' m\n'+
      (drv?'σ\'_v(L_p 中點，深 '+fmt(r.zmid,2)+' m) = '+fP(r.sigmid)+' '+u.P+'；拉拔率 = π × '+fmt(r.bar.d,1)+'/1000 × '+fP(r.sigmid)+' × tan('+fmt(s.kdelta,3)+'×'+fmt(s.phi,1)+'°) = '+fFL(r.rate)+' '+u.FL+'\n'
         :'拉拔率 = π × '+fmt(s.Ddh/1000,3)+' × '+fP(s.qu)+' = '+fFL(r.rate)+' '+u.FL+'\n')+
      'R_po = '+fFL(r.rate)+' × '+fmt(r.Lp,2)+' = '+fF(r.Rpo)+' '+u.F+'；FS_po = '+fmt(r.FSpo,2)+'</div>';
  });
  $("intdet").innerHTML=subH(dd);
}
function renderFacing(){
  var I=LAST.I, FS=LAST.FS, s=LAST.s, u=U(), f0=I.rows[0].fc;
  var h='<thead><tr><th>#</th><th>S<sub>max</sub><br>m</th><th>T<sub>o</sub><br>'+u.F+'</th><th>R<sub>FF</sub><br>'+u.F+'</th><th>FS<sub>FF</sub><br>≥'+fmt(FS.fFlex,2)+'</th><th>R<sub>FP</sub><br>'+u.F+'</th><th>FS<sub>FP</sub><br>≥'+fmt(FS.fPunch,2)+'</th><th>判定</th></tr></thead><tbody>';
  I.rows.forEach(function(r){var ok=r.FSff>=FS.fFlex&&r.FSfp>=FS.fPunch;
    h+='<tr class="'+(ok?"":"ng")+'"><td>'+r.i+'</td><td>'+fmt(r.Smax,2)+'</td><td>'+fF(r.To)+'</td><td>'+fF(r.fc.RFF)+'</td><td>'+fmt(r.FSff,2)+'</td><td>'+fF(r.fc.RFP)+'</td><td>'+fmt(r.FSfp,2)+'</td><td>'+(ok?'<span class="ok">OK</span>':'<span class="ng">NG</span>')+'</td></tr>';});
  $("tface").innerHTML=h+'</tbody>';
  var r=I.rows.reduce(function(a,b){return b.FSff<a.FSff?b:a;});
  $("facedet").innerHTML=subH('<div class="eqs"><b>面版斷面（鋼線網置中，d = h/2）</b>\n'+
    'h = '+fmt(s.fh,1)+' cm，f\'_c = '+fS(s.fc)+' '+u.S+'，f_y = '+fS(s.fym)+' '+u.S+'，C_F = '+fmt(f0.CF,2)+(s.CF?'':'（依厚度自動）')+'\n'+
    'm_v = a_s·f_y·(d − a/2) = '+fM(f0.mv,2)+' '+u.M+'；m_h = '+fM(f0.mh,2)+' '+u.M+'\n'+
    'D\'_c = L_{BP} + h = '+fmt(f0.Dc,3)+' m；V_F = 0.33√f\'_c·π·D\'_c·h = '+fF(f0.VF)+' '+u.F+'（C_P = 1.0）\n\n'+
    '<b>撓曲最不利：第 '+r.i+' 排</b>\nS_max = max(S_H, S_V) = '+fmt(r.Smax,2)+' m；T_o = T × [0.6 + 0.2(S_max − 1)] = '+fF(r.T)+' × '+fmt(r.kTo,3)+' = '+fF(r.To)+' '+u.F+'\n'+
    'R_FF,v = C_F·(2m_v)·(8S_H/S_V) = '+fF(r.fc.RFFv)+'；R_FF,h = C_F·(2m_h)·(8S_V/S_H) = '+fF(r.fc.RFFh)+' → R_FF = '+fF(r.fc.RFF)+' '+u.F+'\n'+
    'FS_FF = '+fmt(r.FSff,2)+'；FS_FP = '+fF(r.fc.RFP)+' / '+fF(r.To)+' = '+fmt(r.FSfp,2)+'</div>');
}
function renderSliding(){
  var SL=LAST.SL, FS=LAST.FS, u=U();
  var h='<thead><tr><th class="l">工況</th><th>W<br>'+u.FL+'</th><th>Q<sub>D</sub><br>'+u.FL+'</th><th>U<br>'+u.FL+'</th><th>P<sub>A</sub><br>'+u.FL+'</th><th>P<sub>w</sub><br>'+u.FL+'</th><th>FS<br>≥'+fmt(FS.slide,2)+'</th><th>判定</th></tr></thead><tbody>';
  SL.forEach(function(o){h+='<tr class="'+(o.FS>=o.req?"":"ng")+'"><td class="l t">'+(o.key==="S"?"暴雨":"常時")+'</td><td>'+fFL(o.W,1)+'</td><td>'+fFL(o.QD,1)+'</td><td>'+fFL(o.U,1)+'</td><td>'+fFL(o.PA,1)+'</td><td>'+fFL(o.Pw,1)+'</td><td>'+fmt(o.FS,2)+'</td><td>'+okTag(o.FS,o.req)+'</td></tr>';});
  $("tslide").innerHTML=h+'</tbody>';
  var o=SL[0], s=LAST.s;
  $("slidedet").innerHTML=subH('<div class="eqs">加勁體：牆趾至最下排土釘尾端，底寬 B_L = '+fmt(o.xb,2)+' m，後緣高 H_1 = '+fmt(o.H1,2)+' m\n'+
    'FS = [c\'·B_L + (W + Q_D + P_A·sinβ − U)·tanφ\'] / (P_A·cosβ + P_w)\n'+
    '常時：['+fP(s.c)+' × '+fmt(o.xb,2)+' + ('+fFL(o.W,1)+' + '+fFL(o.QD,1)+' − '+fFL(o.U,1)+') × tan'+fmt(s.phi,1)+'°] / ('+fFL(o.PA,1)+' + '+fFL(o.Pw,1)+') = '+fmt(o.FS,2)+'\n'+
    'P_A 以 Rankine K_a = '+fmt(o.Ka,4)+' 計算，含超載 '+fFL(o.PAq,1)+' '+u.FL+'。基底摩擦角取土壤 φ\'。</div>');
}

function renderGlobal(){
  if(!LAST)return; var u=U(), s=LAST.s, keys=Object.keys(GRES).sort(function(a,b){return GRES[a].order-GRES[b].order;});
  var h='<thead><tr><th class="l">工況</th><th>FS</th><th>需求</th><th>判定</th><th>圓心 x, y (m)</th><th>R (m)</th><th>出口 x</th><th>入口 x</th><th>搜尋圓弧數</th></tr></thead><tbody>';
  keys.forEach(function(k){var r=GRES[k], b=r.best;
    h+='<tr class="'+(b&&b.F>=r.req?"":"ng")+'"><td class="l t">'+esc(r.label)+'</td><td>'+(b?fmt(b.F,3):"—")+'</td><td>'+fmt(r.req,2)+'</td><td>'+(b?okTag(b.F,r.req):'<span class="ng">無有效圓弧</span>')+'</td><td>'+(b?fmt(b.xc,2)+", "+fmt(b.yc,2):"—")+'</td><td>'+(b?fmt(b.R,2):"—")+'</td><td>'+(b?fmt(b.xl,2):"—")+'</td><td>'+(b?fmt(b.xr,2):"—")+'</td><td>'+r.count+'</td></tr>';});
  $("tglob").innerHTML=h+'</tbody>';
  var n=GRES.N, notes=[];
  notes.push("座標原點在完工牆趾，x 向牆內為正。分析方法："+methodName(s.slopeMethod)+"；土釘抗力取"+(s.nailRes==="nominal"?"標稱值":"容許值")+"，"+(s.nailMode==="active"?"主動":"被動")+"模式。");
  if(n&&n.cmp)notes.push("完工常時臨界圓弧三法比較：簡化 Bishop "+fmt(n.cmp.bishop,3)+"、Spencer "+fmt(n.cmp.spencer,3)+"、Morgenstern-Price "+fmt(n.cmp.mp,3)+"。");
  $("glob-notes").innerHTML=notes.map(function(t){return '<p>'+esc(t)+'</p>';}).join("");
  renderSegs(); drawFig();
}
function renderSegs(){
  var keys=Object.keys(GRES).sort(function(a,b){return GRES[a].order-GRES[b].order;});
  $("segs").innerHTML=keys.map(function(k){var r=GRES[k], b=r.best, bad=!b||b.F<r.req;
    var lab=k==="N"?"完工常時":k==="S"?"完工暴雨":"第 "+k.slice(1)+" 階";
    return '<button type="button" role="tab" aria-selected="'+(k===selKey)+'" class="'+(k===selKey?"on ":"")+(bad?"bad":"")+'" data-k="'+k+'">'+lab+'<span class="fsv">'+(b?fmt(b.F,2):"—")+'</span></button>';}).join("");
}
$("segs").addEventListener("click",function(e){var b=e.target.closest("button[data-k]"); if(!b)return; selKey=b.dataset.k; renderSegs(); drawFig();});

/* ---------- 斷面圖 ---------- */
var EXC={bg:"#ffffff",ink:"#1b2427",muted:"#5a676b",line:"#cdd5d1",accent:"#1d5f86",stress:"#a2561c",warn:"#b4541a",soil:"#efe6cc",dot:"#c8b47e",face:"#7d8a86"};
function figSvg(res,W,exp){
  var s=LAST.s, M=res.M, b=res.best, H=s.H, xcr=SN.faceX(H,s), Lh=0;
  s.nails.forEach(function(n){Lh=Math.max(Lh,n.L*Math.cos(n.ang*Math.PI/180));});
  var xmin=-0.55*H, xmax=xcr+Lh+0.35*H, ymin=-0.4*H, ymax=H*1.18+Math.max(0,(xmax-xcr)*Math.tan((s.beta||0)*Math.PI/180));
  if(b){xmin=Math.min(xmin,b.xl-0.6); xmax=Math.max(xmax,b.xr+0.6); ymin=Math.min(ymin,b.yc-b.R-0.5); ymax=Math.max(ymax,b.yc+0.6);}
  var pad=28, sc=(W-2*pad)/(xmax-xmin), Ht=Math.round((ymax-ymin)*sc+2*pad);
  function X(x){return (pad+(x-xmin)*sc).toFixed(1);} function Y(y){return (pad+(ymax-y)*sc).toFixed(1);}
  function C(v,cls){return exp?(' '+v):(' class="'+cls+'"');}
  var o='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+Ht+'" width="'+W+'" height="'+Ht+'" role="img" aria-label="土釘斷面與臨界滑動面">';
  var col=exp?EXC:{bg:"var(--surface)",ink:"var(--ink)",muted:"var(--muted)",line:"var(--line)",accent:"var(--accent)",stress:"var(--stress)",warn:"var(--warn)",soil:"var(--sand)",dot:"var(--sand-ink)",face:"var(--hard-ink)"};
  o+='<defs><pattern id="psoil" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="'+col.soil+'" opacity="'+(exp?1:0.55)+'"/><circle cx="2" cy="2" r="0.9" fill="'+col.dot+'"/><circle cx="6.5" cy="6.5" r="0.7" fill="'+col.dot+'"/></pattern></defs>';
  o+='<rect width="'+W+'" height="'+Ht+'" fill="'+col.bg+'"/>';
  var ye=M.ye, xfb=M.xfb, far=xmax, yfar=H+(far-xcr)*M.tb;
  o+='<path d="M'+X(xmin)+' '+Y(ye)+' L'+X(xfb)+' '+Y(ye)+' L'+X(xcr)+' '+Y(H)+' L'+X(far)+' '+Y(yfar)+' L'+X(far)+' '+Y(ymin)+' L'+X(xmin)+' '+Y(ymin)+'Z" fill="url(#psoil)" stroke="none"/>';
  if(ye>1e-6){ // 未開挖部分：完工面虛線
    o+='<path d="M'+X(0)+' '+Y(0)+' L'+X(xfb)+' '+Y(ye)+' M'+X(xmin)+' '+Y(0)+' L'+X(0)+' '+Y(0)+'" stroke="'+col.muted+'" stroke-width="1" stroke-dasharray="4 3" fill="none"/>';
  }
  // 滑動體
  if(b){
    var pts=[], n=60, i;
    for(i=0;i<=n;i++){var xx=b.xl+(b.xr-b.xl)*i/n, dx=xx-b.xc; pts.push([xx,b.yc-Math.sqrt(Math.max(b.R*b.R-dx*dx,0))]);}
    var top=[]; for(i=n;i>=0;i--){var x2=b.xl+(b.xr-b.xl)*i/n; top.push([x2,SN.ysurf(M,x2)]);}
    o+='<path d="M'+pts.map(function(p){return X(p[0])+' '+Y(p[1]);}).join(" L")+' L'+top.map(function(p){return X(p[0])+' '+Y(p[1]);}).join(" L")+'Z" fill="'+col.warn+'" opacity="0.13"/>';
    o+='<path d="M'+pts.map(function(p){return X(p[0])+' '+Y(p[1]);}).join(" L")+'" fill="none" stroke="'+col.warn+'" stroke-width="2.2"/>';
    if(b.yc<ymax){o+='<circle cx="'+X(b.xc)+'" cy="'+Y(b.yc)+'" r="3" fill="'+col.warn+'"/><path d="M'+X(b.xc)+' '+Y(b.yc)+' L'+X(pts[n>>1][0])+' '+Y(pts[n>>1][1])+'" stroke="'+col.warn+'" stroke-width="0.8" stroke-dasharray="3 3"/>';}
  }
  // 地表線
  o+='<path d="M'+X(xmin)+' '+Y(ye)+' L'+X(xfb)+' '+Y(ye)+' M'+X(xcr)+' '+Y(H)+' L'+X(far)+' '+Y(yfar)+'" stroke="'+col.ink+'" stroke-width="1.5" fill="none"/>';
  // 面版
  o+='<path d="M'+X(xfb)+' '+Y(ye)+' L'+X(xcr)+' '+Y(H)+'" stroke="'+col.face+'" stroke-width="4.5" fill="none"/>';
  // Rankine 破壞面（完工）
  if(res.key==="N"||res.key==="S"){var th=(45+s.phi/2)*Math.PI/180; o+='<path d="M'+X(0)+' '+Y(0)+' L'+X(H/Math.tan(th))+' '+Y(H)+'" stroke="'+col.stress+'" stroke-width="1.3" stroke-dasharray="6 4" fill="none"/>';}
  // 水位
  function wline(gwd,dash,lab){ if(gwd===null||!isFinite(gwd))return; var yw=H-gwd; var x0=yw>ye?SN.faceX(yw,s):xmin; if(yw<ymin)return;
    o+='<path d="M'+X(x0)+' '+Y(yw)+' L'+X(far)+' '+Y(yw)+'" stroke="'+col.accent+'" stroke-width="1.4"'+(dash?' stroke-dasharray="7 4"':'')+' fill="none"/>';
    var xt=xcr+Lh+0.15*H; o+='<path d="M'+(+X(xt)-5)+' '+(+Y(yw)-9)+' h10 l-5 8z" fill="'+col.accent+'"/><text x="'+(+X(xt)+8)+'" y="'+(+Y(yw)-3)+'" fill="'+col.accent+'" style="font-family:sans-serif;font-size:11px">'+lab+'</text>'; }
  wline(s.gwN,false,"常時"); wline(s.gwS,true,"暴雨");
  // 土釘
  var cross={}; if(b&&b.nails)b.nails.forEach(function(q){cross[q.i]=q;});
  M.nails.forEach(function(nl){var g=nl.g, x2=g.xh+g.L*g.cx, y2=g.yh+g.L*g.cy, cr=cross[nl.i];
    o+='<path d="M'+X(g.xh)+' '+Y(g.yh)+' L'+X(x2)+' '+Y(y2)+'" stroke="'+col.ink+'" stroke-width="'+(cr?2.6:1.3)+'" fill="none"/>';
    o+='<rect x="'+(+X(g.xh)-2.5)+'" y="'+(+Y(g.yh)-5)+'" width="5" height="10" fill="'+col.ink+'"/>';
    o+='<text x="'+(+X(x2)+5)+'" y="'+(+Y(y2)+4)+'" fill="'+col.muted+'" style="font-family:monospace;font-size:10.5px">'+(nl.i+1)+'</text>';
    if(cr)o+='<circle cx="'+X(cr.x)+'" cy="'+Y(cr.y)+'" r="3.2" fill="'+col.bg+'" stroke="'+col.warn+'" stroke-width="1.6"/>';
  });
  // 尺寸標註
  o+='<text x="'+(+X(xcr)+6)+'" y="'+(+Y(H)-6)+'" fill="'+col.ink+'" style="font-family:sans-serif;font-size:11px">牆頂</text>';
  o+='<text x="'+(+X(xfb)-6)+'" y="'+(+Y(ye)+14)+'" text-anchor="end" fill="'+col.ink+'" style="font-family:sans-serif;font-size:11px">'+(ye>1e-6?"開挖面 −"+fmt(M.He,2)+" m":"牆趾")+'</text>';
  if(b){o+='<text x="'+(pad+4)+'" y="'+(pad+4)+'" fill="'+col.warn+'" style="font-family:monospace;font-size:14px;font-weight:700">'+esc(res.label)+'　FS = '+fmt(b.F,3)+'</text>';}
  // 比例尺
  var step=H>12?5:2, bx=pad+6, by=Ht-10;
  o+='<path d="M'+bx+' '+by+' h'+(step*sc).toFixed(1)+'" stroke="'+col.ink+'" stroke-width="2"/><text x="'+(bx+step*sc+6)+'" y="'+(by+4)+'" fill="'+col.muted+'" style="font-family:monospace;font-size:10.5px">'+step+' m</text>';
  return o+'</svg>';
}
function drawFig(){
  var r=GRES[selKey]; if(!r){$("fig").innerHTML='<p class="hint" style="padding:16px">圓弧搜尋計算中…</p>';$("figmeta").innerHTML="";$("critdet").innerHTML="";return;}
  var W=Math.max(Math.min($("fig").clientWidth||900,1200),320);
  $("fig").innerHTML=figSvg(r,W,false);
  var b=r.best, u=U(), bad=!b||b.F<r.req;
  $("figmeta").innerHTML='<div class="first'+(bad?" ngbox":"")+'"><span>'+esc(r.label)+'</span><b>FS '+(b?fmt(b.F,3):"—")+'</b></div><div><span>需求</span><b>'+fmt(r.req,2)+'</b></div><div><span>圓心 (x, y)</span><b>'+(b?fmt(b.xc,2)+", "+fmt(b.yc,2):"—")+'</b></div><div><span>半徑 R</span><b>'+(b?fmt(b.R,2)+" m":"—")+'</b></div><div><span>出口／入口 x</span><b>'+(b?fmt(b.xl,2)+" / "+fmt(b.xr,2):"—")+'</b></div>';
  if(!b||!b.nails){$("critdet").innerHTML="";return;}
  var h='<h3 class="sub3">與滑動面相交之土釘</h3><div class="tbl-scroll"><table><thead><tr><th>#</th><th>L<sub>a</sub> m</th><th>L<sub>b</sub> m</th><th>後段拉拔<br>'+u.F+'</th><th>鋼筋抗拉<br>'+u.F+'</th><th>面版＋前段<br>'+u.F+'</th><th>T 取用<br>'+u.F+'</th><th class="l">控制</th><th>T/S<sub>H</sub><br>'+u.FL+'</th></tr></thead><tbody>';
  b.nails.forEach(function(q){h+='<tr><td>'+(q.i+1)+'</td><td>'+fmt(q.La,2)+'</td><td>'+fmt(q.Lb,2)+'</td><td>'+fF(q.t1)+'</td><td>'+fF(q.t2)+'</td><td>'+fF(q.t3)+'</td><td>'+fF(q.T)+'</td><td class="l t">'+q.gov+'</td><td>'+fFL(q.Tw)+'</td></tr>';});
  if(!b.nails.length)h+='<tr><td colspan="9" class="l t">此滑動面未與任何土釘相交。</td></tr>';
  h+='</tbody></table></div><h3 class="sub3">切片（共 '+b.slices.length+' 片）</h3><div class="tbl-scroll"><table><thead><tr><th>#</th><th>x m</th><th>b m</th><th>h m</th><th>α °</th><th>W '+u.FL+'</th><th>Q '+u.FL+'</th><th>u '+u.P+'</th><th>土釘 Px '+u.FL+'</th><th>土釘 Py '+u.FL+'</th></tr></thead><tbody>';
  b.slices.forEach(function(q,i){h+='<tr><td>'+(i+1)+'</td><td>'+fmt(q.x,2)+'</td><td>'+fmt(q.b,3)+'</td><td>'+fmt(q.h,2)+'</td><td>'+fmt(Math.asin(q.sa)*180/Math.PI,1)+'</td><td>'+fFL(q.W)+'</td><td>'+fFL(q.Q)+'</td><td>'+fP(q.u)+'</td><td>'+(q.Px?fFL(q.Px):"")+'</td><td>'+(q.Py?fFL(q.Py):"")+'</td></tr>';});
  $("critdet").innerHTML=h+'</tbody></table></div>';
}
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
  var s=LAST.s, I=LAST.I, FS=LAST.FS, SL=LAST.SL, u=U(), body=[], today=stamp(Date.now()).slice(0,10), C=SN.CODES[s.code]||SN.CODES.gec7;
  function H1(t){body.push(para(t,{style:"Heading1"}));} function H2(t){body.push(para(t,{b:true,sp:[160,60],keep:true}));}
  function P(t,o){body.push(para(t,Object.assign({sp:[0,60]},o||{})));} function B(t){body.push(para("•　"+t,{ind:360,hang:360,sp:[0,40],sz:20}));}
  function NOTE(t){body.push(para(t,{sz:18,color:"5A676B",sp:[60,60]}));}
  body.push(para("土釘邊坡設計計算書",{style:"Title"}));
  body.push(para([{t:"案件名稱："},{t:state.name||"（未命名）",b:true}],{jc:"center",sp:[0,0]}));
  body.push(para("計算日期："+today+"　　單位："+u.name+"（"+u.F+"、"+u.P+"、"+u.G+"、"+u.S+"）",{jc:"center",sp:[0,240],sz:20,color:"5A676B"}));

  H1("一、設計條件");
  H2("1.1 幾何、土壤與地下水");
  body.push(table([4200,2600,2838],[["項目","數值","單位"],
    ["開挖高度 H",fmt(s.H,2),"m"],["牆面傾角（與水平）",fmt(s.face,1),"°"],["牆頂背坡角 β",fmt(s.beta,1),"°"],["牆頂均布超載 q",fP(s.q),u.P],
    ["單位重 γ_t／γ_{sat}",fmt(cF(s.gt),2)+" / "+fmt(cF(s.gs),2),u.G],["有效摩擦角 φ'",fmt(s.phi,1),"°"],["有效凝聚力 c'",fP(s.c),u.P],
    ["常時水位深度（牆頂下）",s.gwN===null?"不考慮":fmt(s.gwN,2),"m"],["暴雨（高水位）深度",s.gwS===null?"不檢核":fmt(s.gwS,2),"m"],["水單位重 γ_w",fmt(cF(s.gw),2),u.G],
    ["面版排水（需求拉力不計水壓）",s.drained?"是":"否","—"]],{align:["left","center","center"],sz:20}));
  H2("1.2 土釘與面版");
  var mrows=[["項目","數值","單位"],["土釘型式",s.method==="driven"?"打入式":"鑽孔灌漿式","—"]];
  if(s.method==="driven")mrows.push(["介面摩擦 tan δ = tan(k·φ')，k",fmt(s.kdelta,3),"—"]); else {mrows.push(["鑽孔直徑 D_{DH}",fmt(s.Ddh,0),"mm"]); mrows.push(["極限握裹強度 q_u",fP(s.qu),u.P]);}
  mrows.push(["土釘鋼筋 f_y",fS(s.fy),u.S],["噴凝土面版厚 h",fmt(s.fh,1),"cm"],["面版 f'_c",fS(s.fc),u.S],["鋼線網 f_y",fS(s.fym),u.S],["鋼線網 a_s（垂直／水平）",fmt(s.asv,2)+" / "+fmt(s.ash,2),"cm²/m"],["承壓鈑邊長 L_{BP}",fmt(s.lbp,1),"cm"],["壓力係數 C_F",fmt(I.rows[0].fc.CF,2)+(s.CF?"":"（依厚度）"),"—"]);
  body.push(table([4200,2600,2838],mrows,{align:["left","center","center"],sz:20}));
  var nr=[["排","深度 z m","S_H m","S_V m","長度 L m","傾角 ψ °","鋼筋","A_s cm²"]];
  I.rows.forEach(function(r){nr.push([r.i,fmt(r.n.z,2),fmt(r.n.sh,2),fmt(r.sv,2),fmt(r.n.L,2),fmt(r.n.ang,1),r.n.bar,fmt(r.bar.As,2)]);});
  P("土釘配置：",{b:true,sp:[120,40]}); body.push(table([800,1300,1100,1100,1300,1200,1200,1200],nr,{sz:18}));
  H2("1.3 安全係數（"+C.name+"）");
  var fr=[["檢核項目","FS","依據"]]; SN.FS_KEYS.forEach(function(k){fr.push([SN.FS_LABEL[k],fmt(FS[k],2),{t:C.src[k]||"自訂",jc:"left"}]);});
  body.push(table([3000,1000,5638],fr,{align:["left","center","left"],sz:18}));

  H1("二、分析方法");
  ["需求拉力：Rankine 主動土壓 σ_h = K_a·cosβ·(q + σ'_v) + u"+(s.drained?"（面版排水，不計 u）":"")+"，K_a = "+fmt(I.Ka,4)+"。各排垂直負擔高度 S_V 取上下兩排之中點，第一排由牆頂起算、最後一排算至牆底；"+(s.excelTrib?"土壓合力取土釘深度處之 σ_h 乘 S_V（原 Excel 點值法）。":"土壓合力 P = ∫σ_h dz（面積積分）。")+"T_h = P·S_H，沿土釘軸力 T = T_h / cosψ。有暴雨水位時取常時與暴雨之大者。",
   "鋼筋抗拉：R_t = A_s·f_y，FS_t = R_t / T。",
   "拉拔：Rankine 破壞面通過牆趾，與水平夾 45° + φ'/2 = "+fmt(I.theta,1)+"°；有效錨定長度 L_p 為破壞面以外之土釘長度（沿土釘量測）。"+(s.method==="driven"?"打入式每公尺拉拔阻抗 = π·d_b·σ'_v·tanδ，σ'_v 取 L_p 中點之有效覆土應力（不計超載）。":"鑽孔灌漿式每公尺拉拔阻抗 = π·D_{DH}·q_u。")+"R_{po} = 拉拔率 × L_p，FS_{po} = R_{po} / T。",
   "面版（FHWA GEC 7）：釘頭設計拉力 T_o = T·[0.6 + 0.2(S_{max} − 1)]，S_{max} = max(S_H, S_V)。撓曲 R_{FF} = C_F·(m_{neg} + m_{pos})·(8S_H/S_V)，並以水平向檢核取小值；鋼線網置中 d = h/2，m = a_s·f_y·(d − a/2)。穿孔剪力 V_F = 0.33√f'_c·π·D'_c·h，D'_c = L_{BP} + h，C_P = 1.0。",
   "加勁體滑動：加勁體自牆趾至最下排土釘尾端，FS = [c'·B_L + (W + Q_D + P_A·sinβ − U)·tanφ'] / (P_A·cosβ + P_w)，P_A 以 Rankine 計算。",
   "整體穩定："+methodName(s.slopeMethod)+" 法圓弧搜尋，40 片切片。土釘可發揮力 T = min(後段拉拔 L_b·r / FS_{po}, R_t / FS_t, 面版抗力 / FS_F + 前段拉拔 L_a·r / FS_{po})"+(s.nailRes==="nominal"?"（本案採標稱值，不除 FS）":"")+"，除以 S_H 換算為每公尺寬，作用於滑動面交點、沿土釘方向；"+(s.nailMode==="active"?"主動模式（減少滑動力）。":"被動模式（土釘力除以 FS，計入力矩與法向力）。")+"出口限於牆趾或其前方開挖面，入口限於牆頂後方地表。圓心格網兩階段搜尋。",
   "施工階段：第 k 階開挖至第 k 排土釘下方 "+fmt(s.overdig,2)+" m（不超過 H），僅計入已施作之第 1～k−1 排土釘，水位採常時。"
  ].forEach(B);

  H1("三、內部穩定（逐支土釘）");
  var ir=[["排","S_V m","工況","P "+u.FL,"T "+u.F,"R_t "+u.F,"FS_t","L_p m","拉拔率 "+u.FL,"R_{po} "+u.F,"FS_{po}","判定"]];
  I.rows.forEach(function(r){var ok=r.FSt>=FS.tensile&&r.FSpo>=FS.pullout; ir.push([r.i,fmt(r.sv,2),r.wcase==="S"?"暴雨":"常時",fFL(r.P),fF(r.T),fF(r.Rt),fmt(r.FSt,2),fmt(r.Lp,2),fFL(r.rate),fF(r.Rpo),fmt(r.FSpo,2),ok?{t:"OK",color:"2C7A4B",b:true}:{t:"NG",color:"B4541A",b:true}]);});
  body.push(table([500,700,700,900,900,900,700,800,1000,900,700,700],ir,{sz:16}));
  NOTE("需求：FS_t ≥ "+fmt(FS.tensile,2)+"、FS_{po} ≥ "+fmt(FS.pullout,2)+"。各排土壓合力加總 "+fFL(I.rows.reduce(function(a,r){return a+r.P;},0))+" "+u.FL+"，Rankine 總土壓（常時）"+fFL(I.Ptot)+" "+u.FL+"。");
  var r1=I.rows[0], g1=SN.nailGeom(s,r1.n);
  P("算例（第 1 排，z = "+fmt(r1.n.z,2)+" m）：",{b:true,sp:[120,40]});
  ["σ_h(頂) = "+fP(r1.ptop)+"、σ_h(z) = "+fP(r1.pz)+"、σ_h(底) = "+fP(r1.pbot)+" "+u.P+"；負擔範圍 "+fmt(r1.top,2)+"～"+fmt(r1.bot,2)+" m",
   "P = "+fFL(r1.P)+" "+u.FL+"；T_h = "+fFL(r1.P)+" × "+fmt(r1.n.sh,2)+" = "+fF(r1.Th)+" "+u.F+"；T = "+fF(r1.Th)+" / cos"+fmt(r1.n.ang,1)+"° = "+fF(r1.T)+" "+u.F,
   "R_t = "+fmt(r1.bar.As,2)+" cm² × "+fS(s.fy)+" "+u.S+" = "+fF(r1.Rt)+" "+u.F+"；FS_t = "+fF(r1.Rt)+" / "+fF(r1.T)+" = "+fmt(r1.FSt,2),
   "釘頭座標 ("+fmt(g1.xh,2)+", "+fmt(g1.yh,2)+") m；破壞面交點 L_a = "+fmt(r1.La,2)+" m；L_p = "+fmt(r1.n.L,2)+" − "+fmt(r1.La,2)+" = "+fmt(r1.Lp,2)+" m",
   (s.method==="driven"?"σ'_v = "+fP(r1.sigmid)+" "+u.P+"（L_p 中點深 "+fmt(r1.zmid,2)+" m）；拉拔率 = π × "+fmt(r1.bar.d/1000,4)+" × "+fP(r1.sigmid)+" × tan("+fmt(s.kdelta*s.phi,2)+"°) = "+fFL(r1.rate)+" "+u.FL
     :"拉拔率 = π × "+fmt(s.Ddh/1000,3)+" × "+fP(s.qu)+" = "+fFL(r1.rate)+" "+u.FL),
   "R_{po} = "+fFL(r1.rate)+" × "+fmt(r1.Lp,2)+" = "+fF(r1.Rpo)+" "+u.F+"；FS_{po} = "+fF(r1.Rpo)+" / "+fF(r1.T)+" = "+fmt(r1.FSpo,2)
  ].forEach(B);

  H1("四、面版檢核");
  var fr2=[["排","S_{max} m","T_o "+u.F,"R_{FF} "+u.F,"FS_{FF}","R_{FP} "+u.F,"FS_{FP}","判定"]];
  I.rows.forEach(function(r){var ok=r.FSff>=FS.fFlex&&r.FSfp>=FS.fPunch; fr2.push([r.i,fmt(r.Smax,2),fF(r.To),fF(r.fc.RFF),fmt(r.FSff,2),fF(r.fc.RFP),fmt(r.FSfp,2),ok?{t:"OK",color:"2C7A4B",b:true}:{t:"NG",color:"B4541A",b:true}]);});
  body.push(table([700,1200,1200,1300,1100,1300,1100,900],fr2,{sz:18}));
  var f0=I.rows[0].fc;
  NOTE("m_v = "+fM(f0.mv)+" "+u.M+"、m_h = "+fM(f0.mh)+" "+u.M+"；D'_c = "+fmt(f0.Dc,3)+" m；V_F = "+fF(f0.VF)+" "+u.F+"。需求：FS_{FF} ≥ "+fmt(FS.fFlex,2)+"、FS_{FP} ≥ "+fmt(FS.fPunch,2)+"。");

  H1("五、外部穩定：加勁體滑動");
  var sr=[["工況","B_L m","W "+u.FL,"Q_D "+u.FL,"U "+u.FL,"P_A "+u.FL,"P_w "+u.FL,"FS","判定"]];
  SL.forEach(function(o){sr.push([o.key==="S"?"暴雨":"常時",fmt(o.xb,2),fFL(o.W,1),fFL(o.QD,1),fFL(o.U,1),fFL(o.PA,1),fFL(o.Pw,1),fmt(o.FS,2),okc(o.FS,o.req)]);});
  body.push(table([900,900,1200,1100,1100,1200,1100,900,900],sr,{sz:18}));
  NOTE("需求 FS ≥ "+fmt(FS.slide,2)+"。");

  H1("六、整體穩定（圓弧搜尋）");
  var keys=Object.keys(GRES).sort(function(a,b){return GRES[a].order-GRES[b].order;});
  var gr=[["工況","FS","需求","判定","圓心 x, y m","R m","出口 x m","入口 x m"]];
  keys.forEach(function(k){var r=GRES[k], b=r.best; gr.push([{t:r.label,jc:"left"},b?fmt(b.F,3):"—",fmt(r.req,2),b?okc(b.F,r.req):{t:"無有效圓弧"},b?fmt(b.xc,2)+", "+fmt(b.yc,2):"—",b?fmt(b.R,2):"—",b?fmt(b.xl,2):"—",b?fmt(b.xr,2):"—"]);});
  body.push(table([3300,900,800,800,1500,800,800,800],gr,{sz:17}));
  NOTE("座標原點在完工牆趾，x 向牆內為正、y 向上為正。分析方法："+methodName(s.slopeMethod)+"。");
  if(GRES.N&&GRES.N.cmp){var cm=GRES.N.cmp; P("完工常時臨界圓弧，三種方法比較：簡化 Bishop "+fmt(cm.bishop,3)+"、Spencer "+fmt(cm.spencer,3)+"、Morgenstern-Price "+fmt(cm.mp,3)+"。",{sp:[60,60]});}
  var pid=1; imgs.forEach(function(im){ if(!im.png)return; var cx=6120000, cy=Math.round(cx*im.png.h/im.png.w); if(cy>7600000){cy=7600000;cx=Math.round(cy*im.png.w/im.png.h);} body.push(imagePara("rIdImg"+pid,cx,cy,pid)); body.push(para("圖 "+pid+"　"+im.cap,{jc:"center",sz:18,color:"5A676B",sp:[0,120]})); im.rid="rIdImg"+pid; pid++; });
  var bN=GRES.N&&GRES.N.best;
  if(bN&&bN.nails){P("完工常時臨界圓弧與土釘交點：",{b:true,sp:[120,40]});
    var tr=[["排","L_a m","L_b m","後段拉拔 "+u.F,"鋼筋抗拉 "+u.F,"面版＋前段 "+u.F,"T 取用 "+u.F,"控制","T/S_H "+u.FL]];
    bN.nails.forEach(function(q){tr.push([q.i+1,fmt(q.La,2),fmt(q.Lb,2),fF(q.t1),fF(q.t2),fF(q.t3),fF(q.T),{t:q.gov,jc:"left"},fFL(q.Tw)]);});
    if(bN.nails.length)body.push(table([600,900,900,1200,1200,1300,1100,1500,1000],tr,{sz:17})); else P("此滑動面未與任何土釘相交。");}

  H1("七、結論");
  var concl=[];
  function cc(t,v,req){concl.push([{t:t,jc:"left"},isFinite(v)?fmt(v,2):"—",fmt(req,2),isFinite(v)?okc(v,req):"—"]);}
  if(GRES.N)cc("整體穩定・完工常時",GRES.N.best?GRES.N.best.F:NaN,FS.gStatic);
  if(GRES.S)cc("整體穩定・暴雨（高水位）",GRES.S.best?GRES.S.best.F:NaN,FS.gHigh);
  var stg=keys.filter(function(k){return k.charAt(0)==="E";}).map(function(k){return GRES[k];}).filter(function(r){return r.best;});
  if(stg.length){var m=stg.reduce(function(a,b){return b.best.F<a.best.F?b:a;}); cc("整體穩定・施工階段（"+m.label.replace(/（.*$/,"")+"）",m.best.F,FS.gStage);}
  function mn(f){return I.rows.reduce(function(a,r){return Math.min(a,f(r));},Infinity);}
  cc("鋼筋抗拉（最小）",mn(function(r){return r.FSt;}),FS.tensile); cc("拉拔阻抗（最小）",mn(function(r){return r.FSpo;}),FS.pullout);
  cc("面版撓曲（最小）",mn(function(r){return r.FSff;}),FS.fFlex); cc("面版穿孔剪力（最小）",mn(function(r){return r.FSfp;}),FS.fPunch);
  cc("加勁體滑動",SL.reduce(function(a,o){return Math.min(a,o.FS);},Infinity),FS.slide);
  body.push(table([4600,1500,1500,2038],[["檢核項目","FS","需求","判定"]].concat(concl),{align:["left","center","center","center"],sz:20}));

  H1("八、備註");
  ["單一均質土層、水平地下水位，未考慮地震力。整體穩定僅分析圓弧滑動面。",
   "土釘構件層級之安全係數（拉拔、抗拉、面版）國內規範未訂，引用 FHWA GEC 7（FHWA-NHI-14-007, 2015）表 5.1。",
   (s.method==="grout"?"極限握裹強度 q_u 應以現場驗證拉拔試驗確認，試驗結果低於設計值時應修正設計。":"打入式土釘以鋼筋周長及介面摩擦計算拉拔，未計入灌漿體。"),
   "c' = 0 時無支撐開挖面理論上無法自立，施工階段 FS 偏低；實務上依賴視凝聚力或縮小每階開挖高度。",
   "本計算書由土釘邊坡設計試算網頁產生，供初步設計與自我檢核使用；正式送審建議另以商用邊坡穩定分析軟體核對。"
  ].forEach(B);

  var doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>'+
    body.join("")+'<w:sectPr><w:footerReference w:type="default" r:id="rIdFtr"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
  var W_NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  var styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles '+W_NS+'><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="標楷體" w:cs="Times New Roman"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'+
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="160"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'+
    '<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="18"/></w:rPr></w:style></w:styles>';
  var footer='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+W_NS+'><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:t xml:space="preserve">'+x(state.name||"土釘邊坡設計計算書")+'　第 </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t xml:space="preserve"> 頁</w:t></w:r></w:p></w:ftr>';
  var REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
  var rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="'+REL+'styles" Target="styles.xml"/><Relationship Id="rIdFtr" Type="'+REL+'footer" Target="footer1.xml"/>'+
    imgs.filter(function(im){return im.rid;}).map(function(im,i){return '<Relationship Id="'+im.rid+'" Type="'+REL+'image" Target="media/image'+(i+1)+'.png"/>';}).join("")+'</Relationships>';
  var ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
  var root='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+REL+'officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
  var iso=new Date().toISOString().replace(/\.\d+Z$/,"Z");
  var core='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+x("土釘邊坡設計計算書 "+(state.name||""))+'</dc:title><dc:creator>土釘邊坡設計試算</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+iso+'</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">'+iso+'</dcterms:modified></cp:coreProperties>';
  var files=[{name:"[Content_Types].xml",data:ct},{name:"_rels/.rels",data:root},{name:"docProps/core.xml",data:core},{name:"word/document.xml",data:doc},{name:"word/styles.xml",data:styles},{name:"word/footer1.xml",data:footer},{name:"word/_rels/document.xml.rels",data:rels}];
  imgs.filter(function(im){return im.rid;}).forEach(function(im,i){files.push({name:"word/media/image"+(i+1)+".png",data:im.png.data});});
  return zip(files);
}
$("btn-word").addEventListener("click",function(){
  var b=$("btn-word");
  if(!LAST){caseToast("請先輸入完整的設計條件。",true);return;}
  var list=SN.globalList(LAST.s); if(list.some(function(x){return !GRES[x.key];})){caseToast("圓弧搜尋尚未完成，請稍候再匯出。",true);return;}
  b.disabled=true; b.textContent="產生中…";
  var figs=[]; if(GRES.N)figs.push({k:"N",cap:"完工常時臨界滑動面"}); if(GRES.S)figs.push({k:"S",cap:"完工暴雨（高水位）臨界滑動面"});
  var stg=Object.keys(GRES).filter(function(k){return k.charAt(0)==="E"&&GRES[k].best;});
  if(stg.length){var m=stg.reduce(function(a,k){return GRES[k].best.F<GRES[a].best.F?k:a;}); figs.push({k:m,cap:"施工階段最不利工況（"+GRES[m].label+"）"});}
  Promise.all(figs.map(function(f){return svgPng(figSvg(GRES[f.k],900,true));})).then(function(pngs){
    var imgs=figs.map(function(f,i){return {cap:f.cap,png:pngs[i]};});
    download(buildDocx(imgs),safeName(state.name)+"_土釘計算書.docx");
    caseToast(pngs.every(Boolean)?"已匯出 Word 計算書。":"已匯出 Word 計算書（此瀏覽器無法產生部分圖形，已略過）。");
  }).catch(function(err){console.error(err);caseToast("匯出失敗，請再試一次。",true);}).then(function(){b.disabled=false;b.textContent="匯出 Word 計算書";});
});

fillAll(); run();
if(!storageOK)caseToast("這個瀏覽器不允許本機儲存，請改用「備份檔」保存案件。",true);
window.__SNAPP={figSvg:figSvg,GRES:function(){return GRES;},LAST:function(){return LAST;}};
})();
