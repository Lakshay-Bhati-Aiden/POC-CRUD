# Commands Reference — Install, Run, Test, Troubleshoot

> Every command needed for **this** project, what it does, and when to use it.
> Detected OS: **Windows** (paths like `C:\Users\...`, `venv\Scripts\`). Project root: the `POCs` folder.
>
> Run all commands **from the `POCs` folder** unless stated otherwise.

---

## 0. Which terminal? (read this first)

Your company laptop **blocks PowerShell scripts** (the venv's `Activate.ps1`). We agreed **not** to change the execution policy. So there are two working styles:

| Style | Activate the venv | Run Python tools |
|---|---|---|
| **Command Prompt (cmd)** — what you use | `venv\Scripts\activate.bat` → prompt shows `(venv)` | `python ...`, `uvicorn ...` |
| **PowerShell** without activation | (skip) | Call the venv's Python directly: `.\venv\Scripts\python.exe -m ...` |

In VS Code, switch the terminal type with the **⌄** next to **+** → *Command Prompt*.
Tell them apart: `PS C:\...>` = PowerShell, `C:\...>` = Command Prompt.

Commands below show **cmd** first and the **PowerShell** equivalent where it differs.

---

## 1. Install prerequisites (one-time)

| What | How | Check |
|---|---|---|
| Python 3.13 (🔎 version used by this project) | python.org installer, tick *"Add python.exe to PATH"* | `python --version` |
| PostgreSQL (❓ version unknown) | postgresql.org Windows installer (includes *SQL Shell (psql)* and pgAdmin) | Open *SQL Shell (psql)* → `SELECT version();` |
| VS Code | code.visualstudio.com | — |
| Git (not installed yet) | git-scm.com installer (defaults), or `winget install --id Git.Git -e` | Restart VS Code, then `git --version` |

If an installer needs admin rights you don't have, ask IT — don't work around company policy.

---

## 2. Virtual environment and dependencies

```cmd
python -m venv venv
```
Creates the `venv` folder (private Python for this project). **Once per project.** Re-run only if `venv` is deleted or broken.

```cmd
venv\Scripts\activate.bat
```
Activates it **in this terminal only** (cmd). Needed in **every new terminal**. Prompt starts with `(venv)`.

```cmd
deactivate
```
Leaves the venv.

```cmd
python -m pip install -r requirements.txt
```
Installs the exact versions listed in `requirements.txt`. Use after creating a fresh venv or on another computer.
PowerShell: `.\venv\Scripts\python.exe -m pip install -r requirements.txt`

The packages were originally installed with (✅ matches `requirements.txt`):

```cmd
python -m pip install fastapi sqlalchemy
python -m pip install "uvicorn[standard]" "psycopg[binary]" python-dotenv
python -m pip install email-validator
```
Quotes are required because of the `[extras]`.

```cmd
python -m pip freeze > requirements.txt
```
Saves the current package list (overwrites the file). Run after installing anything new.

### Verify the environment

```cmd
where python
```
First line must end in `POCs\venv\Scripts\python.exe`. (PowerShell: `where.exe python`.)

```cmd
python -c "import sys; print(sys.prefix)"
```
Prints the active Python's folder — should end in `POCs\venv`.

```cmd
python -m pip show fastapi uvicorn sqlalchemy psycopg psycopg-binary python-dotenv email-validator
```
Shows version and **Location** (must be `...\POCs\venv\Lib\site-packages`).

```cmd
python -c "import fastapi, uvicorn, sqlalchemy, psycopg, dotenv, email_validator; print('all imports OK')"
```
Proves Python can import everything. Note import names differ from package names (`python-dotenv` → `dotenv`).

### Fix a broken package

```cmd
python -m pip install --force-reinstall websockets==17.4
```
Reinstalls one package from scratch (this fixed the missing `websockets\server.py`).

### VS Code editor ("Import could not be resolved")

Ctrl+Shift+P → **Python: Select Interpreter** → `.\venv\Scripts\python.exe`. Bottom-right should show `('venv')`. Then Ctrl+Shift+P → **Developer: Reload Window** if needed.

---

## 3. PostgreSQL

### Is PostgreSQL running? Start it

PostgreSQL runs as a Windows **service**.

```powershell
Get-Service -Name postgresql*
```
Shows the service name (e.g. `postgresql-x64-NN` — ❓ exact name depends on your version) and whether it is `Running`.

```powershell
Start-Service -Name postgresql-x64-NN
```
Starts it (replace with the real name; usually needs an **admin** terminal). GUI alternative: Win+R → `services.msc` → find *postgresql* → Start.

### Connect with psql

**Easiest:** Start menu → **SQL Shell (psql)**, then answer the prompts:

| Prompt | Admin session | App-user session |
|---|---|---|
| Server | `localhost` | `localhost` |
| Database | `postgres` | `aiden` |
| Port | `5432` | `5432` |
| Username | `postgres` | `aiden_user` |
| Password | your install password | the app password (real `@`, **not** `%40`) |

Prompt `postgres=#` (`#` = superuser) or `aiden=>` (`>` = normal user).

From a terminal (only if psql is on your PATH, or use the full path ❓ `"C:\Program Files\PostgreSQL\<version>\bin\psql.exe"`):

```cmd
psql -h localhost -p 5432 -U aiden_user -d aiden
```

### Create the database and user (one-time, as `postgres`)

```sql
CREATE USER aiden_user WITH PASSWORD '<your password>';
CREATE DATABASE aiden OWNER aiden_user;
\l
\q
```
`\l` lists databases, `\q` quits. SQL needs `;`; backslash commands don't.

### Useful psql commands (as `aiden_user` in `aiden`)

| Command | What it does |
|---|---|
| `\dt` | List tables (expect `applications`) |
| `\d applications` | Show columns and types |
| `SELECT * FROM applications ORDER BY id DESC;` | All rows, newest first |
| `SELECT id, name, status, plan, newsletter FROM applications WHERE id = 1;` | One row |
| `SELECT status, count(*) FROM applications GROUP BY status;` | Count per status |
| `SELECT count(*) FROM applications;` | Total (same number as the dashboard) |
| `\c aiden` | Switch to the `aiden` database |
| `\q` | Quit |

If the prompt shows `aiden-#` or `aiden(#`, psql is still waiting for a `;` — press **Ctrl+C** and retype.

---

## 4. Configuration (`.env`)

Create `POCs\.env` (one line, no spaces around `=`, no quotes):

```text
DATABASE_URL=postgresql+psycopg://aiden_user:YOUR_PASSWORD@localhost:5432/aiden
```

- URL-encode special characters **in the password only**: `@`→`%40`, `:`→`%3A`, `/`→`%2F`, `#`→`%23`, `%`→`%25`.
- `.env` is listed in `.gitignore` — never commit or share it.

---

## 5. Initialise the database (create the table)

```cmd
python -c "from backend.database import engine; engine.connect(); print('Connected!')"
```
**Connection test.** Loads `.env`, builds the engine and opens one connection. Ends with `Connected!` (above it you'll see SQL log lines from `echo=True`).

```cmd
python -c "import backend.models; from backend.database import Base, engine; Base.metadata.create_all(engine)"
```
**Creates the `applications` table** from `models.py` (there is no automatic table creation in the app code). Safe to run twice — existing tables are skipped, but **existing tables are never altered**.

```cmd
python -c "from sqlalchemy import inspect; from backend.database import engine; print(inspect(engine).get_table_names())"
```
**Checks which tables exist** — last line should be `['applications']`.

PowerShell: replace `python` with `.\venv\Scripts\python.exe` in all three.

### Reset the table (⚠ deletes all rows)

Needed after changing `models.py` (e.g. adding a column), because `create_all` doesn't alter tables:

```sql
DROP TABLE applications;
```
in psql, then re-run the `create_all` command above.

### Optional: a separate test database (recommended for write/delete testing)

```sql
CREATE DATABASE aiden_test OWNER aiden_user;   -- as postgres
```
Temporarily change `.env` to `.../aiden_test`, restart Uvicorn, run `create_all`, test freely, then switch `.env` back. (This is a suggestion — the project currently uses only `aiden`.)

---

## 6. Run the application

You need **three things running**: PostgreSQL (service), the API, and the frontend file server. Use two terminals.

### Terminal 1 — the API (Uvicorn)

```cmd
venv\Scripts\activate.bat
uvicorn backend.main:app --reload --reload-dir backend
```
PowerShell: `.\venv\Scripts\python.exe -m uvicorn backend.main:app --reload --reload-dir backend`

| Part | Meaning |
|---|---|
| `backend.main` | the file `backend\main.py` as an import path |
| `:app` | the `app = FastAPI()` variable inside it |
| `--reload` | restart automatically when code changes (development only) |
| `--reload-dir backend` | watch only `backend\` (not `venv\`, avoiding restart loops) |

Expect: `Uvicorn running on http://127.0.0.1:8000` … `Application startup complete.` The terminal stays busy. **Ctrl+C** stops it.

### Terminal 2 — the frontend

```cmd
venv\Scripts\activate.bat
python -m http.server 5500 --directory frontend
```
Serves the `frontend` folder on port 5500. Expect `Serving HTTP on :: port 5500 ...`. **Ctrl+C** stops it.

### Open in the browser (use `127.0.0.1`, not `localhost` — CORS allows only `http://127.0.0.1:5500`)

| URL | What |
|---|---|
| `http://127.0.0.1:5500/dashboard.html` | Admin dashboard (start here) |
| `http://127.0.0.1:5500/page1.html` | New application |
| `http://127.0.0.1:8000/docs` | Interactive API docs |
| `http://127.0.0.1:8000/openapi.json` | Raw API description |
| `http://127.0.0.1:8000/api/hello` | Smoke test → `{"message":"Hello, FastAPI!"}` |

### Stop everything

Ctrl+C in both terminals → `deactivate`. PostgreSQL keeps running as a service (that's fine).

---

## 7. Test the CRUD operations in the browser

Keep DevTools (F12) open on the **Network** tab, and the Uvicorn terminal visible.

### Sample data

| Field | Valid | Invalid examples |
|---|---|---|
| name | `Asha Sharma` | *(empty)*, 101+ characters |
| email | `asha@example.com` | `abc`, *(empty)* |
| phone | `9876543210` | `98765 43210`, `+919876543210`, `12345` |
| plan | `basic` / `pro` | anything else (only possible via `/docs`/API) |

### Test script

| # | Action | Expected result |
|---|---|---|
| 1 | Dashboard → **+ New application** → valid data → **Next** | Network: OPTIONS then `POST /api/applications` **201**; redirected to `page2.html?id=N`; Uvicorn shows `INSERT ... RETURNING` + `COMMIT` |
| 2 | Page 1 with all fields empty | Stays on page 1; `Status 422` with **3** errors (name, email, phone) |
| 3 | Page 2: choose **Pro**, tick newsletter, **Save** | OPTIONS then `PATCH /api/applications/N` **200**; redirected to `review.html?id=N`; Uvicorn shows `UPDATE` |
| 4 | Review page loads | `GET /api/applications/N` **200**; details show Plan: pro, Newsletter: Yes, Status: draft |
| 5 | **Submit application** | `POST .../N/submit` **200**, no preflight; "Application submitted."; Status: submitted |
| 6 | Click **Submit** again | `Error 409: Application already submitted` |
| 7 | Create via page 1 only, then open `review.html?id=<that id>` → Submit | `Error 400: Complete page 2 before submitting`; Plan shows `null` |
| 8 | Open `review.html?id=999` | `Error 404: Application not found` |
| 9 | **Go to dashboard** | `GET /api/applications?limit=5&offset=0` **200**; newest first; yellow *draft* / green *submitted* badges |
| 10 | Create 6+ applications, use **Next/Previous** | `offset=5`, `offset=10`…; "Page X of Y"; buttons disabled at the ends |
| 11 | **Delete** → Cancel | No request sent |
| 12 | **Delete** → OK | OPTIONS then `DELETE /api/applications/N` **204**, then a new GET; row gone; total −1 |
| 13 | psql: `SELECT * FROM applications ORDER BY id DESC;` | Matches what the dashboard shows |

---

## 8. Test API endpoints without the frontend

### Option A — `/docs` (easiest)

`http://127.0.0.1:8000/docs` → pick an endpoint → **Try it out** → **Execute**. Read the **"Server response"** box (Code + Response body). The "Responses" section below it is only documentation.

### Option B — PowerShell `Invoke-RestMethod`

Success cases (it prints the parsed JSON):

```powershell
# Create
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/applications" `
  -ContentType "application/json" `
  -Body '{"name":"Asha","email":"asha@example.com","phone":"9876543210"}'

# Read one / list
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/applications/1"
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/applications?limit=5&offset=0"

# Update preferences
Invoke-RestMethod -Method Patch -Uri "http://127.0.0.1:8000/api/applications/1" `
  -ContentType "application/json" -Body '{"plan":"pro","newsletter":true}'

# Submit
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/applications/1/submit"

# Delete (prints nothing on 204)
Invoke-RestMethod -Method Delete -Uri "http://127.0.0.1:8000/api/applications/1"
```

The backtick `` ` `` continues a PowerShell command on the next line. `Invoke-RestMethod` **throws** on 4xx/5xx; to see the error body:

```powershell
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/applications/999"
} catch {
  $_.Exception.Response.StatusCode.value__   # e.g. 404
  $_.ErrorDetails.Message                    # e.g. {"detail":"Application not found"}
}
```

### Option C — `curl.exe` (cmd or PowerShell)

In PowerShell type **`curl.exe`**, not `curl` (in Windows PowerShell `curl` is an alias for a different command). `-i` shows status and headers.

```cmd
curl.exe -i http://127.0.0.1:8000/api/applications/999
curl.exe -i "http://127.0.0.1:8000/api/applications?limit=100"
curl.exe -i -X DELETE http://127.0.0.1:8000/api/applications/1
```

Expected: 404 `{"detail":"Application not found"}`; 422 (limit max is 50); 204 or 404.

**Note:** these tools don't apply CORS (only browsers do) — a request that works here but fails in the page usually means a CORS or frontend problem.

---

## 9. Automated tests

✅ **There are no automated tests in this project** (no `tests/` folder, no `test_*.py`, `pytest` is not in `requirements.txt`). Nothing to run yet.

When you add them later (see "What to Learn Next" in the walkthrough), the usual commands are:

```cmd
python -m pip install pytest httpx
python -m pytest -v
```

---

## 10. Troubleshooting

### Read errors bottom-up
The **last line** of a Python traceback says what went wrong; the lines above say where. If your own files (`backend\...`) don't appear in the traceback, your code probably isn't the cause.

| Symptom | Likely cause | Fix / check |
|---|---|---|
| `'uvicorn' is not recognized` | venv not active, or uvicorn not installed | `venv\Scripts\activate.bat`; or `python -m uvicorn ...`; `python -m pip show uvicorn` |
| `ModuleNotFoundError: No module named 'X'` | Package missing **in this venv**, or wrong Python | `where python`; `python -m pip install -r requirements.txt` |
| `No module named 'websockets.server'` | Damaged install (🔎 OneDrive) | `python -m pip install --force-reinstall websockets==17.4` |
| Endless `WatchFiles detected changes ... Reloading` | `--reload` watching `venv\` | add `--reload-dir backend` |
| `Could not import module "backend.main"` | Started from the wrong folder | `cd` to `POCs` (the folder containing `backend\`) |
| `NameError: name 'Query' is not defined` | Missing import | `from fastapi import ... Query` at top of `main.py` |
| Error mentioning `DATABASE_URL`/`None` on start-up | `.env` missing, misnamed or not in `POCs` | Check the file name is exactly `.env` and its one line |
| `connection refused` / `Is the server running on host "localhost"... port 5432` | PostgreSQL service stopped | `Get-Service postgresql*` → start it |
| `password authentication failed for user "aiden_user"` | Wrong password, or `@` not encoded as `%40` in `.env` | Log in with psql using the real password; fix `.env` |
| `database "aiden" does not exist` | DB not created / typo | `\l` as `postgres`; `CREATE DATABASE ...` |
| `relation "applications" does not exist` | Table not created | Run the `create_all` command (§5) |
| `column "plan" ... does not exist` | Table older than the model | `DROP TABLE applications;` then `create_all` |
| `[WinError 10048]` / *address already in use* on 8000 or 5500 | Another process (often an old server) uses the port | `netstat -ano \| findstr :8000` → note the PID → close that terminal, or `taskkill /PID <pid> /F` (only your own processes). The ports are hard-coded in the JS and CORS config, so don't just pick a new port |
| Browser: `{"detail":"Not Found"}` | No route for that path (typo) | Compare the URL with `/docs` |
| `405 Method Not Allowed` | Path exists, method doesn't match | Check `method:` in `fetch` vs the decorator |
| `422` | Body/path/query failed validation | Read `detail[].loc` and `msg` |
| Console: `blocked by CORS policy` | (a) page opened via `localhost` instead of `127.0.0.1`; (b) **server crashed (500)** — crash responses skip CORS headers | (a) use `http://127.0.0.1:5500/...`; (b) look at the **Uvicorn traceback** |
| Console: `TypeError: Failed to fetch`, Network `(failed)` | Uvicorn not running | Start terminal 1 |
| Page reloads instead of submitting | JS error before the listener attached (e.g. missing `const form`) | Console ⚙ **Preserve log**, Ctrl+F5, read the first red error |
| Page stuck on "Loading..." | JS stopped by an error (e.g. `getElementById` returned `null`) | Console; check ids match between HTML and JS |
| Changes not visible | Browser cache | **Ctrl+F5** |
| VS Code: "Import could not be resolved" (app runs fine) | Editor uses a different interpreter | Python: Select Interpreter → venv |
| `'git' is not recognized` | Git not installed / VS Code not restarted | Install Git, restart VS Code |

---

## 11. Git (after installing Git)

```cmd
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```
One-time: who you are (recorded in every commit).

```cmd
git init
```
Once per project: start tracking this folder (creates hidden `.git`).

```cmd
git status
```
What changed. **Before your first commit, confirm `.env`, `venv/` and `__pycache__/` are NOT listed.**

```cmd
git add .
git commit -m "Form app with dashboard, pagination, delete and styling"
git log --oneline
```
Stage all changes, save a checkpoint, list checkpoints.

---

## 12. Daily quick-start (cheat sheet)

```cmd
:: Terminal 1 (cmd), in POCs
venv\Scripts\activate.bat
uvicorn backend.main:app --reload --reload-dir backend

:: Terminal 2 (cmd), in POCs
venv\Scripts\activate.bat
python -m http.server 5500 --directory frontend

:: Browser
:: http://127.0.0.1:5500/dashboard.html
:: http://127.0.0.1:8000/docs
```
