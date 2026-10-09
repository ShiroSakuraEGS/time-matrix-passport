/**
 * 賽博時空簽證護照 (Cyber Time Passport) - 介面互動與控制器邏輯
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 初始化核心資料
  await window.passportCore.init();

  // 取得 DOM 元件
  const itemSelector = document.getElementById('itemSelector');
  const btnOpenAddItem = document.getElementById('btnOpenAddItem');
  const btnDeleteItem = document.getElementById('btnDeleteItem');
  const stampClockSeal = document.getElementById('stampClockSeal');
  const stampItemBadge = document.getElementById('stampItemBadge');
  const stampDigits = document.getElementById('stampDigits');
  const stampStatusLabel = document.getElementById('stampStatusLabel');

  const btnStartTimer = document.getElementById('btnStartTimer');
  const btnPauseTimer = document.getElementById('btnPauseTimer');
  const btnFinishTimer = document.getElementById('btnFinishTimer');

  const sheetStatusDot = document.getElementById('sheetStatusDot');
  const sheetStatusText = document.getElementById('sheetStatusText');
  const quickOpenSheetLink = document.getElementById('quickOpenSheetLink');

  // 分頁籤
  const tabs = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // 簽證頁面
  const visaStampsGrid = document.getElementById('visaStampsGrid');
  const btnPrevPage = document.getElementById('btnPrevPage');
  const btnNextPage = document.getElementById('btnNextPage');
  const pageIndicatorText = document.getElementById('pageIndicatorText');

  // 設定頁面
  const inputWebhookUrl = document.getElementById('inputWebhookUrl');
  const inputSheetUrl = document.getElementById('inputSheetUrl');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const btnTestWebhook = document.getElementById('btnTestWebhook');
  const btnOpenSheetDirect = document.getElementById('btnOpenSheetDirect');
  const btnCopyScriptCode = document.getElementById('btnCopyScriptCode');
  const checkSoundEnabled = document.getElementById('checkSoundEnabled');
  const checkFloatingEnabled = document.getElementById('checkFloatingEnabled');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnImportCsv = document.getElementById('btnImportCsv');
  const importCsvInput = document.getElementById('importCsvInput');
  const btnExportData = document.getElementById('btnExportData');
  const btnImportData = document.getElementById('btnImportData');
  const importFileInput = document.getElementById('importFileInput');

  // Modal 元件
  const modalAddItem = document.getElementById('modalAddItem');
  const btnCloseAddItem = document.getElementById('btnCloseAddItem');
  const newProjectName = document.getElementById('newProjectName');
  const newProjectCode = document.getElementById('newProjectCode');
  const colorPickerRow = document.getElementById('colorPickerRow');
  const btnConfirmAddItem = document.getElementById('btnConfirmAddItem');

  const modalFinish = document.getElementById('modalFinish');
  const btnCloseFinish = document.getElementById('btnCloseFinish');
  const finishModalDuration = document.getElementById('finishModalDuration');
  const finishNotesInput = document.getElementById('finishNotesInput');
  const btnSubmitFinish = document.getElementById('btnSubmitFinish');

  const modalInspector = document.getElementById('modalInspector');
  const btnCloseInspector = document.getElementById('btnCloseInspector');
  const inspectorTitle = document.getElementById('inspectorTitle');
  const inspectorTotalTime = document.getElementById('inspectorTotalTime');
  const inspectorCount = document.getElementById('inspectorCount');
  const inspectorSessionList = document.getElementById('inspectorSessionList');
  const btnInspectorOpenSheet = document.getElementById('btnInspectorOpenSheet');
  const btnInspectorDeleteItem = document.getElementById('btnInspectorDeleteItem');

  let selectedColor = '#00f0ff';
  let inspectingItemId = null;

  // ---------------- 1. 分頁籤切換 ----------------
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      window.cyberSound.playClickSound();
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      if (targetId === 'stamp-clock') document.getElementById('tabClock').classList.add('active');
      if (targetId === 'visa-pages') {
        document.getElementById('tabVisa').classList.add('active');
        renderVisaPages();
      }
      if (targetId === 'settings') {
        document.getElementById('tabSettings').classList.add('active');
        loadSettingsToForm();
      }
    });
  });

  // ---------------- 2. 項目選單渲染 ----------------
  function renderItemSelector() {
    const activeId = window.passportCore.activeTimer.itemId;
    itemSelector.innerHTML = '';
    window.passportCore.items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `[${item.code}] ${item.name}`;
      if (activeId && activeId === item.id) {
        opt.selected = true;
      }
      itemSelector.appendChild(opt);
    });

    updateSelectedBadge();
  }

  function updateSelectedBadge() {
    const selectedId = itemSelector.value;
    const item = window.passportCore.items.find(i => i.id === selectedId);
    if (item) {
      stampItemBadge.textContent = `[${item.code}] ${item.name}`;
      stampItemBadge.style.color = item.color || 'var(--neon-cyan)';
    } else {
      stampItemBadge.textContent = '請選擇或新增項目';
      stampItemBadge.style.color = 'var(--text-muted)';
    }
  }

  itemSelector.addEventListener('change', () => {
    window.cyberSound.playClickSound();
    updateSelectedBadge();
  });

  // ---------------- 3. 印章時鐘與計時器動態更新 ----------------
  function updateTimerUI() {
    const timer = window.passportCore.activeTimer;
    const elapsedSec = window.passportCore.getCurrentElapsedSeconds();
    stampDigits.textContent = window.passportCore.formatTime(elapsedSec);

    if (timer.isRunning && !timer.isPaused) {
      stampClockSeal.className = 'stamp-clock-seal running';
      stampStatusLabel.textContent = 'RUNNING // 簽證審核中';
      btnStartTimer.disabled = true;
      btnPauseTimer.disabled = false;
      btnPauseTimer.innerHTML = '<span>⏸️</span> 暫停';
      btnFinishTimer.disabled = false;
      itemSelector.disabled = true;
    } else if (timer.isRunning && timer.isPaused) {
      stampClockSeal.className = 'stamp-clock-seal paused';
      stampStatusLabel.textContent = 'PAUSED // 暫停中';
      btnStartTimer.disabled = true;
      btnPauseTimer.disabled = false;
      btnPauseTimer.innerHTML = '<span>▶️</span> 繼續';
      btnFinishTimer.disabled = false;
      itemSelector.disabled = true;
    } else {
      stampClockSeal.className = 'stamp-clock-seal';
      stampStatusLabel.textContent = 'READY // 待命';
      btnStartTimer.disabled = false;
      btnPauseTimer.disabled = true;
      btnPauseTimer.innerHTML = '<span>⏸️</span> 暫停';
      btnFinishTimer.disabled = (elapsedSec === 0);
      itemSelector.disabled = false;
    }
  }

  // 啟動定時刷新（每 500 毫秒刷新一次時鐘數字）
  setInterval(updateTimerUI, 500);

  // 蓋印觸發動畫效果
  function triggerStampAnimation() {
    stampClockSeal.classList.remove('stamping');
    void stampClockSeal.offsetWidth; // 強制重繪
    stampClockSeal.classList.add('stamping');
    window.cyberSound.playStampSound();
  }

  // 點擊【蓋印開始】
  btnStartTimer.addEventListener('click', async () => {
    const selectedId = itemSelector.value;
    if (!selectedId) {
      alert('請先選擇或建立通關項目！');
      return;
    }
    triggerStampAnimation();
    await window.passportCore.startTimer(selectedId);
    updateTimerUI();
  });

  // 點擊印章本體亦可快速互動（若未開始則開始，若進行中則暫停）
  stampClockSeal.addEventListener('click', async () => {
    const timer = window.passportCore.activeTimer;
    if (!timer.isRunning) {
      btnStartTimer.click();
    } else if (!timer.isPaused) {
      btnPauseTimer.click();
    } else {
      btnPauseTimer.click();
    }
  });

  // 點擊【暫停 / 繼續】
  btnPauseTimer.addEventListener('click', async () => {
    window.cyberSound.playClickSound();
    const timer = window.passportCore.activeTimer;
    if (timer.isRunning && !timer.isPaused) {
      await window.passportCore.pauseTimer();
    } else if (timer.isRunning && timer.isPaused) {
      await window.passportCore.resumeTimer();
    }
    updateTimerUI();
  });

  // 點擊【完成簽證】
  btnFinishTimer.addEventListener('click', async () => {
    triggerStampAnimation();
    const elapsedSec = window.passportCore.getCurrentElapsedSeconds();
    finishModalDuration.textContent = window.passportCore.formatTime(elapsedSec);
    finishNotesInput.value = '';
    modalFinish.classList.add('active');
  });

  // 送出完成簽證
  btnSubmitFinish.addEventListener('click', async () => {
    window.cyberSound.playStampSound();
    const notes = finishNotesInput.value;
    modalFinish.classList.remove('active');

    // 顯示同步動畫
    sheetStatusDot.className = 'sync-dot syncing';
    sheetStatusText.textContent = '資料封包傳輸寫入中...';

    const session = await window.passportCore.finishTimer(notes);
    window.cyberSound.playSuccessSound();

    setTimeout(() => {
      updateSyncStatusUI();
      updateTimerUI();
      renderVisaPages();
    }, 800);
  });

  btnCloseFinish.addEventListener('click', () => {
    window.cyberSound.playClickSound();
    modalFinish.classList.remove('active');
  });

  // ---------------- 4. 試算表連線狀態指示 ----------------
  function updateSyncStatusUI() {
    const settings = window.passportCore.settings;
    if (settings.webhookUrl && settings.webhookUrl.startsWith('http')) {
      sheetStatusDot.className = 'sync-dot online';
      sheetStatusText.textContent = 'GOOGLE 試算表：即時雲端同步';
    } else {
      sheetStatusDot.className = 'sync-dot';
      sheetStatusText.textContent = '未鏈接試算表 (本機離線模式)';
    }

    if (settings.sheetUrl && settings.sheetUrl.startsWith('http')) {
      quickOpenSheetLink.href = settings.sheetUrl;
      quickOpenSheetLink.style.display = 'inline';
    } else {
      quickOpenSheetLink.style.display = 'none';
    }
  }

  // ---------------- 5. 護照簽證分頁 (Visa Stamps Pages) ----------------
  function renderVisaPages() {
    const stats = window.passportCore.getStatistics();
    const perPage = window.passportCore.settings.itemsPerPage || 4;
    const totalPages = Math.max(1, Math.ceil(stats.length / perPage));

    if (window.passportCore.currentPage > totalPages) {
      window.passportCore.currentPage = totalPages;
    }
    const curPage = window.passportCore.currentPage;

    pageIndicatorText.textContent = `PAGE 0${curPage} / 0${totalPages}`;
    btnPrevPage.disabled = (curPage <= 1);
    btnNextPage.disabled = (curPage >= totalPages);

    visaStampsGrid.innerHTML = '';

    const startIdx = (curPage - 1) * perPage;
    const pageItems = stats.slice(startIdx, startIdx + perPage);

    pageItems.forEach(item => {
      const stampEl = document.createElement('div');
      stampEl.className = 'visa-stamp-card';
      stampEl.style.setProperty('--item-color', item.color);

      // 印章卡片內容：項目代號、名稱、累積總時長、蓋印次數
      stampEl.innerHTML = `
        <div class="stamp-border-frame"></div>
        <div class="stamp-header-row">
          <span class="stamp-code-tag">${escapeHtml(item.code)}</span>
          <span class="stamp-seal-mini">★ VISA SEAL</span>
        </div>
        <div class="stamp-project-title" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div class="stamp-total-duration-box">
          <div class="stamp-duration-value">${item.formattedHMS}</div>
          <div class="stamp-duration-label">累積通關時長 (${item.formattedTotal})</div>
        </div>
        <div class="stamp-footer-row">
          <span class="stamp-count-text">${item.clearanceCount} 次簽證</span>
          <span class="stamp-inspect-hint">點開詳細說明 🔍</span>
        </div>
      `;

      // 點擊印章卡片展開詳細檢視器
      stampEl.addEventListener('click', () => {
        window.cyberSound.playClickSound();
        openInspectorModal(item.id);
      });

      visaStampsGrid.appendChild(stampEl);
    });

    // 若該頁未滿 4 個，補上空白新增印章槽
    if (pageItems.length < perPage) {
      const emptySlots = perPage - pageItems.length;
      for (let i = 0; i < emptySlots; i++) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'visa-stamp-empty';
        emptyEl.innerHTML = `
          <span style="font-size:18px;">✚</span>
          <span>空白簽證頁位 (點擊新增)</span>
        `;
        emptyEl.addEventListener('click', () => {
          window.cyberSound.playClickSound();
          modalAddItem.classList.add('active');
        });
        visaStampsGrid.appendChild(emptyEl);
      }
    }
  }

  btnPrevPage.addEventListener('click', () => {
    if (window.passportCore.currentPage > 1) {
      window.cyberSound.playClickSound();
      window.passportCore.currentPage--;
      renderVisaPages();
    }
  });

  btnNextPage.addEventListener('click', () => {
    const stats = window.passportCore.getStatistics();
    const perPage = window.passportCore.settings.itemsPerPage || 4;
    const totalPages = Math.ceil(stats.length / perPage);
    if (window.passportCore.currentPage < totalPages) {
      window.cyberSound.playClickSound();
      window.passportCore.currentPage++;
      renderVisaPages();
    }
  });

  // ---------------- 6. 印章詳細說明檢視器 (Inspector Modal) ----------------
  function openInspectorModal(itemId) {
    inspectingItemId = itemId;
    const stats = window.passportCore.getStatistics().find(s => s.id === itemId);
    if (!stats) return;

    inspectorTitle.textContent = `[${stats.code}] ${stats.name} - 簽證檔案`;
    inspectorTotalTime.textContent = `${stats.formattedHMS} (${stats.formattedTotal})`;
    inspectorCount.textContent = `${stats.clearanceCount} 次蓋印`;

    inspectorSessionList.innerHTML = '';
    if (stats.sessions.length === 0) {
      inspectorSessionList.innerHTML = '<div style="color:var(--text-muted); font-size:11px; text-align:center; padding:15px;">尚無通關紀錄，按開始計時以蓋下首枚印章！</div>';
    } else {
      stats.sessions.forEach(sess => {
        const itemEl = document.createElement('div');
        itemEl.className = 'session-history-item';
        itemEl.style.setProperty('--item-color', stats.color);
        itemEl.innerHTML = `
          <div class="session-item-top">
            <span>📅 ${escapeHtml(sess.startTime || sess.timestamp)}</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="session-item-duration">⏱️ ${sess.durationFormatted}</span>
              <button class="btn-del-session" title="刪除此筆紀錄">&times;</button>
            </div>
          </div>
          ${sess.notes ? `<div class="session-item-notes">📝 ${escapeHtml(sess.notes)}</div>` : ''}
        `;

        // 單筆紀錄刪除按鈕
        const delBtn = itemEl.querySelector('.btn-del-session');
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('確定要刪除此筆通關簽證日誌嗎？')) {
            window.cyberSound.playClickSound();
            await window.passportCore.deleteSession(sess.id);
            openInspectorModal(itemId);
            renderVisaPages();
          }
        });

        inspectorSessionList.appendChild(itemEl);
      });
    }

    modalInspector.classList.add('active');
  }

  btnCloseInspector.addEventListener('click', () => {
    window.cyberSound.playClickSound();
    modalInspector.classList.remove('active');
  });

  btnInspectorOpenSheet.addEventListener('click', () => {
    openGoogleSheet();
  });

  // 檢視器內直接刪除整個項目與印章
  if (btnInspectorDeleteItem) {
    btnInspectorDeleteItem.addEventListener('click', async () => {
      if (!inspectingItemId) return;
      const item = window.passportCore.items.find(i => i.id === inspectingItemId);
      if (!item) return;

      if (window.passportCore.activeTimer.isRunning && window.passportCore.activeTimer.itemId === inspectingItemId) {
        alert('⚠️ 此項目目前正在計時中！請先結束或暫停計時再刪除。');
        return;
      }

      if (confirm(`確定要刪除項目【${item.name} (${item.code})】嗎？\n點擊「確定」將連同其歷史簽證印章一併移除。`)) {
        window.cyberSound.playStampSound();
        await window.passportCore.deleteItem(inspectingItemId, true);
        modalInspector.classList.remove('active');
        renderItemSelector();
        renderVisaPages();
        alert(`🗑️ 項目【${item.name}】已成功刪除！`);
      }
    });
  }

  // ---------------- 7. 新增與刪除通關項目 ----------------
  // 刪除選取之通關項目
  btnDeleteItem.addEventListener('click', async () => {
    const selectedId = itemSelector.value;
    if (!selectedId) {
      alert('請先選擇要刪除的通關項目！');
      return;
    }
    const item = window.passportCore.items.find(i => i.id === selectedId);
    if (!item) return;

    if (window.passportCore.activeTimer.isRunning && window.passportCore.activeTimer.itemId === selectedId) {
      alert('⚠️ 此項目目前正在計時中！請先完成或暫停計時，再進行刪除。');
      return;
    }

    if (window.passportCore.items.length <= 1) {
      alert('⚠️ 護照中至少需保留一個通關項目！');
      return;
    }

    const confirmed = confirm(`確定要刪除通關項目【${item.name} (${item.code})】嗎？\n點擊「確定」將會連同此項目的歷史簽證印章一併移除。`);
    if (!confirmed) return;

    window.cyberSound.playStampSound();
    await window.passportCore.deleteItem(selectedId, true);
    renderItemSelector();
    renderVisaPages();
    alert(`🗑️ 項目【${item.name}】已成功移除！`);
  });

  btnOpenAddItem.addEventListener('click', () => {
    window.cyberSound.playClickSound();
    newProjectName.value = '';
    newProjectCode.value = 'PRJ-' + Math.floor(100 + Math.random() * 900);
    modalAddItem.classList.add('active');
  });

  btnCloseAddItem.addEventListener('click', () => {
    window.cyberSound.playClickSound();
    modalAddItem.classList.remove('active');
  });

  // 顏色選擇器點擊
  colorPickerRow.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      window.cyberSound.playClickSound();
      colorPickerRow.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      selectedColor = dot.dataset.color;
    });
  });

  btnConfirmAddItem.addEventListener('click', async () => {
    const name = newProjectName.value.trim();
    const code = newProjectCode.value.trim();
    if (!name) {
      alert('請輸入項目名稱！');
      return;
    }
    window.cyberSound.playStampSound();
    const newItem = await window.passportCore.addItem(name, code, selectedColor);
    modalAddItem.classList.remove('active');
    renderItemSelector();
    itemSelector.value = newItem.id;
    updateSelectedBadge();
    renderVisaPages();
  });

  // ---------------- 8. 設定頁面控制 ----------------
  function loadSettingsToForm() {
    const s = window.passportCore.settings;
    inputWebhookUrl.value = s.webhookUrl || '';
    inputSheetUrl.value = s.sheetUrl || '';
    checkSoundEnabled.checked = s.soundEnabled !== false;
    if (checkFloatingEnabled) {
      checkFloatingEnabled.checked = s.floatingWidgetEnabled !== false;
    }
  }

  btnSaveSettings.addEventListener('click', async () => {
    window.cyberSound.playClickSound();
    const webhookUrl = inputWebhookUrl.value.trim();
    const sheetUrl = inputSheetUrl.value.trim();
    const soundEnabled = checkSoundEnabled.checked;
    const floatingWidgetEnabled = checkFloatingEnabled ? checkFloatingEnabled.checked : true;

    await window.passportCore.updateSettings({
      webhookUrl,
      sheetUrl,
      soundEnabled,
      floatingWidgetEnabled
    });

    updateSyncStatusUI();
    alert('✅ 賽博時空護照設定已成功儲存！');
  });

  btnTestWebhook.addEventListener('click', async () => {
    window.cyberSound.playClickSound();
    const url = inputWebhookUrl.value.trim();
    if (!url) {
      alert('請先填入 Google Apps Script 網址！');
      return;
    }

    btnTestWebhook.disabled = true;
    btnTestWebhook.textContent = '測試中...';

    const result = await window.passportCore.testWebhookConnection(url);
    btnTestWebhook.disabled = false;
    btnTestWebhook.textContent = '📶 測試連線 (PING)';

    if (result.ok) {
      alert('🎉 ' + result.message);
    } else {
      alert('⚠️ ' + result.message);
    }
  });

  function openGoogleSheet() {
    const url = window.passportCore.settings.sheetUrl;
    if (url && url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      alert('尚未設定 Google 試算表檢視網址！請至【03 // 雲端設定】中貼上您的試算表連結。');
    }
  }

  btnOpenSheetDirect.addEventListener('click', openGoogleSheet);

  // 一鍵複製 Google Apps Script 完整程式碼
  btnCopyScriptCode.addEventListener('click', async () => {
    window.cyberSound.playClickSound();
    const code = `/**
 * 賽博時空簽證護照 (Cyber Time Passport) - Google Apps Script 雲端同步腳本
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Busy' })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var sheet = getOrCreateLogSheet();
    var data = {};
    if (e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }
    } else { data = e.parameter || {}; }
    var timestamp = data.timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    sheet.appendRow([
      timestamp,
      data.code || 'SYS-00',
      data.name || '未命名任務',
      data.startTime || '',
      data.endTime || '',
      data.durationSec || 0,
      data.durationFormatted || '',
      data.notes || '',
      data.sessionId || ('PASS-' + new Date().getTime())
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: '已成功寫入 Google 試算表！' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', message: 'CyberPassport Online' })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateLogSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = "時空引渡簽證紀錄";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName, 0);
    var headers = ["蓋印時間", "項目代號", "項目名稱", "開始時間", "完成時間", "經過秒數", "累積時長", "簽證備註", "識別碼"];
    sheet.appendRow(headers);
    var hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setBackground("#0d131f").setFontColor("#00f0ff").setFontWeight("bold").setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  }
  return sheet;
}`;

    try {
      await navigator.clipboard.writeText(code);
      alert('📋 已成功將 Google Apps Script 腳本複製到剪貼簿！\n請至 Google 試算表的【擴充功能】->【Apps Script】貼上並部署為網頁應用程式。');
    } catch (e) {
      alert('複製失敗，請手動開啟專案內的 google-apps-script.js 檔案複製。');
    }
  });

  // 音效切換
  checkSoundEnabled.addEventListener('change', () => {
    window.passportCore.updateSettings({ soundEnabled: checkSoundEnabled.checked });
  });

  // 網頁懸浮小工具切換
  if (checkFloatingEnabled) {
    checkFloatingEnabled.addEventListener('change', () => {
      window.passportCore.updateSettings({ floatingWidgetEnabled: checkFloatingEnabled.checked });
    });
  }

  // 匯出 CSV 格式
  btnExportCsv.addEventListener('click', () => {
    window.cyberSound.playClickSound();
    const csvContent = window.passportCore.exportSessionsCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nowStr = new Date().toISOString().replace(/[:T-]/g, '').slice(0, 14);
    a.download = `cyber_passport_records_${nowStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 匯入 CSV 格式
  btnImportCsv.addEventListener('click', () => {
    window.cyberSound.playClickSound();
    importCsvInput.click();
  });

  importCsvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const res = await window.passportCore.importSessionsCsv(evt.target.result);
      importCsvInput.value = '';
      if (res.success) {
        window.cyberSound.playSuccessSound();
        alert(`🎉 ${res.message}`);
        renderItemSelector();
        renderVisaPages();
        updateSyncStatusUI();
      } else {
        alert(`⚠️ ${res.message}`);
      }
    };
    reader.readAsText(file, 'utf-8');
  });

  // 匯出 JSON
  btnExportData.addEventListener('click', () => {
    window.cyberSound.playClickSound();
    const jsonStr = window.passportCore.exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cyber_passport_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 匯入 JSON
  btnImportData.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const ok = await window.passportCore.importDataJson(evt.target.result);
      if (ok) {
        alert('🎉 護照資料已成功還原！');
        renderItemSelector();
        renderVisaPages();
        updateSyncStatusUI();
      } else {
        alert('❌ 檔案格式不符合規範！');
      }
    };
    reader.readAsText(file);
  });

  // HTML 特殊字元跳脫保護
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 核心資料變更時同步 UI
  window.passportCore.onChange(() => {
    renderItemSelector();
    renderVisaPages();
    updateSyncStatusUI();
  });

  // 初次載入渲染
  renderItemSelector();
  updateSyncStatusUI();
  updateTimerUI();
});
