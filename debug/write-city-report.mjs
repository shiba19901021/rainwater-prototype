import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('./city-results.json',import.meta.url),'utf8'));
const fmt=n=>typeof n==='number'?n.toFixed(2):'無';
const normal=data.filter(r=>r.mode==='normal'),dry=data.filter(r=>r.mode==='dry');
const maxWater=Math.max(...data.map(r=>r.maxWaterError)),maxPoll=Math.max(...data.map(r=>r.maxPollutionError));
const text=`# Prototype 1C.1｜生活需求＋基礎城市設施

本版增加土地競爭與生活需求，保留 1B.2 已驗證水系統。停止於 1C.1；未加入受災失能、恢復、金錢、人口成長、多人或排名。

## 1. 修改與新增檔案

- water-resilience-p0.html：城市需求純統計、新設施參數、CITY-A～F、生活需求顯示、分組建設與角色提示；原公園沿用。
- debug/engine-loader.mjs：匯出 cityNeeds；保留既有測試模組選項。
- tests/city-needs.test.mjs：10 項城市、守恆、速度與 1B.2 精確相容測試。
- tests/round.test.mjs、tests/wetland.test.mjs：舊屬性逐欄比較，容許新增生活欄位，既有水參數與軌跡仍嚴格驗證。
- tests/pollution-balance.test.mjs：1B.2 與 1B.1 的歷史「只改三個值」來源檢查使用凍結的 1B.2；其餘控制實驗仍跑現版。另新增現版與 1B.2 完整配置／軌跡比較，避免把新需求視為舊平衡修改。
- audit.mjs、package.json、server.mjs：納入新測試與 debug:city，更新版本標示。
- README.md：本版操作與歷史版本區分。
- debug/city-experiments.mjs、city-results.json、city-results-table.txt：可重現控制實驗與數據。
- debug/write-city-report.mjs、PROTOTYPE-1C1-REPORT.md、prototype-1c1-test-results.txt：報告與驗證記錄。
- debug/ui-p1c1-city.jpg、ui-p1c1-mobile.jpg、ui-p1c1-checks.json：實際瀏覽器檢查。
- checkpoints/prototype-1b2-before-1c1/water-resilience-p0.html：修改前正式 HTML，用於逐步對照。

## 2. 生活需求公式與任務狀態

目標 H=targetHouseholds，預設由 balanceConfig.cityNeeds.defaultHousingTarget 提供。住宅 H；工作 ceil(H × jobsTargetRatio)，預設比例 1；公共服務 ceil(H × 1/3)；休閒 ceil(H × 1/4)。各配置點數加總，不依水況、污染、缺水或停工圖示扣分。所有達標為良好；缺 1 項受壓、缺 2 項不足、缺 3～4 項嚴重失能。

畫面顯示實際點數／目標，達標綠色，缺乏橙色。底層滿足比率 clamp 至 1，超額住宅不補其他需求，不給總分；沒有設施數量上限。cityNeeds 是讀取配置的獨立函式，不參與水引擎。

## 3. 新設施完整參數

| 設施／config key | icon／底色 | runoff | infiltration | detention 等級／實際容量 | waterDemand 等級／每步 | pollutionLoad 等級／每步 | housing/jobs/publicService/leisure |
|---|---|---:|---:|---:|---:|---:|---|
| 商業 commercial | 🏪／#dfb66e | 2 | 0 | 0／0 | 2／0.08 | 1／0.04 | 0/1/0/0 |
| 公共服務 publicService | 🏥／#e5aaad | 2 | 0 | 0／0 | 2／0.08 | 1／0.04 | 0/0/1/0 |
| 一般公園 generalPark（別名 park） | 🌳／#91ba76 | 1 | 2 | 1／4.5 | 0／0 | 0／0 | 0/0/0/1 |
| 農地 agriculture | 🌱／#bed18a | 0 | 2 | 0／0 | 5／0.20 | 2／0.08 | 0/1/0/0 |

每步固定 0.5 模擬秒。runoff/infiltration 仍使用原水文公式；上述是相對教學參數，非毫米、人口或真實流量。新消費者沿用實際供水、污水回流、有限處理與再生水流程；污染按原每步產生方式計算，即使缺水也持續產污。一般公園無污染生成／用水（原未設定欄位按零解讀），無河川自然淨化；沒有另造第二種一般公園。

## 4. 全設施生活貢獻

| 設施 | housing | jobs | publicService | leisure |
|---|---:|---:|---:|---:|
| 住宅 | 1 | 0 | 0 | 0 |
| 商業 | 0 | 1 | 0 | 0 |
| 工業 | 0 | 2 | 0 | 0 |
| 農地 | 0 | 1 | 0 | 0 |
| 公共服務 | 0 | 0 | 1 | 0 |
| 一般公園／下凹公園／濕地（各一座） | 0 | 0 | 0 | 1 |
| 森林／調節池／處理廠／取水站／道路／空地 | 0 | 0 | 0 | 0 |

貢獻全部來自 facilityConfig，住宅與三種工作係數讀取 cityNeeds config。公園類皆 +1，災害不使工作或住宅失能。

## 5. 預設目標與土地比例

預設 H=12，所以需要 **12 住宅／12 工作／4 公共服務／3 休閒**。需求範例 H=8 亦測試正確得到 8／8／3／2；未將任何需求數字寫死在 rendering。

固定地圖 90 格可建，20 格固定道路、10 格河川。H=8 若使用工業需 17 格，只有 18.9%；商業需 21 格（23.3%），低於需求占地 25～35% 目標。因此只校準生活目標為 12，未調水文與地圖。

剛好達標的工業配置：12 住宅＋6 工業＋4 公共服務＋3 一般公園＝25 格（27.78%），剩 65 格。商業／農業配置：12＋12＋4＋3＝31 格（34.44%），剩 59 格。公園可替換為下凹或濕地仍各提供一點，並帶來原有水設計效果；占地只算一次。

## 6. CITY-A～F 控制實驗

正式下拉選單新增 CITY-A～F，所有案例均固定同一地圖、正常水資源起點、無治理／供水設施（F 除外）。B 使用商業作基本工作來源，E 是相同配置的商業比較組，因此兩者完全相同，是有意保留的控制重複組。

| 案例 | 住宅／工作／服務／休閒點數 | 使用／剩餘土地 | 城市功能 |
|---|---|---|---|
${normal.map(r=>`| ${r.case} | ${['housing','jobs','publicService','leisure'].map(k=>r.city.provided[k]).join('/')} | ${r.used}／${r.free} | ${r.city.status} |`).join('\n')}

F 配置 18 森林、6 濕地、6 調節池；休閒達標，但沒有住宅、工作、公共服務，因此嚴重失能。零城市用水／產污、沒有乾旱缺水，水質良好，生活任務仍失敗。

## 7. 工作來源的實際水系統差異

主要比較使用正式 **2:00 自動天氣故事**，同一固定雨程。另跑 240 秒連續晴天，以及 240 秒高壓雨程（小雨 60 秒→大雨 60 秒→豪雨 60 秒→小雨 60 秒）。後者是長時間壓力診斷，不能當作普通試玩。不同雨程結果不可混比。

| 案例 | 每步城市需求 | 2:00 累計污染生成 | 2:00 累計入滲 | 最大有害淹水格數 | 最差水質 | 連續晴天首次缺水（秒） |
|---|---:|---:|---:|---:|---|---:|
${normal.map(r=>`| ${r.case} | ${fmt(r.demandPerStep)} | ${fmt(r.pollutionGenerated)} | ${fmt(r.infiltrated)} | ${r.maxFlooding} | ${r.worstQuality} | ${fmt(dry.find(d=>d.case===r.case).firstShortage)} |`).join('\n')}

相同 12 工作點：6 工業比 12 商業省 6 格；單座工業用水 3、污染 3，但較少座數，使整座工業城市需求 **2.00** 反而略低於商業 **2.24**，不能宣稱等工作工業總用水一定較高。其污染 **326.4** 高於商業 **268.8**（+21.43%）。

農地入滲 **1184.47**，比商業 **964.53** 增加約 **22.81%**；需求 **3.68** 比商業 +64.29%，晴天首次缺水 **64.5** 秒，早於商業 **68.5**、工業 **69.0**。農地單座污染中等，但因需要更多土地，整體污染 **384** 高於等工作點的工業（+17.65%）。農地透水並不保證整城淹水較少：沿用污水回流後，高用水增加回河水量，本配置最大淹水 20 格，商業 19 格。這是需要試玩檢視的取捨，未為農地效果修改舊平衡。

## 8. 核心水系統相容、守恆與回歸

舊濕地 30%／每步 1.0、處理容量 1.25、住宅污染 1、工業污染 3、再生水 50%、污水回流 70%、入滲、洪水、乾旱、外部供水、取水、水質門檻、需求、天氣與河川流速均未改。新增設施使用相同既有供水與污染流程，不新增第二個引擎。

現版與修改前 1B.2：逐欄檢查所有原設施參數、完整原 balance（排除新增 cityNeeds）、固定地圖與天氣一致。A～D、W1～W6、P1～P8 各跑 320 步同一乾→小雨→大雨→豪雨，**每一步完整可序列化模擬狀態完全相等**。A～J 的所有控制實驗數據亦完全相等。歷史原測試仍驗證洪水、乾旱、供水、取水、W6、P1～P8、濕地、有限處理、pause/resume 與倍速；新城市另測 1×～4× 完整結果完全相同。

CITY 18 組雨程最大水量守恆誤差 **${maxWater.toExponential(3)}**，污染守恆誤差 **${maxPoll.toExponential(3)}**，均小於 1e-7。新消費者在污染設為零時仍按實際供水回流，避免漏掉攜帶污染與污水分配。CITY-C/D/E 的 480 步乾旱→豪雨也逐步檢查兩種守恆。

最終完整自動測試 **105／105 通過，0 失敗**，結果見 prototype-1c1-test-results.txt。

## 9. 實際瀏覽器驗證

正式 HTML 在 http://127.0.0.1:4173/ 啟動。實際切換 A、B、C、D、F，核對四項數字與功能狀態；新設施商業、公共服務、農地、一般公園可放置／拆除，需求即時更新。原動畫實際跑完 2:00／4× 的農業偏乾回合，最後缺水但城市功能仍良好。

桌面 1280 與手機 390 寬測試，頁面與需求、建設按鈕無橫向 overflow；新 icon 清楚。建設分城市生活、綠地／水設計、水資源設施，保留拆除與查看；滑鼠提示／點選說明是簡短角色文字。五案例及操作過程沒有 console error／warn。

瀏覽器找到並修正「編輯配置後生活需求未刷新」問題，新增 render 更新測試，並再次實際核對每次放置與拆除的需求數字。

## 10. 已知限制與等待試玩

- 城市狀態按欠缺項目數判斷，未區分一項小幅不足與完全缺乏；底層有 capped ratio，尚未給分。
- 工作、住宅、服務、休閒皆為靜態點數；工業原有缺水停工圖示不扣 jobs，沒有 1C.2 失能或恢復。
- 未模擬設施服務距離、交通、人口增長或土地價格；公共服務不提供恢復加成。
- 農地目前高用水與中等單座污染；在等工作點下，污染可能高於少量高效率工業，需用試玩決定是否調整新設施，舊值未改。
- 全韌性案例沒有用水和產污，但仍可能淹水，不能保證極端雨程安全；2:00 自動最大 15 格，長時間豪雨最大 83 格。長雨把不同配置差距壓縮是舊水系統行為，本版沒有調整。
- 預設生活目標 12 是占地校準用測試值；未加講師人口介面或多人，未固定人口為地圖尺寸，後續可由 targetHouseholds 配置。

完成後停止在 Prototype 1C.1，等待實際試玩。
`;
writeFileSync(new URL('./PROTOTYPE-1C1-REPORT.md',import.meta.url),text);
