// script.js

(function() {
  // ---------- DOM elements ----------
  const timerDisplay = document.getElementById('timerDisplay');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const lapBtn = document.getElementById('lapBtn');
  const exportBtn = document.getElementById('exportBtn');
  const lapListEl = document.getElementById('lapList');
  const bestLapDisplay = document.getElementById('bestLapDisplay');
  const avgLapDisplay = document.getElementById('avgLapDisplay');

  const modeStopwatchBtn = document.getElementById('modeStopwatch');
  const modeTimerBtn = document.getElementById('modeTimer');
  const modeTitle = document.getElementById('modeTitle');
  const timerInputs = document.getElementById('timerInputs');
  const lapBtnContainer = document.getElementById('lapBtnContainer');
  const lapSection = document.getElementById('lapSection');

  const minutesInput = document.getElementById('minutesInput');
  const secondsInput = document.getElementById('secondsInput');
  const setTimerBtn = document.getElementById('setTimerBtn');
  const presetBtns = document.querySelectorAll('.preset-btn');

  const muteToggle = document.getElementById('muteToggle');
  const speakerOnIcon = document.getElementById('speakerOnIcon');
  const speakerOffIcon = document.getElementById('speakerOffIcon');
  
  const themeToggle = document.getElementById('themeToggle');
  const moonIcon = document.getElementById('moonIcon');
  const sunIcon = document.getElementById('sunIcon');

  // PWA install elements
  const installContainer = document.getElementById('installContainer');
  const installBtn = document.getElementById('installBtn');
  let deferredPrompt;

  // ---------- localStorage keys ----------
  const STORAGE_LAPS = 'stopwatchLaps';
  const STORAGE_TIMER_TARGET = 'timerTarget';
  const STORAGE_MODE = 'activeMode';
  const STORAGE_MUTE = 'mute';
  const STORAGE_THEME = 'theme';

  // ---------- State ----------
  let running = false;
  let intervalId = null;
  let mode = 'stopwatch';
  let muted = false;
  let darkTheme = true;

  // Stopwatch state
  let elapsedSeconds = 0;
  let startTime = null;
  let laps = [];

  // Timer state
  let countdownTarget = 60;
  let countdownRemaining = 60;

  // Audio context
  let audioCtx = null;

  // ---------- Load saved data ----------
  function loadSavedData() {
    // Laps
    const savedLaps = localStorage.getItem(STORAGE_LAPS);
    if (savedLaps) {
      try {
        laps = JSON.parse(savedLaps);
        laps = laps.filter(lap => typeof lap.lapTime === 'number');
      } catch (e) {
        laps = [];
      }
    }

    // Timer target
    const savedTarget = localStorage.getItem(STORAGE_TIMER_TARGET);
    if (savedTarget !== null) {
      const target = Number(savedTarget);
      if (!isNaN(target) && target >= 0) {
        countdownTarget = target;
        countdownRemaining = target;
      }
    }

    // Mode
    const savedMode = localStorage.getItem(STORAGE_MODE);
    if (savedMode === 'timer' || savedMode === 'stopwatch') {
      mode = savedMode;
    }

    // Mute
    const savedMute = localStorage.getItem(STORAGE_MUTE);
    if (savedMute !== null) {
      muted = savedMute === 'true';
    }
    updateMuteIcons();

    // Theme
    const savedTheme = localStorage.getItem(STORAGE_THEME);
    if (savedTheme !== null) {
      darkTheme = savedTheme === 'dark';
    }
    applyTheme();
  }

  // ---------- Save functions ----------
  function saveLaps() {
    localStorage.setItem(STORAGE_LAPS, JSON.stringify(laps));
  }
  
  function saveTimerTarget() {
    localStorage.setItem(STORAGE_TIMER_TARGET, countdownTarget.toString());
  }
  
  function saveMode() {
    localStorage.setItem(STORAGE_MODE, mode);
  }
  
  function saveMute() {
    localStorage.setItem(STORAGE_MUTE, muted.toString());
  }
  
  function saveTheme() {
    localStorage.setItem(STORAGE_THEME, darkTheme ? 'dark' : 'light');
  }

  // ---------- Theme toggle ----------
  function toggleTheme() {
    darkTheme = !darkTheme;
    applyTheme();
    saveTheme();
  }

  function applyTheme() {
    const body = document.body;
    if (darkTheme) {
      body.classList.remove('light-theme');
      body.classList.add('dark-theme');
      moonIcon.classList.remove('hidden');
      sunIcon.classList.add('hidden');
    } else {
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
      moonIcon.classList.add('hidden');
      sunIcon.classList.remove('hidden');
    }
  }

  // ---------- Mute toggle ----------
  function toggleMute() {
    muted = !muted;
    updateMuteIcons();
    saveMute();
  }

  function updateMuteIcons() {
    if (muted) {
      speakerOnIcon.classList.add('hidden');
      speakerOffIcon.classList.remove('hidden');
    } else {
      speakerOnIcon.classList.remove('hidden');
      speakerOffIcon.classList.add('hidden');
    }
  }

  // ---------- Formatting ----------
  function formatSimple(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function formatWithMs(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const cents = Math.floor((seconds - Math.floor(seconds)) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${cents.toString().padStart(2, '0')}`;
  }

  // ---------- Display update ----------
  function updateDisplay() {
    if (mode === 'stopwatch') {
      timerDisplay.textContent = formatSimple(elapsedSeconds);
    } else {
      timerDisplay.textContent = formatSimple(countdownRemaining);
    }
  }

  // ---------- Render laps ----------
  function renderLaps() {
    if (laps.length === 0) {
      lapListEl.innerHTML = '<div class="text-center text-slate-400 italic py-2">No laps recorded</div>';
      bestLapDisplay.textContent = '—';
      avgLapDisplay.textContent = '—';
      return;
    }

    let bestTime = Infinity;
    let total = 0;
    laps.forEach(lap => {
      total += lap.lapTime;
      if (lap.lapTime < bestTime) bestTime = lap.lapTime;
    });

    let finalHtml = '';
    laps.forEach((lap, index) => {
      const formatted = formatWithMs(lap.lapTime);
      const isBest = lap.lapTime === bestTime;
      const bestClass = isBest ? 'bg-emerald-500/20 rounded px-1 -mx-1' : '';
      finalHtml += `<div class="flex justify-between border-b border-white/10 py-1 ${bestClass}">`;
      finalHtml += `<span class="text-indigo-300">Lap ${index + 1}</span>`;
      finalHtml += `<span>${formatted}</span>`;
      finalHtml += `</div>`;
    });

    lapListEl.innerHTML = finalHtml;
    bestLapDisplay.textContent = formatWithMs(bestTime);
    avgLapDisplay.textContent = formatWithMs(total / laps.length);
  }

  // ---------- Add lap ----------
  function addLap() {
    if (mode !== 'stopwatch') return;
    laps.push({ lapTime: elapsedSeconds });
    renderLaps();
    saveLaps();
  }

  // ---------- Export laps as CSV ----------
  function exportLaps() {
    if (laps.length === 0) {
      alert('No laps to export');
      return;
    }

    let csv = 'Lap,Time (seconds),Formatted\n';
    laps.forEach((lap, index) => {
      const formatted = formatWithMs(lap.lapTime);
      csv += `${index + 1},${lap.lapTime.toFixed(2)},${formatted}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laps-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Audio beep ----------
  function playBeep() {
    if (muted) return;

    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          beepInternal();
        }).catch(() => {});
      } else {
        beepInternal();
      }
    } catch (e) {}
  }

  function beepInternal() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  }

  function flashTimer() {
    timerDisplay.classList.add('flash');
    setTimeout(() => {
      timerDisplay.classList.remove('flash');
    }, 1800);
  }

  // ---------- Stop timer ----------
  function stopTimer() {
    if (!running) return;
    running = false;
    clearInterval(intervalId);
    intervalId = null;
  }

  // ---------- Reset ----------
  function resetTimer() {
    if (running) stopTimer();

    if (mode === 'stopwatch') {
      elapsedSeconds = 0;
      laps = [];
      renderLaps();
      saveLaps();
    } else {
      countdownRemaining = countdownTarget;
      updateDisplay();
    }
  }

  // ---------- Start ----------
  function startTimer() {
    if (running) return;

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (mode === 'stopwatch') {
      startTime = Date.now() - (elapsedSeconds * 1000);
    } else {
      if (countdownRemaining <= 0) {
        countdownRemaining = countdownTarget;
      }
      startTime = Date.now() - ((countdownTarget - countdownRemaining) * 1000);
    }

    running = true;
    intervalId = setInterval(() => {
      const now = Date.now();
      if (mode === 'stopwatch') {
        elapsedSeconds = (now - startTime) / 1000;
        updateDisplay();
      } else {
        const elapsed = (now - startTime) / 1000;
        const remaining = countdownTarget - elapsed;
        if (remaining <= 0) {
          countdownRemaining = 0;
          updateDisplay();
          stopTimer();
          playBeep();
          flashTimer();
        } else {
          countdownRemaining = remaining;
          updateDisplay();
        }
      }
    }, 100);
  }

  // ---------- Switch mode ----------
  function setMode(newMode) {
    if (newMode === mode) return;
    if (running) stopTimer();

    mode = newMode;
    saveMode();

    if (mode === 'stopwatch') {
      modeTitle.textContent = 'STOPWATCH';
      modeStopwatchBtn.classList.add('bg-indigo-500', 'text-white');
      modeStopwatchBtn.classList.remove('text-white/70');
      modeTimerBtn.classList.remove('bg-indigo-500', 'text-white');
      modeTimerBtn.classList.add('text-white/70');
      timerInputs.classList.add('hidden');
      lapBtnContainer.classList.remove('hidden');
      lapSection.classList.remove('hidden');
      updateDisplay();
      renderLaps();
    } else {
      modeTitle.textContent = 'TIMER';
      modeTimerBtn.classList.add('bg-indigo-500', 'text-white');
      modeTimerBtn.classList.remove('text-white/70');
      modeStopwatchBtn.classList.remove('bg-indigo-500', 'text-white');
      modeStopwatchBtn.classList.add('text-white/70');
      timerInputs.classList.remove('hidden');
      lapBtnContainer.classList.add('hidden');
      lapSection.classList.add('hidden');
      updateDisplay();
    }
  }

  // ---------- Set timer target ----------
  function setTimerTarget() {
    let mins = parseInt(minutesInput.value, 10) || 0;
    let secs = parseInt(secondsInput.value, 10) || 0;
    if (mins < 0) mins = 0;
    if (mins > 59) mins = 59;
    if (secs < 0) secs = 0;
    if (secs > 59) secs = 59;
    minutesInput.value = mins;
    secondsInput.value = secs;

    const newTarget = mins * 60 + secs;
    countdownTarget = newTarget;
    countdownRemaining = newTarget;
    updateDisplay();
    saveTimerTarget();
  }

  // ---------- Preset handler ----------
  function setPreset(e) {
    const minutes = parseInt(e.target.dataset.minutes, 10);
    if (isNaN(minutes)) return;
    minutesInput.value = minutes;
    secondsInput.value = 0;
    setTimerTarget();
  }

  // ---------- PWA Install handling ----------
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installContainer.classList.remove('hidden');
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    deferredPrompt = null;
    installContainer.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    installContainer.classList.add('hidden');
    deferredPrompt = null;
  });

  // ---------- Event listeners ----------
  startBtn.addEventListener('click', startTimer);
  stopBtn.addEventListener('click', stopTimer);
  resetBtn.addEventListener('click', resetTimer);
  lapBtn.addEventListener('click', addLap);
  exportBtn.addEventListener('click', exportLaps);

  modeStopwatchBtn.addEventListener('click', () => setMode('stopwatch'));
  modeTimerBtn.addEventListener('click', () => setMode('timer'));

  setTimerBtn.addEventListener('click', setTimerTarget);
  minutesInput.addEventListener('change', setTimerTarget);
  secondsInput.addEventListener('change', setTimerTarget);

  muteToggle.addEventListener('click', toggleMute);
  themeToggle.addEventListener('click', toggleTheme);

  presetBtns.forEach(btn => btn.addEventListener('click', setPreset));

  // ---------- Initialise ----------
  loadSavedData();

  // Set inputs to saved target
  const targetMins = Math.floor(countdownTarget / 60);
  const targetSecs = Math.floor(countdownTarget % 60);
  minutesInput.value = targetMins;
  secondsInput.value = targetSecs;

  setMode(mode);

  if (mode === 'stopwatch') {
    renderLaps();
  }
})();