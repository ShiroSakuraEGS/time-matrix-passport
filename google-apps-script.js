/**
 * ============================================================================
 * 賽博時空簽證護照 (Cyber Time Passport) - Google Apps Script 雲端同步腳本
 * ============================================================================
 * 
 * 【使用說明】：
 * 1. 在 Google 雲端硬碟建立一份新的「Google 試算表（Google Sheets）」。
 * 2. 點擊頂部選單【擴充功能】->【Apps Script】。
 * 3. 清空原本的程式碼，將本檔案所有代碼完整複製並貼上。
 * 4. 點擊右上角【部署】->【新增部署】。
 * 5. 類型選擇【網頁應用程式】（Web App）：
 *    - 說明：時空護照同步伺服端
 *    - 執行身分：我（您的 Google 帳號）
 *    - 誰可以存取：任何人（Anyone） ※請確保選 Anyone，套件才能傳輸資料
 * 6. 點擊【部署】，複製取得的「網頁應用程式網址（Web App URL）」！
 * 7. 將此網址貼回擴充套件設定中的「Google 試算表 Webhook 網址」，即可實現即時雲端記帳！
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // 嘗試取得鎖定，避免多筆併發寫入衝突
  try {
    lock.waitLock(10000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: '伺服端忙碌中，請稍後重試'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var sheet = getOrCreateLogSheet();
    var data = {};

    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        data = e.parameter || {};
      }
    } else {
      data = e.parameter || {};
    }

    // 解析傳入的欄位資料
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var itemCode = data.code || 'SYS-000';
    var itemName = data.name || '未命名任務';
    var startTime = data.startTime || '';
    var endTime = data.endTime || '';
    var durationSec = data.durationSec || 0;
    var durationFormatted = data.durationFormatted || formatSeconds(durationSec);
    var notes = data.notes || '';
    var sessionId = data.sessionId || ('PASS-' + new Date().getTime());

    // 寫入試算表新列
    sheet.appendRow([
      timestamp,
      itemCode,
      itemName,
      startTime,
      endTime,
      durationSec,
      durationFormatted,
      notes,
      sessionId
    ]);

    // 套用最新資料列格式
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 9).setHorizontalAlignment('center');
    sheet.getRange(lastRow, 3).setHorizontalAlignment('left'); // 項目名稱靠左
    sheet.getRange(lastRow, 8).setHorizontalAlignment('left'); // 備註靠左

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: '賽博時空簽證已成功蓋印並寫入 Google 試算表！',
      row: lastRow,
      item: itemName,
      duration: durationFormatted
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: '寫入失敗: ' + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 支援 GET 健康檢查（連線測試使用）
function doGet(e) {
  var action = (e.parameter && e.parameter.action) || 'ping';

  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'CYBER-TIME MATRIX 雲端伺服端連線正常，隨時待命！',
      timestamp: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'CyberPassport Apps Script Web App Online.'
  })).setMimeType(ContentService.MimeType.JSON);
}

// 取得或自動建立「時空簽證紀錄」工作表，並設定科技感表頭
function getOrCreateLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "時空引渡簽證紀錄";
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName, 0);

    // 建立表頭
    var headers = [
      "蓋印時間",
      "項目代號",
      "項目名稱",
      "開始時間",
      "完成時間",
      "經過秒數",
      "累積時長",
      "簽證備註/任務說明",
      "簽證識別碼"
    ];

    sheet.appendRow(headers);

    // 設定表頭樣式（深藍黑底色、青綠霓虹文字）
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#0d131f");
    headerRange.setFontColor("#00f0ff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    headerRange.setFontFamily("Consolas");
    sheet.setFrozenRows(1);

    // 自動調整欄寬
    sheet.setColumnWidth(1, 160); // 蓋印時間
    sheet.setColumnWidth(2, 110); // 項目代號
    sheet.setColumnWidth(3, 180); // 項目名稱
    sheet.setColumnWidth(4, 160); // 開始時間
    sheet.setColumnWidth(5, 160); // 完成時間
    sheet.setColumnWidth(6, 100); // 經過秒數
    sheet.setColumnWidth(7, 120); // 累積時長
    sheet.setColumnWidth(8, 260); // 備註
    sheet.setColumnWidth(9, 180); // 識別碼
  }

  return sheet;
}

// 秒數格式化輔助函式
function formatSeconds(totalSec) {
  var sec = parseInt(totalSec, 10) || 0;
  var hrs = Math.floor(sec / 3600);
  var mins = Math.floor((sec % 3600) / 60);
  var secs = sec % 60;

  var pad = function(n) { return (n < 10 ? '0' : '') + n; };
  return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
}
