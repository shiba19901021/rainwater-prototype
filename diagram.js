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
 const pipe=(d,width=18)=>`<path class="pipe-shadow" d="${d}" stroke-width="${width+9}"/><path class="pipe-edge" d="${d}" stroke-width="${width+4}"/><path class="pipe-face" d="${d}" stroke-width="${width}"/><path class="pipe-light" d="${d}" stroke-width="${Math.max(2,width*.21)}"/>`;
 const faucets=[92,148,202].map((x,i)=>`<g class="faucet" data-tap="${i}" ${interactive?'':`role="button" tabindex="0" aria-label="${i+1} 號水龍頭目前關閉，點擊開啟" aria-pressed="false"`}><path class="tap" d="M${x} 637V655H${x-12}V666"/><path class="tap-spout" d="M${x-19} 665H${x-5}"/><path class="tap-stem" d="M${x} 635V621"/><path class="tap-handle" d="M${x-11} 621H${x+11}M${x} 613V628"/><ellipse cx="${x-12}" cy="666" rx="7" ry="3" class="tap-mouth"/><rect x="${x-23}" y="606" width="46" height="71" fill="transparent" class="tap-hit"/>${interactive?'':`<path class="tap-water" data-flow="tap-${i}" d="M${x-12} 672V711"/>`}</g>`).join('');
 const part=(key,body)=>`<g class="device" data-part="${key}" style="--part-color:${EQUIPMENT[key].color}" ${interactive?`role="button" tabindex="0" aria-label="${EQUIPMENT[key].name}" aria-pressed="false"`:''}>${body}</g>`;
 return `<svg class="system-diagram" viewBox="0 0 1000 800" aria-label="嘉北國小雨水系統手繪工程圖" role="group">
 <defs><pattern id="${prefix}-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" stroke="#92a18c" stroke-width=".6" fill="none" opacity=".16"/></pattern><clipPath id="${prefix}-tank-clip"><path d="M287 525L309 548L462 538V679L329 687Q299 688 292 664Z"/></clipPath><clipPath id="${prefix}-column-clip"><path d="M533 268H547V368L557 381V620L546 634V665H534V634L523 620V381L533 368Z"/></clipPath><clipPath id="${prefix}-branch-clip"><rect data-water="branch-clip" x="420" y="675" width="145" height="0"/></clipPath><linearGradient id="${prefix}-barrel-front" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#626b5a"/><stop offset=".48" stop-color="#414d42"/><stop offset="1" stop-color="#344137"/></linearGradient></defs>
 <rect width="1000" height="800" fill="#faf8ef"/><rect width="1000" height="800" fill="url(#${prefix}-grid)"/>
 <g class="site-context"><path d="M50 294L812 294L942 228M50 299L812 299L942 233M70 339V701M235 339V701M715 339V701M80 358H219V531H80ZM732 359H857V662H732Z"/><path d="M40 735H760L940 644M286 690V744H515V681M296 700H505"/>
 <path d="M786 112L931 34L972 47L824 132Z" fill="#eef0e7"/>
 <path d="M93 121H860L912 143H143Z" fill="#eceee6"/><path d="M143 143V158H912V143M825 131V158"/>
 <path d="M928 106V242L977 265"/>
 </g><g class="gutter"><path d="M440 129H858L875 142H457Z" fill="#4c514b" stroke="#414a43" stroke-width="3"/><path d="M443 132H857" stroke="#8f978c" stroke-width="2"/></g>
 <g class="camera" fill="#e7e6dc" stroke="#899386" stroke-width="2"><path d="M763 224L803 230L799 241L759 235Z"/><ellipse cx="761" cy="230" rx="6" ry="7"/><path d="M782 238L783 248L795 250" fill="none"/></g>
 ${part('inlet',pipe(SYSTEM.inlet)+`<path class="hit-pipe" d="${SYSTEM.inlet}"/>`)}
 ${part('column',pipe(SYSTEM.column,36)+`<path d="M527 365H553L560 377H520ZM521 616H559L551 636H529Z" class="fitting"/><path d="M527 367H553M522 621H558" class="fitting-line"/><path class="hit-pipe" d="${SYSTEM.column}"/>`)}
 ${part('high',pipe(SYSTEM.high)+`<path class="hit-pipe" d="${SYSTEM.high}"/>`)}
 ${part('valve',pipe(SYSTEM.bottom)+`<rect x="599" y="660" width="31" height="30" rx="5" class="fitting"/>${interactive?'<path d="M598 667L631 667L631 676H598Z" fill="#bd4f3e" stroke="#7c3d31" stroke-width="2"/>':''}<path class="hit-pipe" d="${SYSTEM.bottom}"/>`)}
 ${part('tank',`<path class="barrel silhouette" d="${SYSTEM.barrel}"/><path class="barrel-top" d="M287 525Q291 508 315 504L437 491Q473 489 486 516L462 538L309 548Z"/><path class="barrel-side" d="M462 538L486 516L505 628Q508 653 487 666L463 679Z"/><path class="barrel-front" d="M287 525L309 548L462 538V679L329 687Q299 688 292 664Z" fill="url(#${prefix}-barrel-front)"/><path class="barrel-seam" d="M309 548L329 687M462 538V679M299 584L465 574M300 593L465 583M333 549L340 679M445 540L453 678"/><path class="barrel-panel" d="M348 606L434 600L437 646L352 652Z"/><ellipse cx="387" cy="500" rx="51" ry="17" class="tank-lid"/><ellipse cx="387" cy="497" rx="44" ry="11" class="tank-lid-top"/><text x="353" y="568" class="tank-label">200 L</text>`)}
 ${part('spill',pipe(SYSTEM.spill)+`<path class="hit-pipe" d="${SYSTEM.spill}"/>`)}
 ${part('vent',pipe('M320 504V473',15)+`<path d="M310 471H330M310 466H330M312 463V474M318 463V474M324 463V474" stroke="#645b71" stroke-width="2"/><path class="hit-pipe" d="M320 504V473"/>`)}
 ${part('taps',pipe(SYSTEM.tap,11)+`<path class="hit-pipe" d="${SYSTEM.tap}"/>`+faucets)}
 ${part('union',`<rect x="430" y="420" width="26" height="17" rx="3" class="fitting"/><path d="M435 420V437M441 420V437M447 420V437M452 420V437" stroke="#7a8273" stroke-width="1.4"/><rect x="255" y="645" width="16" height="25" rx="3" class="fitting approximate"/><path class="hit-pipe" d="M443 416V441M263 647V663"/>`)}
 <path d="M539 537V625L540 655Q540 675 558 675H586" class="hidden-route"/>
 ${interactive?'':`<g class="water-layer" pointer-events="none"><rect data-water="column" x="519" y="675" width="44" height="0" clip-path="url(#${prefix}-column-clip)" fill="#5aa8bd" opacity=".8"/><path d="M540 338H518Q511 338 508 328L490 281Q487 274 479 274H455" clip-path="url(#${prefix}-branch-clip)" class="water-solid"/><rect data-water="tank" x="275" y="687" width="237" height="0" clip-path="url(#${prefix}-tank-clip)" fill="#5aa8bd" opacity=".8"/><path data-flow="inlet" d="${SYSTEM.inlet}" class="water-stream"/><path data-flow="falling" d="${SYSTEM.column}" class="water-stream"/><path data-flow="drain" d="${SYSTEM.bottom}L678 714" class="water-stream"/><path data-flow="front" d="${SYSTEM.high}V523" class="water-front" pathLength="1"/><path data-flow="collect" d="${SYSTEM.high}V523" class="water-stream"/><path data-flow="spill" d="${SYSTEM.spill}" class="water-stream"/><g data-flow="rain" class="diagram-rain"><path d="M796 56l-7 15m40-35-7 15m40-35-7 15m40-35-7 15"/></g></g><g class="crest-guide"><path d="M425 274H582"/><text x="590" y="279">高位管最高點</text></g>`}
 <g class="drawing-notes"><text x="40" y="44">嘉北國小 ／ 雨水系統構造筆記</text><text x="665" y="770">依完成設備描繪 · 非施工比例圖</text></g>
 ${interactive?'<g class="callout" hidden pointer-events="none"><path class="leader"/><rect x="650" y="375" width="323" height="112" rx="3"/><text class="callout-name" x="671" y="414"></text><text class="callout-brief" x="671" y="451"></text></g>':''}
 </svg>`;
}
