/**
 * main.js - Operation 25 Game Engine
 */
import { generateRound } from './mathGenerator.js';
import { saveRanking, getRankings } from './supabaseClient.js';
import { BGMEngine } from './bgmEngine.js';

// ─── Audio ───────────────────────────────────────────────────────────────────
let audioCtx = null;
let bgmEngine = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSFX(type) {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();

  if (type === 'correct') {
    // Play a bright 3-note major chord (C5, E5, G5)
    const frequencies = [523.25, 659.25, 783.99]; 
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * 0.05));
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.2 + (i * 0.05));
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime + (i * 0.05));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4 + (i * 0.05));
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + (i * 0.05));
      osc.stop(ctx.currentTime + 0.5);
    });
  } else if (type === 'wrong') {
    // Play a low, dissonant sawtooth buzzer
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }
}

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  currentRound: 1,
  currentAnswer: '',
  currentProblem: null,
  roundStartTime: 0,
  gameStartTime: 0,
  roundElapsed: 0,
  totalElapsed: 0,
  timerInterval: null,
  theme: localStorage.getItem('op25-theme') || 'theme-space-night',
  soundEnabled: localStorage.getItem('op25-sound') !== 'off',
};

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const screens = {
  start: document.getElementById('start-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen'),
};
const modals = {
  theme: document.getElementById('theme-modal'),
  ranking: document.getElementById('ranking-modal'),
  tutorial: document.getElementById('tutorial-modal'),
};
const equationDisplay  = document.getElementById('equation-display');
const answerDisplay    = document.getElementById('answer-display');
const answerBox        = document.getElementById('answer-box');
const wrongIndicator   = document.getElementById('wrong-indicator');
const currentRoundDisp = document.getElementById('current-round-display');
const roundTimeDisp    = document.getElementById('round-time-display');
const totalTimeDisp    = document.getElementById('total-time-display');
const finalTimeDisp    = document.getElementById('final-time-display');
const rankingList      = document.getElementById('ranking-list');
const playerNameInput  = document.getElementById('player-name');

let wrongTimeout = null;

// ─── Screen Transitions ───────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`${id}-screen`).classList.add('active');
}

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.className = theme;
  state.theme = theme;
  localStorage.setItem('op25-theme', theme);
  if (bgmEngine) bgmEngine.setTheme(theme);
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  if (m > 0) {
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  }
  return `${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
}

function startTimers() {
  state.roundStartTime = performance.now();
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    const now = performance.now();
    const roundMs = now - state.roundStartTime;
    const totalMs = state.totalElapsed + roundMs;

    roundTimeDisp.textContent = formatTime(roundMs);
    totalTimeDisp.textContent = formatTime(totalMs);
  }, 50);
}

function stopTimers() {
  clearInterval(state.timerInterval);
  const now = performance.now();
  const roundMs = now - state.roundStartTime;
  state.totalElapsed += roundMs;
}

// ─── Game Logic ───────────────────────────────────────────────────────────────
function loadRound(round) {
  state.currentRound = round;
  state.currentAnswer = '';
  state.currentProblem = generateRound(round);

  currentRoundDisp.textContent = round;
  equationDisplay.textContent = state.currentProblem.equation;
  answerDisplay.textContent = '';

  roundTimeDisp.textContent = '00.00';
  startTimers();
}

function startGame() {
  state.totalElapsed = 0;
  state.currentAnswer = '';
  loadRound(1);
  showScreen('game');

  if (!bgmEngine) {
    bgmEngine = new BGMEngine(getAudioCtx());
  }
  bgmEngine.stop();
  bgmEngine.setTheme(state.theme);
  if (state.soundEnabled) bgmEngine.start();
}

function submitAnswer() {
  const userAns = state.currentAnswer.trim();
  const correctAns = state.currentProblem.answer.trim();

  if (!userAns) return;

  if (userAns === correctAns) {
    playSFX('correct');
    stopTimers();

    // Celebration: Confetti
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#2ecc71', '#58a6ff', '#f1c40f']
      });
    }

    // Visual feedback for correct answer
    screens.game.classList.remove('screen-flash-correct');
    void screens.game.offsetWidth; // trigger reflow
    screens.game.classList.add('screen-flash-correct');
    screens.game.classList.add('correct-flash');

    if (state.currentRound === 25) {
      setTimeout(() => {
        screens.game.classList.remove('correct-flash');
        endGame();
      }, 800);
    } else {
      // Pause slightly so the user sees the "Correct" effect
      setTimeout(() => {
        screens.game.classList.remove('correct-flash');
        state.currentAnswer = '';
        answerDisplay.textContent = '';
        loadRound(state.currentRound + 1);
      }, 700);
    }
  } else {
    playSFX('wrong');
    // Visual feedback for wrong answer
    screens.game.classList.remove('screen-flash-wrong');
    screens.game.classList.remove('intense-shake');
    void screens.game.offsetWidth; // trigger reflow
    screens.game.classList.add('screen-flash-wrong');
    screens.game.classList.add('intense-shake');
    setTimeout(() => screens.game.classList.remove('intense-shake'), 500);

    // Clear input but keep the same problem
    state.currentAnswer = '';
    answerDisplay.textContent = '';
    
    // Shake animation on answer-box
    answerBox.classList.remove('error-flash');
    void answerBox.offsetWidth; // reflow to restart animation
    answerBox.classList.add('error-flash');
    setTimeout(() => answerBox.classList.remove('error-flash'), 400);

    // Show floating wrong indicator
    if (wrongTimeout) clearTimeout(wrongTimeout);
    wrongIndicator.textContent = '❌ 틀렸습니다!';
    wrongIndicator.className = 'wrong-indicator';
    wrongIndicator.style.display = 'block';
    wrongIndicator.style.zIndex = '200'; // Make sure it's on top
    wrongTimeout = setTimeout(() => {
      wrongIndicator.style.display = 'none';
      wrongIndicator.className = '';
    }, 1600);
  }
}

function endGame() {
  bgmEngine && bgmEngine.stop();
  const totalMs = state.totalElapsed;
  finalTimeDisp.textContent = formatTime(totalMs);
  playerNameInput.value = '';
  showScreen('result');

  // Store time in seconds for DB
  state.finalTimeSec = totalMs / 1000;
}

// ─── Keypad Handler ──────────────────────────────────────────────────────────
function handleKey(key) {
  if (key === 'clear') {
    if (state.currentAnswer.length > 0) {
      state.currentAnswer = state.currentAnswer.slice(0, -1);
      answerDisplay.textContent = state.currentAnswer;
    }
    return;
  }
  if (key === 'enter') {
    submitAnswer();
    return;
  }
  // Only allow digits
  if (/^\d$/.test(key) && state.currentAnswer.length < 20) {
    state.currentAnswer += key;
    answerDisplay.textContent = state.currentAnswer;
  }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', () => {
  getAudioCtx(); // Unlock audio
  startGame();
});

document.getElementById('btn-theme').addEventListener('click', () => {
  modals.theme.classList.remove('hidden');
});

document.getElementById('btn-ranking').addEventListener('click', async () => {
  modals.ranking.classList.remove('hidden');
  rankingList.innerHTML = '<p>로딩 중...</p>';
  const result = await getRankings();
  if (result.success && result.data.length > 0) {
    rankingList.innerHTML = result.data.map((r, i) => `
      <div class="ranking-item">
        <span class="ranking-rank">#${i + 1}</span>
        <span class="ranking-name">${escapeHtml(r.player_name)}</span>
        <span class="ranking-time">${formatTime(r.total_time * 1000)}</span>
      </div>
    `).join('');
  } else {
    rankingList.innerHTML = '<p>아직 기록이 없습니다!</p>';
  }
});

document.getElementById('btn-tutorial').addEventListener('click', () => {
  modals.tutorial.classList.remove('hidden');
});

// Theme selector
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme);
    modals.theme.classList.add('hidden');
  });
});

// Close modals
document.querySelectorAll('.close-modal').forEach(btn => {
  btn.addEventListener('click', () => {
    Object.values(modals).forEach(m => m.classList.add('hidden'));
  });
});

// Keypad buttons
document.querySelectorAll('.key-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    handleKey(btn.dataset.key);
  });
});

// Physical keyboard support
document.addEventListener('keydown', (e) => {
  if (!screens.game.classList.contains('active')) return;
  
  if (/^[0-9]$/.test(e.key)) {
    handleKey(e.key);
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault(); // Stop synthetic clicks if a button is focused
    handleKey('enter');
    return;
  }
  if (e.key === 'Backspace') {
    handleKey('clear');
    return;
  }
});

// Sound Toggle
const btnSoundToggle = document.getElementById('btn-sound-toggle');
function updateSoundBtn() {
  btnSoundToggle.textContent = state.soundEnabled ? '🔊' : '🔇';
  btnSoundToggle.classList.toggle('muted', !state.soundEnabled);
}
btnSoundToggle.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem('op25-sound', state.soundEnabled ? 'on' : 'off');
  updateSoundBtn();
  if (bgmEngine) {
    if (state.soundEnabled) {
      bgmEngine.start();
    } else {
      bgmEngine.stop();
    }
  }
});
updateSoundBtn();

// Result Screen
document.getElementById('btn-submit-score').addEventListener('click', async () => {
  const name = playerNameInput.value.trim();
  if (!name) { alert('이름을 입력해주세요!'); return; }
  const btn = document.getElementById('btn-submit-score');
  btn.disabled = true;
  btn.textContent = '저장 중...';
  await saveRanking(name, state.finalTimeSec);
  btn.textContent = '저장 완료! ✓';
});

document.getElementById('btn-home-from-result').addEventListener('click', () => {
  showScreen('start');
});

// ─── Utility ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Apply saved theme on load
applyTheme(state.theme);
