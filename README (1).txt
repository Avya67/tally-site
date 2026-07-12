TALLY — SETUP NOTES
====================

WHAT THIS IS
------------
A 3-page static website: index.html (landing), how-it-works.html (pipeline
walkthrough), chat.html (the working chat). style.css and script.js are
shared across all three pages. No build step, no framework — just open
index.html in a browser, or host the whole folder.

HOSTING ON GITHUB PAGES (free)
-------------------------------
1. Create a GitHub repo, upload this whole folder's contents to it.
2. Repo Settings → Pages → set source to "main" branch, root folder.
3. GitHub gives you a live URL in a minute or two (something like
   https://yourteam.github.io/tally/).
4. Every page's nav links (index.html / how-it-works.html / chat.html)
   are relative, so they'll work correctly once hosted like this —
   they won't jump between pages inside Claude's in-chat preview, only
   once the files are actually served together (GitHub Pages, or any
   local server / double-clicking the files locally).

WHAT EACH PERSON NEEDS TO DO
------------------------------
Chua Jiaqi (AI Core):
  - DONE — production webhook URL is already wired into script.js.
  - If you ever need to change it, it's the N8N_WEBHOOK_URL constant
    at the top of script.js. Just make sure your workflow's last node
    stays a "Respond to Webhook" node returning {"reply": "..."}.

Cheang Chee Xuan (Ingestion):
  - No website changes needed — your workflow feeds Google Calendar
    directly, upstream of Chua Jiaqi's part, and connects into his
    webhook rather than the site directly.
  - Optional: add a screenshot of your n8n canvas into the marked
    slot in how-it-works.html if you want it visible for the demo.

Avya (this site):
  - Owns index.html, chat.html, style.css, and the chat logic in
    script.js. Copy/styling is editable — comments mark the sticky
    notes and chat bubble sections.

Carissa (Slides & Marketing Video):
  - No website changes needed — her part of the project (deck +
    marketing video) is separate from this repo. See how-it-works.html
    for where she's credited.
  - The front-end still has its own built-in fallback for when the
    webhook fails or times out — see fallbackReply() in script.js —
    this is now just Avya's safety net, not a QA deliverable.

A NOTE ON THE "OFFLINE DEMO MODE" REPLIES
-------------------------------------------
The webhook is now connected, so chat.html should show real AI replies
from Chua Jiaqi's n8n workflow (the Advanced AI Agent node) instead of
canned ones. If you ever see "offline demo mode" in the chat status
badge, it means N8N_WEBHOOK_URL in script.js is empty or the webhook
call is failing — check the browser console (F12) for the error, or
confirm the n8n workflow is still set to "Active".
