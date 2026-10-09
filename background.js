/**
 * 賽博時空簽證護照 - Service Worker 後台常駐服務 (Manifest V3)
 * 負責後台計時追蹤、工具列圖示 Badge 文字動態更新與跨分頁同步廣播
 */

// 擴充套件安裝或啟動時初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('賽博時空引渡護照 (Cyber Time Passport) 已就緒！');
  chrome.action.setBadgeBackgroundColor({ color: '#00f0ff' });
});

// 每 2 秒輪詢更新工具列 Badge 徽章顯示（若正在計時，即時在瀏覽器右上角小圖示顯示分秒）
setInterval(() => {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['activeTimer'], (res) => {
      const timer = res.activeTimer;
      if (!timer || !timer.isRunning) {
        chrome.action.setBadgeText({ text: '' });
        return;
      }

      if (timer.isPaused) {
        chrome.action.setBadgeBackgroundColor({ color: '#ffe600' });
        chrome.action.setBadgeText({ text: 'PAUS' });
        return;
      }

      // 計時進行中
      const now = Date.now();
      const currentRunSec = Math.floor((now - timer.startTimestamp) / 1000);
      const totalSec = (timer.accumulatedSec || 0) + currentRunSec;

      const mins = Math.floor(totalSec / 60);
      let badgeText = '';
      if (mins < 60) {
        badgeText = `${mins}m`;
      } else {
        const hrs = Math.floor(mins / 60);
        badgeText = `${hrs}h`;
      }

      chrome.action.setBadgeBackgroundColor({ color: '#00ff88' });
      chrome.action.setBadgeText({ text: badgeText });
    });
  }
}, 2000);

// 監聽訊息交換
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'ok', time: Date.now() });
  }
  return true;
});
