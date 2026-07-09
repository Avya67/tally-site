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
const N8N_WEBHOOK_URL = "https://n8ngc.codeblazar.org/webhook/887baf2a-a560-43b7-b6bf-7fb9902cbe35"; // e.g. "https://your-n8n-instance.app.n8n.cloud/webhook/tally-chat"

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
   HERO — draggable sticky notes
   (only runs if a .note-field exists on the page, i.e. index.html)
   ========================= */
(function dragNotes(){
  const field = document.querySelector('.note-field');
  if(!field) return;

  const notes = field.querySelectorAll('.note');
  notes.forEach(note=>{
    let dragging = false;
    let offsetX = 0, offsetY = 0;

    const start = (clientX, clientY)=>{
      dragging = true;
      note.classList.add('dragging');
      const rect = note.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
    };
    const move = (clientX, clientY)=>{
      if(!dragging) return;
      const fieldRect = field.getBoundingClientRect();
      let x = clientX - fieldRect.left - offsetX;
      let y = clientY - fieldRect.top - offsetY;
      x = Math.max(-20, Math.min(x, fieldRect.width - 100));
      y = Math.max(-20, Math.min(y, fieldRect.height - 60));
      note.style.left = x + 'px';
      note.style.top = y + 'px';
      note.style.right = 'auto';
      note.style.bottom = 'auto';
    };
    const end = ()=>{
      dragging = false;
      note.classList.remove('dragging');
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
      return "I can't reach the live calendar right now (offline demo mode), but once Chua Jiaqi's webhook is connected, I'll pull your real deadlines from Google Calendar here.";
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
    if(!res.ok) throw new Error('Webhook returned ' + res.status);
    const data = await res.json();
    return data.reply || "Hmm, I didn't get a proper reply back — check the webhook's response format.";
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
    addSystem('Tally is in offline demo mode — Chua Jiaqi\'s n8n webhook isn\'t connected yet.');
  }
})();
