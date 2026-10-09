/**
 * CyberPassport Sound Synthesizer (賽博音效合成引擎)
 * 基於 Web Audio API 即時合成音訊，無須外掛任何 MP3 檔案，具備高反應性與零延遲
 */

class CyberSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  // 初始化或喚醒 AudioContext（配合瀏覽器使用者手勢策略）
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 設定音效開關
  setEnabled(val) {
    this.enabled = !!val;
  }

  // 1. 蓋印重擊音效（Stamp Thump）：模擬實體印章大力蓋下的金屬低音回饋與氣閥聲
  playStampSound() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // 低頻衝擊正弦波
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.18);

      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);

      // 機械卡榫清脆金屬聲
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'square';
      clickOsc.frequency.setValueAtTime(980, t);
      clickOsc.frequency.exponentialRampToValueAtTime(220, t + 0.05);

      clickGain.gain.setValueAtTime(0.35, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickOsc.start(t);
      clickOsc.stop(t + 0.06);
    } catch (e) {
      console.warn('音效播放失敗:', e);
    }
  }

  // 2. 賽博故障音效（Glitch Chirp）：高頻電子雜訊與頻道調諧音
  playGlitchSound() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(450, t);
      osc.frequency.setValueAtTime(1200, t + 0.03);
      osc.frequency.setValueAtTime(280, t + 0.06);
      osc.frequency.setValueAtTime(800, t + 0.09);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }

  // 3. 按鈕互動點擊音（Cyber Click）：微型雷射脈衝
  playClickSound() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.04);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }

  // 4. 成功簽證通過音（Clearance Success）：科幻完成和弦
  playSuccessSound() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);

        gain.gain.setValueAtTime(0.25, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.35);
      });
    } catch (e) {}
  }
}

// 掛載至全域變數
window.cyberSound = new CyberSoundEngine();
