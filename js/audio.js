/**
 * ALICE ESL Phonics P1 - 萌蛙過河音訊與音效控制器 (audio.js)
 * 整合 Web Audio API 即時程序化合成音效、P1 原生中英雙語真人發音與 Web Speech API 題目語音
 */

class SoundController {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
    this.isBilingual = true; // 預設開啟中英雙語發音
    this.voiceAudio = null;
    this.voiceZhAudio = null;
    this.bgmTimer = null;
    this.isBgmActive = false;

    // 延遲初始化 Web Audio，遵循現代瀏覽器手勢互動政策
    this.initAudioContext();
  }

  initAudioContext() {
    if (!this.audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  resumeAudio() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopVoice();
      this.stopBgm();
    } else {
      this.startBgm();
    }
    return this.isMuted;
  }

  toggleBilingual() {
    this.isBilingual = !this.isBilingual;
    return this.isBilingual;
  }

  /**
   * 停止當前任何進行中的發音語音
   */
  stopVoice() {
    if (this.voiceAudio) {
      this.voiceAudio.pause();
      this.voiceAudio.currentTime = 0;
      this.voiceAudio = null;
    }
    if (this.voiceZhAudio) {
      this.voiceZhAudio.pause();
      this.voiceZhAudio.currentTime = 0;
      this.voiceZhAudio = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * 播放 P1 本地教材真人發音音檔 (支援中英雙語連續朗讀)
   */
  playWordAudio(vocabId, onEnded = null) {
    if (this.isMuted) {
      if (onEnded) onEnded();
      return;
    }
    this.stopVoice();

    const book = window.BOOK_ID || "P8";
    const enPath = `${book}_flashcards_audios/${book}_${vocabId}.mp3`;
    const zhPath = `${book}_flashcards_audios/${book}_${vocabId}_zh.mp3`;
    

    this.voiceAudio = new Audio(enPath);

    this.voiceAudio.onended = () => {
      if (this.isBilingual && !this.isMuted) {
        // 短暫延遲後播放中文發音
        setTimeout(() => {
          if (this.isMuted) {
            if (onEnded) onEnded();
            return;
          }
          this.voiceZhAudio = new Audio(zhPath);
          this.voiceZhAudio.onended = () => {
            if (onEnded) onEnded();
          };
          this.voiceZhAudio.onerror = () => {
            if (onEnded) onEnded();
          };
          this.voiceZhAudio.play().catch(() => {
            if (onEnded) onEnded();
          });
        }, 260);
      } else {
        if (onEnded) onEnded();
      }
    };

    this.voiceAudio.onerror = () => {
      console.warn(`無法載入英文音檔: ${enPath}，嘗試 TTS 語音朗讀輔助。`);
      this.speakText(vocabId, 'en-US', onEnded);
    };

    this.voiceAudio.play().catch(e => {
      console.log("Audio play prevented:", e);
      if (onEnded) onEnded();
    });
  }

  /**
   * 使用預先合成之 Google Cloud Neural2 最高品質音檔播放題目句子或指示
   */
  speakText(text, lang = 'en-US', onEnded = null) {
    if (this.isMuted || !text) {
      if (onEnded) onEnded();
      return;
    }
    this.stopVoice();

    const clean = text.trim();
    const map = window.SENTENCES_AUDIO_MAP || {};
    const audioPath = map[clean] || map[clean.replace(/,\s*/g, ' ')];

    if (audioPath) {
      this.voiceAudio = new Audio(audioPath);
      this.voiceAudio.onended = () => { if (onEnded) onEnded(); };
      this.voiceAudio.onerror = () => { if (onEnded) onEnded(); };
      this.voiceAudio.play().catch(e => {
        if (onEnded) onEnded();
      });
    } else {
      // 若無匹配則嘗試播放單字發音
      this.playWordAudio(text, onEnded);
    }
  }

  // ==========================================
  // Web Audio API 卡通音效合成器 (零依賴、極致流暢)
  // ==========================================

  /**
   * 卡通起跳音效 (Boing / Spring Jump)
   */
  playJump() {
    if (this.isMuted) return;
    this.resumeAudio();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(680, t + 0.18);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {
      console.warn("SFX error:", e);
    }
  }

  /**
   * 清脆水花漣漪音效 (Water Splash)
   */
  playSplash() {
    if (this.isMuted) return;
    this.resumeAudio();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const bufferSize = this.audioCtx.sampleRate * 0.18;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.frequency.exponentialRampToValueAtTime(3200, t + 0.12);
      filter.Q.setValueAtTime(4.0, t);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start(t);

      // 同步加入一記圓潤的泡泡噗通聲
      const bubbleOsc = this.audioCtx.createOscillator();
      const bubbleGain = this.audioCtx.createGain();
      bubbleOsc.type = 'sine';
      bubbleOsc.frequency.setValueAtTime(450, t);
      bubbleOsc.frequency.exponentialRampToValueAtTime(800, t + 0.08);

      bubbleGain.gain.setValueAtTime(0.12, t);
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      bubbleOsc.connect(bubbleGain);
      bubbleGain.connect(this.audioCtx.destination);

      bubbleOsc.start(t);
      bubbleOsc.stop(t + 0.1);
    } catch (e) {
      console.warn("SFX error:", e);
    }
  }

  /**
   * 答對喜悅叮咚音 (Ding-Dong / Chime)
   */
  playCorrect() {
    if (this.isMuted) return;
    this.resumeAudio();
    if (!this.audioCtx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const t = this.audioCtx.currentTime + idx * 0.07;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(t);
        osc.stop(t + 0.35);
      });
    } catch (e) {
      console.warn("SFX error:", e);
    }
  }

  /**
   * 答錯逗趣歪頭音效 (Gentle Boop / Wobble - 零挫折感)
   */
  playWrong() {
    if (this.isMuted) return;
    this.resumeAudio();
    if (!this.audioCtx) return;

    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(260, t + 0.08);
      osc.frequency.linearRampToValueAtTime(290, t + 0.16);
      osc.frequency.linearRampToValueAtTime(220, t + 0.28);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    } catch (e) {
      console.warn("SFX error:", e);
    }
  }

  /**
   * 過關勝利彩帶大號角 (Cheer & Fanfare)
   */
  playCheer() {
    if (this.isMuted) return;
    this.resumeAudio();
    if (!this.audioCtx) return;

    try {
      const melody = [
        { f: 523.25, d: 0.12 }, // C5
        { f: 659.25, d: 0.12 }, // E5
        { f: 783.99, d: 0.12 }, // G5
        { f: 1046.5, d: 0.38 }  // C6
      ];

      let startTime = this.audioCtx.currentTime;
      melody.forEach(note => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + note.d);

        startTime += note.d * 0.9;
      });
    } catch (e) {
      console.warn("SFX error:", e);
    }
  }

  /**
   * 輕快輕巧的背景音樂合成器 (Web Audio BGM)
   * 以溫潤木琴音色 (Marimba) 循環演奏舒緩童趣旋律
   */
  startBgm() {
    if (this.isBgmActive || this.isMuted) return;
    this.isBgmActive = true;
    this.resumeAudio();

    const chords = [
      [261.63, 329.63, 392.00], // C
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66]  // G
    ];

    let chordIdx = 0;
    let step = 0;

    const playNextNote = () => {
      if (!this.isBgmActive || this.isMuted || !this.audioCtx) return;

      const currentChord = chords[chordIdx];
      const freq = currentChord[step % currentChord.length];
      const t = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      // 微弱伴奏音量，不干擾學童聽力
      gain.gain.setValueAtTime(0.025, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.28);

      step++;
      if (step >= 4) {
        step = 0;
        chordIdx = (chordIdx + 1) % chords.length;
      }

      this.bgmTimer = setTimeout(playNextNote, 320);
    };

    playNextNote();
  }

  stopBgm() {
    this.isBgmActive = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// 導出全域單例
window.soundCtrl = new SoundController();
