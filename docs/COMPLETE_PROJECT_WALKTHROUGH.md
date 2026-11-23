# Complete Project Walkthrough — FastAPI + PostgreSQL Multi-Page Form

> A guided tour of **your** application: what it is built from, how it was built, what every file does, and the questions you asked along the way.
>
> Parts 4, 5 and 7 of your request live in the companion documents:
> - [`ARCHITECTURE_AND_CRUD_FLOWS.md`](ARCHITECTURE_AND_CRUD_FLOWS.md) — diagrams and step-by-step Create / Read / Update / Delete traces
> - [`COMMANDS_REFERENCE.md`](COMMANDS_REFERENCE.md) — every command to install, run, test and troubleshoot

---

## 0. How to read this document

### Trust labels

Every important statement is based on one of three sources. Where it matters, it is labelled:

| Label | Meaning |
|---|---|
| ✅ **Verified** | Read directly in the project's source code (snapshot taken for this document) |
| 🔎 **Inferred** | Logically follows from the code or from our conversation, but not visible in the code itself (e.g. the exact SQL PostgreSQL ran) |
| ❓ **Unknown** | Cannot be determined from the files available (e.g. your PostgreSQL version) |

### What was inspected

Project root: `C:\Users\LakshayBhati\OneDrive - AIDEN AI PRIVATE LIMITED\Desktop\AI-E\POCs`

```text
POCs/
├── .env                 ← exists, NOT opened (contains your DB password)
├── .gitignore
├── CLAUDE.md            ← tutor instructions for Claude
├── PROJECT_CONTEXT.md   ← your learning-journey notes
├── requirements.txt
├── backend/
│   ├── database.py
│   ├── models.py
│   ├── main.py
│   └── __pycache__/     ← Python's auto-generated cache (ignored)
├── frontend/
│   ├── page1.html   + app.js
│   ├── page2.html   + page2.js
│   ├── review.html  + review.js
│   ├── dashboard.html + dashboard.js
│   └── style.css
└── venv/                ← virtual environment (not inspected file-by-file)
```

✅ **Verified absences** (things that do *not* exist in the project):

- No `schemas.py`, `services.py` or `routers/` folder — everything backend-related is in `main.py` (Phase 8 refactor was intentionally postponed).
- No automated tests (no `tests/` folder, no `test_*.py` files).
- No Alembic / migration files.
- No `.git` folder — the project is **not yet a Git repository** (Git was not installed on the machine at the time of our last conversation).
- No `/api/applications/summary` route — it was discussed but not added; the dashboard shows the total from the list endpoint instead.

---

## PART 1 — Prerequisites and Technology Overview

### 1.1 The big picture in one diagram

```text
┌──────────────────────────┐   HTTP + JSON    ┌──────────────────────────┐   SQL    ┌──────────────┐
│  BROWSER                 │ ───────────────► │  FastAPI app (main.py)   │ ───────► │  PostgreSQL  │
│  page1/page2/review/     │                  │  run by Uvicorn :8000    │          │  database    │
│  dashboard .html + .js   │ ◄─────────────── │  SQLAlchemy + psycopg    │ ◄─────── │  "aiden"     │
│  served by http.server   │   HTTP + JSON    │                          │   rows   │  :5432       │
│  on :5500                │                  │                          │          │              │
└──────────────────────────┘                  └──────────────────────────┘          └──────────────┘
```

Three programs run at the same time on your computer:

| Program | Port | Started by | Job |
|---|---|---|---|
| Python `http.server` | 5500 | `python -m http.server 5500 --directory frontend` | Hands out the HTML/CSS/JS files — nothing else |
| Uvicorn running FastAPI | 8000 | `uvicorn backend.main:app --reload --reload-dir backend` | Your JSON API |
| PostgreSQL | 5432 | Windows service (installed with PostgreSQL) | Stores the data permanently |

### 1.2 Technologies, one by one

For each: **what it is → why we need it → what it does here → how it talks to the others.**

#### Python ✅ (3.13 — 🔎 inferred from `C:\...\Python313\` in an error traceback and from `*.cpython-313.pyc` files in `backend/__pycache__/`)

- **What:** A general-purpose programming language.
- **Why:** FastAPI, SQLAlchemy and Pydantic are Python libraries.
- **Here:** Every backend file (`database.py`, `models.py`, `main.py`) is Python. Python is also used to run the tiny frontend file server (`python -m http.server`).
- **Talks to:** Runs inside Uvicorn; reaches PostgreSQL through SQLAlchemy → psycopg.

#### Virtual environment (`venv/`) ✅

- **What:** A private copy of Python for this one project, with its own package folder (`venv\Lib\site-packages`).
- **Why:** Keeps this project's package versions separate from other projects and from the global Python; no admin rights needed.
- **Here:** Created with `python -m venv venv`. All packages in `requirements.txt` are installed inside it. You activate it in Command Prompt with `venv\Scripts\activate.bat` (prompt shows `(venv)`).
- **Talks to:** Activation simply puts `venv\Scripts` first on the PATH, so `python`, `pip` and `uvicorn` point to the venv copies.

#### pip and `requirements.txt` ✅

- **What:** pip is Python's package installer. `requirements.txt` is the list of exact package versions.
- **Why:** To reinstall the identical environment anywhere (`python -m pip install -r requirements.txt`).
- **Here:** Generated with `python -m pip freeze > requirements.txt`.

#### FastAPI ✅ (`fastapi==0.164.0`)

- **What:** A Python web framework for building JSON APIs.
- **Why we chose it:** You write a normal Python function, put a decorator on it (`@app.get(...)`), and FastAPI handles routing, request parsing, validation (via Pydantic), JSON conversion and auto-generated docs at `/docs`.
- **Here:** `backend/main.py` creates `app = FastAPI()` (line 10) and defines 7 endpoints.
- **Talks to:** Receives requests from Uvicorn; calls your functions; uses Pydantic to validate; uses SQLAlchemy sessions (via `get_db`) to reach the database.

#### Starlette ✅ (`starlette==1.10.0`) — 🔎 installed as a FastAPI dependency

- FastAPI is built on top of Starlette. The CORS middleware you import (`fastapi.middleware.cors.CORSMiddleware`) actually comes from Starlette. You never import Starlette directly.

#### Uvicorn ✅ (`uvicorn==0.54.0`, installed as `uvicorn[standard]`)

- **What:** An **ASGI web server** — the program that listens on a port, speaks raw HTTP, and hands each request to FastAPI.
- **Why:** FastAPI is only a framework; it cannot listen on a network port by itself.
- **Here:** `uvicorn backend.main:app --reload --reload-dir backend` imports the `app` object from `backend/main.py` and serves it on `http://127.0.0.1:8000`.
- **The `[standard]` extras** ✅ (visible in `requirements.txt`): `httptools` (fast HTTP parsing), `watchfiles` (powers `--reload`), `websockets` (WebSocket support — not used by your app, but Uvicorn loads it on start-up; this caused the `No module named 'websockets.server'` error you fixed), `PyYAML`, `python-dotenv`.
- **Analogy used in our sessions:** Uvicorn is the delivery person, FastAPI is the kitchen.

#### Pydantic ✅ (`pydantic==2.14.3`) + `email-validator` ✅ (`2.4.0`)

- **What:** A data-validation library. You describe the expected shape of data as a class; Pydantic checks incoming data against it.
- **Why:** Never trust data coming from a browser.
- **Here:** `ApplicationCreate` and `ApplicationPreferences` in `main.py` (lines 20–27). `EmailStr` requires the extra `email-validator` package.
- **Talks to:** FastAPI calls Pydantic automatically for any endpoint parameter typed as a `BaseModel`. Invalid data → **422** response, and your function never runs.

#### PostgreSQL ❓ (version unknown — not recorded in the project)

- **What:** A relational database server: stores data in tables of rows and columns, queried with SQL.
- **Why:** Data must survive server restarts.
- **Here:** Database **`aiden`** (✅ confirmed by you). Login user `formapp_user` (🔎 from `PROJECT_CONTEXT.md`, Part B — ❓ if you also used a different user name, replace `formapp_user` everywhere in these docs). One table: `applications`.
- **Talks to:** Listens on port **5432**. Only psycopg (on behalf of SQLAlchemy) talks to it from your app. You talk to it directly with **SQL Shell (psql)**.

#### psycopg ✅ (`psycopg==3.3.9`, `psycopg-binary==3.3.9`)

- **What:** The **database driver** — low-level code that speaks PostgreSQL's network protocol.
- **Why:** SQLAlchemy generates SQL but needs a driver to actually send it.
- **Here:** Selected by the `postgresql+psycopg://` prefix in `DATABASE_URL` (🔎 the value lives in `.env`, which was not opened; the format is documented in `PROJECT_CONTEXT.md` and our conversation). `psycopg-binary` is the pre-compiled version installed by `"psycopg[binary]"`.

#### SQLAlchemy ✅ (`SQLAlchemy==2.1.9`) — the ORM

- **What:** An **ORM** (Object-Relational Mapper): lets you work with Python classes and objects instead of writing SQL by hand.
- **Why:** `db.add(row); db.commit()` instead of hand-writing `INSERT INTO ...`; it also manages connections.
- **Here:**
  - `database.py` → `engine`, `Base`, `SessionLocal`, `get_db`
  - `models.py` → class `Application` = table `applications`
  - `main.py` → `db.get`, `db.add`, `db.commit`, `db.refresh`, `db.delete`, `select(...)`, `func.count()`
- **Talks to:** Uses psycopg to send SQL to PostgreSQL. With `echo=True` (database.py line 11) it **prints every SQL statement** in the Uvicorn terminal.

#### python-dotenv ✅ (`python-dotenv==1.2.4`)

- **What:** Reads a `.env` file and loads its lines as environment variables.
- **Why:** Keeps your database password **out of source code** (and out of Git — `.env` is in `.gitignore`).
- **Here:** `load_dotenv()` in `database.py` line 8, then `os.getenv("DATABASE_URL")` on line 10.

#### HTML ✅

- **What:** The **structure** of a web page (headings, forms, buttons, tables).
- **Here:** 4 pages — `page1.html` (contact form), `page2.html` (preferences), `review.html` (review + submit), `dashboard.html` (admin list).
- **Talks to:** Each page loads one JS file with `<script src="...">` at the end of `<body>` and the shared `style.css` with `<link rel="stylesheet">`.

#### CSS ✅

- **What:** The **looks** — colours, spacing, layout.
- **Here:** One shared `frontend/style.css` (89 lines) used by all four pages: white "card" layout, styled inputs and buttons, flexbox rows, table styles, status badges.

#### JavaScript (vanilla, no frameworks) ✅

- **What:** The **behaviour** of the page, running inside the browser.
- **Here:** 4 files — `app.js`, `page2.js`, `review.js`, `dashboard.js`. They read inputs, call the API with `fetch()`, and update the page.
- **Talks to:** Sends HTTP requests to `http://127.0.0.1:8000/api/...` and reads JSON responses.

#### HTTP (requests and responses)

- **What:** The language browsers and servers use. A **request** has a *method* (GET, POST, PATCH, DELETE), a *path* (`/api/applications/7`), *headers* and optionally a *body*. A **response** has a *status code* (200, 201, 204, 400, 404, 409, 422, 500), headers and optionally a body.
- **Key property — stateless:** the server remembers nothing between requests. Your pages stay connected only because the **application `id` is carried in the URL** (`page2.html?id=7`).

#### REST API concepts (as applied here)

| Idea | In your app |
|---|---|
| A URL names a **resource** | `/api/applications` = the collection; `/api/applications/7` = one application |
| The **method** says what to do | GET = read, POST = create, PATCH = partial update, DELETE = remove |
| Status codes describe the outcome | 201 Created, 204 No Content, 404 Not Found, 409 Conflict, 422 Validation error |
| **Action endpoint** for business operations | `POST /api/applications/{id}/submit` — "submit" is an action with rules, not a field the client may set |

Together GET/POST/PATCH/DELETE give you **CRUD** — Create, Read, Update, Delete.

#### JSON

- **What:** A text format for data: `{"name": "Asha", "newsletter": true}`.
- **Here — two conversions in each direction:**
  - Browser → server: `JSON.stringify(payload)` (JS object → JSON text) → FastAPI + Pydantic parse it into a Python object.
  - Server → browser: your function returns a Python `dict` → **FastAPI** converts it to JSON text and adds `content-type: application/json` → `response.json()` turns it back into a JS object.

#### CORS (Cross-Origin Resource Sharing) ✅

- **What:** A browser security rule. An **origin** = protocol + host + port. The pages come from `http://127.0.0.1:5500`, the API is at `http://127.0.0.1:8000` → **different origins**, so the browser hides API responses from your JavaScript unless the API explicitly allows that origin.
- **Here:** `app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5500"], ...)` in `main.py` lines 12–17.
- **Note:** `http://localhost:5500` is a *different* origin as text, so it is **not** allowed — always open the pages via `127.0.0.1`.

#### Browser DevTools (F12)

- Network tab (every request, status, payload, response, headers), Console (JS errors), Elements (HTML + applied CSS). Used constantly for debugging.

#### Git ❓ (not installed at the time of our last session)

- Planned for saving checkpoints. `.gitignore` already exists and excludes `venv/`, `.env`, `__pycache__/`.

### 1.3 Full dependency list ✅ (from `requirements.txt`)

| Package | Version | Why it is there |
|---|---|---|
| fastapi | 0.164.0 | Web framework (you installed it) |
| starlette | 1.10.0 | 🔎 Dependency of FastAPI (provides routing, middleware) |
| pydantic / pydantic_core | 2.14.3 / 2.50.4 | Validation (dependency of FastAPI) |
| annotated-types, typing_extensions, typing-inspection, annotated-doc | — | 🔎 Small helper libraries required by Pydantic/FastAPI |
| email-validator | 2.4.0 | Needed by `EmailStr` (you installed it in Phase 3) |
| dnspython, idna | 2.9.2 / 3.20 | 🔎 Dependencies of email-validator |
| uvicorn | 0.54.0 | Web server (installed as `uvicorn[standard]`) |
| h11, click | 0.16.0 / 8.5.1 | 🔎 Uvicorn dependencies (HTTP parsing, command line) |
| httptools, watchfiles, websockets, PyYAML | — | 🔎 Uvicorn `[standard]` extras |
| anyio | 4.16.0 | 🔎 Async toolkit used by Starlette |
| SQLAlchemy | 2.1.9 | ORM (you installed it) |
| psycopg / psycopg-binary | 3.3.9 | PostgreSQL driver (installed as `psycopg[binary]`) |
| python-dotenv | 1.2.4 | Reads `.env` |
| tzdata | 2026.6 | 🔎 Time-zone data; pulled in by a dependency on Windows |
| opentelemetry-api | 1.45.2 | ❓ Not used by your code; most likely pulled in by one of the packages above — which one is not determinable from the files |

### 1.4 Required configuration ✅

| Item | Where | Value / rule |
|---|---|---|
| `DATABASE_URL` | `.env` in the project root | `postgresql+psycopg://formapp_user:<password>@localhost:5432/aiden` (🔎 format; real value not opened). Special characters in the password must be URL-encoded — your password contains `@`, written as `%40`. |
| Allowed CORS origin | `main.py` line 14 | `http://127.0.0.1:5500` |
| API base URL used by the frontend | every `fetch` in the 4 JS files | `http://127.0.0.1:8000` |
| Frontend port | `http.server` command | `5500` |
| VS Code interpreter | Ctrl+Shift+P → "Python: Select Interpreter" | `.\venv\Scripts\python.exe` (fixes "Import could not be resolved") |

---

## PART 2 — How the Application Was Built, Step by Step

This reconstruction combines the actual files (✅) with the steps from our conversation and `PROJECT_CONTEXT.md` (🔎). Commands are the ones used in this project; their full explanations are in `COMMANDS_REFERENCE.md`.

### Step 1 — Project initialised

- **What we did:** Created the project folder `POCs` and two instruction files: `CLAUDE.md` (tutor rules) and `PROJECT_CONTEXT.md` (your notes).
- **Why:** Learning goal first — understand every line, one concept at a time.
- **Files:** `CLAUDE.md`, `PROJECT_CONTEXT.md`.
- **Next step depends on:** nothing.

### Step 2 — PostgreSQL database and user created 🔎 (from `PROJECT_CONTEXT.md`, Part B)

- **What:** In **SQL Shell (psql)** as the `postgres` admin:
  ```sql
  CREATE USER formapp_user WITH PASSWORD '<your password>';
  CREATE DATABASE aiden OWNER formapp_user;
  ```
- **Why:** The app gets its own **limited** login (least privilege) and its own empty database it can create tables in.
- **Next step depends on:** this user/database existing — the `DATABASE_URL` points at them.

### Step 3 — Python virtual environment

- **What:**
  ```cmd
  python -m venv venv
  venv\Scripts\activate.bat
  ```
- **Why:** Project-private packages. In PowerShell, activation was blocked by the company's script policy, so you switched the VS Code terminal to **Command Prompt** (we deliberately did **not** change the policy).
- **Files:** `venv/`.
- **Next:** packages install *into* this venv.

### Step 4 — Dependencies installed

- **What:**
  ```cmd
  python -m pip install fastapi sqlalchemy
  python -m pip install "uvicorn[standard]" "psycopg[binary]" python-dotenv
  python -m pip install email-validator
  python -m pip freeze > requirements.txt
  ```
- **Why `python -m pip`:** guarantees pip belongs to the same Python you are running (the venv).
- **Troubleshooting from this step:** `websockets\server.py` was missing (🔎 likely damaged by OneDrive syncing `venv\`); fixed with `python -m pip install --force-reinstall websockets==17.4`.
- **Files:** `requirements.txt` ✅.

### Step 5 — First FastAPI app (Phase 1)

- **What:** `backend/main.py` with `app = FastAPI()` and `GET /api/hello` (still present, lines 96–98 ✅). Started with:
  ```cmd
  uvicorn backend.main:app --reload --reload-dir backend
  ```
- **Why `--reload-dir backend`:** without it, `--reload` watched the whole folder including `venv\`, so package changes / OneDrive syncing triggered endless restarts.
- **Lessons:** route = **method + path**; FastAPI converts dicts to JSON; 404 = no route; 405 = route exists but wrong method; `/docs` and `/openapi.json` are generated from your decorators.
- **Next:** a frontend that calls this endpoint.

### Step 6 — First frontend → backend call (Phase 2)

- **What:** `frontend/page1.html` with a button, `app.js` calling `fetch("http://127.0.0.1:8000/api/hello")`, served with:
  ```cmd
  python -m http.server 5500 --directory frontend
  ```
- **What happened:** CORS error. The request **did** reach Uvicorn (200 OK in its log), but the browser hid the response because 5500 ≠ 8000.
- **Fix:** `CORSMiddleware` in `main.py` (lines 12–17 ✅).
- **Bug found on the way:** the `<script>` tag was misplaced, so `app.js` never ran.

### Step 7 — Sending data + validation (Phase 3)

- **What:** Page 1 became a real form (name, email, phone); `POST /api/applications`; Pydantic schema `ApplicationCreate`.
- **Validation grew in two stages:** first only types (`str`) — an empty string still passed; then rules: `Field(min_length=1, max_length=100)`, `EmailStr`, `Field(pattern=r"^\d{10}$")` (lines 20–23 ✅).
- **Lessons:** 422 happens **before** your function runs; field names must match on both sides (a wrong field name `message` in the schema caused a confusing 422); JSON requests trigger a CORS **preflight** (`OPTIONS`).

### Step 8 — Connecting PostgreSQL (Phase 4)

- **What:**
  1. `.env` with `DATABASE_URL` (password `@` encoded as `%40`); `.gitignore` excluding `.env`.
  2. `backend/database.py`: `load_dotenv()`, `create_engine(DATABASE_URL, echo=True)`.
  3. Connection test:
     ```cmd
     python -c "from backend.database import engine; engine.connect(); print('Connected!')"
     ```
  4. `class Base(DeclarativeBase)` and `backend/models.py` with `class Application`.
  5. Table created with a one-off command (✅ there is **no** `create_all` call anywhere in the code — it was run manually):
     ```cmd
     python -c "import backend.models; from backend.database import Base, engine; Base.metadata.create_all(engine)"
     ```
  6. `SessionLocal` + `get_db()` and the POST route saving a row and returning `{"id", "status"}` with status **201**.
- **Next:** the returned `id` is what connects page 1 to page 2.

### Step 9 — Page 2 and PATCH (Phase 5)

- **What:** After a 201, `app.js` redirects to `page2.html?id=<id>`. Page 2 reads the id from the URL and sends `PATCH /api/applications/{id}` with `{plan, newsletter}`.
- **Schema change:** columns `plan` and `newsletter` were added to the model. Because `create_all` **never alters existing tables**, the table was dropped (`DROP TABLE applications;` in psql) and recreated with the same `create_all` command.
- **Lessons:** stateless HTTP; path parameters; `404` (valid id, no row) vs `422` (`abc` is not an int); `.checked` not `.value` for checkboxes.

### Step 10 — Review page and business rules (Phase 6)

- **What:** `GET /api/applications/{id}` (read one) and `POST /api/applications/{id}/submit` with rules → 404 / 409 / 400. `review.html` + `review.js` load and display the record and submit it.
- **Lesson:** rules belong on the **server**; the frontend can be bypassed.

### Step 11 — Error handling (Phase 7)

- **What:** Experiments: server stopped (`TypeError: Failed to fetch`) and server crashed (`1 / 0` → 500, shown in the browser as a **CORS error** because the crash response skips the CORS middleware). `try`/`catch` added around `fetch` code.
- **Current state ✅:** `page2.js`, `review.js` and `dashboard.js` use `try`/`catch`; **`app.js` does not** (see "Code Review Observations").

### Step 12 — Dashboard (extra)

- **What:** `GET /api/applications` returning a list → then **paginated** with `limit`/`offset` and `total`; `dashboard.html` + `dashboard.js` building table rows; `DELETE /api/applications/{id}` (204) with a Delete button per row; "+ New application" and "Go to dashboard" links.

### Step 13 — Styling (extra)

- **What:** Shared `style.css`, `<main>` card wrapper, classes (`btn`, `btn-secondary`, `btn-danger`, `badge`, `wide`, `page-header`, `actions`, `pagination`).

### Step 14 — Starting and testing

See `COMMANDS_REFERENCE.md`. In short: PostgreSQL running → terminal 1: Uvicorn → terminal 2: `http.server` → open `http://127.0.0.1:5500/dashboard.html` or `page1.html` → test in the browser, in `/docs`, and in psql.

---

## PART 3 — File-by-File Code Explanation

The files are presented in **dependency order**: each file only uses files explained before it.

```text
.env ──► database.py ──► models.py ──► main.py ◄── (HTTP) ── app.js / page2.js / review.js / dashboard.js
                    └───────────────────────────►┘                    ▲
                         (get_db imported directly)          *.html load them; style.css styles all pages
```

### 3.0 The backend Python files at a glance ✅

The `backend` folder contains exactly **three** `.py` files. Each has one job:

| File | One-line job | What it contains | Answers the question | Used by |
|---|---|---|---|---|
| `database.py` | **How do we connect to PostgreSQL?** | `load_dotenv()`, `DATABASE_URL`, `engine`, `Base`, `SessionLocal`, `get_db()` | "Where is the database and how do I get a session?" | `models.py` (imports `Base`), `main.py` (imports `get_db`), the `create_all` command |
| `models.py` | **What does a stored row look like?** | `class Application(Base)` → table `applications` with 7 columns | "How is data stored?" | `main.py` (imports `Application`), the `create_all` command |
| `main.py` | **What can the outside world ask for, and what are the rules?** | `app = FastAPI()`, CORS middleware, Pydantic schemas `ApplicationCreate` / `ApplicationPreferences`, 7 route functions with validation and business rules | "Which code runs for this method + URL, is the request valid, and what should happen?" | Uvicorn (`backend.main:app`); called over HTTP by the 4 JS files |

Analogy — a restaurant:

| File | Restaurant role |
|---|---|
| `main.py` | The **waiter and the menu**: takes orders (requests), checks they are on the menu (routes) and filled in correctly (schemas), applies house rules (409/400), brings back the result (JSON) |
| `models.py` | The **recipe card / storage plan**: what one dish (row) consists of |
| `database.py` | The **kitchen's door to the storeroom**: the address of the storeroom (`DATABASE_URL`), the keys (`engine`), and a fresh tray for each order (`get_db` → a session) |

**Other things in `backend/`:**

- `__pycache__/*.cpython-313.pyc` — compiled bytecode Python creates automatically to start faster. Never edit; safe to delete; ignored by Git.
- ✅ There is **no `__init__.py`**. That's fine: since Python 3.3 a folder can be imported as a *namespace package*, which is why `from backend.database import ...` and `uvicorn backend.main:app` work as long as you start from `POCs`.

**Start-up import order** (what runs when Uvicorn loads your code — before any request):

```text
uvicorn backend.main:app
└─ imports backend/main.py, top to bottom
   ├─ line 5  from backend.database import get_db
   │          → runs database.py once: load_dotenv() → DATABASE_URL → engine (no connection yet)
   │            → Base → SessionLocal → get_db is defined
   ├─ line 6  from backend.models import Application
   │          → runs models.py once: reuses the already-loaded Base → class Application
   │            registers table "applications" in Base.metadata
   ├─ line 10 app = FastAPI()
   ├─ 12–17   CORS middleware attached
   ├─ 20–27   schema classes defined
   └─ 29–98   the 7 decorators register routes on app
→ "Application startup complete."
```

Python runs each module **once** and reuses it on later imports, so the whole server has exactly **one** `engine` (and one connection pool), shared by all requests. Sessions, by contrast, are created **per request** by `get_db`.

### 3.1 `.env` (project root) — not opened

- **Purpose:** Holds `DATABASE_URL` (🔎 one line: `postgresql+psycopg://formapp_user:<password>@localhost:5432/aiden`).
- **Used by:** `database.py` via `load_dotenv()` + `os.getenv("DATABASE_URL")`.
- **If removed:** `DATABASE_URL` becomes `None`, and `create_engine(None, ...)` fails as soon as `backend.database` is imported — so Uvicorn cannot even load `main.py` (🔎 SQLAlchemy raises an `ArgumentError`).

### 3.2 `.gitignore` ✅

```text
venv/
.env
__pycache__/
```

Keeps the 1000s of package files, your password, and Python cache files out of Git.

### 3.3 `requirements.txt` ✅

Exact package versions (see §1.3). Rebuild a venv with `python -m pip install -r requirements.txt`.

### 3.4 `backend/database.py` ✅ — connection and session management

```python
 1  # Phase 4: connecting PostgreSQL
 2  import os
 3  from dotenv import load_dotenv
 4  from sqlalchemy import create_engine
 5  from sqlalchemy.orm import DeclarativeBase
 6  from sqlalchemy.orm import sessionmaker
 7
 8  load_dotenv()  # Load environment variables from .env file
 9
10  DATABASE_URL = os.getenv("DATABASE_URL")
11  engine = create_engine(DATABASE_URL, echo=True)
12
13  class Base(DeclarativeBase):
14      pass
15
16  SessionLocal = sessionmaker(bind=engine)
17
18  def get_db():
19      db = SessionLocal()
20      try:
21          yield db
22      finally:
23          db.close()
```

| Lines | What it does | Why / what breaks without it |
|---|---|---|
| 2–6 | Imports | `os` for env vars, `load_dotenv` for `.env`, SQLAlchemy pieces |
| 8 | `load_dotenv()` finds `.env` (🔎 searching upward from this file's folder, so it finds `POCs\.env`) and loads it | Without it `os.getenv` returns `None` |
| 10 | Reads the connection string | Password stays out of code |
| 11 | `create_engine(..., echo=True)` — the **engine** knows *how* to connect and manages a pool of connections. It does **not** connect yet. `echo=True` prints every SQL statement to the Uvicorn terminal | Without the engine nothing can reach the DB. Without `echo` you lose the SQL log (fine for production, bad for learning) |
| 13–14 | `Base` — parent class for all models; keeps the registry `Base.metadata` of tables | `models.py` and the `create_all` command need it |
| 16 | `SessionLocal` — a **factory** that creates sessions bound to the engine | One new session per request |
| 18–23 | `get_db()` — a **generator dependency**: opens a session, `yield`s it to the route, and **always** closes it afterwards (`finally`) | Without `close()` connections leak until PostgreSQL refuses new ones |

**Who uses it:** `models.py` imports `Base`; `main.py` imports `get_db`; the `create_all` command imports `Base` and `engine`.

### 3.5 `backend/models.py` ✅ — the ORM model (table definition)

```python
 1  from sqlalchemy import String
 2  from sqlalchemy.orm import Mapped, mapped_column
 3  from backend.database import Base
 4
 5  class Application(Base):
 6      __tablename__ = "applications"
 7
 8      id: Mapped[int] = mapped_column(primary_key=True)
 9      name: Mapped[str] = mapped_column(String(100))
10      email: Mapped[str] = mapped_column(String(255))
11      phone: Mapped[str] = mapped_column(String(10))
12      status: Mapped[str] = mapped_column(String(20), default="draft")
13      plan: Mapped[str | None] = mapped_column(String(20))
14      newsletter: Mapped[bool] = mapped_column(default=False)
```

| Line | Column | Meaning |
|---|---|---|
| 5 | — | One instance of `Application` = one row; inheriting `Base` registers the table |
| 6 | — | Real table name in PostgreSQL: `applications` |
| 8 | `id` | Primary key; PostgreSQL generates 1, 2, 3… This is the id carried between pages |
| 9–11 | `name`, `email`, `phone` | `VARCHAR(100/255/10)`, required (`Mapped[str]` → `NOT NULL`) |
| 12 | `status` | `VARCHAR(20)`, defaults to `"draft"`; becomes `"submitted"` via the submit endpoint |
| 13 | `plan` | `str \| None` → **nullable**; empty until page 2 is saved |
| 14 | `newsletter` | `BOOLEAN`, defaults to `False` |

🔎 **Important detail:** `default=...` is a **Python-side** default — SQLAlchemy fills it in when *it* inserts a row. It is **not** stored as a default in PostgreSQL. So an `INSERT` typed by hand in psql that omits `status` or `newsletter` would fail with a NOT NULL error. (A database-side default would be `server_default=...`.)

**Who uses it:** `main.py` (`from backend.models import Application`) and the `create_all` command (`import backend.models` — needed so the class registers itself with `Base` before tables are created).

### 3.6 `backend/main.py` ✅ — the whole API

#### Imports (lines 1–8)

```python
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Application
from typing import Literal
from sqlalchemy import select, func
```

`backend.database` / `backend.models` are **absolute imports** that work because Uvicorn is started from `POCs` with `backend.main:app`.

#### App and CORS (lines 10–17)

```python
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- `app` is the object Uvicorn runs (`backend.main:app`). Every route attaches to it.
- **Middleware** runs around every request. `CORSMiddleware` answers preflight `OPTIONS` requests and adds `access-control-allow-origin: http://127.0.0.1:5500` to responses.
- `allow_methods=["*"]` is needed for PATCH and DELETE; `allow_headers=["*"]` for `Content-Type: application/json`.

#### Schemas (lines 20–27)

```python
class ApplicationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(pattern=r"^\d{10}$")

class ApplicationPreferences(BaseModel):
    plan: Literal["basic", "pro"]
    newsletter: bool
```

| Schema | Used by | Rules |
|---|---|---|
| `ApplicationCreate` | `create_application` (POST) | name 1–100 chars; valid email; phone exactly 10 digits |
| `ApplicationPreferences` | `update_preferences` (PATCH) | plan must be exactly `"basic"` or `"pro"`; newsletter a boolean |

Schemas describe **requests**; the model describes **rows**. `ApplicationCreate` has no `id`/`status` — the server decides those.

#### Endpoints

| # | Lines | Method + path | Function | Success | Errors |
|---|---|---|---|---|---|
| 1 | 29–35 | `POST /api/applications` | `create_application` | 201 `{id, status}` | 422 |
| 2 | 37–46 | `PATCH /api/applications/{application_id}` | `update_preferences` | 200 `{id, plan, newsletter}` | 404, 422 |
| 3 | 48–56 | `GET /api/applications/{application_id}` | `get_application` | 200 full record | 404, 422 |
| 4 | 58–69 | `POST /api/applications/{application_id}/submit` | `submit_application` | 200 `{id, status}` | 404, 409, 400, 422 |
| 5 | 71–85 | `GET /api/applications?limit=&offset=` | `list_applications` | 200 `{total, limit, offset, items}` | 422 |
| 6 | 87–93 | `DELETE /api/applications/{application_id}` | `delete_application` | 204 (no body) | 404, 422 |
| 7 | 96–98 | `GET /api/hello` | `say_hello` | 200 `{"message": "Hello, FastAPI!"}` | — |

**1. `create_application`** (Create)

```python
@app.post("/api/applications", status_code=201)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    row = Application(name=payload.name, email=payload.email, phone=payload.phone)
    db.add(row)        # stage
    db.commit()        # INSERT ... RETURNING id  + COMMIT
    db.refresh(row)    # reload: gets id and the "draft" default
    return {"id": row.id, "status": row.status}
```

`payload` is validated by Pydantic **before** the function runs. `Depends(get_db)` gives a fresh session and closes it afterwards.

**2. `update_preferences`** (Update)

```python
row = db.get(Application, application_id)      # SELECT ... WHERE id = ?
if row is None:
    raise HTTPException(status_code=404, detail="Application not found")
row.plan = payload.plan
row.newsletter = payload.newsletter
db.commit()                                     # UPDATE ... WHERE id = ?
```

No `db.add` — the row is already tracked by the session, so SQLAlchemy notices the changed attributes.

**3. `get_application`** (Read one) — same lookup + 404; returns all 7 fields. No commit (read-only; the SQL log shows `ROLLBACK` when the session closes — harmless).

**4. `submit_application`** (Update — business action) — checks in order: exists? (404) → already submitted? (409) → page 2 done (`plan is None`)? (400) → sets `status = "submitted"` and commits.

**5. `list_applications`** (Read many, paginated)

```python
def list_applications(limit: int = Query(5, ge=1, le=50),
                      offset: int = Query(0, ge=0),
                      db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(Application))
    rows = db.scalars(
        select(Application).order_by(Application.id.desc()).limit(limit).offset(offset)
    ).all()
```

- Query parameters with validation: `limit` 1–50 (default 5), `offset` ≥ 0 (default 0).
- Two SQL statements: 🔎 `SELECT count(*) FROM applications` and `SELECT ... ORDER BY id DESC LIMIT :limit OFFSET :offset`.
- Returns only 5 fields per item (no `phone`, no `newsletter`).

**6. `delete_application`** (Delete) — lookup + 404 → `db.delete(row)` → `db.commit()` (🔎 `DELETE FROM applications WHERE id = ?`). Returns nothing → **204 No Content**. This is a **hard delete** ✅ — the row is physically removed; there is no `deleted`/`is_active` column.

**7. `say_hello`** — the original Phase 1 test endpoint.

**What breaks if `main.py` changes:** a path or method change breaks the matching `fetch` (404/405); renaming a schema field breaks the contract with the frontend (422); removing CORS breaks every browser call (but not `/docs`).

### 3.7 `frontend/style.css` ✅

Shared by all four pages via `<link rel="stylesheet" href="style.css">`.

| Section (lines) | What it styles |
|---|---|
| 1 | `* { box-sizing: border-box; }` — width includes padding |
| 3–18 | `body` (grey background, font) and `main` (centred white card, 520px) |
| 20–32 | `label`, `input`, `select`, checkbox exception |
| 34–45 | `button`, `:hover`, `:disabled` |
| 47–68 | `h1`, `.muted`, `.btn` (links that look like buttons), `.btn-secondary`, `.btn-danger` |
| 70–75 | Layout: `main.wide` (960px dashboard), `.page-header`, `.actions`, `.pagination` (flexbox) |
| 77–81 | Table: collapsed borders, header style, row hover |
| 83–86 | `.badge`, `.badge-draft`, `.badge-submitted` |
| 88–89 | `#details` box on the review page |

`.btn-danger` overrides the blue `button` rule because a **class selector is more specific** than a tag selector.

### 3.8 `frontend/page1.html` + `frontend/app.js` ✅ — Create

**HTML:** `<form id="page1-form">` with inputs `#name`, `#email`, `#phone`, a `type="submit"` button, and `<p id="result">`. `app.js` is loaded at the end of `<body>` so the elements exist when it runs.

**JS (`app.js`, 22 lines):**

```javascript
const form = document.getElementById("page1-form");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
  event.preventDefault();                       // stop the default page reload
  const payload = { name: ..., email: ..., phone: ... };   // read inputs
  const response = await fetch("http://127.0.0.1:8000/api/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (response.ok) {
    window.location.href = `page2.html?id=${data.id}`;   // carry the id
  } else {
    result.textContent = `Status ${response.status}: ${JSON.stringify(data)}`;
  }
});
```

- Calls → `create_application` in `main.py`.
- ✅ **No `try`/`catch` in this file** — if the server is down, `fetch` throws, the error appears only in the Console, and the page stays silent.
- If `const form` were missing → `ReferenceError` → no listener → the form reloads the page (a bug you hit and fixed).

### 3.9 `frontend/page2.html` + `frontend/page2.js` ✅ — Update (preferences)

**HTML:** `<p id="info">`, `<form id="page2-form">` with `<select id="plan">` (`basic`/`pro`) and `<input type="checkbox" id="newsletter">`, `<p id="result">`.

**JS:**

- Lines 1–4: `new URLSearchParams(window.location.search).get("id")` → shows "Editing application #<id>".
- Lines 9–31: on submit → payload `{plan: select.value, newsletter: checkbox.checked}` → `fetch(.../api/applications/${id}, {method: "PATCH", ...})` → on success redirect to `review.html?id=<id>`; else show the error; `catch` shows "Couldn't reach the server".
- Calls → `update_preferences`.
- If the URL has no `?id=`, `id` is `null` → the request goes to `/api/applications/null` → 🔎 422 (`"null"` is not an int).

### 3.10 `frontend/review.html` + `frontend/review.js` ✅ — Read one + Submit

**HTML:** `#details` (shows "Loading..."), `.actions` with `#submit-btn` and a link `<a href="dashboard.html" class="btn btn-secondary">`, `#result`.

**JS:**

- `loadApplication()` (lines 5–20): `GET /api/applications/${id}` → on error shows `Error <status>: <detail>`; on success writes the 6 fields as text (`textContent` — safe against HTML injection). Called on page load (line 46) and again after a successful submit.
- Submit handler (lines 24–40): `POST /api/applications/${id}/submit` (no body, no headers → no preflight) → success: "Application submitted." + reload details; failure: `Error <status>: <detail>`.
- Lines 42–44: the old `dashboard-btn` handler, **commented out** (kept as a reminder; the button was replaced by a link).
- Calls → `get_application`, `submit_application`.

### 3.11 `frontend/dashboard.html` + `frontend/dashboard.js` ✅ — Read many + Delete

**HTML:** `<main class="wide">`, header with "+ New application" link (`page1.html`), `#message`, a table with headers ID / Name / Email / Plan / Status / Actions and an empty `<tbody id="rows">`, pagination (`#prev-btn`, `#page-info`, `#next-btn`). ✅ The table still has the old `border="1"` attribute; the CSS mostly overrides it.

**JS:**

| Lines | Code | Purpose |
|---|---|---|
| 1–8 | element handles, `LIMIT = 5`, `let offset = 0` | Page state |
| 10–54 | `loadApplications()` | `GET /api/applications?limit=5&offset=<offset>` → show total → clear rows → build one `<tr>` per item (4 text cells, a status badge, a Delete button) → page info → enable/disable Previous/Next |
| 56–72 | `deleteApplication(id)` | `confirm()` → `DELETE /api/applications/${id}` → on success reload the list; **no `.json()` on success** because 204 has no body |
| 74–82 | Previous/Next click handlers | Change `offset` by ±5 and reload |
| 84 | `loadApplications();` | Runs on page load |

Calls → `list_applications`, `delete_application`.

### 3.12 Cross-file call map (who calls whom)

| Frontend function / event | File | HTTP | Backend function | DB operation |
|---|---|---|---|---|
| `submit` on `#page1-form` | app.js | POST `/api/applications` | `create_application` | INSERT |
| `submit` on `#page2-form` | page2.js | PATCH `/api/applications/{id}` | `update_preferences` | SELECT + UPDATE |
| `loadApplication()` | review.js | GET `/api/applications/{id}` | `get_application` | SELECT |
| `click` on `#submit-btn` | review.js | POST `/api/applications/{id}/submit` | `submit_application` | SELECT + UPDATE |
| `loadApplications()` | dashboard.js | GET `/api/applications?limit&offset` | `list_applications` | SELECT count + SELECT … LIMIT/OFFSET |
| `deleteApplication(id)` | dashboard.js | DELETE `/api/applications/{id}` | `delete_application` | SELECT + DELETE |

Every backend function receives its session through `Depends(get_db)` → `SessionLocal()` → `engine` → psycopg → PostgreSQL.

---

## PART 6 — Questions and Topics Discussed While Building

✅ The full conversation of this session was available. Topics are grouped by theme; each links to where it lives in your code.

### Python & environment

| Question / topic | Simple explanation | In your project |
|---|---|---|
| How to check uvicorn/psycopg/python-dotenv are installed in the venv | `python -c "import sys; print(sys.prefix)"`, `where python`, `python -m pip show ...` — check the **Location** points into `venv` | `requirements.txt` |
| What if `pip show` runs against the wrong Python? | You get a false "yes" from the global Python | Always `python -m pip` |
| Why `python -m pip` instead of `pip`? | Uses the pip that belongs to *this* Python | All install commands |
| `ModuleNotFoundError: No module named 'websockets.server'` | Reading a traceback bottom-up; your code never ran; `server.py` was missing → force-reinstall fixed it (🔎 OneDrive damage) | `venv\Lib\site-packages\websockets` |
| Endless reloads + `KeyboardInterrupt` | `--reload` was watching `venv\` | `--reload-dir backend` |
| Why are `Python313` paths in my venv traceback? | A venv borrows the standard library from the base Python | — |
| Do I need to create `requirements.txt` first? | No — `>` creates/overwrites it | `requirements.txt` |
| How do I activate the venv in cmd? | `venv\Scripts\activate.bat` | — |
| "Import could not be resolved" in VS Code | The **editor** uses a different interpreter than the terminal → select `venv\Scripts\python.exe` | VS Code setting |
| `NameError: name 'Query' is not defined` | A name must be imported/defined before use; default values are evaluated when the file loads | `main.py` line 1 |
| `'git' is not recognized` | Git not installed / not on PATH | — |

### FastAPI & HTTP

| Topic | Explanation | Where |
|---|---|---|
| Uvicorn vs FastAPI; who converts dict → JSON | Uvicorn = server; FastAPI = routing + JSON conversion | `main.py` |
| `@app.get` → `@app.post`: still reachable from the address bar? | No — address bar sends GET → 405 | — |
| `{"detail":"Not Found"}` | FastAPI's 404: request reached the app, no route matched (your path had a typo) | — |
| How does `/docs` know my routes? | Built from `/openapi.json`, generated from decorators | `/docs` |
| Reading `/docs` output | "Server response" is real; "Responses" below is documentation | `/docs` |
| 422 anatomy (`type`, `loc`, `msg`, `input`) | `loc` names the field; a schema field mismatch (`message`) caused one | `ApplicationCreate` |
| 404 vs 422 for bad ids | `abc` fails validation (422, function never runs); `999` passes validation but your check raises 404 | PATCH/GET/DELETE |
| PATCH vs POST | PATCH changes part of an existing resource | `update_preferences` |
| Same URL, different methods | FastAPI matches method + path | GET/PATCH/DELETE `/{id}` |
| Why no COMMIT on GET? | Reads change nothing | `get_application` |
| Why an action endpoint `/submit` instead of PATCHing `status`? | The client could otherwise skip rules or set any status | `submit_application` |
| Route order (`/summary` before `/{id}`) | First match wins | discussed; not in code |
| Performance of `.all()` on 10,000 rows | Loads everything → pagination | `list_applications` |
| 204 No Content | Successful delete; no body → don't call `.json()` | `delete_application`, `deleteApplication` |

### PostgreSQL & SQLAlchemy

| Topic | Explanation | Where |
|---|---|---|
| Password containing `@` | URL-encode as `%40` | `.env` |
| What `create_all` does; did I create a table? | Creates missing tables only; verify with `inspect(engine).get_table_names()` or `\dt` | one-off command |
| What happens if `create_all` runs without dropping? | Silently skips existing tables → missing columns later | Phase 5 |
| `NOT NULL` from `Mapped[str]` vs `Mapped[str \| None]` | Optional types become nullable columns | `models.py` |
| Deleting `db.commit()` | Nothing saved; `refresh` would fail → 500 | `create_application` |
| Where does the `id` come from? | PostgreSQL generates it; `RETURNING id` + `refresh` | `create_application` |
| `GROUP BY` summary counts | Let the DB count per group | discussed; not in code |

### Frontend ↔ backend & JavaScript

| Topic | Explanation | Where |
|---|---|---|
| What is `127.0.0.1`? | Your own computer (= `localhost`) | all fetch URLs |
| CORS: who blocked it and why | The **browser**, not the server; origins differ (5500 vs 8000) | `main.py` CORS |
| Does `localhost:5500` work? | No — different origin text | CORS config |
| Preflight `OPTIONS` | JSON header or PATCH/DELETE → browser asks permission first | Network tab |
| Where exactly does `<script>` go? | End of `<body>`, so elements exist | all HTML pages |
| `event.preventDefault()` | Stops the form's default reload | app.js, page2.js |
| Empty input → 200? | `""` is a valid `str`; needed `min_length` | `ApplicationCreate` |
| Why validate on the server if the browser can? | Browser checks can be bypassed (`/docs`, curl) | Pydantic |
| `.value` on a checkbox | Always `"on"` → Pydantic reads it as `True` → silent wrong data | page2.js uses `.checked` |
| How do pages stay connected? | The id is carried in the URL — stateless HTTP | `?id=` |
| `async` / `await` | `fetch` returns a Promise; `await` pauses only that function | all JS files |
| Why `try`/`catch`? why `response.json()` inside it? | `fetch` throws when the server is down; `.json()` throws on non-JSON | page2.js, review.js, dashboard.js |
| Link vs button for navigation | Use `<a href>` when no logic is needed | review.html, dashboard.html |
| Page stuck on "Loading…" | JS referenced a removed element id → `null` error stopped the script | review.js (now commented out) |
| Page reloads on Next | Missing `const form` → `ReferenceError` → no listener | app.js |
| CSS basics, classes, specificity, flexbox | — | style.css |

---

## Code Review Observations (no changes made)

✅ All verified in the current files. None of these were changed — they are learning opportunities.

| # | File / line | Observation | Effect |
|---|---|---|---|
| 1 | `app.js` | No `try`/`catch` around `fetch` | Server down → silent page; error only in Console |
| 2 | `review.js` line 38 | The submit handler's `catch` writes to `details`, not `result` | A network failure on Submit replaces the application details with "Couldn't load your application…" |
| 3 | `page2.js` | No check for a missing `?id=` | Opening `page2.html` directly sends PATCH to `/api/applications/null` → 422 |
| 4 | `dashboard.js` | After deleting the last row on the last page, `offset` is not moved back | The dashboard shows an empty page; click Previous to recover |
| 5 | `main.py` | No rule prevents PATCHing an application that is already `submitted` | Preferences can change after submission |
| 6 | `main.py` | Name/email/phone cannot be updated — there is no endpoint for it | Update is limited to plan/newsletter (and status via submit) |
| 7 | `main.py` | `name: str = Field(min_length=1)` accepts `" "` (a single space) | Whitespace-only names pass validation |
| 8 | `main.py` | The `get` + `if None` + `404` block is repeated 4 times | Candidate for a helper / services layer (Phase 8) |
| 9 | `main.py` | No authentication: anyone who can reach port 8000 can list (incl. emails) and delete | Fine for a local POC only |
| 10 | `dashboard.html` | Leftover `border="1"` on `<table>` | Minor visual inconsistency |
| 11 | `database.py` | `echo=True` logs all SQL | Great for learning; turn off in production |
| 12 | `models.py` | Defaults are Python-side (`default=`), not DB-side (`server_default=`) | Manual SQL inserts must supply `status` and `newsletter` |
| 13 | Project location | Project lives in OneDrive | 🔎 Likely cause of the damaged `websockets` install; move projects to e.g. `C:\dev\` |

---

## PART 8 — What to Learn Next

### What you already understand (demonstrated by building and debugging this app)

- The request journey browser → Uvicorn → FastAPI → Pydantic → SQLAlchemy → PostgreSQL → back.
- HTTP methods, status codes, path vs query parameters, statelessness.
- CORS, origins and preflight.
- Pydantic validation and reading 422 errors.
- ORM basics: engine, session, add/commit/refresh/delete, `select`, `count`, `LIMIT/OFFSET`.
- Frontend: `fetch`, `async/await`, `try/catch`, DOM manipulation with `textContent`, events, CSS classes and flexbox.
- Debugging: reading tracebacks bottom-up, using the Network tab, Uvicorn logs and psql.

### Gaps, in a sensible learning order

| # | Concept | Why next | First exercise in *this* app |
|---|---|---|---|
| 1 | **Git basics** | Save checkpoints before refactoring | Install Git, `git init`, first commit |
| 2 | **Layered structure** (routers, schemas, services) | Phase 8, deliberately postponed | Move schemas to `schemas.py`; a `get_application_or_404()` helper |
| 3 | **Response models** (`response_model=`) | Let FastAPI validate and document *outputs* too | Add a Pydantic `ApplicationOut` |
| 4 | **Automated tests** (`pytest` + FastAPI `TestClient`) | Prove behaviour without clicking | Tests for 201/422/404/409/400 |
| 5 | **Migrations with Alembic** | Change tables without `DROP TABLE` | Add a `created_at` column via a migration |
| 6 | **More SQL** (`WHERE`, `GROUP BY`, indexes, constraints) | Filters/search and the summary route | Filter dashboard by status; the summary counts |
| 7 | **Database-side constraints & defaults** | Protect data even outside the app | `server_default`, `CHECK (status IN (...))` |
| 8 | **Authentication & authorisation** | Protect dashboard and delete | Simple admin login / API key |
| 9 | **Configuration & environments** | Different settings for dev/test/prod | `pydantic-settings`, `echo` from env |
| 10 | **Soft delete, audit fields** | Real apps rarely hard-delete | `deleted_at` column |
| 11 | **async SQLAlchemy / `async def` routes** | Scale under many concurrent users | Only after the above |
| 12 | **Deployment** | Run beyond localhost | Docker basics |

