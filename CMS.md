# Decap CMS 使用方式

主要管理入口為 <https://xha.tw/admin/>，GitHub Pages 備援入口為 <https://blog.xha.tw/admin/>。兩者使用相同的 Decap CMS 設定，登入後的修改都會寫回 GitHub repo；內容發布到 `main` 後，既有 GitHub Actions 會重新建置並同步到 VPS，GitHub Pages 備援站也會同步更新。

## 編輯與發布

1. 在 Decap CMS 選擇要編輯的集合。
2. 儲存為草稿，或在 Editorial Workflow 中依序移到「審核中」與「準備發布」。
3. 按下發布後，Decap 會把變更合併至 `main`。
4. 到 GitHub Actions 確認 Pages 與 VPS 部署工作均成功。

單純儲存草稿不會改變正式網站。若部署失敗，GitHub 上的內容仍然保留，可以修正後重新執行工作流程。

## 可管理的內容

- 網站設定：站名、作者、位置、GitHub、原始碼連結與頭像。
- 頁面與導覽：首頁、Blog、Docs、Projects、Links、About 的標題、排序、導覽顯示、瀏覽數與留言開關。
- Blog：新增與編輯文章、標籤、日期、圖片、草稿與留言設定。
- 首頁與 About：每個小節可個別新增、排序、編輯或隱藏。
- Projects：先建立分類，再把專案放入分類；分類與個別專案都有排序及顯示開關。
- Links：先建立群組，再把友站放入群組；群組可預設收合，群組與個別連結都能隱藏。
- Docs：可以建立文件；Docs 頁面與導覽預設關閉，需要公開時再到「頁面與導覽」啟用。

## 顯示規則

- `啟用頁面`：控制整個頁面是否公開。
- `顯示於導覽列`：只控制頂部選單，不會刪除頁面。
- `顯示`：控制單一小節、分類、專案、群組或連結。
- `草稿`：Blog 或 Docs 的內容不會進入正式建置。
- `排序`：數字越小越前面；不同類型的 Projects 或 Links 區塊也會依同一套順序排列。

Projects 與 Links 使用分類／群組的檔名作為關聯值。若已有內容引用該分類或群組，請避免直接在 GitHub 重新命名其檔案；要改畫面上的名稱，只需修改標題。

## 圖片

CMS 上傳的圖片會存到 `public/uploads`，網址為 `/uploads/...`。圖片也會隨 GitHub Actions 一起部署，不需另外複製到 VPS。

## 在本機修改

仍可直接編輯 repo 內的 Markdown、YAML 或 JSON。提交並推送到 `main` 後，部署流程和 CMS 發布時相同。若同時在 CMS 與本機修改同一個檔案，請先同步最新的 `main`，避免合併衝突。
