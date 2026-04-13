/* quiz-engine.js — universal quiz engine
   Reads window.QUIZ_DATA and mounts into <div id="root">

   QUIZ_DATA shape:
   {
     title, subtitle, badge, sourceText,
     theme: { accent, accent2, glow, bg1?, bg2? },
     chars: [{
       name, romaji, emoji, img?,
       tagline,
       reasons: { icon: string[], text: string[] }
     }],
     questions: [{ text, opts: [{ text, c: charIndex }] }]
   }
*/
(function () {
  const D = window.QUIZ_DATA;
  const T = D.theme;
  const CHARS = D.chars;
  const QUESTIONS = D.questions;
  const LETTERS = ['A','B','C','D','E','F','G','H','I'];

  // ── 1. Inject theme CSS ──────────────────────────
  const st = document.createElement('style');
  const b1 = T.bg1 || T.glow.replace(/[\d.]+\)$/, '0.12)');
  const b2 = T.bg2 || T.glow.replace(/[\d.]+\)$/, '0.10)');
  st.textContent = `
    :root{--accent:${T.accent};--accent2:${T.accent2};--glow:${T.glow};}
    body{background-image:
      radial-gradient(ellipse at 20% 20%,${b1} 0%,transparent 60%),
      radial-gradient(ellipse at 80% 80%,${b2} 0%,transparent 60%);}
  `;
  document.head.appendChild(st);
  document.title = D.title;

  // ── 2. State ─────────────────────────────────────
  let scores = new Array(CHARS.length).fill(0);
  let current = 0;
  let selected = null;

  // ── 3. Helpers ───────────────────────────────────
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── 4. Build static scaffold ─────────────────────
  const charChips = CHARS.map(c => `<span class="char-chip">${esc(c.name)}</span>`).join('');

  document.getElementById('root').innerHTML = `
    <!-- INTRO -->
    <div class="screen active" id="screen-intro">
      <div class="intro-badge">${esc(D.badge)}</div>
      <h1 class="intro-title">${esc(D.title)}</h1>
      <p class="intro-sub">${D.subtitle}</p>
      <div class="intro-chars">${charChips}</div>
      <button class="btn-start" id="btn-start">开始测试</button>
      <div class="footer">${esc(D.sourceText)} &nbsp;·&nbsp; 非官方测试</div>
    </div>

    <!-- QUIZ -->
    <div class="screen" id="screen-quiz">
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" id="prog-fill" style="width:0%"></div></div>
        <span class="progress-label" id="prog-label">1 / ${QUESTIONS.length}</span>
      </div>
      <div class="q-card">
        <span class="q-tag" id="q-tag">Q1</span>
        <p class="q-text" id="q-text"></p>
        <div class="options" id="options"></div>
      </div>
      <button class="btn-next" id="btn-next">下一题 →</button>
    </div>

    <!-- RESULT -->
    <div class="screen" id="screen-result">
      <div class="result-card" id="result-card"></div>
      <button class="btn-retry" id="btn-retry">↺ 再测一次</button>
      <div class="footer">${esc(D.sourceText)} &nbsp;·&nbsp; 非官方测试</div>
    </div>
  `;

  // ── 5. Bind static buttons ────────────────────────
  document.getElementById('btn-start').addEventListener('click', startQuiz);
  document.getElementById('btn-next').addEventListener('click', nextQuestion);
  document.getElementById('btn-retry').addEventListener('click', startQuiz);

  // ── 6. Quiz flow ──────────────────────────────────
  function startQuiz() {
    scores = new Array(CHARS.length).fill(0);
    current = 0;
    selected = null;
    showScreen('screen-quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = QUESTIONS[current];
    selected = null;

    document.getElementById('q-tag').textContent = `Q${current + 1}`;
    document.getElementById('q-text').textContent = q.text;
    document.getElementById('prog-label').textContent = `${current + 1} / ${QUESTIONS.length}`;
    document.getElementById('prog-fill').style.width = `${(current / QUESTIONS.length) * 100}%`;

    const btn = document.getElementById('btn-next');
    btn.classList.remove('show');
    btn.textContent = current === QUESTIONS.length - 1 ? '查看结果 ✨' : '下一题 →';

    const container = document.getElementById('options');
    container.innerHTML = '';
    const shuffled = [...q.opts].sort(() => Math.random() - 0.5);

    shuffled.forEach((opt, i) => {
      const el = document.createElement('button');
      el.className = 'opt';
      el.innerHTML = `<span class="opt-letter">${LETTERS[i]}</span>${esc(opt.text)}`;
      el.addEventListener('click', () => {
        container.querySelectorAll('.opt').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        selected = opt.c;
        document.getElementById('btn-next').classList.add('show');
      });
      container.appendChild(el);
    });
  }

  function nextQuestion() {
    if (selected === null) return;
    scores[selected] += 1;
    current++;
    if (current >= QUESTIONS.length) renderResult();
    else renderQuestion();
  }

  // ── 7. Result ─────────────────────────────────────
  function renderResult() {
    const maxScore = Math.max(...scores);
    const tops = scores.map((s, i) => ({ s, i })).filter(x => x.s === maxScore);
    const winner = tops[Math.floor(Math.random() * tops.length)].i;
    const char = CHARS[winner];
    const total = scores.reduce((a, b) => a + b, 0) || 1;

    // character portrait
    let imgHTML;
    if (char.img) {
      imgHTML = `
        <div class="result-img-wrap">
          <img class="result-img" src="${esc(char.img)}" alt="${esc(char.name)}"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="result-img-fallback" style="display:none">${char.emoji}</div>
        </div>`;
    } else {
      imgHTML = `<div class="result-img-wrap"><div class="result-img-fallback">${char.emoji}</div></div>`;
    }

    // reasons
    const reasonsHTML = char.reasons.icon.map((icon, i) => `
      <div class="reason-item">
        <span class="reason-icon">${icon}</span>
        <span class="reason-text">${esc(char.reasons.text[i])}</span>
      </div>`).join('');

    // score bars
    const scoreHTML = CHARS.map((c, i) => `
      <div class="score-row">
        <span class="score-char">${esc(c.name)}</span>
        <div class="score-track">
          <div class="score-fill" data-pct="${Math.round(scores[i]/total*100)}" style="width:0%"></div>
        </div>
        <span class="score-pct">${Math.round(scores[i]/total*100)}%</span>
      </div>`).join('');

    document.getElementById('result-card').innerHTML = `
      <span class="result-tag">测试结果</span>
      ${imgHTML}
      <div class="result-name">${esc(char.name)}</div>
      <div class="result-romaji">${esc(char.romaji)}</div>
      <p class="result-tagline">${esc(char.tagline)}</p>
      <hr class="result-divider">
      <div class="result-reason-title">为什么是你</div>
      <div class="result-reasons">${reasonsHTML}</div>
      <div class="score-bar-wrap">
        <div class="score-title">各角色契合度</div>
        ${scoreHTML}
      </div>
    `;

    showScreen('screen-result');

    // animate bars after paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.score-fill[data-pct]').forEach(el => {
          el.style.width = el.dataset.pct + '%';
        });
      });
    });
  }
})();
