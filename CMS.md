# Decap CMS 使用方式

主要管理入口為 <https://xha.tw/admin/>，GitHub Pages 備援入口為 <https://blog.xha.tw/admin/>。兩個入口讀取同一份設定，所有發布內容都會寫回 GitHub repo。變更合併至 `main` 後，GitHub Actions 會同步更新 VPS 主站與 GitHub Pages 備援站。

## 編輯與發布

1. 在 Decap CMS 選擇「頁面與導覽」、Blog、Docs 或「網站設定」。
2. 儲存為草稿，或在 Editorial Workflow 中移到「審核中」與「準備發布」。
3. 按下發布，讓 Decap 將變更合併至 `main`。
4. 到 GitHub Actions 確認 GitHub Pages 與 VPS 部署均成功。

單純儲存草稿不會改變正式網站。若 VPS 暫時無法連線，GitHub Pages 仍會建置；VPS 恢復後可重新執行部署工作。

## CMS 結構

CMS 頂層只有四組：

- 網站設定：站名、作者、位置、GitHub、原始碼連結與頭像。
- 頁面與導覽：首頁、Blog、Docs、Projects、Links、About 的頁面設定，以及四個主要頁面的 Content Blocks。
- Blog：新增與編輯文章。
- Docs：新增與編輯文件；頁面及導覽預設關閉。

首頁、About、Projects、Links 都採用相同的 `Content Blocks` 編輯方式：

1. 在同一份頁面中新增區塊。
2. 選擇區塊類型。
3. 在區塊內新增群組與項目。
4. 直接拖曳調整區塊、群組或項目的順序。
5. 用「顯示」暫時隱藏區塊，不需刪除內容。

例如 Tools 是一個 `Tool Grid`，裡面包含 Productivity、Development 等群組；每個群組再包含任意數量的工具。Projects 和 Links 也使用相同層級，不會因為多一個工具、專案或友站，就在 CMS 首頁多出一個集合。

## Page Blocks

通用區塊可放在多個頁面：

- Rich Text：一般 Markdown 內容，可選擇附加按鈕。
- Card List：有外框的內容卡片。
- Collapse：可展開或收合的補充內容。
- Aside：note、tip、caution、danger 提示框。
- Tabs：多個可切換的分頁內容。
- Steps：有順序編號的步驟。
- Timeline：日期、內容與選用連結。
- Buttons：一組行動按鈕。

指定頁面的區塊：

- 首頁：Latest Posts、Skill Groups、Website Cards。
- About：Tool Grid、Signature。
- Projects：Project Grid；分類和專案都在這一個區塊中管理。
- Links：Link Grid、Link History、Apply Links；群組和友站都在 Link Grid 中管理。

每個區塊都有 URL 識別碼、顯示開關、標題開關與頁面目錄開關。URL 識別碼只能使用小寫英文字母、數字和連字號，且同一頁請勿重複。

## Blog 與 Docs 內文區塊

Blog 和 Docs 的內文使用 MDX。編輯器工具列的 `+` 選單除了 Image 與 Code Block，也可以插入：

- Aside
- Collapse
- Tabs
- Steps
- Timeline
- Signature
- Buttons

CMS 會把這些元件保存成 `<CmsBlock ... />`。請透過 CMS 編輯元件欄位，不要手動改動其編碼後的 `data` 字串。既有 `.md` 內容仍可繼續建置；CMS 新增的文章與文件使用 `.mdx`。

## 圖片與簽名

CMS 上傳的檔案會存到 `public/uploads`，公開網址為 `/uploads/...`，並隨部署一起同步，不需另外複製到 VPS。

Signature 請上傳包含 `<path d="...">` 的 SVG，並保留 `viewBox`。網站只讀取筆畫路徑，不執行 SVG 內的 script、事件或外部資源。可用 `seq="1"`、`seq="2"` 指定筆畫順序，用 `data-duration="600"` 設定單筆動畫時間（毫秒）。只有填色、沒有 path 線條的圖片可靜態顯示，但無法產生手寫動畫。

## 在本機修改

頁面內容位於 `src/data/pages/*.json`，Blog 與 Docs 位於 `src/content/`。本機提交並推送到 `main` 後，部署流程與 CMS 發布相同。若 CMS 和本機同時修改同一檔案，請先同步最新的 `main`，避免合併衝突。
