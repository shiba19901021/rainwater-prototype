/* One geometry source for both exploration and simulation. Fixed-view engineering diagram. */
const SYSTEM = {
 inlet:'M850 137L850 155Q850 164 861 166L901 173Q920 177 909 188L612 213Q594 213 594 229L594 263L552 263Q540 263 540 280L540 377',
 column:'M540 377L540 628',
 bottom:'M540 628V657Q540 675 558 675H660',
 high:'M540 338H518Q511 338 508 328L490 281Q487 274 479 274H455Q443 274 443 290V490',
 spill:'M286 525H254Q243 525 241 540L204 738',
 tap:'M286 650L245 660L218 637H75',
 barrel:'M286 528Q286 508 310 502L358 491L450 493Q481 496 489 518L505 628Q508 657 487 666L329 687Q297 687 291 665Z'
};
const EQUIPMENT={
 inlet:{name:'繞行的進水管',brief:'融入原管線，也避開監視器。',what:'短天溝的水先往右繞，再折返向左，沿既有管線走到沉澱管的位置。',why:'配合原有管線，讓現場看起來比較整齊；向右繞的這一段也避開上方監視器。不是把天溝直接用最短距離接到沉澱管。',color:'#a99559',anchor:[715,205]},
 column:{name:'3.5 吋沉澱管',brief:'加粗這一段，增加暫存容量。',what:'水桶右側的長直管，中段加粗為 3.5 吋；下方縮回 2 吋並連到排水閥。',why:'中段加粗，讓管內有更多容水與沉澱空間，部分泥沙可以留在下方。關閉排水閥後，水位升到高點，較上層的水才會進入水桶；目前收集的雨水未經飲用水處理，請用於澆灌與清潔。',color:'#a68b60',anchor:[550,430]},
 high:{name:'抬高的進桶支管',brief:'水位到達高點，才開始進桶。',what:'從沉澱管側邊向左接出，先向上抬高，再往下接入桶頂。',why:'原本較低的接法可能讓沿管壁流下的前段水直接進桶。抬高後，必須先蓄到這個高度才開始收水。',color:'#829b6b',anchor:[477,274]},
 valve:{name:'紅色排水閥',brief:'平常開著，需要收水才關。',what:'位於沉澱管底部轉向右方的水平管上，控制沉澱管排水，不是桶子的取水開關。',why:'平常開啟，剛下雨先排掉前 5–10 分鐘的水；需要收水才關閉。底部用 2 吋也兼顧材料成本與學生操作。',color:'#c55743',anchor:[615,675]},
 tank:{name:'200 L 儲水桶',brief:'留下雨水，供清洗與澆灌。',what:'左側黑色扁方桶，放在基座上，雨水由桶頂進入。',why:'把部分原本會排走的雨水留下，供植物澆灌與環境清洗等非飲用用途。',color:'#768c81',anchor:[490,576]},
 spill:{name:'溢流管',brief:'桶滿後，多餘雨水向下排。',what:'由桶左上側接出，轉向下方的管路。',why:'水位到達溢流口，多餘雨水排回原有加蓋排水溝，經蓋板縫隙流入。',color:'#a99a70',anchor:[241,553]},
 vent:{name:'通氣口與防蟲網',brief:'讓空氣進出，也減少昆蟲進入水桶的機會。',what:'桶頂左側向上的短管；頂端加裝防蟲網。',why:'讓空氣進出，也減少昆蟲進入水桶的機會。',color:'#a08eac',anchor:[320,480]},
 union:{name:'進、出水端由令',brief:'可拆接頭，方便把桶搬下清洗。',what:'進水與出水管線上的可拆接頭。',why:'用水龍頭放空桶後，可鬆開兩端由令，分離固定管線與水桶，搬下清洗後再裝回。',color:'#a68961',anchor:[443,429]},
 taps:{name:'三個取水龍頭',brief:'把存下來的雨水用在校園。',what:'桶左下方出水管接到沿牆排列的三個水龍頭。',why:'讓儲存的水可以方便取用，供清洗與澆灌；與右側沉澱管排水閥分開。',color:'#839c88',anchor:[166,640]}
};
function engineeringDiagram(prefix,interactive){
 const pipe=(d,width=18)=>`<path class="pipe-edge" d="${d}" stroke-width="${width+5}"/><path class="pipe-face" d="${d}" stroke-width="${width}"/>`;
 const faucets=[92,148,202].map((x,i)=>`<g class="faucet" data-tap="${i}" ${interactive?'':`role="button" tabindex="0" aria-label="${i+1} 號水龍頭目前關閉，點擊開啟" aria-pressed="false"`}><path class="tap" d="M${x} 637V655H${x-12}V666"/><path class="tap-spout" d="M${x-19} 665H${x-5}"/><path class="tap-stem" d="M${x} 635V621"/><path class="tap-handle" d="M${x-11} 621H${x+11}M${x} 613V628"/><ellipse cx="${x-12}" cy="666" rx="7" ry="3" class="tap-mouth"/><rect x="${x-23}" y="606" width="46" height="71" fill="transparent" class="tap-hit"/>${interactive?'':`<path class="tap-water" data-flow="tap-${i}" d="M${x-12} 672V711"/>`}</g>`).join('');
 const part=(key,body)=>`<g class="device" data-part="${key}" style="--part-color:${EQUIPMENT[key].color}" ${interactive?`role="button" tabindex="0" aria-label="${EQUIPMENT[key].name}" aria-pressed="false"`:''}>${body}</g>`;
 return `<svg class="system-diagram" viewBox="0 0 1000 800" aria-label="嘉北國小雨水系統手繪工程圖" role="group">
 <defs><pattern id="${prefix}-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" stroke="#92a18c" stroke-width=".6" fill="none" opacity=".16"/></pattern><clipPath id="${prefix}-tank-clip"><rect x="292" y="509" width="196" height="177" rx="13"/></clipPath><clipPath id="${prefix}-column-clip"><path d="M533 268H547V368L557 381V620L546 634V665H534V634L523 620V381L533 368Z"/></clipPath><clipPath id="${prefix}-branch-clip"><rect data-water="branch-clip" x="420" y="675" width="145" height="0"/></clipPath><linearGradient id="${prefix}-barrel-front" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#626b5a"/><stop offset=".48" stop-color="#414d42"/><stop offset="1" stop-color="#344137"/></linearGradient></defs>
 <rect width="1000" height="800" fill="#f6f3ea"/><path d="M0 170H1000M0 202H1000M0 234H1000M0 266H1000M0 298H1000M0 330H1000M0 362H1000M0 394H1000M0 426H1000M0 458H1000M0 490H1000M0 522H1000M0 554H1000M0 586H1000M0 618H1000M0 650H1000M0 682H1000M0 714H1000" stroke="#ebe4d3" stroke-width="1.2"/><g class="site-context"><rect x="380" y="96" width="620" height="26" fill="#cbd5e1"/><rect x="380" y="122" width="620" height="6" fill="#94a3b8"/><path d="M0 744H1000" stroke="#94a3b8" stroke-width="3"/><rect x="180" y="741" width="60" height="8" rx="2" fill="#cbd5e1"/><rect x="640" y="741" width="60" height="8" rx="2" fill="#cbd5e1"/><rect x="278" y="690" width="232" height="54" rx="3" fill="#e7dfcc" stroke="#cdbf9f" stroke-width="2"/></g>
 <g class="gutter"><path d="M440 128H876L866 144H450Z" fill="#334155"/></g>
 <g class="camera" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"><path d="M790 205V222" fill="none" stroke-width="3"/><rect x="766" y="222" width="46" height="20" rx="5"/><circle cx="766" cy="232" r="8"/></g>
 ${part('inlet',pipe(SYSTEM.inlet)+`<path class="hit-pipe" d="${SYSTEM.inlet}"/>`)}
 ${part('column',pipe(SYSTEM.column,36)+`<path d="M529 364H551L563 380H517ZM517 618H563L551 636H529Z" class="fitting"/><path class="hit-pipe" d="${SYSTEM.column}"/>`)}
 ${part('high',pipe(SYSTEM.high)+`<path class="hit-pipe" d="${SYSTEM.high}"/>`)}
 ${part('valve',pipe(SYSTEM.bottom)+`<rect x="598" y="661" width="34" height="28" rx="5" class="fitting"/>${interactive?'<path d="M598 667L631 667L631 676H598Z" fill="#bd4f3e" stroke="#7c3d31" stroke-width="2"/>':''}<path class="hit-pipe" d="${SYSTEM.bottom}"/>`)}
 ${part('tank',`<rect class="barrel silhouette" x="288" y="505" width="204" height="185" rx="16"/><path class="barrel-seam" d="M288 568H492M288 620H492M330 512V684M450 512V684"/><ellipse cx="390" cy="505" rx="52" ry="10" class="tank-lid"/><text x="390" y="604" class="tank-label" text-anchor="middle">200 L</text>`)}
 ${part('vent',pipe('M320 504V473',15)+`<path d="M310 471H330M310 466H330M312 463V474M318 463V474M324 463V474" stroke="#645b71" stroke-width="2"/><path class="hit-pipe" d="M320 504V473"/>`)}
 ${part('taps',pipe(SYSTEM.tap,11)+`<path class="hit-pipe" d="${SYSTEM.tap}"/>`+faucets)}
 ${part('spill',`<path d="${SYSTEM.spill}" fill="none" stroke="#f6f3ea" stroke-width="36" stroke-linecap="butt"/>`+pipe(SYSTEM.spill)+`<path class="hit-pipe" d="${SYSTEM.spill}"/>`)}
 ${part('union',`<rect x="430" y="420" width="26" height="17" rx="3" class="fitting"/><path d="M435 420V437M441 420V437M447 420V437M452 420V437" stroke="#7a8273" stroke-width="1.4"/><rect x="255" y="645" width="16" height="25" rx="3" class="fitting approximate"/><path class="hit-pipe" d="M443 416V441M263 647V663"/>`)}
 <path d="M539 537V625L540 655Q540 675 558 675H586" class="hidden-route"/>
 ${interactive?'':`<g class="water-layer" pointer-events="none"><rect data-water="column" x="519" y="675" width="44" height="0" clip-path="url(#${prefix}-column-clip)" fill="#38bdf8" opacity=".85"/><path d="M540 338H518Q511 338 508 328L490 281Q487 274 479 274H455" clip-path="url(#${prefix}-branch-clip)" class="water-solid"/><rect data-water="tank" x="275" y="687" width="237" height="0" clip-path="url(#${prefix}-tank-clip)" fill="#38bdf8" opacity=".85"/><path data-flow="inlet" d="${SYSTEM.inlet}" class="water-stream"/><path data-flow="falling" d="${SYSTEM.column}" class="water-stream"/><path data-flow="drain" d="${SYSTEM.bottom}L678 714" class="water-stream"/><path data-flow="front" d="${SYSTEM.high}V523" class="water-front" pathLength="1"/><path data-flow="collect" d="${SYSTEM.high}V523" class="water-stream"/><path data-flow="spill" d="${SYSTEM.spill}" class="water-stream"/><g data-flow="rain" class="diagram-rain"><path d="M796 56l-7 15m40-35-7 15m40-35-7 15m40-35-7 15"/></g></g><g class="crest-guide"><path d="M425 274H582"/><text x="590" y="279">高位管最高點</text></g>`}
 <g class="drawing-notes"><text x="40" y="44">嘉北國小 ／ 雨水系統構造筆記</text><text x="665" y="770">依完成設備描繪 · 非施工比例圖</text></g>
 ${interactive?'<g class="callout" hidden pointer-events="none"><path class="leader"/><rect x="650" y="375" width="323" height="112" rx="3"/><text class="callout-name" x="671" y="414"></text><text class="callout-brief" x="671" y="451"></text></g>':''}
 </svg>`;
}
