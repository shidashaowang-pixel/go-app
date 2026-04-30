/**
 * 语音和音效工具模块
 * - 使用 Web Speech API 实现语音朗读（TTS）
 * - 使用 AudioContext 合成简单音效（正确/错误/提示）
 */

// ========== 语音朗读（TTS） ==========

let speechSupported = false;
try {
  speechSupported = typeof speechSynthesis !== 'undefined';
} catch {
  // SSR 环境
}

/** 朗读文本（中文语音） */
export function speak(text: string, rate = 1.0) {
  if (!speechSupported) return;
  // 取消之前的朗读
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = rate;
  utterance.pitch = 1.2; // 稍高音调，更儿童化
  utterance.volume = 1.0;

  // 尝试选择中文语音
  const voices = speechSynthesis.getVoices();
  const zhVoice = voices.find(v => v.lang.startsWith('zh'));
  if (zhVoice) utterance.voice = zhVoice;

  speechSynthesis.speak(utterance);
}

/** 停止朗读 */
export function stopSpeak() {
  if (!speechSupported) return;
  speechSynthesis.cancel();
}

// ========== 音效合成 ==========

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** 播放正确音效 - 清脆上升双音 */
export function playCorrectSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 第一个音（C5）
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, now); // C5
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // 第二个音（E5）
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.setValueAtTime(0.35, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.3);

  // 第三个音（G5）- 欢乐和弦
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(783.99, now + 0.24); // G5
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.setValueAtTime(0.3, now + 0.24);
  gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.start(now + 0.24);
  osc3.stop(now + 0.5);
}

/** 播放错误音效 - 低沉下降音 */
export function playWrongSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(350, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

/** 播放提示音 - 轻柔叮咚 */
export function playHintSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now); // A5
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.2);
}

/** 播放落子音效 */
export function playStoneSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

/** 播放通关音效 - 欢快上升音阶 */
export function playLevelUpSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = now + i * 0.12;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  });
}

// ========== 生动的反馈语 ==========

/** 答对时的随机鼓励语 */
const correctPhrases = [
  '太棒了！你真厉害！',
  '哇，答对了！真聪明！',
  '好耶！完全正确！',
  '真了不起！继续加油！',
  '厉害厉害！你是围棋小达人！',
  '答对啦！你越来越厉害了！',
  '太强了！给你点个大大的赞！',
  '完美！你真是下棋小天才！',
  '正确！你的棋感越来越好啦！',
  '漂亮！这步棋下得真妙！',
];

/** 答错时的随机鼓励语 */
const wrongPhrases = [
  '没关系，再想想看！',
  '差一点点！再试一次吧！',
  '别着急，仔细看看棋盘哦！',
  '嗯，这步不太对，换个位置试试？',
  '加油加油，你一定可以的！',
  '没关系，下棋就是要敢于尝试！',
  '再仔细想想，答案就在棋盘上！',
  '不要灰心，每一步都是学习！',
];

/** 通关时的随机鼓励语 */
const levelUpPhrases = [
  '恭喜你通关啦！太厉害了！',
  '哇，你闯关成功了！真棒！',
  '好厉害！你通过这一关了！',
  '太强了！你就是围棋小英雄！',
];

/** 随机选一条 */
function randomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function getCorrectPhrase() { return randomPhrase(correctPhrases); }
export function getWrongPhrase() { return randomPhrase(wrongPhrases); }
export function getLevelUpPhrase() { return randomPhrase(levelUpPhrases); }
