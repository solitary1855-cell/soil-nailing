/* 土釘邊坡設計試算 — 計算核心（SI 制：kN、kPa、m、MPa）
 * 可於瀏覽器（window.SN）或 Node.js（module.exports）載入。
 */
(function (root) {
"use strict";
var D2R = Math.PI / 180;

/* ---------------- 鋼筋與規範 ---------------- */
var BARS = {
  D19: { As: 2.87, d: 19.1 }, D22: { As: 3.87, d: 22.2 }, D25: { As: 5.07, d: 25.4 },
  D29: { As: 6.47, d: 28.7 }, D32: { As: 8.14, d: 32.2 }, D36: { As: 10.07, d: 35.8 }
};

/* 安全係數（ASD）。土釘構件層級的值，國內規範未訂，皆引用 FHWA GEC 7 (2015) 表 5.1 */
var FS_KEYS = ["gStatic", "gHigh", "gStage", "slide", "pullout", "tensile", "fFlex", "fPunch"];
var FS_LABEL = {
  gStatic: "整體穩定（常時）", gHigh: "整體穩定（暴雨／高水位）", gStage: "整體穩定（施工階段）",
  slide: "加勁體滑動", pullout: "拉拔阻抗", tensile: "鋼筋抗拉", fFlex: "面版撓曲", fPunch: "面版穿孔剪力"
};
var CODES = {
  gec7: {
    name: "FHWA GEC 7（2015）",
    fs: { gStatic: 1.5, gHigh: 1.5, gStage: 1.33, slide: 1.5, pullout: 2.0, tensile: 1.8, fFlex: 1.5, fPunch: 1.5 },
    src: {
      gStatic: "GEC 7 表 5.1 Overall Stability", gHigh: "GEC 7 未另訂高水位值，採常時值",
      gStage: "GEC 7 表 5.1 Excavation（1.25～1.33，取 1.33）", slide: "GEC 7 表 5.1 Lateral Sliding",
      pullout: "GEC 7 表 5.1", tensile: "GEC 7 表 5.1（Grade 60/75）", fFlex: "GEC 7 表 5.1", fPunch: "GEC 7 表 5.1"
    }
  },
  bldg: {
    name: "建築物基礎構造設計規範（112）",
    fs: { gStatic: 1.5, gHigh: 1.1, gStage: 1.33, slide: 1.5, pullout: 2.0, tensile: 1.8, fFlex: 1.5, fPunch: 1.5 },
    src: {
      gStatic: "基礎規範 7.4.4 長期載重 > 1.5", gHigh: "基礎規範 7.4.4 最高水位 > 1.1",
      gStage: "規範未訂，引用 GEC 7 表 5.1", slide: "基礎規範 7.4.1 長期 > 1.5",
      pullout: "規範未訂，引用 GEC 7", tensile: "規範未訂，引用 GEC 7", fFlex: "規範未訂，引用 GEC 7", fPunch: "規範未訂，引用 GEC 7"
    }
  },
  swc: {
    name: "水土保持技術規範（第 73 條）",
    fs: { gStatic: 1.5, gHigh: 1.1, gStage: 1.33, slide: 1.5, pullout: 2.0, tensile: 1.8, fFlex: 1.5, fPunch: 1.5 },
    src: {
      gStatic: "水保規範 第 73 條 平時 1.5", gHigh: "水保規範 第 73 條 暴雨 1.1",
      gStage: "規範未訂，引用 GEC 7 表 5.1", slide: "引用 GEC 7 表 5.1",
      pullout: "規範未訂，引用 GEC 7", tensile: "規範未訂，引用 GEC 7", fFlex: "規範未訂，引用 GEC 7", fPunch: "規範未訂，引用 GEC 7"
    }
  },
  custom: { name: "自訂", fs: null, src: {} }
};

/* GEC 7 表 4.4a/4.4b 極限握裹強度（psi → kPa，1 psi = 6.895 kPa） */
var BOND = [
  ["旋轉鑽孔", "砂／礫石", 15, 26], ["旋轉鑽孔", "粉土質砂", 15, 22], ["旋轉鑽孔", "粉土", 9, 11],
  ["旋轉鑽孔", "殘積土", 6, 17], ["旋轉鑽孔", "細崩積土", 11, 22], ["旋轉鑽孔", "粉土質黏土", 5, 7],
  ["打入套管", "砂／礫石（低覆土）", 28, 35], ["打入套管", "砂／礫石（高覆土）", 41, 62], ["打入套管", "緊密冰磧土", 55, 70],
  ["打入套管", "崩積土", 15, 26], ["打入套管", "黏土質粉土", 13, 20],
  ["螺旋鑽", "粉土質砂回填", 3, 6], ["螺旋鑽", "粉土質細砂", 8, 13], ["螺旋鑽", "粉土質黏土質砂", 9, 20],
  ["螺旋鑽", "黃土", 4, 11], ["螺旋鑽", "軟弱黏土", 3, 4], ["螺旋鑽", "堅實黏土", 6, 9],
  ["螺旋鑽", "堅實黏土質粉土", 6, 15], ["螺旋鑽", "鈣質砂質黏土", 13, 20]
].map(function (r) { return { m: r[0], s: r[1], lo: Math.round(r[2] * 6.895), hi: Math.round(r[3] * 6.895) }; });

function getFS(s) {
  if (s.code === "custom") {
    var o = {}; FS_KEYS.forEach(function (k) { var v = +((s.fsCustom || {})[k]); o[k] = v > 0 ? v : CODES.gec7.fs[k]; }); return o;
  }
  return (CODES[s.code] || CODES.gec7).fs;
}

/* ---------------- 基本土壓 ---------------- */
function rankineKa(phi, beta) {
  var p = phi * D2R, b = (beta || 0) * D2R;
  if (!beta) return Math.pow(Math.tan(Math.PI / 4 - p / 2), 2);
  var cb = Math.cos(b), cp = Math.cos(p), r = Math.sqrt(Math.max(cb * cb - cp * cp, 0));
  return cb * (cb - r) / (cb + r);
}
/* 地下水：gwd = 地表下深度（null 表無水位） */
function sigV(z, s, gwd) { // 有效垂直應力（不含超載）
  if (gwd === null || gwd === undefined || !isFinite(gwd) || z <= gwd) return s.gt * z;
  return s.gt * gwd + (s.gs - s.gw) * (z - gwd);
}
function uAt(z, s, gwd) { if (gwd === null || gwd === undefined || !isFinite(gwd) || z <= gwd) return 0; return s.gw * (z - gwd); }

/* ---------------- 幾何 ---------------- */
function faceX(y, s) { return y / Math.tan(s.face * D2R); } // 牆面線（通過牆趾）
function nailGeom(s, n) {
  var yh = s.H - n.z, xh = faceX(yh, s), psi = n.ang * D2R;
  return { xh: xh, yh: yh, cx: Math.cos(psi), cy: -Math.sin(psi), L: n.L, psi: psi };
}

/* ---------------- 內部穩定（逐支土釘） ---------------- */
function nailPulloutRate(s, n, sigv) { // 每公尺拉拔阻抗 kN/m（標稱）
  if (s.method === "driven") {
    var b = BARS[n.bar] || BARS.D29, per = Math.PI * b.d / 1000;
    return per * Math.max(sigv, 0) * Math.tan(s.kdelta * s.phi * D2R);
  }
  return Math.PI * (s.Ddh / 1000) * s.qu;
}
function facingCap(s, sh, sv) { // 面版撓曲與穿孔剪力標稱強度（kN）
  var h = s.fh / 100, fc = s.fc, fyM = s.fym, CF = s.CF > 0 ? s.CF : autoCF(s.fh);
  function mcap(as) { // as cm²/m，鋼線網置中 d = h/2
    var A = as * 1e-4, d = h / 2, a = A * fyM / (0.85 * fc * 1.0);
    return Math.max(A * fyM * (d - a / 2) * 1000, 0); // kN·m/m
  }
  var mv = mcap(s.asv), mh = mcap(s.ash);
  var RFFv = CF * (mv + mv) * (8 * sh / sv), RFFh = CF * (mh + mh) * (8 * sv / sh);
  var Dc = s.lbp / 100 + h, VF = 0.33 * Math.sqrt(fc) * Math.PI * Dc * h * 1000;
  return { mv: mv, mh: mh, CF: CF, RFFv: RFFv, RFFh: RFFh, RFF: Math.min(RFFv, RFFh), Dc: Dc, VF: VF, RFP: VF };
}
function autoCF(hcm) { return hcm <= 10 ? 2.0 : hcm <= 15 ? 2.0 - (hcm - 10) / 5 * 0.5 : hcm <= 20 ? 1.5 - (hcm - 15) / 5 * 0.5 : 1.0; }

function internal(s) {
  var FS = getFS(s), H = s.H, Ka = rankineKa(s.phi, s.beta), kh = Ka * Math.cos((s.beta || 0) * D2R);
  var th = (45 + s.phi / 2) * D2R; // Rankine 破壞面（通過牆趾）
  var nails = s.nails.slice().sort(function (a, b) { return a.z - b.z; });
  var cases = [{ key: "N", gwd: s.gwN }];
  if (s.gwS !== null && isFinite(s.gwS)) cases.push({ key: "S", gwd: s.gwS });
  function sh(z, gwd) { return kh * (s.q + sigV(z, s, gwd)) + (s.drained ? 0 : uAt(z, s, gwd)); }
  var rows = nails.map(function (n, i) {
    var top = i === 0 ? 0 : (nails[i - 1].z + n.z) / 2, bot = i === nails.length - 1 ? H : (n.z + nails[i + 1].z) / 2;
    if (s.excelTrib) { top = i === 0 ? 0 : (nails[i - 1].z + n.z) / 2; }
    var sv = bot - top, best = null;
    cases.forEach(function (c) {
      var P;
      if (s.excelTrib) P = sh(n.z, c.gwd) * sv;
      else { // Simpson 積分（水位處分段）
        var pts = [top, bot]; if (c.gwd !== null && isFinite(c.gwd) && c.gwd > top && c.gwd < bot) pts = [top, c.gwd, bot];
        P = 0; for (var k = 0; k < pts.length - 1; k++) { var a = pts[k], b = pts[k + 1]; P += (b - a) / 6 * (sh(a, c.gwd) + 4 * sh((a + b) / 2, c.gwd) + sh(b, c.gwd)); }
      }
      var o = { key: c.key, gwd: c.gwd, pz: sh(n.z, c.gwd), ptop: sh(top, c.gwd), pbot: sh(bot, c.gwd), P: P };
      if (!best || o.P > best.P) best = o;
    });
    var Th = best.P * n.sh, T = Th / Math.cos(n.ang * D2R);
    var bar = BARS[n.bar] || BARS.D29, Rt = bar.As * 1e-4 * s.fy * 1000; // kN
    // 破壞面交點（沿土釘）
    var g = nailGeom(s, n), tt = Math.tan(th);
    var La = (g.yh - g.xh * tt) / (Math.sin(g.psi) + Math.cos(g.psi) * tt); La = Math.max(La, 0);
    var Lp = Math.max(n.L - La, 0), sMid = La + Lp / 2;
    var xm = g.xh + sMid * g.cx, ym = g.yh + sMid * g.cy, zmid = H - ym + (xm > faceX(H, s) ? (xm - faceX(H, s)) * Math.tan((s.beta || 0) * D2R) : 0);
    var sigmid = sigV(zmid, s, s.gwN), r = nailPulloutRate(s, n, sigmid), Rpo = r * Lp;
    var fc = facingCap(s, n.sh, sv), Smax = Math.max(n.sh, sv), kTo = Math.min(Math.max(0.6 + 0.2 * (Smax - 1), 0), 1), To = T * kTo;
    return {
      i: i + 1, n: n, top: top, bot: bot, sv: sv, wcase: best.key, pz: best.pz, ptop: best.ptop, pbot: best.pbot, P: best.P,
      Th: Th, T: T, bar: bar, Rt: Rt, Ta: Rt / FS.tensile, FSt: Rt / T,
      La: La, Lp: Lp, zmid: zmid, sigmid: sigmid, rate: r, Rpo: Rpo, FSpo: Rpo / T,
      fc: fc, Smax: Smax, kTo: kTo, To: To, FSff: fc.RFF / To, FSfp: fc.RFP / To
    };
  });
  // Rankine 總土壓（核對）
  var Ptot = 0, N = 400; for (var k = 0; k < N; k++) { var a = H * k / N, b = H * (k + 1) / N; Ptot += (b - a) * sh((a + b) / 2, s.gwN); }
  return { Ka: Ka, kh: kh, theta: th / D2R, rows: rows, Ptot: Ptot, FS: FS, cases: cases.map(function (c) { return c.key; }) };
}

/* ---------------- 外部穩定：加勁體滑動 ---------------- */
function sliding(s) {
  var FS = getFS(s), H = s.H, bt = (s.beta || 0) * D2R, Ka = rankineKa(s.phi, s.beta);
  var nails = s.nails.slice().sort(function (a, b) { return a.z - b.z; }), nb = nails[nails.length - 1];
  var gb = nailGeom(s, nb), xb = gb.xh + nb.L * gb.cx, xcr = faceX(H, s);
  if (xb <= xcr) xb = xcr + 0.01;
  var H1 = H + (xb - xcr) * Math.tan(bt);
  var out = [];
  [{ key: "N", gwd: s.gwN }, { key: "S", gwd: s.gwS }].forEach(function (c) {
    if (c.key === "S" && (c.gwd === null || !isFinite(c.gwd))) return;
    // 加勁體：牆趾(0,0)→牆頂(xcr,H)→後緣頂(xb,H1)→後緣底(xb,0)
    var area = (xb - xcr) * (H + H1) / 2 + xcr * H / 2;
    var hw = (c.gwd === null || !isFinite(c.gwd)) ? 0 : Math.max(H - c.gwd, 0); // 牆底以上水深（後緣處以地表下深度計）
    var hwb = (c.gwd === null || !isFinite(c.gwd)) ? 0 : Math.max(H1 - c.gwd, 0);
    // 水位以下面積（以水平水位線 y = hw 近似，hw 以牆頂為基準）
    var yw = (c.gwd === null || !isFinite(c.gwd)) ? -1e9 : H - c.gwd;
    var aw = 0; if (yw > 0) { var y = Math.min(yw, H); aw = y * xb - (y * y / 2) / Math.tan(s.face * D2R); }
    var W = s.gt * (area - aw) + s.gs * aw;
    var QD = s.q * (xb - xcr);
    var U = s.gw * Math.max(yw, 0) * xb;
    // 後緣主動土壓（Rankine，平行地表）＋水壓
    var dw = (c.gwd === null || !isFinite(c.gwd)) ? H1 : Math.min(c.gwd + (H1 - H), H1); // 後緣處地表下水深
    var sv1 = s.gt * dw, PAs = Ka * s.gt * dw * dw / 2 + Ka * sv1 * (H1 - dw) + Ka * (s.gs - s.gw) * (H1 - dw) * (H1 - dw) / 2;
    var PAq = Ka * s.q * H1, PA = PAs + PAq, Pw = s.gw * Math.pow(Math.max(H1 - dw, 0), 2) / 2;
    var R = s.c * xb + Math.max(W + QD + PA * Math.sin(bt) - U, 0) * Math.tan(s.phi * D2R);
    var Dv = PA * Math.cos(bt) + Pw;
    out.push({ key: c.key, xb: xb, H1: H1, area: area, W: W, QD: QD, U: U, PA: PA, PAq: PAq, Pw: Pw, R: R, D: Dv, FS: R / Dv, req: FS.slide, Ka: Ka });
  });
  return out;
}

/* ---------------- 整體穩定：圓弧搜尋 ---------------- */
function makeModel(s, stage) {
  // stage: {He, nails:[...index]}  He = 開挖深度
  var H = s.H, He = stage.He, ye = H - He, xfb = faceX(ye, s), xcr = faceX(H, s), tb = Math.tan((s.beta || 0) * D2R);
  var far = 4 * H + 60;
  var pts = [[xfb - far, ye], [xfb, ye], [xcr, H], [xcr + far, H + far * tb]];
  var nl = stage.nails.map(function (i) {
    var n = s.nails[i], g = nailGeom(s, n);
    var bar = BARS[n.bar] || BARS.D29;
    // 面版容許／標稱抗力（以該支之 Sv 估計）
    return { n: n, g: g, i: i, Rt: bar.As * 1e-4 * s.fy * 1000, sv: stage.sv[i] };
  });
  return { s: s, H: H, He: He, ye: ye, xfb: xfb, xcr: xcr, pts: pts, nails: nl, gwd: stage.gwd, tb: tb };
}
function ysurf(M, x) {
  var p = M.pts;
  if (x <= p[1][0]) return p[1][1];
  if (x <= p[2][0]) return p[1][1] + (x - p[1][0]) * (p[2][1] - p[1][1]) / (p[2][0] - p[1][0]);
  return p[2][1] + (x - p[2][0]) * M.tb;
}
function ywAt(M, x) { // 水位線高程（水平，於地表下 gwd；牆前截至地表）
  if (M.gwd === null || M.gwd === undefined || !isFinite(M.gwd)) return -1e9;
  return Math.min(M.H - M.gwd, ysurf(M, x));
}

/* 由圓心與半徑求滑動面與地表交點 */
function circleCut(M, xc, yc, R) {
  var a = xc - R, b = xc + R, N = 160, prev = null, segs = [], st = null;
  function g(x) { var dx = x - xc, q = R * R - dx * dx; if (q < 0) q = 0; return ysurf(M, x) - (yc - Math.sqrt(q)); }
  if (g(a + 1e-9) > 1e-6 || g(b - 1e-9) > 1e-6) return null; // 圓弧端點在土中
  for (var k = 0; k <= N; k++) {
    var x = a + (b - a) * k / N, v = g(x);
    if (prev !== null) {
      if (prev.v <= 0 && v > 0) st = bis(prev.x, x);
      if (prev.v > 0 && v <= 0 && st !== null) { segs.push([st, bis(prev.x, x)]); st = null; }
    }
    prev = { x: x, v: v };
  }
  function bis(l, r) { var gl = g(l); for (var t = 0; t < 40; t++) { var m = (l + r) / 2, gm = g(m); if ((gm > 0) === (gl > 0)) { l = m; gl = gm; } else r = m; } return (l + r) / 2; }
  if (!segs.length) return null;
  var best = segs[0]; segs.forEach(function (sg) { if (sg[1] - sg[0] > best[1] - best[0]) best = sg; });
  return { xl: best[0], xr: best[1] };
}

function buildSlices(M, xc, yc, R, cut, nslice) {
  var s = M.s, n = nslice || 40, xl = cut.xl, xr = cut.xr, b = (xr - xl) / n, sl = [], maxd = 0;
  var tphi = Math.tan(s.phi * D2R);
  for (var i = 0; i < n; i++) {
    var xm = xl + (i + 0.5) * b, dx = xm - xc, yb = yc - Math.sqrt(Math.max(R * R - dx * dx, 0)), yt = ysurf(M, xm), h = Math.max(yt - yb, 0);
    var sa = dx / R, ca = Math.sqrt(Math.max(1 - sa * sa, 0)), yw = ywAt(M, xm);
    var hw = Math.min(Math.max(yw - yb, 0), h);
    var W = b * (s.gt * (h - hw) + s.gs * hw);
    var u = s.gw * Math.max(Math.min(yw, yt) - yb, 0);
    var Q = xm >= M.xcr - 1e-9 ? s.q * b : 0;
    if (h * ca > maxd) maxd = h * ca;
    sl.push({ x: xm, b: b, yb: yb, yt: yt, h: h, sa: sa, ca: ca, l: b / Math.max(ca, 1e-6), W: W, Q: Q, u: u, c: s.c, tp: tphi, Px: 0, Py: 0, MP: 0, nails: [] });
  }
  return { sl: sl, maxd: maxd, b: b };
}

/* 土釘與滑動面交點及可發揮之力（每公尺寬） */
function nailForces(M, xc, yc, R, cut, S, opt) {
  var s = M.s, FSv = getFS(s), nom = opt.nailRes === "nominal";
  var fpo = nom ? 1 : FSv.pullout, ft = nom ? 1 : FSv.tensile, ff = nom ? 1 : Math.min(FSv.fFlex, FSv.fPunch);
  var list = [];
  M.nails.forEach(function (nl) {
    var g = nl.g, px = g.xh - xc, py = g.yh - yc;
    var B = 2 * (px * g.cx + py * g.cy), C = px * px + py * py - R * R, D = B * B - 4 * C;
    function inside(t) { var x = g.xh + t * g.cx, y = g.yh + t * g.cy; if (x <= cut.xl || x >= cut.xr) return false; var dx = x - xc; var ya = yc - Math.sqrt(Math.max(R * R - dx * dx, 0)); return y > ya && y < ysurf(M, x) + 1e-9; }
    if (!inside(0.02)) return; // 釘頭不在滑動體內
    var sc = null;
    if (D > 0) {
      var r1 = (-B - Math.sqrt(D)) / 2, r2 = (-B + Math.sqrt(D)) / 2;
      [r1, r2].forEach(function (t) { if (sc === null && t > 0.02 && t < g.L) { var y = g.yh + t * g.cy; if (y < yc) sc = t; } });
    }
    if (sc === null) return; // 土釘全在滑動體內
    var La = sc, Lb = g.L - sc, x = g.xh + sc * g.cx, y = g.yh + sc * g.cy;
    function rate(t) { var xx = g.xh + t * g.cx, yy = g.yh + t * g.cy, z = ysurf(M, xx) - yy; return nailPulloutRate(s, nl.n, sigV(z, s, M.gwd === null ? null : M.gwd + (ysurf(M, xx) - M.H))); }
    var rb = rate(sc + Lb / 2), ra = rate(La / 2);
    var fc = facingCap(s, nl.n.sh, nl.sv), Tf = Math.min(fc.RFF, fc.RFP);
    var t1 = Lb * rb / fpo, t2 = nl.Rt / ft, t3 = Tf / ff + La * ra / fpo;
    var T = Math.min(t1, t2, t3), gov = T === t1 ? "拉拔（後段）" : T === t2 ? "鋼筋抗拉" : "面版＋前段拉拔";
    var Tw = T / nl.n.sh, Fx = Tw * g.cx, Fy = Tw * g.cy;
    var MP = (x - xc) * Fy - (y - yc) * Fx; // 逆時針為正（抵抗）
    var k = Math.min(Math.max(Math.floor((x - cut.xl) / S.b), 0), S.sl.length - 1);
    var sl = S.sl[k]; sl.Px += Fx; sl.Py += Fy; sl.MP += MP;
    list.push({ i: nl.i, x: x, y: y, La: La, Lb: Lb, t1: t1, t2: t2, t3: t3, T: T, Tw: Tw, gov: gov, MP: MP, d: MP / Tw });
  });
  return list;
}

/* GLE 通式：method = bishop | spencer | mp ；passive: 土釘力除以 F */
function solveFS(sl, xc, yc, R, method, passive) {
  var n = sl.length, i;
  var xl = sl[0].x - sl[0].b / 2, xr = sl[n - 1].x + sl[n - 1].b / 2;
  var D0 = 0; for (i = 0; i < n; i++) D0 += (sl[i].W + sl[i].Q) * (sl[i].x - xc);
  var MPs = 0, Pxs = 0; for (i = 0; i < n; i++) { MPs += sl[i].MP; Pxs += sl[i].Px; }
  var X = new Float64Array(n + 1), E = new Float64Array(n + 1), Np = new Float64Array(n), fb = new Float64Array(n + 1);
  for (i = 0; i <= n; i++) { var xb = xl + (xr - xl) * i / n; fb[i] = method === "mp" ? Math.sin(Math.PI * i / n) : 1; }
  var bad = false;
  function normals(F) {
    bad = false;
    for (var j = 0; j < n; j++) {
      var q = sl[j], ma = q.ca + q.sa * q.tp / F;
      if (ma < 0.2) bad = true;
      var Py = passive ? q.Py / F : q.Py;
      var N = (q.W + q.Q - Py - (X[j] - X[j + 1]) - q.u * q.l * q.ca - q.c * q.l * q.sa / F) / Math.max(ma, 0.05);
      Np[j] = N > 0 ? N : 0;
    }
  }
  function Fmom(F0) {
    var F = F0;
    for (var it = 0; it < 60; it++) {
      normals(F); var Rs = 0;
      for (var j = 0; j < n; j++) Rs += (sl[j].c * sl[j].l + Np[j] * sl[j].tp) * R;
      var Fn = passive ? (Rs + MPs) / D0 : Rs / (D0 - MPs);
      if (!(Fn > 0) || !isFinite(Fn)) return NaN;
      if (Math.abs(Fn - F) < 1e-5) { F = Fn; break; } F = Fn;
    }
    return F;
  }
  function Fforce(F0) {
    var F = F0;
    for (var it = 0; it < 60; it++) {
      normals(F); var num = 0, den = 0;
      for (var j = 0; j < n; j++) { var q = sl[j]; num += (q.c * q.l + Np[j] * q.tp) * q.ca; den += (Np[j] + q.u * q.l) * q.sa; }
      var Fn = passive ? (num + Pxs) / den : num / (den - Pxs);
      if (!(Fn > 0) || !isFinite(Fn)) return NaN;
      if (Math.abs(Fn - F) < 1e-5) { F = Fn; break; } F = Fn;
    }
    return F;
  }
  if (!(D0 > 0)) return null;
  for (i = 0; i <= n; i++) X[i] = 0;
  var Fb = Fmom(1.5); if (!isFinite(Fb)) return null;
  var badB = bad;
  if (method === "bishop") return { F: Fb, lambda: 0, bad: badB };
  // GLE：給定 λ，疊代 X
  function evalL(lam) {
    for (var k = 0; k <= n; k++) X[k] = 0;
    var Fm = Fb, Ff = Fb;
    for (var it = 0; it < 40; it++) {
      Fm = Fmom(Fm); Ff = Fforce(Ff);
      if (!isFinite(Fm) || !isFinite(Ff)) return null;
      // 以 Ff 計算 E、X
      normals(Ff); E[0] = 0; var dmax = 0;
      for (var j = 0; j < n; j++) {
        var q = sl[j], S = (q.c * q.l + Np[j] * q.tp) / Ff, Px = passive ? q.Px / Ff : q.Px;
        E[j + 1] = E[j] - (Np[j] + q.u * q.l) * q.sa + S * q.ca + Px;
      }
      for (var k2 = 1; k2 < n; k2++) { var Xn = lam * fb[k2] * E[k2]; dmax = Math.max(dmax, Math.abs(Xn - X[k2])); X[k2] = 0.5 * X[k2] + 0.5 * Xn; }
      X[0] = 0; X[n] = 0;
      if (dmax < 1e-3 && it > 2) break;
    }
    return { Fm: Fm, Ff: Ff, g: Fm - Ff };
  }
  var l0 = 0, e0 = evalL(l0); if (!e0) return null;
  var l1 = 0.25, e1 = evalL(l1); if (!e1) return null;
  for (var it2 = 0; it2 < 25; it2++) {
    if (Math.abs(e1.g) < 1e-4) return { F: (e1.Fm + e1.Ff) / 2, lambda: l1, bad: bad, Fb: Fb };
    var d = e1.g - e0.g; if (Math.abs(d) < 1e-12) break;
    var l2 = l1 - e1.g * (l1 - l0) / d;
    if (!isFinite(l2) || Math.abs(l2) > 3) break;
    l0 = l1; e0 = e1; l1 = l2; e1 = evalL(l1); if (!e1) break;
  }
  // 掃描 + 二分
  var prevL = -0.5, prevE = evalL(prevL);
  for (var L = -0.4; L <= 2.0001; L += 0.1) {
    var e = evalL(L); if (!e || !prevE) { prevL = L; prevE = e; continue; }
    if ((e.g > 0) !== (prevE.g > 0)) {
      var a = prevL, ga = prevE.g, b2 = L, mid = null;
      for (var t = 0; t < 30; t++) { var m = (a + b2) / 2; mid = evalL(m); if (!mid) break; if ((mid.g > 0) === (ga > 0)) { a = m; ga = mid.g; } else b2 = m; if (Math.abs(mid.g) < 1e-4) break; }
      if (mid) return { F: (mid.Fm + mid.Ff) / 2, lambda: (a + b2) / 2, bad: bad, Fb: Fb };
    }
    prevL = L; prevE = e;
  }
  return null;
}

function evalCircle(M, xc, yc, R, opt, detail) {
  var cut = circleCut(M, xc, yc, R);
  if (!cut) return null;
  if (cut.xl > M.xfb + 1e-3) return null;              // 出口須在開挖底面（牆趾或其前方）
  if (cut.xr < M.xcr - 1e-6) return null;              // 入口須在牆頂後方地表
  if (cut.xr - cut.xl < 0.3) return null;
  var S = buildSlices(M, xc, yc, R, cut, opt.nslice || 40);
  if (S.maxd < 0.2) return null;
  var nf = nailForces(M, xc, yc, R, cut, S, opt);
  var r = solveFS(S.sl, xc, yc, R, opt.method, opt.passive !== false);
  if (!r || !(r.F > 0) || r.bad) return null;
  var out = { F: r.F, xc: xc, yc: yc, R: R, xl: cut.xl, xr: cut.xr, lambda: r.lambda };
  if (detail) { out.slices = S.sl; out.nails = nf; }
  return out;
}

/* 兩階段搜尋 */
function search(M, opt) {
  var H = M.H, He = M.He, ye = M.ye, Lh = 0;
  M.s.nails.forEach(function (n) { Lh = Math.max(Lh, n.L * Math.cos(n.ang * D2R)); });
  var nx = opt.grid || 24, ny = opt.grid || 24;
  var x0 = M.xfb - 0.6 * He, x1 = M.xcr + Math.max(Lh, He) * 0.9, y0 = ye + 0.5 * He, y1 = H + 1.6 * He;
  var best = null, grid = [], count = 0;
  function radii(xc, yc) {
    var rs = [Math.hypot(xc - M.xfb, yc - ye)];
    [0.05, 0.12, 0.25, 0.4, 0.6, 0.85, 1.1].forEach(function (f) { var R = yc - (ye - f * He); if (R > 0) rs.push(R); });
    return rs;
  }
  function tryC(xc, yc, R) {
    count++;
    var r = evalCircle(M, xc, yc, R, opt, false);
    if (r && (!best || r.F < best.F)) best = r;
    return r;
  }
  for (var i = 0; i < nx; i++) for (var j = 0; j < ny; j++) {
    var xc = x0 + (x1 - x0) * i / (nx - 1), yc = y0 + (y1 - y0) * j / (ny - 1), fmin = null;
    radii(xc, yc).forEach(function (R) { var r = tryC(xc, yc, R); if (r && (fmin === null || r.F < fmin)) fmin = r.F; });
    grid.push({ x: xc, y: yc, F: fmin });
  }
  if (!best) return { best: null, grid: grid, count: count, box: [x0, x1, y0, y1] };
  // 細搜尋
  var dx = (x1 - x0) / (nx - 1), dy = (y1 - y0) / (ny - 1);
  for (var pass = 0; pass < 2; pass++) {
    var cx = best.xc, cy = best.yc, cR = best.R, m = 6;
    for (var a = -m; a <= m; a++) for (var b = -m; b <= m; b++) {
      var xc2 = cx + a * dx / m, yc2 = cy + b * dy / m;
      var rs = radii(xc2, yc2);
      for (var k = -4; k <= 4; k++) rs.push(cR * (1 + k * 0.025));
      rs.forEach(function (R) { tryC(xc2, yc2, R); });
    }
    dx /= 3; dy /= 3;
  }
  var det = evalCircle(M, best.xc, best.yc, best.R, opt, true);
  return { best: det || best, grid: grid, count: count, box: [x0, x1, y0, y1] };
}

/* 三法在同一圓弧上之比較 */
function compareMethods(M, c, opt) {
  var o = {};
  ["bishop", "spencer", "mp"].forEach(function (m) {
    var r = evalCircle(M, c.xc, c.yc, c.R, Object.assign({}, opt, { method: m }), false);
    o[m] = r ? r.F : null;
  });
  return o;
}

function stagesList(s) {
  var nails = s.nails.map(function (n, i) { return { n: n, i: i }; }).sort(function (a, b) { return a.n.z - b.n.z; });
  var IN = internal(s), sv = {};
  IN.rows.forEach(function (r) { var idx = s.nails.indexOf(r.n); sv[idx] = r.sv; });
  var out = [];
  nails.forEach(function (o, k) {
    var He = Math.min(o.n.z + s.overdig, s.H);
    out.push({ key: "E" + (k + 1), label: "第 " + (k + 1) + " 階開挖（至 " + He.toFixed(2) + " m，已施作 " + k + " 排）", He: He, nails: nails.slice(0, k).map(function (q) { return q.i; }), gwd: s.gwN, sv: sv, req: "gStage" });
  });
  return { list: out, sv: sv };
}

/* 全部整體穩定分析 */
function globalList(s) {
  var st = stagesList(s), all = s.nails.map(function (_, i) { return i; }), L = [];
  L.push({ key: "N", label: "完工・常時", He: s.H, nails: all, gwd: s.gwN, sv: st.sv, req: "gStatic" });
  if (s.gwS !== null && isFinite(s.gwS)) L.push({ key: "S", label: "完工・暴雨（高水位）", He: s.H, nails: all, gwd: s.gwS, sv: st.sv, req: "gHigh" });
  if (s.doStages) st.list.forEach(function (x) { L.push(x); });
  return L;
}
function runGlobal(s, stage, opt) {
  var M = makeModel(s, stage), o = Object.assign({ method: s.slopeMethod, passive: s.nailMode !== "active", nailRes: s.nailRes, grid: stage.key.charAt(0) === "E" ? 16 : 24 }, opt || {});
  var r = search(M, o);
  var res = { key: stage.key, label: stage.label, req: getFS(s)[stage.req], reqKey: stage.req, M: M, best: r.best, grid: r.grid, count: r.count, box: r.box };
  if (r.best && stage.key === "N") res.cmp = compareMethods(M, r.best, o);
  return res;
}

var API = {
  BARS: BARS, CODES: CODES, FS_KEYS: FS_KEYS, FS_LABEL: FS_LABEL, BOND: BOND, getFS: getFS, rankineKa: rankineKa, autoCF: autoCF,
  internal: internal, sliding: sliding, facingCap: facingCap, makeModel: makeModel, ysurf: ysurf, ywAt: ywAt, faceX: faceX, nailGeom: nailGeom,
  evalCircle: evalCircle, search: search, solveFS: solveFS, compareMethods: compareMethods, globalList: globalList, runGlobal: runGlobal, sigV: sigV, uAt: uAt
};
if (typeof module !== "undefined" && module.exports) module.exports = API; else root.SN = API;
})(this);
