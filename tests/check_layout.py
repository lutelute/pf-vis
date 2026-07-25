#!/usr/bin/env python3
"""レイアウト検証: 全ページ × 3画面幅で機械判定する。

チェック項目:
  1. 横オーバーフロー: ページ全体が画面幅に収まるか
  2. はみ出し要素: 可視要素が右端からはみ出していないか
  3. コントラスト比: テキスト色 vs 背景色 (WCAG AA: 小文字4.5 / 大文字3.0)
  4. canvas文字の実効サイズ: 内部座標→CSS縮小後に文字が読めるか (>=8px相当)
  5. タップ領域: モバイルでボタン・入力が高さ28px以上か
起動: python3 tests/check_layout.py  (要: ローカルサーバー :8093)
"""
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:8093"
PAGES = [
    ("メイン", "index.html"),
    ("はじめに", "getting_started.html"),
    ("入門", "power_flow_intuitive_v6_fixed.html"),
    ("プロセス可視化", "power_flow_process_visualizer_v2.html"),
    ("多手法比較", "power_flow_compare.html"),
    ("MATPOWER", "power_flow_matpower_v2.html"),
    ("v5", "power_flow_v5.html"),
    ("可視化", "power_flow_visualizer.html"),
    ("DC精度", "dc_accuracy_analysis.html"),
    ("演習", "exercises.html"),
    ("NR講演", "learn_newton.html"),
    ("ラダーL0", "ladder_l0.html"),
    ("ラダーL1", "ladder_l1.html"),
    ("ラダーL2", "ladder_l2.html"),
    ("ラダーL5", "ladder_l5.html"),
    ("ラダーL6", "ladder_l6.html"),
]
VIEWPORTS = [(375, 700, "mobile"), (560, 800, "phablet"), (768, 900, "tablet"),
             (900, 900, "tablet-l"), (1280, 900, "desktop")]

JS_AUDIT = """() => {
  const issues = [];
  const vw = window.innerWidth;
  // 1. 横オーバーフロー
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 2) issues.push({type:'overflow', detail:`scrollWidth ${sw} > viewport ${vw}`});
  // 2. はみ出し可視要素 (上位5件)
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display==='none' || cs.visibility==='hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width===0 || r.height===0) continue;
    if (r.right > vw + 3 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
      let p = el.parentElement, scrollable=false;
      while (p) { const pcs=getComputedStyle(p);
        if (pcs.overflowX==='auto'||pcs.overflowX==='scroll') {scrollable=true;break;} p=p.parentElement; }
      if (!scrollable) offenders.push({tag:el.tagName.toLowerCase(),
        cls:(el.className+'').slice(0,40), id:el.id, right:Math.round(r.right)});
    }
  }
  for (const o of offenders.slice(0,5))
    issues.push({type:'clipped', detail:`<${o.tag}${o.id?'#'+o.id:''} .${o.cls}> right=${o.right}`});
  if (offenders.length>5) issues.push({type:'clipped', detail:`…他${offenders.length-5}件`});
  // 3. コントラスト比
  const lum = c => { const m=c.match(/\\d+(\\.\\d+)?/g); if(!m) return null;
    const [r,g,b]=m.slice(0,3).map(x=>{x=+x/255; return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);});
    return 0.2126*r+0.7152*g+0.0722*b; };
  // 自要素→祖先の順に背景を集め、alpha合成した実効背景色を返す。
  // グラデーション等 background-image がある層は判定不能として null。
  const bgOf = el => {
    const layers=[]; let p=el;
    while (p && p!==document.documentElement) {
      const cs=getComputedStyle(p);
      const m=(cs.backgroundColor||'').match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/);
      const a=m?(m[4]===undefined?1:parseFloat(m[4])):0;
      if (cs.backgroundImage && cs.backgroundImage!=='none') return null;
      if (m && a>0) { layers.push([+m[1],+m[2],+m[3],a]); if(a>=1) break; }
      p=p.parentElement;
    }
    let r=255,g=255,b=255;
    for (let i=layers.length-1;i>=0;i--) {
      const [r2,g2,b2,a2]=layers[i];
      r=r2*a2+r*(1-a2); g=g2*a2+g*(1-a2); b=b2*a2+b*(1-a2);
    }
    return `rgb(${r}, ${g}, ${b})`;
  };
  const seen = new Set();
  for (const el of document.querySelectorAll('p,span,li,td,th,dd,dt,label,a,h1,h2,h3,button,div')) {
    const cs = getComputedStyle(el);
    if (cs.display==='none'||cs.visibility==='hidden') continue;
    if (![...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim().length>2)) continue;
    const r = el.getBoundingClientRect();
    if (r.width===0||r.height===0||r.bottom<0) continue;
    const bgc=bgOf(el);
    if (bgc===null) continue;
    const fg=lum(cs.color), bg=lum(bgc);
    if (fg===null||bg===null) continue;
    const ratio=(Math.max(fg,bg)+0.05)/(Math.min(fg,bg)+0.05);
    const size=parseFloat(cs.fontSize), bold=+cs.fontWeight>=700;
    const large=size>=18.7||(size>=14&&bold);
    const need=large?3.0:4.5;
    if (ratio<need) {
      const key=cs.color+'|'+cs.fontSize;
      if (!seen.has(key)) { seen.add(key);
        issues.push({type:'contrast',
          detail:`${cs.color} ${size}px ratio=${ratio.toFixed(2)} (要${need}) <${el.tagName.toLowerCase()} .${(el.className+'').slice(0,30)}>`}); }
    }
  }
  // 4. canvas文字の実効サイズ (内部10.5px想定で縮小率から換算)
  for (const cv of document.querySelectorAll('canvas')) {
    const r=cv.getBoundingClientRect(); if(r.width===0) continue;
    const scale=r.width/cv.width;
    const eff=10.5*scale;
    if (eff<8) issues.push({type:'canvas-font',
      detail:`#${cv.id||'?'} scale=${scale.toFixed(2)} → 実効${eff.toFixed(1)}px (<8px)`});
  }
  // 5. タップ領域 (モバイルのみ呼び出し側で判定)
  const smallTaps=[];
  for (const el of document.querySelectorAll('button,input[type=text],input[type=range],a.pfbtn')) {
    const cs=getComputedStyle(el); if(cs.display==='none') continue;
    const r=el.getBoundingClientRect();
    if (r.width===0||r.height===0) continue;
    if (r.height<28) smallTaps.push(`<${el.tagName.toLowerCase()} .${(el.className+'').slice(0,20)}> h=${Math.round(r.height)}`);
  }
  return {issues, smallTaps};
}"""


def main():
    total_issues = 0
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for vw, vh, vname in VIEWPORTS:
            page = browser.new_page(viewport={"width": vw, "height": vh})
            for name, path in PAGES:
                try:
                    page.goto(f"{BASE}/{path}?lv=1", wait_until="networkidle", timeout=20000)
                except Exception:
                    page.goto(f"{BASE}/{path}?lv=1", timeout=20000)
                page.wait_for_timeout(400)
                r = page.evaluate(JS_AUDIT)
                issues = r["issues"]
                if vname == "mobile" and r["smallTaps"]:
                    issues.append({"type": "tap", "detail": f"タップ領域<28px: {len(r['smallTaps'])}件 例: {r['smallTaps'][0]}"})
                if issues:
                    report.setdefault(f"{name} ({path})", {})[vname] = issues
                    total_issues += len(issues)
            page.close()
        browser.close()

    print("=" * 60)
    print("レイアウト検証レポート")
    print("=" * 60)
    if not report:
        print("問題なし 🎉")
    for pg, by_vp in report.items():
        print(f"\n■ {pg}")
        for vname, issues in by_vp.items():
            for i in issues:
                print(f"  [{vname}] {i['type']}: {i['detail']}")
    print(f"\n{'=' * 60}\n合計 {total_issues} 件\n{'=' * 60}")
    return 1 if total_issues else 0


if __name__ == "__main__":
    sys.exit(main())
