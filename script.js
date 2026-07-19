/* =========================================================
   RELEASE COUNTDOWN GATE
   เปิดใช้งาน 09/09/2026 เวลา 00:00 น. ตามเวลาไทย (+07:00)
   ========================================================= */
(() => {
  'use strict';
  const RELEASE_DATE = new Date(Date.now() + 2 * 1 * 1000);
  // const RELEASE_DATE = new Date('2026-09-10T00:00:00+07:00');
  const RELEASE_STARTED_AT = new Date('2026-07-14T00:00:00+07:00');
  const gate = document.getElementById('release-gate');
  const daysEl = document.getElementById('release-days');
  const hoursEl = document.getElementById('release-hours');
  const minutesEl = document.getElementById('release-minutes');
  const secondsEl = document.getElementById('release-seconds');
  const statusEl = document.getElementById('release-status');
  const progressEl = document.getElementById('release-progress-bar');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = 0;
  let released = false;

  const pad = (value) => String(Math.max(0, value)).padStart(2, '0');

  function setNumber(element, value) {
    if (!element || element.textContent === value) return;
    element.textContent = value;
    element.classList.remove('is-ticking');
    void element.offsetWidth;
    element.classList.add('is-ticking');
  }

  function unlockReleaseGate() {
    if (released) return;
    released = true;
    clearInterval(timer);
    document.body.classList.remove('release-locked');

    if (!gate) return;
    gate.classList.add('is-unlocking');
    if (statusEl) statusEl.textContent = 'ถึงเวลาเปิดของขวัญแล้ว ✨';
    setNumber(daysEl, '00');
    setNumber(hoursEl, '00');
    setNumber(minutesEl, '00');
    setNumber(secondsEl, '00');
    if (progressEl) progressEl.style.width = '100%';
    navigator.vibrate?.([50, 35, 80]);

    setTimeout(() => gate.classList.add('is-leaving'), reduceMotion ? 80 : 900);
    setTimeout(() => {
      gate.remove();
      document.getElementById('password-input')?.focus();
    }, reduceMotion ? 180 : 1650);
  }

  function updateCountdown() {
    const now = Date.now();
    const remaining = RELEASE_DATE.getTime() - now;
    if (remaining <= 0) {
      unlockReleaseGate();
      return;
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setNumber(daysEl, pad(days));
    setNumber(hoursEl, pad(hours));
    setNumber(minutesEl, pad(minutes));
    setNumber(secondsEl, pad(seconds));

    const totalWindow = RELEASE_DATE.getTime() - RELEASE_STARTED_AT.getTime();
    const elapsed = now - RELEASE_STARTED_AT.getTime();
    const progress = totalWindow > 0 ? Math.min(100, Math.max(0, elapsed / totalWindow * 100)) : 0;
    if (progressEl) progressEl.style.width = `${progress}%`;
  }

  if (!gate || Date.now() >= RELEASE_DATE.getTime()) {
    document.body.classList.remove('release-locked');
    gate?.remove();
  } else {
    updateCountdown();
    timer = setInterval(updateCountdown, 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateCountdown();
    });
  }
})();

(() => {
  const scenes = [...document.querySelectorAll('.scene')];
  const dots = [...document.querySelectorAll('.nav-dot')];
  const portal = document.getElementById('portal');
  const soundToggle = document.getElementById('sound-toggle');
  const memoryMusic = document.getElementById('memory-music');
  const dodgeBtn = document.getElementById('dodge-btn');
  const dodgeNote = document.getElementById('dodge-note');
  const canvas = document.getElementById('space-canvas');
  const ctx = canvas.getContext('2d');
  let current = 0;
  let transitioning = false;
  let muted = false;
  let audioCtx = null;
  let touchX = null;
  let dodgeCount = 0;

  // โหมดประหยัดแรงสำหรับมือถือ/แท็บเล็ต
  const isMobile = matchMedia('(max-width: 860px), (pointer: coarse)').matches;
  const lowPowerMode = isMobile || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  document.documentElement.classList.toggle('low-power', lowPowerMode);

  // เปลี่ยนข้อความหลักของเว็บได้จาก index.html
  document.querySelectorAll('.type-on-enter').forEach((el) => {
    const text = el.dataset.text || el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((char, i) =>
      char === ' ' ? '<span class="char" style="--i:' + i + '">&nbsp;</span>' :
      '<span class="char" style="--i:' + i + '">' + char + '</span>'
    ).join('');
  });

  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(freq = 440, duration = .12, type = 'sine', volume = .05, delay = 0) {
    if (muted) return;
    ensureAudio();
    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + .01);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now); osc.stop(now + duration + .02);
  }

  function clickSound() { tone(520,.08,'triangle',.035); tone(780,.12,'sine',.025,.05); }
  function whooshSound() { tone(180,.25,'sawtooth',.025); tone(520,.3,'sine',.022,.08); }
  function successSound() { [523,659,784,1046].forEach((f,i)=>tone(f,.35,'triangle',.038,i*.08)); }
// ===============================
// เพลงพื้นหลัง
// ===============================

function startBackgroundMusic() {
  if (!memoryMusic || muted || document.body.classList.contains('intro-locked')) return;

  memoryMusic.volume = 0.4;

  const playPromise = memoryMusic.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log('เพลงพื้นหลังเริ่มเล่นแล้ว');
      })
      .catch(() => {
        console.log('รอให้ผู้ใช้กดหรือแตะหน้าเว็บก่อนเริ่มเพลง');
      });
  }
}

function unlockBackgroundMusic() {
  if (!memoryMusic || muted || document.body.classList.contains('intro-locked')) return;

  memoryMusic.volume = 0.4;

  memoryMusic.play()
    .then(() => {
      document.removeEventListener(
        'pointerdown',
        unlockBackgroundMusic,
        true
      );

      document.removeEventListener(
        'keydown',
        unlockBackgroundMusic,
        true
      );
    })
    .catch(() => {});
}

// พยายามเล่นทันทีเมื่อเปิดเว็บ
startBackgroundMusic();

// ถ้าเบราว์เซอร์บล็อก autoplay
// เพลงจะเริ่มทันทีเมื่อผู้ใช้แตะ คลิก หรือกดแป้นพิมพ์
document.addEventListener(
  'pointerdown',
  unlockBackgroundMusic,
  true
);

document.addEventListener(
  'keydown',
  unlockBackgroundMusic,
  true
);
  function rippleAt(x, y) {
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.left = x + 'px'; r.style.top = y + 'px';
    document.body.appendChild(r);
    setTimeout(() => r.remove(), 750);
  }
// function syncMemoryMusic(targetScene) {
//   if (!memoryMusic) return;

//   // หน้า 4 คือหน้าความทรงจำ
//   // หน้า 5 คือหน้าสุดท้าย
//   const musicScenes = [4, 5];

//   if (musicScenes.includes(targetScene) && !muted) {
//     memoryMusic.volume = 0.4;

//     // ถ้าเพลงเล่นอยู่แล้ว จะไม่เริ่มใหม่
//     if (memoryMusic.paused) {
//       memoryMusic.play().catch((error) => {
//         console.log('เบราว์เซอร์ยังไม่อนุญาตให้เล่นเพลง:', error);
//       });
//     }
//   } else {
//     memoryMusic.pause();
//     memoryMusic.currentTime = 0;
//   }
// }
  function goTo(index, origin) {
    index = Math.max(0, Math.min(scenes.length - 1, index));
    if (index === current || transitioning) return;
    // syncMemoryMusic(index);
    transitioning = true;
    whooshSound();
    if (origin) {
      const rect = origin.getBoundingClientRect();
      portal.style.left = (rect.left + rect.width / 2) + 'px';
      portal.style.top = (rect.top + rect.height / 2) + 'px';
      rippleAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      portal.style.left = '50%'; portal.style.top = '50%';
    }
    portal.classList.remove('burst');
    void portal.offsetWidth;
    portal.classList.add('burst');

    const old = scenes[current];
    old.classList.add('is-leaving');
    setTimeout(() => {
      old.classList.remove('is-active','is-leaving');
      current = index;
      scenes[current].classList.add('is-active');
      dots.forEach((d,i)=>d.classList.toggle('is-active', i === current));
      if (current === scenes.length - 1) setTimeout(() => confetti(lowPowerMode ? 28 : 70), 550);
      // มือถือปลดล็อกการกดเร็วขึ้น ไม่ต้องรอเอฟเฟกต์จบทั้งหมด
      setTimeout(() => { transitioning = false; }, lowPowerMode ? 220 : 650);
    }, 330);
  }

  document.querySelectorAll('.next-btn').forEach((btn) => {
    btn.addEventListener('click', () => { clickSound(); goTo(current + 1, btn); });
  });
  document.querySelectorAll('.branch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      clickSound();
      const target = Number(btn.dataset.go);
      if (Number.isInteger(target)) goTo(target, btn);
    });
  });
  dots.forEach((dot) => dot.addEventListener('click', () => { clickSound(); goTo(+dot.dataset.go, dot); }));

  document.getElementById('restart-btn').addEventListener('click', (e) => goTo(0, e.currentTarget));
  document.getElementById('celebrate-btn').addEventListener('click', () => { successSound(); confetti(lowPowerMode ? 42 : 120); });

  function dodge() {
    dodgeCount++;
    clickSound();
    if (dodgeCount >= 4) {
      dodgeBtn.textContent = 'โอเค หายงอนก็ได้ 💚';
      dodgeBtn.classList.remove('dodge-btn');
      dodgeBtn.style.transform = '';
      dodgeBtn.onclick = () => goTo(current + 1, dodgeBtn);
      dodgeNote.textContent = 'เย้! ระบบใจอ่อนทำงานแล้ว ✨';
      successSound();
      return;
    }
    const x = (Math.random() * 180 - 90);
    const y = (Math.random() * 80 - 40);
    dodgeBtn.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random()*10-5}deg)`;
    dodgeNote.textContent = ['จับไม่ได้หรอก 👽','เกือบแล้ว!','อีกนิดเดียวเอง 😆'][dodgeCount - 1];
  }
  dodgeBtn.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') dodge(); });
  dodgeBtn.addEventListener('click', dodge);

soundToggle.addEventListener('click', () => {
  muted = !muted;

  soundToggle.classList.toggle('is-muted', muted);

  soundToggle.querySelector('.sound-icon').textContent =
    muted ? '🔇' : '🔊';

  if (muted) {
    // หยุดเพลง แต่จำตำแหน่งเดิมไว้
    memoryMusic.pause();
  } else {
    // เล่นต่อจากตำแหน่งเดิม
    startBackgroundMusic();

    ensureAudio();
    successSound();
  }
});

  document.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('intro-locked')) return;
    if (!document.getElementById('memory-lightbox')?.hidden || !document.getElementById('secret-modal')?.hidden || !document.getElementById('heart-reward-modal')?.hidden) return;
    if (e.target.closest('button, a, input, textarea, select')) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });
  document.addEventListener('touchstart', (e) => touchX = e.changedTouches[0].clientX, {passive:true});
  document.addEventListener('touchend', (e) => {
    if (document.body.classList.contains('intro-locked')) { touchX = null; return; }
    if (!document.getElementById('memory-lightbox')?.hidden || !document.getElementById('secret-modal')?.hidden || !document.getElementById('heart-reward-modal')?.hidden) { touchX = null; return; }
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 70) goTo(current + (dx < 0 ? 1 : -1));
    touchX = null;
  }, {passive:true});

  let lastTrail = 0;
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || performance.now() - lastTrail < 45) return;
    lastTrail = performance.now();
    const s = document.createElement('span');
    s.className = 'trail-star'; s.textContent = Math.random() > .55 ? '✦' : '·';
    s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px';
    document.body.appendChild(s); setTimeout(()=>s.remove(),800);
  });

  function confetti(amount = 80) {
    for (let i = 0; i < amount; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = Math.random()*100 + 'vw';
      c.style.setProperty('--duration', (2.5 + Math.random()*2.5) + 's');
      c.style.setProperty('--drift', (Math.random()*180 - 90) + 'px');
      c.style.setProperty('--hue', Math.floor(Math.random()*130 + 70));
      c.style.animationDelay = (Math.random()*.7) + 's';
      document.body.appendChild(c); setTimeout(()=>c.remove(),5600);
    }
  }

  // พื้นหลังดาวเคลื่อนไหวแบบเบา ๆ
  let stars = [];
  function resizeCanvas() {
    const ratio = lowPowerMode ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
    ctx.setTransform(ratio,0,0,ratio,0,0);
    stars = Array.from({length: lowPowerMode ? Math.min(38, Math.floor(innerWidth*innerHeight/18000)) : Math.min(100, Math.floor(innerWidth*innerHeight/11000))}, () => ({
      x: Math.random()*innerWidth, y: Math.random()*innerHeight,
      r: Math.random()*1.6+.3, v: Math.random()*.12+.03, a: Math.random()*.7+.2,
      tw: Math.random()*Math.PI*2
    }));
  }
  let lastFrame = 0;
  let spaceFrame = 0;
  function drawSpace(t) {
    // มือถือวาดประมาณ 24fps และหยุด loop จริงเมื่อสลับแอป/ล็อกจอ
    if (!lowPowerMode || t - lastFrame >= 42) {
      lastFrame = t;
      ctx.clearRect(0,0,innerWidth,innerHeight);
      stars.forEach((s) => {
        s.y += s.v; if (s.y > innerHeight + 4) { s.y = -4; s.x = Math.random()*innerWidth; }
        const alpha = s.a * (.55 + Math.sin(t*.0018+s.tw)*.35);
        ctx.beginPath(); ctx.fillStyle = `rgba(214,255,166,${alpha})`;
        ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      });
    }
    spaceFrame = requestAnimationFrame(drawSpace);
  }
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 120);
  }, { passive:true });
  function startSpace() {
    if (document.hidden || spaceFrame) return;
    spaceFrame = requestAnimationFrame((time) => {
      spaceFrame = 0;
      drawSpace(time);
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(spaceFrame);
      spaceFrame = 0;
    } else {
      lastFrame = 0;
      startSpace();
    }
  });

  resizeCanvas(); startSpace();
})();

/* =========================================================
   MOBILE TOUCH FX — feedback เบา ๆ ที่ใช้เฉพาะ transform/opacity
   ========================================================= */
(() => {
  const coarsePointer = matchMedia('(max-width: 860px), (pointer: coarse)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!coarsePointer || reduceMotion) return;

  let lastSpark = 0;
  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || document.body.classList.contains('release-locked')) return;
    if (event.target.closest('input, textarea, select, .message-wheel')) return;

    const now = performance.now();
    if (now - lastSpark < 160) return;
    lastSpark = now;

    const spark = document.createElement('span');
    spark.className = 'mobile-tap-spark';
    spark.textContent = Math.random() > .5 ? '✦' : '💚';
    spark.style.left = `${event.clientX}px`;
    spark.style.top = `${event.clientY}px`;
    document.body.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });

    const button = event.target.closest('button');
    if (button) {
      button.classList.remove('mobile-tap-bounce');
      void button.offsetWidth;
      button.classList.add('mobile-tap-bounce');
      button.addEventListener('animationend', () => button.classList.remove('mobile-tap-bounce'), { once: true });
    }
  }, { passive: true });
})();

/* =========================================================
   CUTE GALAXY UPGRADE v3
   เอฟเฟกต์หัวใจ, tilt, toast, scene counter และ music status
   ========================================================= */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const allScenes = [...document.querySelectorAll('.scene')];
  const counter = document.getElementById('scene-current');
  const toast = document.getElementById('cute-toast');
  const musicStatus = document.getElementById('music-status');
  const musicText = document.getElementById('music-status-text');
  const soundButton = document.getElementById('sound-toggle');
  const music = document.getElementById('memory-music');

  const sceneMessages = [
    'จดหมายจากกาแล็กซีมาถึงแล้ว 💌',
    'ตอบดี ๆ น้า เจ้าตัวเขียวลุ้นอยู่ 👽💚',
    'ง้อด้วยหัวใจเต็มกระเป๋าเลยนะ 🥺',
    'บันทึกคำสัญญาเรียบร้อยแล้ว ✨',
    'เริ่มควิซหัวใจ ไม่มีคำตอบผิดนะ 💭',
    'เปิดกล่องความน่ารักและรับกอดได้เลย 🫂',
    'ทุกความทรงจำกำลังหมุนไปพร้อมเพลง ♫',
    'สุขสันต์วันเกิด คนพิเศษที่สุด 🎂💚'
  ];

  let toastTimer = 0;
  let lastActive = -1;

  function activeSceneIndex() {
    return Math.max(0, allScenes.findIndex((scene) => scene.classList.contains('is-active')));
  }

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2100);
  }

  function syncSceneUI(force = false) {
    const index = activeSceneIndex();
    if (!force && index === lastActive) return;
    lastActive = index;
    if (counter) counter.textContent = String(index + 1).padStart(2, '0');
    showToast(sceneMessages[index] || 'วาร์ปสำเร็จ ✨');
  }

  const sceneObserver = new MutationObserver(() => syncSceneUI());
  allScenes.forEach((scene) => sceneObserver.observe(scene, { attributes:true, attributeFilter:['class'] }));
  syncSceneUI(true);

  function createParticle(x, y, symbol, delay = 0) {
    const particle = document.createElement('span');
    const angle = Math.random() * Math.PI * 2;
    const distance = 42 + Math.random() * 84;
    particle.className = 'cute-particle';
    particle.textContent = symbol;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.fontSize = `${13 + Math.random() * 15}px`;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 22}px`);
    particle.style.setProperty('--rot', `${Math.random() * 180 - 90}deg`);
    particle.style.setProperty('--life', `${720 + Math.random() * 430}ms`);
    particle.style.animationDelay = `${delay}ms`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1500 + delay);
  }

  function burstAt(x, y, amount = 10) {
    if (reduceMotion) return;
    const symbols = ['💚','♡','✦','✨','·'];
    for (let i = 0; i < amount; i++) {
      createParticle(x, y, symbols[Math.floor(Math.random() * symbols.length)], i * 16);
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const rect = button.getBoundingClientRect();
    burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, button.id === 'celebrate-btn' ? 28 : 9);
  }, true);

  // tilt เบา ๆ เฉพาะจอที่มีเมาส์
  if (!reduceMotion && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.cute-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - .5;
        const py = (event.clientY - rect.top) / rect.height - .5;
        card.style.setProperty('--ry', `${px * 5}deg`);
        card.style.setProperty('--rx', `${py * -5}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  function syncMusicStatus() {
    if (!musicStatus || !musicText || !music) return;
    const playing = !music.paused && !music.muted;
    musicStatus.classList.toggle('is-paused', !playing);
    musicText.textContent = playing ? 'เพลงกำลังเล่นอยู่ ♫' : 'แตะเพื่อเปิดเพลง ♡';
  }

  if (music) {
    ['play','pause','volumechange','ended'].forEach((name) => music.addEventListener(name, syncMusicStatus));
    syncMusicStatus();
  }

  if (musicStatus && soundButton) {
    musicStatus.addEventListener('click', () => soundButton.click());
  }

  // หลังผู้ใช้แตะครั้งแรก ให้แจ้งว่าเพลงพร้อมแล้ว
  document.addEventListener('pointerdown', () => {
    setTimeout(() => {
      syncMusicStatus();
      if (music && !music.paused) showToast('เปิดเพลงให้แล้วนะ ♫💚');
    }, 180);
  }, { once:true, capture:true });

  // อีโมจิลอยขึ้นจากด้านล่างแบบเบา ๆ
  function ambientEmoji() {
    if (reduceMotion || document.hidden) return;
    const el = document.createElement('span');
    el.className = 'ambient-emoji';
    el.textContent = ['♡','💚','✦','✨'][Math.floor(Math.random() * 4)];
    el.style.left = `${4 + Math.random() * 92}vw`;
    el.style.fontSize = `${14 + Math.random() * 16}px`;
    el.style.setProperty('--dur', `${7 + Math.random() * 4}s`);
    el.style.setProperty('--drift', `${Math.random() * 150 - 75}px`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 12000);
  }

  if (!reduceMotion && !matchMedia('(max-width: 860px), (pointer: coarse)').matches) setInterval(ambientEmoji, 2200);

  // เพิ่มหัวใจชุดใหญ่ตอนฉลอง
  document.getElementById('celebrate-btn')?.addEventListener('click', (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, matchMedia('(max-width: 860px), (pointer: coarse)').matches ? 14 : 42);
    showToast('ขอให้มีความสุขมาก ๆ เลยน้า 🎂✨');
  });

  // ข้อความน่ารักตอนปุ่มงอนหลบ
  document.getElementById('dodge-btn')?.addEventListener('pointerenter', () => {
    if (Math.random() > .45) showToast('ปุ่มนี้ขี้อายเหมือนเจ้าตัวเขียวเลย 😆');
  });
})();

/* =========================================================
   COMPLETE CUTE FEATURES
   ซองจดหมาย, ควิซ, กล่องคำชม, กอด, แกลเลอรี และข้อความลับ
   ========================================================= */
(() => {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.getElementById('envelope-intro');
  const openEnvelope = document.getElementById('open-envelope');
  const music = document.getElementById('memory-music');
  const toast = document.getElementById('cute-toast');
  let localToastTimer = 0;

  function toastMessage(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(localToastTimer);
    localToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // 1) เปิดซองจดหมายก่อนเข้าเว็บ
  openEnvelope?.addEventListener('click', () => {
    if (intro?.classList.contains('is-opening')) return;
    intro?.classList.add('is-opening');
    document.body.classList.remove('intro-locked');
    music?.play().catch(() => {});
    setTimeout(() => {
      intro?.classList.add('is-gone');
      toastMessage('เปิดจดหมายสำเร็จแล้ว 💌✨');
    }, reduceMotion ? 80 : 1250);
    setTimeout(() => intro?.remove(), reduceMotion ? 150 : 1900);
  });

  // 2) ควิซ 3 ข้อ ทุกคำตอบพาไปสู่ข้อความน่ารัก
  const quizData = [
    {
      question: 'เค้าชอบอะไรในตัวเธอที่สุด?',
      options: ['รอยยิ้มของเธอ', 'ความน่ารักของเธอ', 'ทุกอย่างเลย'],
      feedback: 'ถูกทุกข้อ เพราะเค้าชอบทุกอย่างที่เป็นเธอ 💚'
    },
    {
      question: 'เวลาเธอเหนื่อย เค้าอยากทำอะไรที่สุด?',
      options: ['กอดแน่น ๆ', 'อยู่ข้าง ๆ', 'พาไปหาอะไรอร่อย ๆ'],
      feedback: 'คำตอบจริงคือทำทั้งหมดเลย ขอแค่เธอยิ้มได้ก็พอ 🫂'
    },
    {
      question: 'เค้าหล่อมั้ยตอบดีดี ',
      options: ['หล่อ', 'หล่อมาก', 'หล่อมากก'],
      feedback: 'เเน่นอนว่าเค้าหล่อ ✨'
    }
  ];
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const quizFeedback = document.getElementById('quiz-feedback');
  const quizStep = document.getElementById('quiz-step');
  const quizBar = document.getElementById('quiz-progress-bar');
  const quizNext = document.getElementById('quiz-next');
  let quizIndex = 0;
  let quizLocked = false;

  function renderQuiz() {
    const item = quizData[quizIndex];
    if (!item || !quizQuestion || !quizOptions) return;
    quizLocked = false;
    quizQuestion.textContent = item.question;
    quizStep.textContent = `ข้อ ${quizIndex + 1} จาก ${quizData.length}`;
    quizBar.style.width = `${(quizIndex / quizData.length) * 100}%`;
    quizFeedback.textContent = '';
    quizFeedback.classList.remove('show');
    quizOptions.innerHTML = '';
    item.options.forEach((label, optionIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiz-option';
      button.innerHTML = `<span>${String.fromCharCode(65 + optionIndex)}</span>${label}`;
      button.addEventListener('click', () => answerQuiz(button));
      quizOptions.appendChild(button);
    });
  }

  function answerQuiz(selectedButton) {
    if (quizLocked) return;
    quizLocked = true;
    quizOptions?.querySelectorAll('button').forEach((button) => {
      button.disabled = true;
      button.classList.toggle('is-selected', button === selectedButton);
    });
    quizFeedback.textContent = quizData[quizIndex].feedback;
    quizFeedback.classList.add('show');
    quizBar.style.width = `${((quizIndex + 1) / quizData.length) * 100}%`;
    toastMessage('คำตอบนี้น่ารักมากก 💚');

    setTimeout(() => {
      quizIndex += 1;
      if (quizIndex < quizData.length) {
        renderQuiz();
      } else {
        quizQuestion.textContent = 'ผ่านควิซหัวใจแล้วว!';
        quizStep.textContent = 'ครบทั้ง 3 ข้อแล้ว';
        quizOptions.innerHTML = '<div class="quiz-finale">💚<strong>คะแนนความน่ารัก</strong><b>∞ / 10</b><small>เกินมาตรฐานกาแล็กซีไปมาก</small></div>';
        quizFeedback.textContent = 'สรุปคือเธอน่ารักที่สุด และทุกคำตอบถูกหมดเลย';
        quizFeedback.classList.add('show');
        quizNext.hidden = false;
        toastMessage('ปลดล็อกคะแนนความน่ารักระดับอนันต์ ✨');
      }
    }, reduceMotion ? 150 : 1150);
  }
  renderQuiz();

  // 3) กล่องสุ่มคำชม
  const compliments = [
    'วันนี้เธออ้วนมากกก',
    'เธอเอ๋อมากด้วย โครตเอ๋อ 💚',
    'เธอกินเยอะมากก ',
    'เธอโครตอ้วนน '
  ];
  const complimentText = document.getElementById('compliment-text');
  const complimentButton = document.getElementById('compliment-btn');
  let previousCompliment = -1;

  complimentButton?.addEventListener('click', () => {
    let nextIndex = Math.floor(Math.random() * compliments.length);
    if (compliments.length > 1) while (nextIndex === previousCompliment) nextIndex = Math.floor(Math.random() * compliments.length);
    previousCompliment = nextIndex;
    complimentText.classList.remove('is-changing');
    void complimentText.offsetWidth;
    complimentText.textContent = compliments[nextIndex];
    complimentText.classList.add('is-changing');
    complimentButton.textContent = 'สุ่มคำชมอีกครั้ง 💌';
    toastMessage('รับคำชมเรียบร้อยแล้ว เก็บไว้อ่านเวลาคิดถึงนะ');
  });

  // 4) ปุ่มกอดเจ้าตัวเขียว
  const hugButton = document.getElementById('hug-btn');
  const hugZone = document.getElementById('hug-zone');
  const hugMessage = document.getElementById('hug-message');
  let hugCount = 0;
  hugButton?.addEventListener('click', () => {
    hugCount += 1;
    hugZone?.classList.remove('is-hugging');
    void hugZone?.offsetWidth;
    hugZone?.classList.add('is-hugging');
    const messages = [
      'กอดแล้วนะ ห้ามเศร้าแล้วว 🫂💚',
      'เพิ่มกอดให้อีกหนึ่งที พลังใจเต็ม 100% ✨',
      'กอดแน่นกว่าเดิมอีก เพราะคิดถึงมากกก',
      'กอดได้ไม่จำกัดจำนวนเลยนะ 💚'
    ];
    hugMessage.textContent = messages[Math.min(hugCount - 1, messages.length - 1)];
    hugButton.textContent = hugCount > 2 ? `กอดอีกครั้ง (${hugCount}) 🫂` : 'ขอกอดอีกที 🫂';
    navigator.vibrate?.([45, 35, 65]);
    setTimeout(() => hugZone?.classList.remove('is-hugging'), 900);
  });

  // 5) ตัวนับวัน: ใส่วันที่จริงที่ data-start-date ใน index.html รูปแบบ YYYY-MM-DD
  const daysCard = document.getElementById('days-card');
  const daysText = document.getElementById('days-together');
  const startDateValue = daysCard?.dataset.startDate?.trim();
  if (startDateValue && daysText) {
    const start = new Date(`${startDateValue}T00:00:00`);
    const today = new Date();
    if (!Number.isNaN(start.getTime()) && start <= today) {
      const days = Math.floor((today - start) / 86400000) + 1;
      daysText.textContent = `${days.toLocaleString('th-TH')} วันที่ได้รู้จักกัน`;
    }
  }

  // 6) แกลเลอรีรูปเต็มจอ
  const lightbox = document.getElementById('memory-lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  let lastMemoryTrigger = null;

  function openMemory(item) {
    if (!lightbox || !lightboxImage || !lightboxCaption) return;
    lastMemoryTrigger = item;
    lightboxImage.src = item.dataset.full || item.querySelector('img')?.src || '';
    lightboxImage.alt = item.querySelector('img')?.alt || 'รูปความทรงจำ';
    lightboxCaption.textContent = item.dataset.caption || item.querySelector('figcaption')?.textContent || '';
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.classList.add('show'));
    lightboxClose?.focus();
    toastMessage('เปิดความทรงจำแล้ว 📷💚');
  }

  function closeMemory() {
    if (!lightbox) return;
    lightbox.classList.remove('show');
    setTimeout(() => { lightbox.hidden = true; lastMemoryTrigger?.focus(); }, reduceMotion ? 0 : 240);
  }

  document.querySelectorAll('.memory-item').forEach((item) => {
    item.addEventListener('click', () => openMemory(item));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMemory(item); }
    });
  });
  lightboxClose?.addEventListener('click', closeMemory);
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeMemory(); });

  // 7) ข้อความลับแบบกดค้าง 2 วินาที
  const secretButton = document.getElementById('secret-heart');
  const secretModal = document.getElementById('secret-modal');
  const secretClose = document.getElementById('secret-close');
  const secretOkay = document.getElementById('secret-ok');
  let secretTimer = 0;
  let secretUnlocked = false;

  function openSecret() {
    if (!secretModal) return;
    secretUnlocked = true;
    secretButton?.classList.remove('is-holding');
    secretButton?.classList.add('is-unlocked');
    secretModal.hidden = false;
    requestAnimationFrame(() => secretModal.classList.add('show'));
    secretClose?.focus();
    navigator.vibrate?.([55, 35, 55, 35, 90]);
    toastMessage('ปลดล็อกข้อความลับสำเร็จ 💚');
  }
  function beginSecretHold(event) {
    if (secretUnlocked) { openSecret(); return; }
    event?.preventDefault();
    clearTimeout(secretTimer);
    secretButton?.classList.add('is-holding');
    secretTimer = setTimeout(openSecret, reduceMotion ? 900 : 2000);
  }
  function cancelSecretHold() {
    if (secretUnlocked) return;
    clearTimeout(secretTimer);
    secretButton?.classList.remove('is-holding');
  }
  function closeSecret() {
    if (!secretModal) return;
    secretModal.classList.remove('show');
    setTimeout(() => { secretModal.hidden = true; secretButton?.focus(); }, reduceMotion ? 0 : 240);
  }

  secretButton?.addEventListener('pointerdown', beginSecretHold);
  ['pointerup','pointercancel','pointerleave'].forEach((name) => secretButton?.addEventListener(name, cancelSecretHold));
  secretButton?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') beginSecretHold(event);
  });
  secretButton?.addEventListener('keyup', (event) => {
    if (event.key === 'Enter' || event.key === ' ') cancelSecretHold();
  });
  secretButton?.addEventListener('click', () => { if (secretUnlocked) openSecret(); });
  secretClose?.addEventListener('click', closeSecret);
  secretOkay?.addEventListener('click', closeSecret);
  secretModal?.addEventListener('click', (event) => { if (event.target === secretModal) closeSecret(); });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (lightbox && !lightbox.hidden) closeMemory();
    if (secretModal && !secretModal.hidden) closeSecret();
  });
})();

/* =========================================================
   GALAXY SECRET UPGRADE
   Password • Countdown • Heart Hunt • Save Card
   ========================================================= */
(() => {
  'use strict';

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function showMiniToast(message) {
    const oldToast = document.querySelector('.heart-find-toast');
    oldToast?.remove();
    const toast = document.createElement('div');
    toast.className = 'heart-find-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }

  /* ---------- 1) รหัส 1234 + นับถอยหลัง 3 2 1 ---------- */
  const gate = document.getElementById('password-gate');
  const passwordCard = document.getElementById('password-card');
  const passwordForm = document.getElementById('password-form');
  const passwordInput = document.getElementById('password-input');
  const passwordError = document.getElementById('password-error');
  const countdown = document.getElementById('galaxy-countdown');
  const countdownNumber = document.getElementById('countdown-number');
  const countdownMessage = document.getElementById('countdown-message');
  const countdownLoader = countdown?.querySelector('.countdown-loader span');
  const envelopeIntro = document.getElementById('envelope-intro');
  const openEnvelopeButton = document.getElementById('open-envelope');
  const WEBSITE_PASSWORD = '2105';
  let passwordBusy = false;
  let autoSubmitTimer = 0;

  async function animateCountdown() {
    if (!countdown || !countdownNumber) {
      envelopeIntro?.classList.remove('is-waiting');
      return;
    }

    countdown.hidden = false;
    requestAnimationFrame(() => countdown.classList.add('is-visible'));

    const steps = [
      { value: '3', progress: '28%', message: 'กำลังตรวจสอบรหัสลับ' },
      { value: '2', progress: '60%', message: 'กำลังเชื่อมต่อกาแล็กซี' },
      { value: '1', progress: '88%', message: 'กำลังส่งจดหมายมาหาเธอ' }
    ];

    for (const step of steps) {
      countdownNumber.textContent = step.value;
      countdownMessage.textContent = step.message;
      countdownLoader && (countdownLoader.style.width = step.progress);
      countdownNumber.classList.remove('is-changing');
      void countdownNumber.offsetWidth;
      countdownNumber.classList.add('is-changing');
      navigator.vibrate?.(step.value === '1' ? 65 : 35);
      await wait(reduceMotion ? 260 : 830);
    }

    countdownNumber.textContent = '💚';
    countdownMessage.textContent = 'จดหมายมาถึงแล้ว!';
    countdownLoader && (countdownLoader.style.width = '100%');
    countdownNumber.classList.remove('is-changing');
    void countdownNumber.offsetWidth;
    countdownNumber.classList.add('is-changing');
    navigator.vibrate?.([45, 35, 90]);
    await wait(reduceMotion ? 220 : 620);

    envelopeIntro?.classList.remove('is-waiting');
    countdown.classList.add('is-leaving');
    await wait(reduceMotion ? 80 : 650);
    countdown.remove();
    openEnvelopeButton?.focus();
  }

  async function unlockGalaxy() {
    if (passwordBusy || !passwordInput) return;
    passwordBusy = true;

    if (passwordInput.value !== WEBSITE_PASSWORD) {
      passwordBusy = false;
      passwordError.textContent = 'รหัสไม่ถูกต้อง เจ้าตัวเขียวยังไม่เปิดประตูให้น้า 👽';
      passwordCard?.classList.remove('is-wrong');
      void passwordCard?.offsetWidth;
      passwordCard?.classList.add('is-wrong');
      passwordInput.value = '';
      passwordInput.focus();
      navigator.vibrate?.([45, 30, 45]);
      return;
    }

    passwordInput.disabled = true;
    passwordCard?.classList.add('is-correct');
    gate?.classList.add('is-unlocking');
    passwordError.textContent = 'รหัสถูกต้อง! กำลังเปิดประตูกาแล็กซี ✨';
    navigator.vibrate?.([40, 35, 75]);
    await wait(reduceMotion ? 180 : 520);

    gate?.classList.add('is-gone');
    animateCountdown();
    await wait(reduceMotion ? 100 : 720);
    gate?.remove();
  }

  passwordForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    unlockGalaxy();
  });

  passwordInput?.addEventListener('input', () => {
    passwordInput.value = passwordInput.value.replace(/\D/g, '').slice(0, 4);
    passwordError.textContent = '';
    passwordCard?.classList.remove('is-wrong');
    clearTimeout(autoSubmitTimer);
    if (passwordInput.value.length === 4) {
      autoSubmitTimer = setTimeout(() => passwordForm?.requestSubmit(), 180);
    }
  });

  setTimeout(() => passwordInput?.focus(), 420);

  /* ---------- 2) เกมตามหาหัวใจลับ + วงล้อข้อความ 7 ช่อง ---------- */
  const scenes = [...document.querySelectorAll('.scene')];
  const foundCountElement = document.getElementById('heart-found-count');
  const totalCountElement = document.getElementById('heart-total-count');
  const counterBar = document.getElementById('heart-counter-bar');
  const counter = document.getElementById('heart-hunt-counter');

  const rewardModal = document.getElementById('heart-reward-modal');
  const rewardClose = document.getElementById('heart-reward-close');
  const wheel = document.getElementById('message-wheel');
  const wheelLabels = document.getElementById('wheel-labels');
  const wheelParticles = document.getElementById('wheel-particles');
  const wheelSpinButton = document.getElementById('wheel-spin-button');
  const wheelSpinText = document.getElementById('wheel-spin-text');
  const wheelStatus = document.getElementById('wheel-status');
  const wheelReadyCopy = document.getElementById('wheel-ready-copy');
  const wheelResult = document.getElementById('wheel-result');
  const wheelResultIcon = document.getElementById('wheel-result-icon');
  const wheelResultMessage = document.getElementById('wheel-result-message');
  const wheelResultEyebrow = document.getElementById('wheel-result-eyebrow');

  const STORAGE_KEY = 'green-galaxy-found-hearts-v3';
  const WHEEL_STORAGE_KEY = 'green-galaxy-wheel-result-v1';

  /*
    ================= ปรับข้อความและเรทตรงนี้ =================
    - weight ยิ่งมาก ยิ่งมีโอกาสออกมาก
    - ช่องบนวงล้อยังมีขนาดเท่ากันทั้ง 7 ช่อง
    - น้ำหนักชุดนี้รวม 100 เพื่อให้อ่านเป็นเปอร์เซ็นต์ได้ง่าย
  */
const WHEEL_PRIZES = [
  {
    label: '- ไม่บอก เดาเอา',
    icon: '🍣',
    weight: 50,
    tier: 'MESSAGE 01',
    message: 'ดีใจด้วยไอเอ๋อ เลือกกระเป๋าที่อยากได้ ในงบไม่เกิน 2,500 บาทท'
  },
  {
    label: '- ไม่บอก เดาเอา',
    icon: '🧸',
    weight: 50,
    tier: 'MESSAGE 02',
    message: 'ดีใจด้วยยย ไอเอ๋อของเค้าได้ลิป Dior เพิ่มอีกหนึ่งแท่งแล้วว 💖'
  },
  {
    label: '- ไม่บอก เดาเอา',
    icon: '💄',
    weight: 50,
    tier: 'MESSAGE 03',
    message: 'ได้ตุ๊กตาน่ารัก ๆ หนึ่งตัวน้า แต่จะเป็นตัวอะไรดี ขอเค้าคิดก่อนนน 🧸'
  },
  {
    label: '- ไม่บอก เดาเอา',
    icon: '👜',
    weight: 50,
    tier: 'MESSAGE 04',
    message: 'อาทิตย์หน้าไปกิน SUSHIRO กันเลยย เค้าให้งบเต็มที่ 2,000 บาทท 🍣'
  },
  {
    label: '- ไม่บอก เดาเอา',
    icon: '🌶️',
    weight: 50,
    tier: 'RARE MESSAGE',
    message: 'เงินอาทิตย์เพิ่ม 300 บาท จาก 500 เป็น 800 บาท ติดต่อกัน 2 อาทิตย์เลย 💸'
  },
  {
    label: '- ไม่บอก เดาเอา',
    icon: '💸',
    weight: 50,
    tier: 'SUPER RARE',
    message: 'รางวัลนี้ดีที่สุดแล้วอ้วนนน ได้ไปกินหมาล่าเป็นเพื่อนเค้าแบบไม่มีข้อโต้แย้ง 😆'
  },
  {
    label: '- ไม่บอก เดาเอา',
    icon: '👑',
    weight: 10,
    tier: 'รางวัล ใหญ่เลยอ้วนนน',
    message: ' อาทิตย์หน้าเงินเข้าบัญชีแน่นอน รับงบซื้อของ 7,000 บาท แต่ใช้เบา ๆ หน่อยน้า 👑'
  }
];

  // หน้า 3 ใช้ index 2 จึงไม่มีหัวใจลับ รวมทั้งหมด 7 หน้า × 3 = 21 ดวง
  const EXCLUDED_HEART_SCENES = new Set([2]);
  const heartScenes = scenes.filter((_, sceneIndex) => !EXCLUDED_HEART_SCENES.has(sceneIndex));
  const totalHearts = heartScenes.length * 3;

  const heartPositions = [
    [{ left:'7%', top:'26%' }, { right:'7%', top:'58%' }, { left:'17%', bottom:'11%' }],
    [{ left:'8%', top:'66%' }, { right:'8%', top:'20%' }, { right:'12%', bottom:'12%' }],
    [{ left:'6%', top:'20%' }, { right:'8%', top:'64%' }, { left:'46%', bottom:'8%' }],
    [{ left:'9%', top:'72%' }, { right:'7%', top:'23%' }, { right:'19%', bottom:'11%' }],
    [{ left:'7%', top:'34%' }, { right:'7%', top:'70%' }, { left:'43%', bottom:'8%' }],
    [{ left:'8%', top:'18%' }, { right:'8%', top:'47%' }, { left:'15%', bottom:'12%' }],
    [{ left:'7%', top:'58%' }, { right:'8%', top:'19%' }, { right:'12%', bottom:'10%' }],
    [{ left:'7%', top:'24%' }, { right:'7%', top:'62%' }, { left:'45%', bottom:'7%' }]
  ];

  let foundHearts = new Set();
  let wheelSpinning = false;
  let wheelRotation = 0;
  let savedWheelResult = null;
  let wheelAudioContext = null;

  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) {
      foundHearts = new Set(
        saved.filter((id) => {
          const match = id.match(/^scene-(\d+)-heart-(\d+)$/);
          if (!match) return false;
          const sceneIndex = Number(match[1]);
          const heartIndex = Number(match[2]);
          return !EXCLUDED_HEART_SCENES.has(sceneIndex) && heartIndex >= 0 && heartIndex < 3;
        })
      );
    }
  } catch (_) {
    foundHearts = new Set();
  }

  try {
    const storedResult = JSON.parse(sessionStorage.getItem(WHEEL_STORAGE_KEY) || 'null');
    if (
      storedResult &&
      Number.isInteger(storedResult.index) &&
      storedResult.index >= 0 &&
      storedResult.index < WHEEL_PRIZES.length
    ) {
      savedWheelResult = storedResult;
      wheelRotation = Number(storedResult.rotation) || 0;
    }
  } catch (_) {
    savedWheelResult = null;
  }

  function saveHeartProgress() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...foundHearts]));
    } catch (_) {}
  }

  function saveWheelResult(result) {
    try {
      sessionStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(result));
    } catch (_) {}
  }

  function updateHeartCounter(animate = false) {
    const found = Math.min(foundHearts.size, totalHearts);
    if (foundCountElement) foundCountElement.textContent = String(found);
    if (totalCountElement) totalCountElement.textContent = String(totalHearts);
    if (counterBar) counterBar.style.width = `${totalHearts ? (found / totalHearts) * 100 : 0}%`;

    const complete = found >= totalHearts;
    counter?.classList.toggle('is-complete', complete);
    if (counter) {
      counter.tabIndex = complete ? 0 : -1;
      counter.setAttribute('role', complete ? 'button' : 'status');
      counter.setAttribute('aria-label', complete
        ? (savedWheelResult ? 'เปิดดูข้อความที่สุ่มได้' : 'เปิดวงล้อข้อความลับ')
        : `พบหัวใจลับ ${found} จาก ${totalHearts} ดวง`
      );
    }

    if (animate && counter) {
      counter.classList.remove('is-popping');
      void counter.offsetWidth;
      counter.classList.add('is-popping');
    }
  }

  function flyHeartToCounter(source) {
    if (!counter) return;
    const sourceRect = source.getBoundingClientRect();
    const targetRect = counter.getBoundingClientRect();
    const flying = document.createElement('span');
    flying.className = 'heart-fly';
    flying.textContent = '💚';
    flying.style.left = `${sourceRect.left + sourceRect.width / 2 - 15}px`;
    flying.style.top = `${sourceRect.top + sourceRect.height / 2 - 15}px`;
    flying.style.setProperty('--fly-x', `${targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2)}px`);
    flying.style.setProperty('--fly-y', `${targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2)}px`);
    document.body.appendChild(flying);
    setTimeout(() => flying.remove(), 850);
  }

  function rewardConfetti(amount = 90) {
    for (let index = 0; index < amount; index += 1) {
      const piece = document.createElement('i');
      piece.className = 'confetti';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.setProperty('--duration', `${2.6 + Math.random() * 2.6}s`);
      piece.style.setProperty('--drift', `${Math.random() * 180 - 90}px`);
      piece.style.setProperty('--hue', String(Math.floor(Math.random() * 140 + 55)));
      piece.style.animationDelay = `${Math.random() * .55}s`;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 5800);
    }
  }

  function buildPrizeWheel() {
    if (!wheel || !wheelLabels) return;
    const colors = ['#baf45d','#ff95c8','#9f83ff','#6ed3c7','#ffd46b','#78a9ff','#eaff9b'];
    const slice = 360 / WHEEL_PRIZES.length;
    const stops = WHEEL_PRIZES.map((_, index) => {
      const start = (index * slice).toFixed(4);
      const end = ((index + 1) * slice).toFixed(4);
      return `${colors[index % colors.length]} ${start}deg ${end}deg`;
    });
    wheel.style.background = `conic-gradient(from -90deg, ${stops.join(',')})`;
    wheelLabels.innerHTML = '';

    WHEEL_PRIZES.forEach((prize, index) => {
      const label = document.createElement('div');
      const angle = -90 + (index + .5) * slice;
      label.className = 'prize-wheel-label';
      label.style.setProperty('--label-angle', `${angle}deg`);
      label.innerHTML = `<span>${prize.icon}</span><small>${prize.label}</small>`;
      wheelLabels.appendChild(label);
    });

    if (savedWheelResult) {
      wheel.style.transform = `rotate(${wheelRotation}deg)`;
      showWheelResult(savedWheelResult.index, false);
    }
  }

  function weightedPrizeIndex() {
    const weights = WHEEL_PRIZES.map((prize) => Math.max(0, Number(prize.weight) || 0));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return Math.floor(Math.random() * WHEEL_PRIZES.length);

    let random = Math.random() * totalWeight;
    for (let index = 0; index < weights.length; index += 1) {
      random -= weights[index];
      if (random < 0) return index;
    }
    return weights.length - 1;
  }

  function wheelTickTone(frequency = 720, volume = .018) {
    if (document.getElementById('sound-toggle')?.classList.contains('is-muted')) return;
    try {
      wheelAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (wheelAudioContext.state === 'suspended') wheelAudioContext.resume();
      const now = wheelAudioContext.currentTime;
      const oscillator = wheelAudioContext.createOscillator();
      const gain = wheelAudioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .055);
      oscillator.connect(gain).connect(wheelAudioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + .065);
    } catch (_) {}
  }

  function runWheelTicks(duration) {
    const startedAt = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      if (elapsed >= duration || !wheelSpinning) return;
      const progress = Math.min(1, elapsed / duration);
      wheelTickTone(830 - progress * 260, .016 + (1 - progress) * .008);
      setTimeout(tick, 55 + progress * 190);
    };
    tick();
  }

  function createWheelBurst() {
    if (!wheelParticles) return;
    wheelParticles.innerHTML = '';
    const symbols = ['💚','✦','✨','♡','💫'];
    const amount = matchMedia('(max-width:860px)').matches ? 16 : 26;
    for (let index = 0; index < amount; index += 1) {
      const particle = document.createElement('span');
      const angle = Math.random() * Math.PI * 2;
      const distance = 110 + Math.random() * 150;
      particle.textContent = symbols[index % symbols.length];
      particle.style.setProperty('--particle-x', `${Math.cos(angle) * distance}px`);
      particle.style.setProperty('--particle-y', `${Math.sin(angle) * distance}px`);
      particle.style.setProperty('--particle-delay', `${Math.random() * 240}ms`);
      wheelParticles.appendChild(particle);
    }
    wheelParticles.classList.remove('burst');
    void wheelParticles.offsetWidth;
    wheelParticles.classList.add('burst');
    setTimeout(() => wheelParticles.classList.remove('burst'), 1700);
  }

  function showWheelResult(index, celebrate = true) {
    const prize = WHEEL_PRIZES[index];
    if (!prize) return;

    if (wheelResultIcon) wheelResultIcon.textContent = prize.icon;
    if (wheelResultMessage) wheelResultMessage.textContent = `“${prize.message}”`;
    if (wheelResultEyebrow) wheelResultEyebrow.textContent = prize.tier;
    if (wheelResult) wheelResult.hidden = false;
    wheelReadyCopy?.classList.add('is-hidden');
    rewardModal?.classList.add('has-result');

    if (wheelSpinButton) {
      wheelSpinButton.disabled = true;
      wheelSpinButton.classList.add('is-used');
    }
    if (wheelSpinText) wheelSpinText.textContent = 'หมุนแล้วหนึ่งครั้ง 💚';
    if (wheelStatus) wheelStatus.textContent = 'วงล้อได้เลือกข้อความพิเศษให้เธอแล้ว';

    if (celebrate) {
      createWheelBurst();
      rewardConfetti(matchMedia('(max-width:860px)').matches ? 48 : 95);
      navigator.vibrate?.([60,35,60,35,120]);
      showMiniToast('วงล้อเลือกข้อความให้แล้ว ✨💚');
    }
  }

  function syncWheelState() {
    if (!wheelSpinButton) return;
    if (savedWheelResult) {
      showWheelResult(savedWheelResult.index, false);
    } else {
      wheelSpinButton.disabled = false;
      wheelSpinButton.classList.remove('is-used');
      if (wheelSpinText) wheelSpinText.textContent = 'หมุนวงล้อข้อความ';
      if (wheelStatus) wheelStatus.textContent = 'ครบ 21/21 แล้ว ปลดล็อกวงล้อสำเร็จ';
      if (wheelResult) wheelResult.hidden = true;
      wheelReadyCopy?.classList.remove('is-hidden');
      rewardModal?.classList.remove('has-result');
    }
  }

  function openHeartReward() {
    if (!rewardModal || foundHearts.size < totalHearts) return;
    syncWheelState();
    rewardModal.hidden = false;
    requestAnimationFrame(() => rewardModal.classList.add('show'));
    navigator.vibrate?.([35,30,55]);
    setTimeout(() => (savedWheelResult ? rewardClose : wheelSpinButton)?.focus(), reduceMotion ? 0 : 360);
  }

  function closeHeartReward() {
    if (!rewardModal || wheelSpinning) return;
    rewardModal.classList.remove('show');
    setTimeout(() => {
      rewardModal.hidden = true;
      counter?.focus?.();
    }, reduceMotion ? 0 : 300);
  }

  async function spinPrizeWheel() {
    if (wheelSpinning || savedWheelResult || !wheel || foundHearts.size < totalHearts) return;

    wheelSpinning = true;
    rewardModal?.classList.add('is-spinning');
    wheelSpinButton.disabled = true;
    if (wheelSpinText) wheelSpinText.textContent = 'กำลังหมุน...';
    if (wheelStatus) wheelStatus.textContent = 'วงล้อกำลังค้นหาข้อความที่เหมาะกับเธอ';

    const selectedIndex = weightedPrizeIndex();
    const slice = 360 / WHEEL_PRIZES.length;

    // ให้เข็มหยุดใกล้กึ่งกลางช่อง แต่ไม่ตรงเป๊ะทุกครั้ง
    const safeJitter = (Math.random() - .5) * slice * .28;
    const targetCenter = (selectedIndex + .5) * slice + safeJitter;

    // หมุนเต็มหลายรอบแบบคลิปตัวอย่าง แล้วค่อย ๆ ช้าลง
    const rounds = 9 + Math.floor(Math.random() * 3);
    const duration = reduceMotion ? 80 : 5000;
    const currentNormalized = ((wheelRotation % 360) + 360) % 360;
    const targetNormalized = ((360 - targetCenter) % 360 + 360) % 360;
    const forwardOffset = (targetNormalized - currentNormalized + 360) % 360;

    wheelRotation += rounds * 360 + forwardOffset;

    // ใช้ transition ตรง ๆ เพื่อให้วงล้อหมุนต่อเนื่อง ไม่กระตุกหรือหยุดกลางทาง
    wheel.classList.remove('is-spinning');
    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(${wheelRotation - (rounds * 360 + forwardOffset)}deg)`;
    void wheel.offsetWidth;

    wheel.style.transition = reduceMotion
      ? 'none'
      : `transform ${duration}ms cubic-bezier(0.10, 0.72, 0.08, 1)`;

    runWheelTicks(duration);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wheel.style.transform = `rotate(${wheelRotation}deg)`;
      });
    });

    // รอจนหมุนครบ 5 วินาที แล้วค่อยแสดงผล
    await wait(duration + (reduceMotion ? 20 : 220));

    wheel.style.transition = '';
    wheelSpinning = false;
    rewardModal?.classList.remove('is-spinning');

    savedWheelResult = {
      index: selectedIndex,
      rotation: wheelRotation,
      label: WHEEL_PRIZES[selectedIndex].label,
      message: WHEEL_PRIZES[selectedIndex].message
    };

    saveWheelResult(savedWheelResult);
    updateHeartCounter();
    showWheelResult(selectedIndex, true);
    wheelTickTone(1046, .045);
  }

  function collectHeart(button, id) {
    if (foundHearts.has(id)) return;
    foundHearts.add(id);
    saveHeartProgress();
    flyHeartToCounter(button);
    button.classList.add('is-found');
    button.disabled = true;
    setTimeout(() => button.remove(), 680);
    updateHeartCounter(true);

    const left = totalHearts - foundHearts.size;
    const message = left > 0
      ? `เจอหัวใจแล้ว 💚 เหลืออีก ${left} ดวง`
      : 'ครบ 21 ดวงแล้ว! วงล้อข้อความถูกปลดล็อก ✨';
    showMiniToast(message);
    navigator.vibrate?.(35);

    if (foundHearts.size === totalHearts) {
      setTimeout(openHeartReward, reduceMotion ? 250 : 900);
    }
  }

  scenes.forEach((scene, sceneIndex) => {
    if (EXCLUDED_HEART_SCENES.has(sceneIndex)) return;
    const positions = heartPositions[sceneIndex] || heartPositions[sceneIndex % heartPositions.length];

    positions.forEach((position, heartIndex) => {
      const id = `scene-${sceneIndex}-heart-${heartIndex}`;
      if (foundHearts.has(id)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hidden-heart';
      button.setAttribute('aria-label', `หัวใจลับดวงที่ ${heartIndex + 1} ในหน้าที่ ${sceneIndex + 1}`);
      Object.assign(button.style, position);
      button.style.setProperty('--heart-rotate', `${(sceneIndex * 11 + heartIndex * 19) % 28 - 14}deg`);
      button.style.animationDelay = `${(sceneIndex + heartIndex) * .21}s`;
      button.addEventListener('click', () => collectHeart(button, id));
      scene.appendChild(button);
    });
  });

  buildPrizeWheel();
  updateHeartCounter();

  counter?.addEventListener('click', () => {
    if (foundHearts.size >= totalHearts) openHeartReward();
  });
  counter?.addEventListener('keydown', (event) => {
    if (foundHearts.size < totalHearts) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openHeartReward();
    }
  });
  wheelSpinButton?.addEventListener('click', spinPrizeWheel);
  rewardClose?.addEventListener('click', closeHeartReward);
  rewardModal?.addEventListener('click', (event) => {
    if (event.target === rewardModal) closeHeartReward();
  });

  /* ---------- 3) บันทึกการ์ดหน้าสุดท้ายเป็น PNG ---------- */
  const saveCardButton = document.getElementById('save-card-btn');
  const saveCardText = document.getElementById('save-card-text');
  const birthdayCard = document.getElementById('birthday-card');
  let savingCard = false;
  let html2CanvasPromise = null;

  function loadHtml2Canvas() {
    if (typeof window.html2canvas === 'function') return Promise.resolve(window.html2canvas);
    if (html2CanvasPromise) return html2CanvasPromise;

    html2CanvasPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.async = true;
      script.onload = () => typeof window.html2canvas === 'function'
        ? resolve(window.html2canvas)
        : reject(new Error('html2canvas unavailable'));
      script.onerror = () => reject(new Error('html2canvas failed to load'));
      document.head.appendChild(script);
    }).catch((error) => {
      html2CanvasPromise = null;
      throw error;
    });

    return html2CanvasPromise;
  }

  async function saveBirthdayCard() {
    if (savingCard || !birthdayCard) return;
    savingCard = true;
    saveCardButton?.classList.add('is-saving');
    if (saveCardText) saveCardText.textContent = 'กำลังสร้างรูป...';

    let clone = null;
    try {
      const html2canvas = await loadHtml2Canvas();

      await document.fonts?.ready;
      clone = birthdayCard.cloneNode(true);
      clone.removeAttribute('id');
      clone.classList.remove('reveal', 'delay-2');
      clone.classList.add('capture-card-clone');
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      document.body.appendChild(clone);

      // ให้เบราว์เซอร์คำนวณ layout ของการ์ดสำเนาก่อนจับภาพ
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(clone, {
        backgroundColor: null,
        scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1)),
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 15000,
        scrollX: 0,
        scrollY: 0
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!blob) throw new Error('ไม่สามารถสร้างไฟล์รูปได้');

      const link = document.createElement('a');
      link.download = 'green-galaxy-birthday-card.png';
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1200);
      showMiniToast('บันทึกการ์ดเป็นรูปเรียบร้อยแล้ว 📸💚');
      navigator.vibrate?.([35, 30, 65]);
    } catch (error) {
      console.error(error);
      showMiniToast(error?.message || 'บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    } finally {
      clone?.remove();
      savingCard = false;
      saveCardButton?.classList.remove('is-saving');
      if (saveCardText) saveCardText.textContent = 'บันทึกการ์ดเป็นรูป';
    }
  }

  saveCardButton?.addEventListener('click', saveBirthdayCard);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && rewardModal && !rewardModal.hidden) closeHeartReward();
  });
})();

/* =========================================================
   SECRET DEVELOPER MENU
   กด R 3 ครั้งภายใน 2 วินาทีเพื่อเปิด
   ========================================================= */
(() => {
  'use strict';

  const HEART_STORAGE_KEY = 'green-galaxy-found-hearts-v3';
  const WHEEL_STORAGE_KEY = 'green-galaxy-wheel-result-v1';
  const DEV_AUTO_OPEN_KEY = 'green-galaxy-dev-auto-open-wheel';
  const EXCLUDED_SCENE_INDEX = 2;
  const REQUIRED_R_PRESSES = 3;
  const PRESS_WINDOW_MS = 2000;

  let rPresses = [];
  let lastFocusedElement = null;

  const modal = document.createElement('section');
  modal.id = 'dev-menu';
  modal.className = 'dev-menu-backdrop';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'dev-menu-title');
  modal.innerHTML = `
    <div class="dev-menu-panel">
      <button class="dev-menu-close" type="button" aria-label="ปิดเมนูนักพัฒนา">×</button>
      <p class="dev-menu-kicker">SECRET CONTROL PANEL</p>
      <h2 class="dev-menu-title" id="dev-menu-title">🛠 Developer Menu</h2>
      <p class="dev-menu-copy">เครื่องมือทดสอบเว็บแบบเร็ว ใช้เฉพาะตอนพัฒนาเว็บ</p>

      <div class="dev-menu-grid">
        <button class="dev-action" type="button" data-dev-action="reset-hearts">
          <span class="dev-action-icon">💚</span>
          <span><strong>รีเซ็ตหัวใจ</strong><small>กลับเป็น 0/21 แต่เก็บผลวงล้อไว้</small></span>
          <span class="dev-action-key">1</span>
        </button>

        <button class="dev-action" type="button" data-dev-action="reset-wheel">
          <span class="dev-action-icon">🎡</span>
          <span><strong>รีเซ็ตวงล้อ</strong><small>ล้างผลเดิมเพื่อให้หมุนได้อีกครั้ง</small></span>
          <span class="dev-action-key">2</span>
        </button>

        <button class="dev-action" type="button" data-dev-action="unlock">
          <span class="dev-action-icon">🔓</span>
          <span><strong>ปลดล็อกทุกหน้า</strong><small>ข้ามรหัส นับถอยหลัง และซองจดหมาย</small></span>
          <span class="dev-action-key">3</span>
        </button>

        <button class="dev-action" type="button" data-dev-action="last-page">
          <span class="dev-action-icon">🚀</span>
          <span><strong>ไปหน้าสุดท้าย</strong><small>วาร์ปไปยังการ์ดอวยพรทันที</small></span>
          <span class="dev-action-key">4</span>
        </button>

        <button class="dev-action" type="button" data-dev-action="all-hearts">
          <span class="dev-action-icon">👑</span>
          <span><strong>ได้หัวใจครบ 21 ดวง</strong><small>ปลดล็อกวงล้อและเปิดให้ทดสอบทันที</small></span>
          <span class="dev-action-key">5</span>
        </button>
      </div>

      <p class="dev-menu-status" id="dev-menu-status" aria-live="polite"></p>
      <p class="dev-menu-hint">กด Esc เพื่อปิด • กด R สามครั้งเพื่อเปิดอีกครั้ง</p>
    </div>
  `;
  document.body.appendChild(modal);

  const panel = modal.querySelector('.dev-menu-panel');
  const closeButton = modal.querySelector('.dev-menu-close');
  const status = modal.querySelector('#dev-menu-status');

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function openDevMenu() {
    if (!modal.hidden) return;
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => {
      modal.classList.add('show');
      modal.querySelector('.dev-action')?.focus();
    });
  }

  function closeDevMenu() {
    if (modal.hidden) return;
    modal.classList.remove('show');
    setTimeout(() => {
      modal.hidden = true;
      setStatus('');
      lastFocusedElement?.focus?.();
    }, 260);
  }

  function unlockCurrentView() {
    document.body.classList.remove('intro-locked', 'release-locked');
    document.getElementById('release-gate')?.remove();
    document.getElementById('password-gate')?.remove();
    document.getElementById('galaxy-countdown')?.remove();
    document.getElementById('envelope-intro')?.remove();
  }

  function makeAllHeartIds() {
    const scenes = [...document.querySelectorAll('.scene')];
    const ids = [];
    scenes.forEach((_, sceneIndex) => {
      if (sceneIndex === EXCLUDED_SCENE_INDEX) return;
      for (let heartIndex = 0; heartIndex < 3; heartIndex += 1) {
        ids.push(`scene-${sceneIndex}-heart-${heartIndex}`);
      }
    });
    return ids;
  }

  function goToLastScene() {
    unlockCurrentView();
    const scenes = [...document.querySelectorAll('.scene')];
    const dots = [...document.querySelectorAll('.nav-dot')];
    const lastIndex = scenes.length - 1;

    scenes.forEach((scene, index) => {
      scene.classList.toggle('is-active', index === lastIndex);
      scene.classList.remove('is-leaving');
    });
    dots.forEach((dot, index) => dot.classList.toggle('is-active', index === lastIndex));

    const sceneCounter = document.getElementById('scene-current');
    if (sceneCounter) sceneCounter.textContent = String(lastIndex + 1).padStart(2, '0');
  }

  function reloadWithMessage(message) {
    setStatus(message);
    setTimeout(() => location.reload(), 520);
  }

  function performAction(action) {
    switch (action) {
      case 'reset-hearts':
        sessionStorage.removeItem(HEART_STORAGE_KEY);
        sessionStorage.removeItem(DEV_AUTO_OPEN_KEY);
        reloadWithMessage('รีเซ็ตหัวใจแล้ว กำลังโหลดใหม่…');
        break;

      case 'reset-wheel':
        sessionStorage.removeItem(WHEEL_STORAGE_KEY);
        sessionStorage.removeItem(DEV_AUTO_OPEN_KEY);
        reloadWithMessage('รีเซ็ตวงล้อแล้ว หมุนใหม่ได้อีกครั้ง…');
        break;

      case 'unlock':
        unlockCurrentView();
        setStatus('ปลดล็อกทุกหน้าในรอบนี้แล้ว 🔓');
        setTimeout(closeDevMenu, 700);
        break;

      case 'last-page':
        goToLastScene();
        setStatus('วาร์ปไปหน้าสุดท้ายแล้ว 🚀');
        setTimeout(closeDevMenu, 650);
        break;

      case 'all-hearts':
        sessionStorage.setItem(HEART_STORAGE_KEY, JSON.stringify(makeAllHeartIds()));
        sessionStorage.removeItem(WHEEL_STORAGE_KEY);
        sessionStorage.setItem(DEV_AUTO_OPEN_KEY, 'yes');
        reloadWithMessage('ตั้งหัวใจเป็น 21/21 แล้ว กำลังเปิดวงล้อ…');
        break;
    }
  }

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeDevMenu();
    const actionButton = event.target.closest('[data-dev-action]');
    if (actionButton) performAction(actionButton.dataset.devAction);
  });
  closeButton?.addEventListener('click', closeDevMenu);

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const typing = target instanceof HTMLElement && (
      target.matches('input, textarea, select') || target.isContentEditable
    );

    if (!modal.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDevMenu();
        return;
      }
      if (!typing && /^[1-5]$/.test(event.key)) {
        event.preventDefault();
        const action = modal.querySelector(`[data-dev-action]:nth-of-type(${event.key})`)?.dataset.devAction;
        if (action) performAction(action);
      }
      return;
    }

    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() !== 'r') return;

    const now = performance.now();
    rPresses = rPresses.filter((time) => now - time <= PRESS_WINDOW_MS);
    rPresses.push(now);

    if (rPresses.length >= REQUIRED_R_PRESSES) {
      rPresses = [];
      event.preventDefault();
      openDevMenu();
      navigator.vibrate?.([30, 25, 45]);
    }
  }, true);

  // หลังใช้ปุ่ม “ได้หัวใจครบ 21 ดวง” จะเปิดวงล้อให้อัตโนมัติ
  if (sessionStorage.getItem(DEV_AUTO_OPEN_KEY) === 'yes') {
    sessionStorage.removeItem(DEV_AUTO_OPEN_KEY);
    window.addEventListener('load', () => {
      setTimeout(() => {
        unlockCurrentView();
        const counter = document.getElementById('heart-hunt-counter');
        counter?.click();
      }, 700);
    }, { once: true });
  }
})();
