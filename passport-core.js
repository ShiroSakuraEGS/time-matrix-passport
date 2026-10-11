/**
 * 賽博時空簽證護照 (Cyber Time Passport) - 核心狀態與資料管理引擎
 * 支援 Chrome Storage Local 與本機 LocalStorage 雙模無縫切換
 */

class PassportCore {
  constructor() {
    this.isChromeStorage = typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);
    this.items = [];
    this.sessions = [];
    this.settings = {
      webhookUrl: '',
      sheetUrl: '',
      soundEnabled: true,
      agentName: 'RUNNER // 0902',
      passportId: 'CYBER-XP-8820',
      activeTab: 'stamp-clock', // 'stamp-clock' | 'visa-pages' | 'settings'
      itemsPerPage: 4           // 簽證頁面每頁顯示 4 個印章
    };
    this.activeTimer = {
      isRunning: false,
      isPaused: false,
      itemId: null,
      startTimestamp: null,
      accumulatedSec: 0,
      pauseTimestamp: null
    };
    this.currentPage = 1;
    this.listeners = [];
  }

  // 儲存轉接層：相容 Chrome Extension 與獨立 Web 環境
  async storageGet(keys) {
    if (this.isChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res || {}));
      });
    } else {
      const res = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach(k => {
        const val = localStorage.getItem(`cyber_passport_${k}`);
        if (val !== null) {
          try { res[k] = JSON.parse(val); } catch (e) { res[k] = val; }
        }
      });
      return res;
    }
  }

  async storageSet(items) {
    if (this.isChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.set(items, () => resolve());
      });
    } else {
      Object.entries(items).forEach(([k, v]) => {
        localStorage.setItem(`cyber_passport_${k}`, JSON.stringify(v));
      });
    }
  }

  // 初始化載入
  async init() {
    const data = await this.storageGet(['items', 'sessions', 'settings', 'activeTimer']);

    // 預設項目（首次啟動時提供賽博龐克風格預設項目）
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      this.items = data.items;
    } else {
      this.items = [
        { id: 'item_dev', code: 'DEV-01', name: '核心程式碼開發', color: '#00f0ff', createdAt: new Date().toISOString() },
        { id: 'item_write', code: 'WRIT-02', name: '鐵人賽文章撰寫', color: '#ff0055', createdAt: new Date().toISOString() },
        { id: 'item_ui', code: 'DSGN-03', name: '賽博未來介面設計', color: '#00ff88', createdAt: new Date().toISOString() },
        { id: 'item_study', code: 'RESR-04', name: 'AI 前沿技術探究', color: '#ffe600', createdAt: new Date().toISOString() }
      ];
      await this.storageSet({ items: this.items });
    }

    if (data.sessions && Array.isArray(data.sessions)) {
      this.sessions = data.sessions;
    } else {
      // 預設示範歷史簽證紀錄
      this.sessions = [
        {
          id: 'sess_demo_1',
          itemId: 'item_dev',
          itemName: '核心程式碼開發',
          itemCode: 'DEV-01',
          startTime: '2026-10-09 14:00:00',
          endTime: '2026-10-09 15:45:00',
          durationSec: 6300,
          durationFormatted: '01:45:00',
          notes: '建置賽博印章時鐘與粒子動態著色器',
          timestamp: '2026-10-09 15:45:00',
          synced: true
        },
        {
          id: 'sess_demo_2',
          itemId: 'item_write',
          itemName: '鐵人賽文章撰寫',
          itemCode: 'WRIT-02',
          startTime: '2026-10-09 16:10:00',
          endTime: '2026-10-09 17:00:00',
          durationSec: 3000,
          durationFormatted: '00:50:00',
          notes: '完稿：Vibe Coding 賽博護照時間管理實踐篇',
          timestamp: '2026-10-09 17:00:00',
          synced: true
        }
      ];
      await this.storageSet({ sessions: this.sessions });
    }

    if (data.settings) {
      this.settings = Object.assign({}, this.settings, data.settings);
    }
    if (data.activeTimer) {
      this.activeTimer = Object.assign({}, this.activeTimer, data.activeTimer);
    }

    if (window.cyberSound) {
      window.cyberSound.setEnabled(this.settings.soundEnabled);
    }

    return this;
  }

  // 訂閱狀態變更通知
  onChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // 新增項目
  async addItem(name, code, color) {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim();
    const cleanCode = (code && code.trim()) ? code.trim().toUpperCase() : ('PRJ-' + Math.floor(100 + Math.random() * 900));
    const cleanColor = color || '#00f0ff';

    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: cleanName,
      code: cleanCode,
      color: cleanColor,
      createdAt: new Date().toISOString()
    };

    this.items.unshift(newItem);
    await this.storageSet({ items: this.items });
    this.notify();
    return newItem;
  }

  // 刪除指定項目（可選擇是否連同其歷史簽證一併刪除）
  async deleteItem(itemId, deleteSessions = true) {
    if (!itemId) return;
    this.items = this.items.filter(it => it.id !== itemId);
    if (deleteSessions) {
      this.sessions = this.sessions.filter(s => s.itemId !== itemId);
    }
    // 若目前正在計時的項目被刪除，則重設進行中的計時器
    if (this.activeTimer.itemId === itemId) {
      await this.resetTimer();
    }
    await this.storageSet({ items: this.items, sessions: this.sessions });
    this.notify();
  }

  // 刪除單筆簽證歷程紀錄
  async deleteSession(sessionId) {
    if (!sessionId) return;
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    await this.storageSet({ sessions: this.sessions });
    this.notify();
  }

  // 轉移單筆簽證紀錄至另一個通關項目（修正記錯項目的情況）
  async transferSession(sessionId, newItemId) {
    if (!sessionId || !newItemId) return false;
    const sess = this.sessions.find(s => s.id === sessionId);
    const targetItem = this.items.find(i => i.id === newItemId);
    if (!sess || !targetItem) return false;

    sess.itemId = targetItem.id;
    sess.itemName = targetItem.name;
    sess.itemCode = targetItem.code;

    await this.storageSet({ sessions: this.sessions });
    this.notify();
    return true;
  }

  // 手動補登簽證紀錄（漏記時間補登，自動計算時長並同步至試算表）
  async addManualSession(itemId, durationSec, notes = '', customEndTimeIso = null) {
    if (!itemId || !durationSec || durationSec < 1) return null;

    const item = this.items.find(i => i.id === itemId) || {
      id: itemId,
      name: '自訂工作項目',
      code: 'SYS-MANUAL',
      color: '#ffe600'
    };

    const endDate = customEndTimeIso ? new Date(customEndTimeIso) : new Date();
    const startDate = new Date(endDate.getTime() - durationSec * 1000);

    const sessionRecord = {
      id: 'pass_manual_' + Date.now(),
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      startTime: this.formatDate(startDate),
      endTime: this.formatDate(endDate),
      durationSec: durationSec,
      durationFormatted: this.formatTime(durationSec),
      notes: (notes || '').trim() || '手動補登紀錄',
      timestamp: this.formatDate(endDate),
      synced: false
    };

    this.sessions.unshift(sessionRecord);
    await this.storageSet({ sessions: this.sessions });

    // 同步至 Google 試算表
    this.syncSessionToGoogleSheet(sessionRecord);
    this.notify();
    return sessionRecord;
  }

  // 更新設定
  async updateSettings(newSettings) {
    this.settings = Object.assign({}, this.settings, newSettings);
    if (window.cyberSound) {
      window.cyberSound.setEnabled(this.settings.soundEnabled);
    }
    await this.storageSet({ settings: this.settings });
    this.notify();
  }

  // 取得目前計時經過秒數（精準計算時間戳，即便視窗關閉或暫停也不會失真）
  getCurrentElapsedSeconds() {
    if (!this.activeTimer.isRunning) {
      return this.activeTimer.accumulatedSec || 0;
    }
    if (this.activeTimer.isPaused) {
      return this.activeTimer.accumulatedSec || 0;
    }
    const now = Date.now();
    const currentRunSec = Math.floor((now - this.activeTimer.startTimestamp) / 1000);
    return (this.activeTimer.accumulatedSec || 0) + Math.max(0, currentRunSec);
  }

  // 開始計時
  async startTimer(itemId) {
    if (!itemId) return;
    const now = Date.now();
    this.activeTimer = {
      isRunning: true,
      isPaused: false,
      itemId: itemId,
      startTimestamp: now,
      accumulatedSec: 0,
      pauseTimestamp: null,
      sessionStartIso: new Date().toISOString()
    };

    await this.storageSet({ activeTimer: this.activeTimer });
    this.notify();
  }

  // 暫停計時
  async pauseTimer() {
    if (!this.activeTimer.isRunning || this.activeTimer.isPaused) return;
    const now = Date.now();
    const currentRunSec = Math.floor((now - this.activeTimer.startTimestamp) / 1000);
    this.activeTimer.accumulatedSec = (this.activeTimer.accumulatedSec || 0) + Math.max(0, currentRunSec);
    this.activeTimer.isPaused = true;
    this.activeTimer.pauseTimestamp = now;

    await this.storageSet({ activeTimer: this.activeTimer });
    this.notify();
  }

  // 恢復計時
  async resumeTimer() {
    if (!this.activeTimer.isRunning || !this.activeTimer.isPaused) return;
    this.activeTimer.isPaused = false;
    this.activeTimer.startTimestamp = Date.now();
    this.activeTimer.pauseTimestamp = null;

    await this.storageSet({ activeTimer: this.activeTimer });
    this.notify();
  }

  // 切換目前正在計時的項目（計時中選錯可即時修正，不中斷累計秒數）
  async switchActiveTimerItem(newItemId) {
    if (!newItemId) return;
    this.activeTimer.itemId = newItemId;
    await this.storageSet({ activeTimer: this.activeTimer });
    this.notify();
  }

  // 完成計時並記錄（可輸入備註、指定更正項目、寫入 Google 試算表）
  async finishTimer(notes = '', targetItemId = null) {
    if (!this.activeTimer.isRunning && this.activeTimer.accumulatedSec === 0) return null;

    const totalSec = this.getCurrentElapsedSeconds();
    if (totalSec < 1) {
      // 若不到 1 秒則直接重設
      this.resetTimer();
      return null;
    }

    const finalItemId = targetItemId || this.activeTimer.itemId;
    const item = this.items.find(i => i.id === finalItemId) || {
      id: 'unknown',
      name: '未定義項目',
      code: 'SYS-UNK',
      color: '#00f0ff'
    };

    const endDate = new Date();
    const startDate = this.activeTimer.sessionStartIso ? new Date(this.activeTimer.sessionStartIso) : new Date(endDate.getTime() - totalSec * 1000);

    const sessionRecord = {
      id: 'pass_' + Date.now(),
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      startTime: this.formatDate(startDate),
      endTime: this.formatDate(endDate),
      durationSec: totalSec,
      durationFormatted: this.formatTime(totalSec),
      notes: notes.trim(),
      timestamp: this.formatDate(endDate),
      synced: false
    };

    this.sessions.unshift(sessionRecord);

    // 重設計時器
    this.activeTimer = {
      isRunning: false,
      isPaused: false,
      itemId: null,
      startTimestamp: null,
      accumulatedSec: 0,
      pauseTimestamp: null
    };

    await this.storageSet({
      sessions: this.sessions,
      activeTimer: this.activeTimer
    });

    // 非同步同步至 Google 試算表
    this.syncSessionToGoogleSheet(sessionRecord);

    this.notify();
    return sessionRecord;
  }

  // 重設/放棄計時
  async resetTimer() {
    this.activeTimer = {
      isRunning: false,
      isPaused: false,
      itemId: null,
      startTimestamp: null,
      accumulatedSec: 0,
      pauseTimestamp: null
    };
    await this.storageSet({ activeTimer: this.activeTimer });
    this.notify();
  }

  // 同步紀錄至 Google 試算表 (透過 Google Apps Script Webhook)
  async syncSessionToGoogleSheet(session) {
    if (!this.settings.webhookUrl || !this.settings.webhookUrl.startsWith('http')) {
      console.log('未設定 Google 試算表 Webhook 網址，已先儲存於本地護照庫中。');
      return { success: false, reason: 'no_webhook' };
    }

    const payload = {
      timestamp: session.timestamp,
      code: session.itemCode,
      name: session.itemName,
      startTime: session.startTime,
      endTime: session.endTime,
      durationSec: session.durationSec,
      durationFormatted: session.durationFormatted,
      notes: session.notes,
      sessionId: session.id
    };

    try {
      // 使用 no-cors 模式發送，因 Google Apps Script Web App 會轉址（302 Redirect），no-cors 可防止瀏覽器 CORS 擋阻
      await fetch(this.settings.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // 標記為已同步
      const target = this.sessions.find(s => s.id === session.id);
      if (target) {
        target.synced = true;
        await this.storageSet({ sessions: this.sessions });
        this.notify();
      }

      return { success: true };
    } catch (err) {
      console.error('同步至 Google 試算表時發生例外狀況:', err);
      return { success: false, error: err.message };
    }
  }

  // 測試 Google 試算表 Webhook 連線
  async testWebhookConnection(url) {
    const targetUrl = url || this.settings.webhookUrl;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return { ok: false, message: '請輸入有效的 Google Apps Script 網頁應用程式網址！' };
    }

    try {
      // 嘗試透過 GET ping 測試
      const pingUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'action=ping&t=' + Date.now();
      const res = await fetch(pingUrl, { method: 'GET' });
      const data = await res.json();
      return { ok: true, message: data.message || '連線測試成功！' };
    } catch (e) {
      // 若 GET 被 CORS 擋下，改用 POST no-cors 發送測試心跳
      try {
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: this.formatDate(new Date()),
            code: 'TEST-00',
            name: '【連線測試】時空引渡心跳封包',
            startTime: this.formatDate(new Date()),
            endTime: this.formatDate(new Date()),
            durationSec: 1,
            durationFormatted: '00:00:01',
            notes: 'CyberPassport 連線通訊測試正常',
            sessionId: 'PING-' + Date.now()
          })
        });
        return { ok: true, message: '已成功發送測試封包至 Google 試算表！請開啟試算表確認是否有新的一筆【連線測試】資料。' };
      } catch (postErr) {
        return { ok: false, message: '連線失敗：' + postErr.message };
      }
    }
  }

  // 統計所有項目總時長與簽證印章資料（供護照各頁印章顯示）
  getStatistics() {
    return this.items.map(item => {
      const itemSessions = this.sessions.filter(s => s.itemId === item.id);
      const totalSec = itemSessions.reduce((acc, cur) => acc + (cur.durationSec || 0), 0);
      return {
        id: item.id,
        name: item.name,
        code: item.code,
        color: item.color,
        createdAt: item.createdAt,
        totalSec: totalSec,
        formattedTotal: this.formatDurationFriendly(totalSec),
        formattedHMS: this.formatTime(totalSec),
        clearanceCount: itemSessions.length, // 簽證/蓋印次數
        sessions: itemSessions               // 歷程紀錄清單
      };
    });
  }

  // 時間與日期格式化工具
  formatTime(totalSeconds) {
    const sec = Math.max(0, parseInt(totalSeconds, 10) || 0);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    const pad = n => (n < 10 ? '0' : '') + n;
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  formatDurationFriendly(totalSeconds) {
    const sec = Math.max(0, parseInt(totalSeconds, 10) || 0);
    if (sec === 0) return '0秒';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    let str = '';
    if (hrs > 0) str += `${hrs}小時 `;
    if (mins > 0 || hrs > 0) str += `${mins}分 `;
    str += `${secs}秒`;
    return str.trim();
  }

  formatDate(date) {
    const d = new Date(date);
    const pad = n => (n < 10 ? '0' : '') + n;
    const YYYY = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
  }

  // 匯出簽證紀錄為 CSV 格式（加入 UTF-8 BOM，避免 Windows Excel 開啟繁體中文時產生亂碼）
  exportSessionsCsv() {
    const headers = ["蓋印時間", "項目代號", "項目名稱", "開始時間", "結束時間", "經過秒數", "累積時長", "簽證備註", "簽證識別碼"];
    const rows = this.sessions.map(s => [
      s.timestamp || s.endTime || '',
      s.itemCode || 'SYS-00',
      s.itemName || '未命名任務',
      s.startTime || '',
      s.endTime || '',
      s.durationSec || 0,
      s.durationFormatted || this.formatTime(s.durationSec || 0),
      s.notes || '',
      s.id || ''
    ]);

    const formatCell = val => {
      const str = String(val === null || val === undefined ? '' : val);
      // 若包含逗號、換行或引號，則以雙引號包裹並將引號跳脫
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.map(formatCell).join(','),
      ...rows.map(row => row.map(formatCell).join(','))
    ];

    // \uFEFF 為 UTF-8 BOM 識別碼
    return '\uFEFF' + csvLines.join('\r\n');
  }

  // 匯入 CSV 格式簽證紀錄
  async importSessionsCsv(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      return { success: false, message: 'CSV 檔案內容為空！' };
    }

    // 移除 UTF-8 BOM
    let cleanText = csvText;
    if (cleanText.charCodeAt(0) === 0xFEFF) {
      cleanText = cleanText.slice(1);
    }

    // 解析 CSV 結構（支援引號包裹與欄位內包含逗號之規範）
    const parsedRows = this.parseCsv(cleanText);
    if (!parsedRows || parsedRows.length < 2) {
      return { success: false, message: 'CSV 格式不正確或無資料列！' };
    }

    // 辨識欄位索引
    const headerRow = parsedRows[0].map(h => h.trim());
    let idxTime = headerRow.findIndex(h => h.includes('時間') || h.includes('timestamp'));
    let idxCode = headerRow.findIndex(h => h.includes('代號') || h.includes('code'));
    let idxName = headerRow.findIndex(h => h.includes('名稱') || h.includes('name'));
    let idxStart = headerRow.findIndex(h => h.includes('開始') || h.includes('start'));
    let idxEnd = headerRow.findIndex(h => h.includes('結束') || h.includes('完成') || h.includes('end'));
    let idxSec = headerRow.findIndex(h => h.includes('秒') || h.includes('sec'));
    let idxDuration = headerRow.findIndex(h => h.includes('時長') || h.includes('duration'));
    let idxNotes = headerRow.findIndex(h => h.includes('備註') || h.includes('說明') || h.includes('note'));
    let idxId = headerRow.findIndex(h => h.includes('識別碼') || h.includes('id'));

    // 預設欄位索引對齊
    if (idxTime === -1) idxTime = 0;
    if (idxCode === -1) idxCode = 1;
    if (idxName === -1) idxName = 2;
    if (idxStart === -1) idxStart = 3;
    if (idxEnd === -1) idxEnd = 4;
    if (idxSec === -1) idxSec = 5;
    if (idxDuration === -1) idxDuration = 6;
    if (idxNotes === -1) idxNotes = 7;
    if (idxId === -1) idxId = 8;

    let importedCount = 0;
    const newSessions = [];
    const colorPalette = ['#00f0ff', '#ff0055', '#00ff88', '#ffe600', '#b026ff', '#ff7700'];

    for (let i = 1; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

      const timeVal = (row[idxTime] || '').trim();
      const codeVal = (row[idxCode] || 'SYS-00').trim().toUpperCase();
      const nameVal = (row[idxName] || '未命名任務').trim();
      const startVal = (row[idxStart] || '').trim();
      const endVal = (row[idxEnd] || '').trim();
      const secVal = parseInt(row[idxSec], 10) || 0;
      const durVal = (row[idxDuration] || this.formatTime(secVal)).trim();
      const notesVal = (row[idxNotes] || '').trim();
      const idVal = (row[idxId] || ('pass_' + Date.now() + '_' + i)).trim();

      // 檢查對應項目是否存在，若不存在則自動為其建立項目
      let item = this.items.find(it => it.code === codeVal || it.name === nameVal);
      if (!item) {
        const randomColor = colorPalette[this.items.length % colorPalette.length];
        item = {
          id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name: nameVal,
          code: codeVal,
          color: randomColor,
          createdAt: new Date().toISOString()
        };
        this.items.push(item);
      }

      // 避免重複 session ID
      const exists = this.sessions.some(s => s.id === idVal);
      if (!exists) {
        newSessions.push({
          id: idVal,
          itemId: item.id,
          itemName: item.name,
          itemCode: item.code,
          startTime: startVal,
          endTime: endVal,
          durationSec: secVal,
          durationFormatted: durVal,
          notes: notesVal,
          timestamp: timeVal || endVal || this.formatDate(new Date()),
          synced: true
        });
        importedCount++;
      }
    }

    if (importedCount > 0) {
      this.sessions = [...newSessions, ...this.sessions];
      await this.storageSet({ items: this.items, sessions: this.sessions });
      this.notify();
      return { success: true, count: importedCount, message: `成功匯入 ${importedCount} 筆簽證紀錄！` };
    } else {
      return { success: false, message: '未匯入任何新資料（可能均為已存在之識別碼）。' };
    }
  }

  // 遵循 RFC 4180 標準的 CSV 解析器
  parseCsv(text) {
    const lines = [];
    let row = [''];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          // 跳脫的雙引號
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++; // 跳過 \r\n
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  }

  // 匯出全部資料 JSON
  exportDataJson() {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      items: this.items,
      sessions: this.sessions,
      settings: this.settings
    }, null, 2);
  }

  // 匯入資料 JSON
  async importDataJson(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.items && Array.isArray(data.items)) this.items = data.items;
      if (data.sessions && Array.isArray(data.sessions)) this.sessions = data.sessions;
      if (data.settings) this.settings = Object.assign({}, this.settings, data.settings);
      await this.storageSet({
        items: this.items,
        sessions: this.sessions,
        settings: this.settings
      });
      this.notify();
      return true;
    } catch (e) {
      console.error('資料解析失敗:', e);
      return false;
    }
  }
}

// 實例化全域核心
window.passportCore = new PassportCore();
