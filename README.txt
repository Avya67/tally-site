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
  - In your n8n workflow, replace the "Telegram Send Message" node at
    the end with a "Respond to Webhook" node.
  - It should return JSON shaped like: {"reply": "text to show user"}
  - Copy the webhook's production URL into script.js, top of file:
        const N8N_WEBHOOK_URL = "your-url-here";
  - Until you do this, the chat page runs in "offline demo mode" —
    it still works and replies, just with canned responses, so the
    site is demo-able even before the webhook is wired up.

Cheang Chee Xuan (Ingestion):
  - No website changes needed — your workflow feeds Google Calendar
    directly, upstream of Chua Jiaqi's part.
  - Optional: add a screenshot of your n8n canvas into the marked
    slot in how-it-works.html if you want it visible for the demo.

Avya (this site):
  - Owns index.html, chat.html, style.css, and the chat logic in
    script.js. Copy/styling is editable — comments mark the sticky
    notes and chat bubble sections.

Carissa (QA / error handling):
  - The front-end already has a matching fallback for when the
    webhook fails or times out — see the fallbackReply() function
    in script.js. Edit that text to match your actual QA messaging
    so the two sides are consistent.

A NOTE ON THE "OFFLINE DEMO MODE" REPLIES
-------------------------------------------
Right now, if N8N_WEBHOOK_URL is empty (or the call fails), chat.html
shows simple canned replies from fallbackReply() in script.js — not a
real AI. This keeps the site demoable at any point in development.
Once Chua Jiaqi's webhook is live, real AI replies come from HIS
n8n workflow (the Advanced AI Agent node), not from this website —
the website is just the front door.
