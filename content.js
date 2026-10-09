/**
 * 賽博時空簽證護照 - 網頁懸浮小工具 (In-Page Content Script)
 * 輕量化常駐於網頁右下角，點擊可展開賽博護照面板；具備完全樣式隔離與開關控制
 */

(function () {
  // 避免重複注入
  if (document.getElementById('cyber-passport-floating-wrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'cyber-passport-floating-wrapper';

  // 1. 最小化懸浮徽章 (Floating Badge)
  const badge = document.createElement('div');
  badge.className = 'cyber-floating-badge';
  badge.id = 'cyberPassportBadge';
  badge.title = '開啟賽博時空簽證護照 (懸浮小工具)';
  badge.innerHTML = `
    <div class="badge-close-btn" id="badgeCloseBtn" title="隱藏此網頁印章徽章">&times;</div>
    <div class="badge-icon">⏱️</div>
    <div class="badge-timer-text" id="badgeTimerText">00:00:00</div>
  `;

  // 2. 懸浮護照視窗 (Floating Passport Window)
  const windowEl = document.createElement('div');
  windowEl.className = 'cyber-passport-window';
  windowEl.id = 'cyberPassportWindow';
  windowEl.style.display = 'none';

  // 護照視窗頂部操作列（支援拖曳）
  const titlebar = document.createElement('div');
  titlebar.className = 'cyber-window-titlebar';
  titlebar.id = 'cyberWindowDragBar';
  titlebar.innerHTML = `
    <span>✦ CYBER TIME MATRIX // PASSPORT WIDGET</span>
    <div class="cyber-window-actions">
      <button class="cyber-win-btn" id="cyberBtnMin" title="最小化為徽章">_</button>
      <button class="cyber-win-btn close" id="cyberBtnClose" title="關閉視窗">&times;</button>
    </div>
  `;

  // 護照嵌入 Iframe（惰性載入，點擊展開時才賦值 src，避免未展開前觸發任何網路連線）
  const iframe = document.createElement('iframe');
  iframe.id = 'cyberPassportIframe';
  iframe.style.width = '440px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '0 0 12px 12px';
  iframe.style.backgroundColor = '#07090e';
  iframe.setAttribute('allow', 'clipboard-write');

  windowEl.appendChild(titlebar);
  windowEl.appendChild(iframe);

  wrapper.appendChild(badge);
  wrapper.appendChild(windowEl);
  document.body.appendChild(wrapper);

  // 檢查使用者是否已關閉網頁懸浮小工具
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['settings'], (res) => {
      if (res.settings && res.settings.floatingWidgetEnabled === false) {
        wrapper.style.display = 'none';
      }
    });

    // 監聽設定變更以即時隱藏或顯示
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings && changes.settings.newValue) {
        const enabled = changes.settings.newValue.floatingWidgetEnabled !== false;
        wrapper.style.display = enabled ? 'block' : 'none';
      }
    });
  }

  // ---------------- 狀態切換 ----------------
  let isOpen = false;

  function toggleWindow(open) {
    isOpen = (typeof open === 'boolean') ? open : !isOpen;
    if (isOpen) {
      // 首次展開時才載入 popup.html 網址
      if (!iframe.src || iframe.src === 'about:blank') {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          iframe.src = chrome.runtime.getURL('popup.html');
        }
      }
      windowEl.style.display = 'flex';
      badge.style.display = 'none';
    } else {
      windowEl.style.display = 'none';
      badge.style.display = 'flex';
    }
  }

  badge.addEventListener('click', (e) => {
    if (e.target.id === 'badgeCloseBtn') return;
    toggleWindow(true);
  });

  // 徽章關閉按鈕（隱藏小工具）
  document.getElementById('badgeCloseBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    wrapper.style.display = 'none';
  });

  document.getElementById('cyberBtnMin').addEventListener('click', () => toggleWindow(false));
  document.getElementById('cyberBtnClose').addEventListener('click', () => toggleWindow(false));

  // ---------------- 拖曳視窗功能 ----------------
  let isDragging = false;
  let startX, startY, initialLeft, initialTop;

  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.cyber-window-actions')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = windowEl.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    windowEl.style.bottom = 'auto';
    windowEl.style.right = 'auto';
    windowEl.style.left = `${initialLeft}px`;
    windowEl.style.top = `${initialTop}px`;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  });

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    const newLeft = Math.max(10, Math.min(window.innerWidth - 450, initialLeft + dx));
    const newTop = Math.max(10, Math.min(window.innerHeight - 620, initialTop + dy));

    windowEl.style.left = `${newLeft}px`;
    windowEl.style.top = `${newTop}px`;
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  // ---------------- 即時同步徽章計時文字 ----------------
  const badgeTimerText = document.getElementById('badgeTimerText');

  function updateBadgeTicker() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['activeTimer'], (res) => {
        const timer = res.activeTimer;
        if (!timer) return;

        if (timer.isRunning && !timer.isPaused) {
          badge.classList.add('running');
          const now = Date.now();
          const curSec = Math.floor((now - timer.startTimestamp) / 1000) + (timer.accumulatedSec || 0);
          badgeTimerText.textContent = formatSec(curSec);
        } else if (timer.isRunning && timer.isPaused) {
          badge.classList.remove('running');
          badgeTimerText.textContent = formatSec(timer.accumulatedSec || 0);
        } else {
          badge.classList.remove('running');
          badgeTimerText.textContent = '00:00:00';
        }
      });
    }
  }

  function formatSec(s) {
    const sec = Math.max(0, parseInt(s, 10) || 0);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    const pad = n => (n < 10 ? '0' : '') + n;
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  setInterval(updateBadgeTicker, 1000);
  updateBadgeTicker();
})();
