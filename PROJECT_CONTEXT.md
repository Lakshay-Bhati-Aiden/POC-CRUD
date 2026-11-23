# PROJECT CONTEXT – FastAPI + PostgreSQL Multi-Page Form (Learning POC)

> This file summarises my learning journey so far: my goal, decisions, setup steps,
> problems I hit and how they were solved, concepts explained, current code, and next steps.
> Claude: use this as background. Follow the "How to teach me" rules below.

---

## 1. Who I am and what I want

- I'm a **beginner**. I've never built a web app and never used Claude Desktop before.
- I'm building a **simple application with a form spread over at least 2 pages**.
- Stack: **FastAPI** (backend), **PostgreSQL** (database), **plain HTML + vanilla JavaScript** (frontend).
- **My main goal is understanding, not just a working app.** I want to understand:
  - how the frontend connects to the backend
  - how the communication happens (HTTP requests and responses, JSON)
  - how the logic works (routing, validation, business rules, database storage)
  - where everything sits and why code is split into layers
- I want to **understand every single line** of my code.

---

## 2. How to teach me (tutor rules)

- Act as a patient **tutor, not a code generator**.
- **Don't write or edit files unless I explicitly ask.** Show code in chat so I can type it myself.
- Work in **small steps**: one concept at a time, under ~30 lines of code per step.
- After every code block, **explain it line by line**: what it does, **why** it exists, and what breaks if it's removed.
- **Before running any terminal command, explain what it does.** I run setup commands myself in the VS Code terminal.
- After each step, **ask me 1–2 questions** to check my understanding. Don't give answers until I respond.
- When I hit an error, **help me understand the error first**, then guide me to the fix.
- Whenever we add a feature, explain the **full request journey**: browser → API → DB → back.
- Tell me **what to look for** in the browser DevTools Network tab, the Uvicorn logs, SQL logs, and the database.
- Don't change security settings on my machine (e.g., PowerShell execution policy).

---

## 3. Tooling decisions I made (and why)

### Claude Desktop modes
- I switched from **Chat/Cowork** to **Code** mode. That's fine, but Code mode can write the whole app for me,
  which defeats my learning goal. So:
  - Point it only at my project folder (`fastapi-form-app`).
  - Keep permission prompts ON; read every change or command before approving it.
  - Use it mainly to **review my code, explain errors, and check my setup**, not to write everything.
  - Use plan-style discussion ("explain your plan first") before any file changes.
- Good split: **Chat** for concepts ("what is a DB session?"), **Code** for hands-on help with my actual files.

### CLAUDE.md
- A plain text file named exactly `CLAUDE.md`, in the **root** of the project folder.
- Claude Code reads it automatically at the start of every session (it acts as persistent instructions).
- I created it in VS Code. Changes apply from the next session.
- `/init` generates a codebase summary instead; for tutor rules, I write my own content.
- To test it: start a new session and ask "What instructions are you following for this project?"

### Connectors
- Connectors (mostly built on MCP – Model Context Protocol) let Claude reach outside the chat into other
  apps or data (Drive, GitHub, Slack, databases, files).
- I saw one labelled "Claude data". To find out what it does: click it, read the description and permissions
  (read-only vs. write), and check whether it's enabled.
- **For this project I don't need any connectors.** Claude Code already works on my project folder.
- Never connect anything tied to work systems, email, or data.
- Later (optional): a PostgreSQL connector to my *local practice* DB, but only after I've learned to run SQL myself.

### Which terminal to use
- **VS Code terminal** for setup and running things, typed by me, so I learn the commands.
- **Claude Code** for questions, reviews, and explaining errors.
- Suggested layout:
  | Window | Purpose |
  |---|---|
  | VS Code terminal 1 | Run the server (`uvicorn`) and watch its logs |
  | VS Code terminal 2 | Other commands: `pip`, `psql`, `git` |
  | Claude Code | "Explain this error", "review my file", "what does this command do?" |
- The venv must be activated **in each new terminal**.

---

## 4. Architecture: how everything fits together

### Why plain HTML + JS instead of Jinja2 templates
With Jinja2, the server builds the HTML, so the frontend↔backend connection is hidden.
With a separate HTML/JS frontend calling a **JSON API**, every message is explicit and visible
in DevTools. That's better for my goal.

### Big picture

```text
┌──────────────────────┐   HTTP request (JSON)    ┌──────────────────────┐   SQL    ┌────────────┐
│   FRONTEND           │ ───────────────────────► │   BACKEND (FastAPI)  │ ───────► │ PostgreSQL │
│   (runs in browser)  │                          │   (runs on server)   │          │ (stores    │
│   HTML = structure   │ ◄─────────────────────── │   routes → logic →   │ ◄─────── │  data)     │
│   CSS  = looks       │   HTTP response (JSON)   │   database           │   rows   │            │
│   JS   = behaviour   │                          │                      │          │            │
└──────────────────────┘                          └──────────────────────┘          └────────────┘
```

### Layers and their jobs

| Layer | File(s) | Job | Question it answers |
|---|---|---|---|
| Pages | `frontend/page1.html`, `page2.html`, `review.html` | Show the form | What does the user see? |
| Frontend logic | `frontend/app.js` | Collect input, send requests, handle responses | What happens when I click "Next"? |
| Routes (API) | `backend/main.py` (later `routers/`) | Match URL + method to a function | Which code runs for `POST /api/applications`? |
| Schemas | `backend/schemas.py` (Pydantic) | Define and validate data in/out | Is this request valid? |
| Business logic | `backend/services.py` | Rules (e.g., can't submit until page 2 is done) | What should happen? |
| Data access | `backend/models.py`, `database.py` (SQLAlchemy) | Turn Python objects into SQL | How is it stored? |
| Database | PostgreSQL | Keep data permanently | Where does it live? |

### The app I'm building: 3-step registration form

| Page | Content | What I learn |
|---|---|---|
| Page 1 | Name, email, phone | HTML forms, POST requests, validation |
| Page 2 | Preferences (dropdowns, checkboxes) | Carrying data between pages |
| Review | Review and submit | Reading from the DB, confirming, saving |
| Admin (optional) | List all submissions | Queries, displaying data |

### One request, end to end (clicking "Next" on page 1)
1. JavaScript reads the form fields (`name`, `email`).
2. `fetch()` sends `POST /api/applications` with JSON body `{"name": "Asha", "email": "a@x.com"}`.
3. The request reaches `http://localhost:8000`, where Uvicorn (the web server) listens.
4. FastAPI matches method + path to my Python function.
5. Pydantic validates the body. If it's invalid → **422**, and my function never runs.
6. My function creates a SQLAlchemy object and commits it.
7. SQLAlchemy generates `INSERT INTO applications ... RETURNING id`.
8. PostgreSQL saves the row and returns `id = 42`.
9. FastAPI responds `201 Created` with `{"id": 42, "status": "draft"}`.
10. JavaScript reads `42` and navigates to `page2.html?id=42`.
11. Page 2 sends `PATCH /api/applications/42` with preferences.
12. The review page sends `GET /api/applications/42`, then `POST /api/applications/42/submit`.

**Key idea: HTTP is stateless.** The server doesn't remember anything between requests.
The `id` passed between pages is what connects them.

### The contract between frontend and backend
The **method, path, and field names must match on both sides.**

Frontend example (`app.js`):
```javascript
const response = await fetch("http://localhost:8000/api/applications", {
  method: "POST",                                   // what action
  headers: { "Content-Type": "application/json" },  // "I'm sending JSON"
  body: JSON.stringify({ name, email })             // the actual data
});
const data = await response.json();                 // read the server's reply
window.location.href = `page2.html?id=${data.id}`;  // carry the id to page 2
```

Backend example (`main.py`, comes later):
```python
@app.post("/api/applications", status_code=201)       # same method + path as the fetch
def create_application(payload: ApplicationCreate,    # Pydantic validates the JSON body
                       db: Session = Depends(get_db)): # FastAPI hands you a DB session
    app_row = Application(name=payload.name, email=payload.email)
    db.add(app_row)
    db.commit()                                       # SQL INSERT happens here
    db.refresh(app_row)                               # get the new id from Postgres
    return {"id": app_row.id, "status": "draft"}      # becomes the JSON response
```

### Where to watch the communication

| Where | What I'll see |
|---|---|
| Browser DevTools → Network tab (F12) | Every request: method, URL, headers, body sent, status code, response |
| Uvicorn terminal | Each incoming request + status, plus my `print()` statements |
| SQLAlchemy `echo=True` in `create_engine` | The exact SQL generated from my Python |
| pgAdmin / `psql` | The rows actually stored |
| `http://localhost:8000/docs` | Auto-generated page to call the API without a frontend |

Exercise: add `print("1. route reached")`, `print("2. validated")`, `print("3. saved")`, then follow
the trail through browser → terminal → database.

---

## 5. Setup completed so far

### Part A – PostgreSQL check ✅
- Installed PostgreSQL.
- Opened **SQL Shell (psql)** (Windows), accepted the defaults, entered the install password.
- Prompt `postgres=#` = connected and ready.
- Ran `SELECT version();` → works (after fixing an error, see section 6).

### Part B – App database and user ✅
```sql
CREATE USER formapp_user WITH PASSWORD '<my password>';
CREATE DATABASE formapp OWNER formapp_user;
\l    -- lists databases; formapp should appear
\q    -- quit psql
```
- Line 1: a login account the FastAPI app will use (not the `postgres` admin account).
- Line 2: an empty database owned by that user, so the app can create tables.
- SQL commands need `;`. psql shortcuts starting with `\` don't.
- Optional test: log in as `formapp_user` to database `formapp`; prompt `formapp=>` (`>` = not admin, correct).

### Part C – Python and virtual environment (in progress)
- Created the venv: `python -m venv venv`
- Activation (Windows):
  | Terminal | Command |
  |---|---|
  | PowerShell | `.\venv\Scripts\Activate.ps1` |
  | Command Prompt | `venv\Scripts\activate.bat` |
  | Mac | `source venv/bin/activate` |
- `(venv)` at the start of the terminal line = active.
- My working activation method: **[update: PowerShell or Command Prompt]**
- Installed so far: **fastapi, sqlalchemy**
- Still to confirm/install: **uvicorn[standard], psycopg[binary], python-dotenv**
  
```cmd
  pip install "uvicorn[standard]" "psycopg[binary]" python-dotenv
  pip list
  pip freeze > requirements.txt
  
```
- Point VS Code at the venv: Ctrl+Shift+P → "Python: Select Interpreter" → choose the one in `venv`.

| Package | Purpose |
|---|---|
| `fastapi` | Framework where I write API routes |
| `uvicorn` | Web server that listens on port 8000 and runs FastAPI |
| `sqlalchemy` | Work with the database in Python instead of raw SQL (ORM) |
| `psycopg` | Low-level driver that actually talks to PostgreSQL |
| `python-dotenv` | Reads secrets (DB password) from a `.env` file |

### Part D – Project layout and config
```text
fastapi-form-app/
├── CLAUDE.md
├── PROJECT_CONTEXT.md
├── requirements.txt
├── .env               ← DB connection string (never share)
├── .gitignore
├── venv/              ← only Python + packages, never my code
├── backend/           ← FastAPI / Python code
└── frontend/          ← HTML / JavaScript
```

`.env` (one line, no spaces around `=`, no quotes):
```text
DATABASE_URL=postgresql+psycopg://formapp_user:<my password>@localhost:5432/formapp
```

| Part | Meaning |
|---|---|
| `postgresql+psycopg` | Database type + driver |
| `formapp_user:<password>` | Who logs in |
| `localhost` | Database is on my computer |
| `5432` | PostgreSQL's default port |
| `formapp` | Which database |

`.gitignore`:
```text
venv/
.env
__pycache__/
```

---

## 6. Problems I hit and how they were resolved

### Problem 1: `SELECT version();` → "syntax error at or near version"
- The error came from PostgreSQL, so I *was* connected; only the command text was wrong.
- Likely causes:
  1. **Leftover text in the psql buffer.** psql collects input until `;`. Earlier text without `;` got joined
     to my command. A prompt of `postgres-#` (dash) or `postgres(#` means it's still waiting.
     **Fix:** Ctrl+C or `\r`, wait for `postgres=#`, retry.
  2. **Copy-paste hidden characters** or smart punctuation. **Fix:** type it by hand.
  3. Typing SQL into a normal terminal instead of psql.
- Quick test: `SELECT 1;`
- **Resolved ✅**: it worked.

### Problem 2: `venv\Scripts\activate` in PowerShell → "The module 'venv' could not be loaded"
- Cause: I ran the **Command Prompt** command in **PowerShell**. PowerShell needs `.\` to run a script
  from the current folder; without it, it treated `venv` as a module name.
- Fix: `.\venv\Scripts\Activate.ps1`
- Tell terminals apart: `PS C:\...>` = PowerShell; `C:\...>` = Command Prompt.

### Problem 3: Activation still failing (likely "running scripts is disabled")
- A PowerShell security policy, common on managed laptops. **Don't change it** (no `Set-ExecutionPolicy`).
- Fix 1 (easiest): switch the VS Code terminal to **Command Prompt** (⌄ next to + → Command Prompt), then
  `venv\Scripts\activate.bat`. Optionally set the default: Ctrl+Shift+P → "Terminal: Select Default Profile".
- Fix 2: skip activation and call the venv's Python directly:
  
```powershell
  .\venv\Scripts\python.exe -m pip install ...
  .\venv\Scripts\python.exe -m uvicorn backend.main:app --reload
  
```
- If "cannot find path": run `dir venv\Scripts`. If `activate.bat`, `Activate.ps1`, and `python.exe` are
  missing, I'm in the wrong folder or need to re-run `python -m venv venv` from the project root.

### Problem 4: Where do packages go if the venv isn't active?
- Without `(venv)`, `pip install` goes into the **global system Python**, not the project. The app may later
  fail with `ModuleNotFoundError` even though the install "worked".
- My own project files are *supposed* to be outside `venv/`. Only Python and packages live inside it.
- Check:
  - `pip show fastapi` → `Location:` should contain `fastapi-form-app\venv\Lib\site-packages`
  - `where python` → first line should be `...\fastapi-form-app\venv\Scripts\python.exe`
- If a package went global: activate the venv and run `pip install` again.

### Problem 5: How to move the chat into Claude Desktop
- There's no direct transfer between tools. Instead, keep progress in `CLAUDE.md` and this context file,
  written in my own words, and update it after every phase.

---

## 7. Concepts explained so far

### Virtual environment (venv)
- A **private copy of Python for one project**, with its own package folder.
- It solves: version clashes between projects, clutter, "works on my machine" problems, and permission
  issues (no admin rights needed).
- It's just a folder:
  
```text
  venv/
  ├── Scripts/            (bin/ on Mac)
  │   ├── python.exe      ← Python just for this project
  │   ├── pip.exe         ← installs into THIS venv only
  │   └── activate.bat    ← shortcut script
  └── Lib/site-packages/  ← where fastapi, sqlalchemy, etc. live
  
```
- **Activating** just puts `venv\Scripts` first on the PATH, so `python` and `pip` point to the venv copies.
- `venv/` = the installed packages (big, disposable, in `.gitignore`).
  `requirements.txt` = the shareable **list** of packages.
- Rebuild anywhere: `python -m venv venv` → activate → `pip install -r requirements.txt`
- Analogy: each project gets its own labelled pantry box; `requirements.txt` is the shopping list.

### PostgreSQL user vs. database vs. table
- **User** = a login account. **Database** = a container for tables. **Table** = rows of data.
- The app gets its own limited user instead of the `postgres` admin account (least privilege).

### Ports and localhost
- `localhost` / `127.0.0.1` = my own computer.
- A **port** is a "door" a program listens on: PostgreSQL uses **5432**, my FastAPI server uses **8000**.

### PostgreSQL vs. SQLAlchemy vs. psycopg
- PostgreSQL = the database server that stores data.
- psycopg = the driver that speaks PostgreSQL's network protocol.
- SQLAlchemy = the Python layer (ORM) that turns Python objects into SQL and uses psycopg underneath.

---

## 8. Phase 1 – First FastAPI app (current step)

### Code: `backend/main.py` (type it myself)
```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/hello")
def say_hello():
    return {"message": "Hello from FastAPI!"}
```

| Line | What it does | Why it's needed |
|---|---|---|
| `from fastapi import FastAPI` | Imports the FastAPI class | Python only knows what you import |
| `app = FastAPI()` | Creates the application object | Uvicorn runs this; every route attaches to it |
| `@app.get("/api/hello")` | Decorator registering the function for **GET /api/hello** | This is **routing**: method + URL → my code |
| `def say_hello():` | The route handler function | Holds the endpoint's logic |
| `return {...}` | Returns a Python dict | FastAPI converts it to **JSON** for the HTTP response |

**Key idea:** the browser never runs my Python. It sends a request; FastAPI runs the matching
function and sends the result back as JSON.

### Run the server (from the project root, venv active)
```cmd
uvicorn backend.main:app --reload
```
| Part | Meaning |
|---|---|
| `uvicorn` | Start the web server |
| `backend.main` | The file `backend/main.py` as an import path |
| `:app` | The variable inside that file |
| `--reload` | Auto-restart on save (development only) |

- Expected: `Uvicorn running on http://127.0.0.1:8000`. The terminal stays busy; Ctrl+C stops it.
- If "uvicorn is not recognized": the venv isn't active or uvicorn isn't installed. Try `python -m uvicorn ...`.

### Test it
- Browser: `http://127.0.0.1:8000/api/hello` → `{"message":"Hello from FastAPI!"}`
- Terminal log: `INFO: 127.0.0.1 - "GET /api/hello HTTP/1.1" 200 OK` (method, path, status code)
- DevTools: F12 → Network → refresh → click `hello` → Headers and Response
- Docs: `http://127.0.0.1:8000/docs` → Try it out → Execute

### Experiments (predict first, then check)
1. Change the message text and save. What does the terminal show? Does the browser update on refresh?
2. Visit `/api/goodbye`. What status code appears?
3. Change `@app.get` to `@app.post` and refresh. What status, and why? (The address bar always sends GET.)
4. Return `{"name": "Asha", "step": 1}`. How does the JSON change?

### Questions I need to answer
1. What is Uvicorn's job, and what is FastAPI's job?
2. What connects the URL `/api/hello` to the function `say_hello`?
3. I returned a Python dict, but the browser got JSON. Who converted it?

**Phase 1 status:** [update: not started]

---

## 9. Remaining plan

| Phase | Build | What I'll understand |
|---|---|---|
| 1 | `GET /api/hello` returning JSON; test in `/docs` | Endpoints, request/response |
| 2 | Plain `frontend/page1.html` calling `/api/hello` with `fetch()` | First frontend→backend call; **CORS** error and why browsers block it |
| 3 | POST page 1 data; backend prints it (no DB yet) | Request bodies, JSON, Pydantic, 422 errors |
| 4 | Connect PostgreSQL, save page 1, return `id` | ORM → SQL → table; where data lives |
| 5 | Page 2 uses `id` to PATCH the same record | Stateless HTTP; how pages stay connected |
| 6 | Review page: GET the record, then submit | Reading data back; status change (draft → submitted) as business logic |
| 7 | Error handling on both sides | Status codes 400/404/422/500 and frontend reactions |
| 8 | Refactor into routers/schemas/services/models (+ Alembic, tests) | Why code is layered |

Rule: don't move on until I can explain the current phase in my own words.

---

## 10. Learning techniques I want Claude to use with me

- **Line-by-line:** "For each line: what it does, why it's needed, what breaks if removed."
- **Predict, then run:** I guess the result first; then we explain any difference.
- **Break it on purpose:** "Give me 3 ways to break this and explain each error."
- **Teach it back:** I explain a concept; Claude corrects me.
- **Quiz me:** questions first, answers only after I respond.
- **Concept before code:** explain the idea and options before showing code.
- **Point me to the docs:** which section of the FastAPI/SQLAlchemy docs covers this.
- **Code review, not rewrite:** "Review like a senior dev; point out issues; let me fix them."
- **Trace requests:** "Trace what happens when I click Next, file by file, browser → DB → back."
- **Diagrams:** "Draw an ASCII diagram of how my files connect."

## 11. Habits I'm keeping
- Type code instead of pasting it; add comments in my own words.
- Keep a `NOTES.md` learning log: concepts, errors, fixes.
- Commit with Git after every working step.
- Keep secrets in `.env`, never in code.
- Don't trust AI blindly: when something fails, share the full error and package versions.
- Ask "why" before "how".

---

## 12. How to start my next session

> "Read CLAUDE.md and PROJECT_CONTEXT.md. Tell me where I am in my plan and what my next step is.
> Teach me; don't do it for me. Start by checking that uvicorn, psycopg, and python-dotenv are installed
> in my venv, then continue Phase 1."