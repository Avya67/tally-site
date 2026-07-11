/* ============================================================
   TALLY — shared script.js
   Team: Chua Jiaqi (AI Core), Cheang Chee Xuan (Ingestion),
         Avya Kesharwani (Front-End/Chat UI), Carissa Chng (QA/Errors)
   ============================================================ */

/* ---------------------------------------------------------------
   CONFIG — CHUA JIAQI: paste your n8n production webhook URL here.
   Your n8n workflow's LAST node should be "Respond to Webhook"
   (swap out the Telegram Send Message node for this), and it
   should return JSON shaped like:  { "reply": "text to show user" }
   Leave as empty string "" to keep the site running in offline
   demo mode until your webhook is ready.
----------------------------------------------------------------*/
const N8N_WEBHOOK_URL = ""; // e.g. "https://your-n8n-instance.app.n8n.cloud/webhook/tally-chat"

/* =========================
   NAV — highlight current page
   ========================= */
(function highlightNav(){
  const links = document.querySelectorAll('.nav-links a');
  const here = window.location.pathname.split('/').pop() || 'index.html';
  links.forEach(a=>{
    const target = a.getAttribute('href');
    if(target === here) a.classList.add('active');
  });
})();

/* =========================
   NAV — mobile hamburger toggle
   ========================= */
(function navToggle(){
  const btn = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if(!btn || !links) return;
  btn.addEventListener('click', ()=>{
    links.classList.toggle('open');
  });
  links.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', ()=> links.classList.remove('open'));
  });
})();

/* =========================
   HERO — draggable sticky notes
   (only runs if a .note-field exists on the page, i.e. index.html,
   and only on wider screens — on mobile the notes reflow into a
   static scrollable row instead, see style.css)
   ========================= */
(function dragNotes(){
  const field = document.querySelector('.note-field');
  if(!field) return;
  if(window.matchMedia('(max-width:600px)').matches) return;

  const notes = field.querySelectorAll('.note');
  notes.forEach(note=>{
    let dragging = false;
    let offsetX = 0, offsetY = 0;

    const start = (clientX, clientY)=>{
      dragging = true;
      const rect = note.getBoundingClientRect();
      const fieldRect = field.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
      // convert to absolute positioning relative to field, anchored at current spot
      note.style.left = (rect.left - fieldRect.left) + 'px';
      note.style.top = (rect.top - fieldRect.top) + 'px';
      note.classList.add('dragging');
    };
    const move = (clientX, clientY)=>{
      if(!dragging) return;
      const fieldRect = field.getBoundingClientRect();
      let x = clientX - fieldRect.left - offsetX;
      let y = clientY - fieldRect.top - offsetY;
      note.style.left = x + 'px';
      note.style.top = y + 'px';
    };
    const end = ()=>{
      dragging = false;
      // note stays in 'dragging' state (absolute) after drop, so it
      // keeps sitting wherever the user left it instead of snapping
      // back into the flex row
    };

    note.addEventListener('pointerdown', e=>{
      note.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY);
    });
    note.addEventListener('pointermove', e=>move(e.clientX, e.clientY));
    note.addEventListener('pointerup', end);
    note.addEventListener('pointercancel', end);
  });
})();

/* =========================
   CHAT — talks to Chua Jiaqi's n8n webhook,
   falls back to an offline canned responder if the
   webhook isn't configured or doesn't respond.
   (only runs if #chat-log exists, i.e. chat.html)
   ========================= */
(function chat(){
  const log = document.getElementById('chat-log');
  if(!log) return;

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const statusEl = document.getElementById('chat-status');

  const usingWebhook = N8N_WEBHOOK_URL.trim().length > 0;
  statusEl.textContent = usingWebhook ? 'connected · n8n' : 'offline demo mode';

  function addBubble(text, who){
    const b = document.createElement('div');
    b.className = 'bubble ' + who;
    b.textContent = text;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function addSystem(text){
    const b = document.createElement('div');
    b.className = 'bubble system';
    b.textContent = text;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
  }

  function showTyping(){
    const t = document.createElement('div');
    t.className = 'typing';
    t.id = 'typing-indicator';
    t.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
  }
  function hideTyping(){
    const t = document.getElementById('typing-indicator');
    if(t) t.remove();
  }

  /* ---------------------------------------------------------------
     CARISSA: this is the safety net on the front-end side — if the
     webhook call fails or times out, the user still gets a graceful
     reply instead of a dead chat. Swap the message text below for
     whatever your QA flow decides is the right fallback copy.
  ----------------------------------------------------------------*/
  function fallbackReply(userText){
    const t = userText.toLowerCase();
    if(t.includes('deadline') || t.includes('due')){
      return "I can't reach the live calendar right now (offline demo mode), but once the AI backend is connected, I'll pull your real deadlines from Google Calendar here.";
    }
    if(t.includes('hi') || t.includes('hello') || t.includes('hey')){
      return "Hey! I'm Tally, your deadline co-pilot. I'm running in offline demo mode right now — connect the n8n webhook in script.js to bring me fully online.";
    }
    return "Got it — noted. (This is a canned offline-demo reply. Once N8N_WEBHOOK_URL is set in script.js, I'll actually think about this using the real AI Agent workflow.)";
  }

  async function sendToWebhook(userText, history){
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, history })
    });
    if(!res.ok){
      const bodyText = await res.text().catch(()=> '');
      console.error('Webhook error', res.status, bodyText);
      throw new Error(res.status + (bodyText ? ' — ' + bodyText.slice(0,200) : ''));
    }
    const data = await res.json().catch(()=>{
      throw new Error('response was not valid JSON — check the "Respond to Webhook" node');
    });
    if(!data || typeof data.reply === 'undefined'){
      console.error('Webhook responded but no "reply" field:', data);
      throw new Error('no "reply" field in response — got: ' + JSON.stringify(data).slice(0,150));
    }
    return data.reply;
  }

  const history = [];

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    addBubble(text, 'user');
    history.push({ role: 'user', text });
    input.value = '';
    showTyping();

    let reply;
    try{
      if(usingWebhook){
        reply = await sendToWebhook(text, history);
      } else {
        await new Promise(r=>setTimeout(r, 500));
        reply = fallbackReply(text);
      }
    } catch(err){
      reply = fallbackReply(text) + " (webhook error: " + err.message + ")";
    }

    hideTyping();
    addBubble(reply, 'bot');
    history.push({ role: 'assistant', text: reply });
  });

  if(!usingWebhook){
    addSystem('Tally is in offline demo mode — the AI backend isn\'t connected yet.');
  }
})();

/* =========================
   HERO — animate wordmark letters in on load
   ========================= */
(function animateWordmark(){
  const wordmark = document.querySelector('.wordmark');
  if(!wordmark) return;
  const spans = wordmark.querySelectorAll('.char-in');
  spans.forEach((s,i)=>{
    s.style.animationDelay = (i * 0.05) + 's';
  });
})();

/* =========================
   SCROLL REVEAL — generic fade/slide-in for any .reveal element
   ========================= */
(function scrollReveal(){
  const items = document.querySelectorAll('.reveal');
  if(!items.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  items.forEach(el=> io.observe(el));
})();

/* =========================
   SLOT MACHINE
   DEMO DATA — CHUA JIAQI: once your calendar-read endpoint exists,
   replace TODAY_TASKS with a fetch() call to it, keeping the same
   {title, tag} shape so the reel logic doesn't need to change.
   ========================= */
(function slotMachine(){
  const machine = document.getElementById('slot-machine');
  if(!machine) return;

  const TODAY_TASKS = [
    { tag: "Due today", title: "Finish C240 AI Ethics worksheet" },
    { tag: "Due tomorrow", title: "Submit CA1 report draft" },
    { tag: "This week", title: "Quiz 3 — Data Analytics" },
    { tag: "Overdue", title: "Reply to group project thread" },
    { tag: "Due today", title: "Robotics club — bring proposal" }
  ];

  // reveal + zoom-in when scrolled into view
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        machine.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  io.observe(machine);

  const reels = machine.querySelectorAll('.reel');
  const lever = document.getElementById('lever-btn');
  const resultEl = document.getElementById('slot-result');
  const symbols = ['★','⏰','📌','✓','🔥','📚'];

  function randomSymbol(){
    return symbols[Math.floor(Math.random()*symbols.length)];
  }

  lever.addEventListener('click', ()=>{
    lever.disabled = true;
    resultEl.innerHTML = '';
    reels.forEach(r=> r.classList.add('spinning'));

    // let reels "spin" for a bit, cycling symbols
    let ticks = 0;
    const spinTimer = setInterval(()=>{
      reels.forEach(r=>{
        r.querySelector('.reel-strip').textContent = randomSymbol();
      });
      ticks++;
      if(ticks > 14){
        clearInterval(spinTimer);
        reels.forEach((r,i)=>{
          setTimeout(()=>{
            r.classList.remove('spinning');
            r.querySelector('.reel-strip').textContent = '★';
          }, i * 220);
        });
        setTimeout(()=>{
          const task = TODAY_TASKS[Math.floor(Math.random()*TODAY_TASKS.length)];
          resultEl.innerHTML = '<span class="tag">' + task.tag + '</span>' + task.title;
          lever.disabled = false;
        }, reels.length * 220 + 200);
      }
    }, 90);
  });
})();

/* =========================
   TAROT CARDS + QUIZ
   ========================= */
(function tarotAndQuiz(){
  const grid = document.getElementById('tarot-grid');
  if(!grid) return;

  const cards = grid.querySelectorAll('.tarot-card');

  // scatter-in on scroll: each card gets a random entry direction/rotation
  cards.forEach(card=>{
    const dx = (Math.random() * 400 - 200) + 'px';
    const dy = (Math.random() * -200 - 60) + 'px';
    const rot = (Math.random() * 50 - 25) + 'deg';
    const settleRot = (Math.random() * 10 - 5) + 'deg';
    card.style.setProperty('--dx', dx);
    card.style.setProperty('--dy', dy);
    card.style.setProperty('--rot', rot);
    card.style.setProperty('--settle-rot', settleRot);
  });

  const io = new IntersectionObserver((entries)=>{
    entries.forEach((entry, i)=>{
      if(entry.isIntersecting){
        setTimeout(()=> entry.target.classList.add('in'), i * 120);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  cards.forEach(c=> io.observe(c));

  // ---- quiz ----
  const startBtn = document.getElementById('start-quiz');
  const quizBox = document.getElementById('quiz-box');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const quizResult = document.getElementById('quiz-result');

  const QUESTIONS = [
    {
      q: "When do you usually start an assignment?",
      opts: [
        { text: "The moment it's assigned", type: "early" },
        { text: "A few days before, in chunks", type: "steady" },
        { text: "The night before, adrenaline on", type: "diver" }
      ]
    },
    {
      q: "How many things are you juggling right now?",
      opts: [
        { text: "Just one, laser focused", type: "early" },
        { text: "A tidy list of a few", type: "steady" },
        { text: "Honestly, too many to count", type: "juggler" }
      ]
    },
    {
      q: "A deadline sneaks up on you. What now?",
      opts: [
        { text: "Rare — I plan ahead", type: "early" },
        { text: "I scramble but pull through", type: "comeback" },
        { text: "It happens, I roll with it", type: "juggler" }
      ]
    }
  ];

  const CHARACTERS = {
    early:    { emoji:"🌅", name:"The Early Bird", desc:"Finishes days ahead, calm and collected.", bg:"#3F6B52" },
    steady:   { emoji:"📋", name:"The Steady Planner", desc:"Breaks it into daily chunks. No surprises.", bg:"#8A6A2E" },
    diver:    { emoji:"⏱️", name:"The Deadline Diver", desc:"Thrives right at 11:59pm.", bg:"#B0472F" },
    juggler:  { emoji:"🤹", name:"The Juggler", desc:"Many things at once, somehow it works out.", bg:"#5A4A8A" },
    comeback: { emoji:"🔥", name:"The Comeback Kid", desc:"Starts late, pulls through strong.", bg:"#C4732E" }
  };

  let qIndex = 0;
  const scores = {};

  function renderQuestion(){
    const item = QUESTIONS[qIndex];
    quizQuestion.textContent = item.q;
    quizOptions.innerHTML = '';
    item.opts.forEach(opt=>{
      const btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.textContent = opt.text;
      btn.addEventListener('click', ()=>{
        scores[opt.type] = (scores[opt.type] || 0) + 1;
        qIndex++;
        if(qIndex < QUESTIONS.length){
          renderQuestion();
        } else {
          showResult();
        }
      });
      quizOptions.appendChild(btn);
    });
  }

  function showResult(){
    quizBox.querySelector('.quiz-live').style.display = 'none';
    let topType = 'early';
    let topScore = -1;
    Object.keys(scores).forEach(k=>{
      if(scores[k] > topScore){ topScore = scores[k]; topType = k; }
    });
    const c = CHARACTERS[topType];
    quizResult.innerHTML =
      '<div class="tarot-card" style="opacity:1;transform:none;background:linear-gradient(160deg,' + c.bg + ',var(--ink));">' +
        '<span></span>' +
        '<div class="tarot-portrait" style="background:rgba(255,255,255,0.15);">' + c.emoji + '</div>' +
        '<div class="tarot-name">' + c.name + '</div>' +
        '<div class="tarot-desc">' + c.desc + '</div>' +
      '</div>' +
      '<p style="color:var(--slate); font-family:\'IBM Plex Mono\',monospace; font-size:0.75rem; margin-top:8px;">Demo result — a few days of real use will refine this.</p>';
    quizResult.classList.add('active');
    animateProgressChart(topType);
  }

  startBtn.addEventListener('click', ()=>{
    // collect scattered cards into a neat deck
    cards.forEach((card, i)=>{
      setTimeout(()=>{
        card.classList.add('collected');
        card.style.transform = 'translate(0,0) rotate(0deg)';
      }, i * 60);
    });
    setTimeout(()=>{
      startBtn.style.display = 'none';
      quizBox.classList.add('active');
      qIndex = 0;
      Object.keys(scores).forEach(k=> delete scores[k]);
      quizResult.classList.remove('active');
      quizBox.querySelector('.quiz-live').style.display = 'block';
      renderQuestion();
    }, cards.length * 60 + 300);
  });
})();

/* =========================
   PROGRESS CHART (demo data — animates once visible)
   ========================= */
function animateProgressChart(highlightType){
  const bars = document.querySelectorAll('.progress-bar');
  if(!bars.length) return;
  const demoHeights = [40, 65, 30, 80, 55, 90, 45];
  bars.forEach((bar,i)=>{
    setTimeout(()=>{
      bar.style.height = demoHeights[i % demoHeights.length] + 'px';
    }, i * 90);
  });
}
(function progressChartOnScroll(){
  const chart = document.querySelector('.progress-chart');
  if(!chart) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        animateProgressChart();
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  io.observe(chart);
})();
