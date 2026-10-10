# V1.0 GitHub 封版清單與操作

已檢查目前資料夾：沒有 .git，尚未 git init；沒有 node_modules、package-lock.json、dist、.env 或部署設定。本次不執行 init／commit／tag／push。既有 GitHub 私人 repo 可沿用 `community-water-resilience`，不用另建空 repo。

## A｜一定要上傳：可執行與可驗證的核心

- water-resilience-p0.html、README.md、package.json、server.mjs、audit.mjs、.gitignore。
- HANDOFF-PROMPT-V2.md、release/ 的摘要、清單、config 快照與檔案清冊。
- tests/ 全部 11 個 .mjs。
- debug/ 全部頂層 .mjs：loader／實驗函式是測試的直接或間接依賴；部分報告產生器需先重跑實驗生成 JSON。
- debug/prototype-before-pressure.html、debug/prototype-before-drought-buffer.html：測試直接讀取。
- 以下六個 checkpoint 的 water-resilience-p0.html（保留原路徑）：
  - checkpoints/prototype-0.5/
  - checkpoints/prototype-1a6-before-1b/
  - checkpoints/prototype-1b-before-1b1/
  - checkpoints/prototype-1b1-before-1b2/
  - checkpoints/prototype-1b2-before-1c1/
  - checkpoints/prototype-1c1-before-1c2/

不能只上傳正式 HTML 而声稱能重現120項驗收。也不要整個忽略 checkpoints/；這六個基準檔仍被測試引用。

## B｜建議上傳：設計與驗收證據

- debug/PROTOTYPE-1A-REPORT.md、PROTOTYPE-1A5-REPORT.md、PROTOTYPE-1A6-REPORT.md、PROTOTYPE-1B-REPORT.md、PROTOTYPE-1B1-REPORT.md、PROTOTYPE-1B2-REPORT.md、PROTOTYPE-1C1-REPORT.md、PROTOTYPE-1C2-REPORT.md。
- debug/BALANCE-DIAGNOSIS.md、PRESSURE-RESULTS.md、VISUAL-READABILITY.md。
- HANDOVER.md、README-cloud-original.md：保留歷史，但不要當現行啟動指南。
- debug/v1-release-test-results.txt：本次封版測試結果。
- debug/ui-p1c2-*.jpg 與 debug/ui-p1c2-checks.json：目前頁面驗收；不是玩家個資。

Prototype 報告應全部保留頂層一份。最新1C.2截圖建議保留；舊版全部截圖可不上傳。

## C｜可以不上傳：本機仍保留

- debug/*results.json、*summary.json、*history.csv、calibration*.jsonl、舊測試log／console JSON／結果表，均可由工具重產或報告已摘要。
- function-results.json 約8.33MB，pollution-results.json 約8.25MB、pressure-results.json 約5.40MB；這些不是程式載入必需資料。不是所有 JSON 都沒用：release/V1-CONFIG-SNAPSHOT.json 與選留 ui-p1c2-checks.json 要保留。
- 舊 ui-p05／p1a／p1b／p1c1 等截圖；debug/prototype-before-visuals.html、prototype-before-river-polish.html、prototype-before-round-control.html 可本機封存，本次不刪。
- checkpoint 內的 README、debug、tests、套娃 checkpoints 重複副本可不上傳；只保留 A 六份 HTML，歷史報告用頂層版本。

大量歷史 debug 建議「Git 排除、本機保留」，目前不清除，避免破壞證據。上傳後 fresh clone 執行 npm test，確認保留依賴齊全。

## D｜不應上傳

未發現現存 token／secret 檔；仍排除未來 .env、憑證與私鑰、.aws、編輯器／Codex個人設定、node_modules、OS .DS_Store／Thumbs.db／desktop.ini、暫存及cache。現有文件可能含本機使用者路徑、時間與試玩紀錄；它們不是憑證，但私人repo較適合保留原始證據。

檢查包含全部現存檔案清冊與常見GitHub/OpenAI token、私鑰、api key／password指派模式，未發現命中；沒有發現 .env／.aws／.codex／.agents／node_modules。這是此次掃描結果，不是保證未來新增資料不含秘密。尚未掃遠端repo或Git歷史（本機無Git歷史）。

## 建議 repo 結構

```text
community-water-resilience/
  water-resilience-p0.html
  README.md
  HANDOFF-PROMPT-V2.md
  HANDOVER.md / README-cloud-original.md
  package.json / server.mjs / audit.mjs / .gitignore
  release/  # 封版摘要、config、清冊、上傳與操作指南
  tests/    # 完整回歸
  debug/    # 頂層工具、歷史報告、必要舊HTML、選留最新驗收證據
  checkpoints/<六個版本>/water-resilience-p0.html
```

不搬動測試依賴路徑；不虛構 src/dist/build。現有 .gitignore 採白名單保留 checkpoint HTML；debug 只排除生成檔，不排除 .mjs／.md 或必要HTML。忽略不等於刪除。

## Git 封版步驟（PowerShell；由你執行）

repo：community-water-resilience；branch：main；commit：`Release V1.0 Core Simulation (validated Prototype 1C.2)`；tag：`v1.0-core-simulation`。

先在目前專案資料夾開終端，檢查與建立本機Git：

```powershell
node audit.mjs
git init -b main
git add .
git status --short
git diff --cached --stat
git diff --cached --check
git commit -m "Release V1.0 Core Simulation (validated Prototype 1C.2)"
git tag -a v1.0-core-simulation -m "V1.0 Core Simulation; balance calibration deferred to V2"
git remote add origin https://github.com/shiba19901021/community-water-resilience.git
git ls-remote origin
```

commit 前查看暫存清單：六個 checkpoint HTML、兩份必要 debug HTML、tests與工具都應列入；巨量JSON與套娃備份不應列入。若Git要求身分，用自己的名稱與GitHub驗證email設定 git config user.name／user.email（不提供假身分）。已有origin時先git remote -v，不重複add。

**若 git ls-remote 沒有任何 branch/tag，遠端是空repo**，確認後自行推送：

```powershell
git push -u origin main
git push origin v1.0-core-simulation
```

**若遠端已有提交**（例如之前上傳0.5），不要force push、不套用空repo推送流程。先：

```powershell
git fetch origin
git log --oneline --all --graph -n 20
git branch -r
```

保留本機封版commit，對照遠端實際預設branch再決定整合；建議在另一個資料夾clone遠端，把清單A/B檔案覆蓋進clone、保留既有.git、再測試／commit／tag／push。不要用整個資料夾複製覆蓋.git，也不要擅自merge無關歷史。此時可把遠端結果交給Codex處理，不須冒險刪除歷史。

推送後GitHub Code頁應有檔案，Tags可找到tag；可另外建立Release，選此tag並貼V1完成範圍與難度未校準說明。保存成功後，另開新Work貼 HANDOFF-PROMPT-V2.md。未建立實際tag前，稱「本機凍結準備完成」，不要稱遠端已封版。
