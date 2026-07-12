/* ============================================================
   TALLY — shared script.js
   Team: Chua Jiaqi (AI Core), Cheang Chee Xuan (Ingestion),
         Avya Kesharwani (Front-End/Chat UI), Carissa Chng (Slides/Marketing)
   ============================================================ */

/* ---------------------------------------------------------------
   CONFIG — CHUA JIAQI: paste your n8n production webhook URL here.
   Your n8n workflow's LAST node should be "Respond to Webhook"
   (swap out the Telegram Send Message node for this), and it
   should return JSON shaped like:  { "reply": "text to show user" }
   Leave as empty string "" to keep the site running in offline
   demo mode until your webhook is ready.
----------------------------------------------------------------*/
const N8N_WEBHOOK_URL = "https://n8ngc.codeblazar.org/webhook/887baf2a-a560-43b7-b6bf-7fb9902cbe35";

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
     This is the safety net on the front-end side — if the webhook
     call fails or times out, the user still gets a graceful
     reply instead of a dead chat. Swap the message text below for
     whatever fallback copy feels right.
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
    { tag: "Due today",     title: "Finish C240 AI Ethics worksheet" },
    { tag: "Due tomorrow",  title: "Submit CA1 report draft" },
    { tag: "This week",     title: "Quiz 3 — Data Analytics" },
    { tag: "Overdue",       title: "Reply to group project thread" },
    { tag: "Due today",     title: "Robotics club — bring proposal" }
  ];

  // urgency-coded symbols: each reel icon means something,
  // not a random emoji — landing all three on the same icon
  // reflects how urgent the pulled task actually is.
  const ICON_BY_TAG = {
    "Overdue": "🔥",
    "Due today": "⏰",
    "Due tomorrow": "⏰",
    "This week": "📕"
  };
  const ALL_ICONS = ["⏰","📕","🔥"];

  const reels = machine.querySelectorAll('.reel');
  const lever = document.getElementById('lever-btn');
  const resultEl = document.getElementById('slot-result');

  function randomIcon(){
    return ALL_ICONS[Math.floor(Math.random()*ALL_ICONS.length)];
  }

  lever.addEventListener('click', ()=>{
    lever.disabled = true;
    resultEl.innerHTML = '';
    reels.forEach(r=> r.classList.add('spinning'));

    const task = TODAY_TASKS[Math.floor(Math.random()*TODAY_TASKS.length)];
    const finalIcon = ICON_BY_TAG[task.tag] || "⏰";

    let ticks = 0;
    const spinTimer = setInterval(()=>{
      reels.forEach(r=>{
        r.querySelector('.reel-strip').textContent = randomIcon();
      });
      ticks++;
      if(ticks > 14){
        clearInterval(spinTimer);
        reels.forEach((r,i)=>{
          setTimeout(()=>{
            r.classList.remove('spinning');
            r.querySelector('.reel-strip').textContent = finalIcon;
          }, i * 220);
        });
        setTimeout(()=>{
          resultEl.innerHTML = '<span class="tag">' + task.tag + '</span>' + task.title;
          lever.disabled = false;
        }, reels.length * 220 + 200);
      }
    }, 90);
  });

  /* ---- scroll-linked vault doors: open on the way in, close on the way out,
     regardless of scroll direction, since it's driven by current position ---- */
  const doors = document.querySelector('.slot-doors');
  const section = document.getElementById('slot-section');
  if(doors && section){
    let ticking = false;
    function updateDoors(){
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = vh / 2;
      const dist = Math.abs(sectionCenter - viewportCenter);
      const maxDist = vh / 2 + rect.height / 2;
      let progress = 1 - Math.min(dist / maxDist, 1);
      progress = Math.max(0, Math.min(1, progress * 1.15)); // gentler, less eager open
      doors.style.setProperty('--door-progress', progress.toFixed(3));
      ticking = false;
    }
    window.addEventListener('scroll', ()=>{
      if(!ticking){
        requestAnimationFrame(updateDoors);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', updateDoors);
    updateDoors();
  }
})();

/* =========================
   PIXEL CHARACTER PORTRAITS
   Small blocky sprite per persona — same base silhouette,
   distinct hair pattern + persona accent color for clothing,
   so the set reads as one consistent character sheet.
   ========================= */
const CHARACTER_COLORS = {
  early:    "#3F6B52",
  steady:   "#8A6A2E",
  diver:    "#B0472F",
  juggler:  "#5A4A8A",
  comeback: "#C4732E"
};
const HAIR_ROWS = {
  // two 8-wide rows, 1 = hair pixel
  early:    ["01111110","11111111"],
  steady:   ["00111100","01111110"],
  diver:    ["10111101","11011011"],
  juggler:  ["11111111","11111111"],
  comeback: ["01111100","10111101"]
};
function pixelPersonSVG(type){
  const cloth = CHARACTER_COLORS[type] || "#3F6B52";
  const skin = "#E8C99B";
  const hairColor = "#1F3B2C";
  const hairRows = HAIR_ROWS[type] || HAIR_ROWS.early;
  const grid = [
    hairRows[0].split('').map(b=> b==='1' ? hairColor : null),
    hairRows[1].split('').map(b=> b==='1' ? hairColor : null),
    ["_","1","1","1","1","1","1","_"].map(b=> b==='1' ? skin : null),
    ["1","1","1","1","1","1","1","1"].map(b=> b==='1' ? skin : null),
    ["_","1","1","1","1","1","1","_"].map(b=> b==='1' ? skin : null),
    ["_","_","_","_","_","_","_","_"],
    ["1","1","1","1","1","1","1","1"].map(b=> b==='1' ? cloth : null),
    ["1","1","1","1","1","1","1","1"].map(b=> b==='1' ? cloth : null),
    ["1","1","1","1","1","1","1","1"].map(b=> b==='1' ? cloth : null)
  ];
  let rects = '';
  grid.forEach((row,y)=>{
    row.forEach((color,x)=>{
      if(color) rects += '<rect x="'+x+'" y="'+y+'" width="1" height="1" fill="'+color+'"/>';
    });
  });
  return '<svg viewBox="0 0 8 9" class="pixel-portrait">' + rects + '</svg>';
}
(function renderPortraits(){
  document.querySelectorAll('[data-portrait]').forEach(el=>{
    el.innerHTML = pixelPersonSVG(el.getAttribute('data-portrait'));
  });
})();

/* =========================
   FAQ ACCORDION — one open at a time
   ========================= */
(function faqAccordion(){
  const list = document.getElementById('faq-list');
  if(!list) return;
  const items = list.querySelectorAll('.faq-item');
  items.forEach(item=>{
    const btn = item.querySelector('.faq-q');
    btn.addEventListener('click', ()=>{
      const wasOpen = item.classList.contains('open');
      items.forEach(i=> i.classList.remove('open'));
      if(!wasOpen) item.classList.add('open');
    });
  });
})();

/* =========================
   TAROT CARDS — flip face-up one by one on scroll,
   then fly into a deck (left) beside the quiz (right).
   Each answer flips the top card to a new candidate,
   the final answer leaves the real result on top.
   ========================= */
(function tarotAndQuiz(){
  const grid = document.getElementById('tarot-grid');
  if(!grid) return;

  const cards = Array.from(grid.querySelectorAll('.tarot-card'));
  const deckCol = document.getElementById('deck-col');
  const quizRow = document.getElementById('quiz-row');
  const quizBox = document.getElementById('quiz-box');
  const quizQuestion = document.getElementById('quiz-question');
  const quizOptions = document.getElementById('quiz-options');
  const quizResultNote = document.getElementById('quiz-result-note');
  const scrollCue = document.getElementById('scroll-cue');

  // scatter-in on scroll: each card gets a random entry direction/rotation
  cards.forEach(card=>{
    const dx = (Math.random() * 500 - 250) + 'px';
    const dy = (Math.random() * -220 - 60) + 'px';
    const rot = (Math.random() * 60 - 30) + 'deg';
    const settleRot = (Math.random() * 12 - 6) + 'deg';
    card.style.setProperty('--dx', dx);
    card.style.setProperty('--dy', dy);
    card.style.setProperty('--rot', rot);
    card.style.setProperty('--settle-rot', settleRot);
  });

  // step 1: scatter in, then flip face-up, one card at a time as it enters view
  const flipIo = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('in');
        setTimeout(()=> entry.target.classList.add('flipped'), 350);
        flipIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });
  cards.forEach(c=> flipIo.observe(c));

  // step 2: once the quiz row scrolls into view, fly all cards into the deck
  let collected = false;
  function collectIntoDeck(){
    if(collected) return;
    collected = true;
    if(scrollCue) scrollCue.style.display = 'none';

    // deck-col must be visible BEFORE we measure/move cards into it —
    // otherwise it's still display:none and every card "arrives" at
    // (0,0), breaking the travel animation and making cards look like
    // they just pop into place instead of actually flying into the deck.
    deckCol.classList.add('active');

    cards.forEach((card, i)=>{
      const before = card.getBoundingClientRect();

      // reset scatter transform so it lands in normal flow inside deck-col
      card.style.transform = '';
      card.classList.add('flipped'); // make sure it's face-up before collecting
      deckCol.appendChild(card);
      card.classList.add('collected');

      const after = card.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;

      // FLIP technique: jump instantly to old spot, then transition to new one
      card.style.transition = 'none';
      card.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(0deg)';
      requestAnimationFrame(()=>{
        card.style.transition = '';
        setTimeout(()=>{
          card.style.transform = ''; // fall back to CSS nth-child fan transform
        }, i * 70);
      });
    });

    setTimeout(()=>{
      quizBox.classList.add('active');
      requestAnimationFrame(()=> quizBox.classList.add('shown'));
      startQuiz();
    }, cards.length * 70 + 500);
  }

  const collectIo = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        collectIntoDeck();
        collectIo.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  if(quizRow) collectIo.observe(quizRow);

  // ---- quiz logic, driven by the deck's top card ----
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

  const CARD_DATA = {
    early:    { name:"The Early Bird",     desc:"Days ahead, calm and collected." },
    steady:   { name:"The Steady Planner", desc:"Daily chunks, no surprises." },
    diver:    { name:"The Deadline Diver", desc:"Thrives at 11:59pm." },
    juggler:  { name:"The Juggler",        desc:"Many things, somehow works." },
    comeback: { name:"The Comeback Kid",   desc:"Starts late, pulls through." }
  };

  let qIndex = 0;
  const scores = {};

  function topCard(){
    // last child in deck-col is the visual top of the stack
    return deckCol.lastElementChild;
  }

  function setCardFace(card, type){
    const front = card.querySelector('.card-front');
    front.style.transition = 'opacity 0.25s ease';
    front.style.opacity = 0;
    setTimeout(()=>{
      card.dataset.type = type;
      const portraitEl = front.querySelector('.tarot-portrait');
      portraitEl.innerHTML = pixelPersonSVG(type);
      front.querySelector('.tarot-name').textContent = CARD_DATA[type].name;
      front.querySelector('.tarot-desc').textContent = CARD_DATA[type].desc;
      front.style.opacity = 1;
    }, 250);
  }

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

        // shift the top card to a new candidate each answer — suspense
        const candidateTypes = Object.keys(CARD_DATA);
        const nextType = candidateTypes[Math.floor(Math.random()*candidateTypes.length)];
        setCardFace(topCard(), nextType);

        qIndex++;
        if(qIndex < QUESTIONS.length){
          renderQuestion();
        } else {
          finishQuiz();
        }
      });
      quizOptions.appendChild(btn);
    });
  }

  function finishQuiz(){
    let topType = 'early';
    let topScore = -1;
    Object.keys(scores).forEach(k=>{
      if(scores[k] > topScore){ topScore = scores[k]; topType = k; }
    });
    // final flip: the real result lands on top and stays
    setCardFace(topCard(), topType);
    quizQuestion.textContent = "That's you.";
    quizOptions.innerHTML = '';
    quizResultNote.style.display = 'block';
    animateProgressChart(topType);
  }

  function startQuiz(){
    qIndex = 0;
    Object.keys(scores).forEach(k=> delete scores[k]);
    quizResultNote.style.display = 'none';
    renderQuestion();
  }
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
