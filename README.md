# FastAPI + PostgreSQL Multi-Page Form (Learning POC)

A small full-stack application built to learn how a browser frontend talks to a backend API and a database.

- **Frontend:** plain HTML, CSS and vanilla JavaScript (`fetch`), no frameworks
- **Backend:** FastAPI (Python) JSON API, Pydantic validation
- **Database:** PostgreSQL through SQLAlchemy (ORM) and psycopg 3 (driver)

### What it does

1. **Page 1:** enter name, email and phone → creates an application (status `draft`)
2. **Page 2:** choose a plan (`basic` / `pro`) and newsletter opt-in
3. **Review:** see the saved application and submit it (status `submitted`)
4. **Dashboard:** paginated list of all applications, with status badges and a Delete button

---

## Project structure

```text
.
├── backend/
│   ├── database.py      # reads .env, creates the engine, sessions (get_db) and Base
│   ├── models.py        # Application model → table "applications"
│   └── main.py          # FastAPI app, CORS, Pydantic schemas, all API routes
├── frontend/
│   ├── page1.html + app.js
│   ├── page2.html + page2.js
│   ├── review.html + review.js
│   ├── dashboard.html + dashboard.js
│   └── style.css
├── docs/                # detailed walkthrough, architecture/CRUD diagrams, command reference
├── .env.example         # template for your own .env
├── .gitignore
└── requirements.txt     # exact Python package versions
```

---

## Prerequisites

| Tool | Notes |
|---|---|
| **Python 3.13** | The version this project was developed with. On Windows, tick *"Add python.exe to PATH"* during install. Check: `python --version` |
| **PostgreSQL** | Any recent version. The Windows installer includes **SQL Shell (psql)** and **pgAdmin**. Remember the password you set for the `postgres` admin user |
| **Git** | To clone the repository. Check: `git --version` |
| A modern browser | Chrome, Edge or Firefox |

---

## Setup (one-time)

All commands are run from the **project root**, the folder that contains `backend/` and `frontend/`.
Commands are shown for **Windows Command Prompt**; PowerShell and macOS/Linux versions are given where they differ.

### 1. Clone the repository

```cmd
git clone https://github.com/Lakshay-Bhati-Aiden/POC-CRUD.git
cd POC-CRUD
```

### 2. Create and activate a virtual environment

```cmd
python -m venv venv
venv\Scripts\activate.bat
```

| Shell | Activate command |
|---|---|
| Command Prompt | `venv\Scripts\activate.bat` |
| PowerShell | `.\venv\Scripts\Activate.ps1` (if your organisation blocks scripts, use Command Prompt instead) |
| macOS / Linux | `source venv/bin/activate` (and use `python3` to create the venv) |

The prompt should now start with `(venv)`. **Activate it again in every new terminal.**

### 3. Install the Python packages

```cmd
python -m pip install -r requirements.txt
```

### 4. Create the database and user

Open **SQL Shell (psql)** (or `psql -U postgres` in a terminal) and log in as the **`postgres`** admin user. Then run:

```sql
CREATE USER aiden_user WITH PASSWORD 'choose-a-password';
CREATE DATABASE aiden OWNER aiden_user;
\q
```

The app uses its own limited user (`aiden_user`) instead of the `postgres` admin account. You may choose other names; just use the same ones in step 5.

### 5. Configure the connection (`.env`)

Copy the template:

| Shell | Command |
|---|---|
| Command Prompt | `copy .env.example .env` |
| PowerShell | `Copy-Item .env.example .env` |
| macOS / Linux | `cp .env.example .env` |

Edit `.env` and replace `YOUR_PASSWORD` with the password from step 4:

```text
DATABASE_URL=postgresql+psycopg://aiden_user:YOUR_PASSWORD@localhost:5432/aiden
```

- One line, no spaces around `=`, no quotes.
- If the password contains special characters, URL-encode them: `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`, `%` → `%25`.
- `.env` is ignored by Git. Never commit it.

### 6. Test the database connection

```cmd
python -c "from backend.database import engine; engine.connect(); print('Connected!')"
```

The last line should be `Connected!` (the SQL log lines above it are normal).

### 7. Create the table

The app does not create tables automatically. Run this once:

```cmd
python -c "import backend.models; from backend.database import Base, engine; Base.metadata.create_all(engine)"
```

Check that it worked:

```cmd
python -c "from sqlalchemy import inspect; from backend.database import engine; print(inspect(engine).get_table_names())"
```

Expected last line: `['applications']`.

---

## Run the application

You need **two terminals**, both in the project root with the venv activated, and PostgreSQL running.

**Terminal 1: backend API (port 8000)**

```cmd
uvicorn backend.main:app --reload --reload-dir backend
```

Wait for `Application startup complete.`

**Terminal 2: frontend files (port 5500)**

```cmd
python -m http.server 5500 --directory frontend
```

**Open in your browser:**

| URL | Page |
|---|---|
| http://127.0.0.1:5500/dashboard.html | Dashboard (start here) |
| http://127.0.0.1:5500/page1.html | New application |
| http://127.0.0.1:8000/docs | Interactive API documentation |

> ⚠️ Use **`127.0.0.1`**, not `localhost`, and keep the ports **8000** and **5500**.
> The frontend calls `http://127.0.0.1:8000`, and the backend's CORS setting only allows pages from `http://127.0.0.1:5500` (see `backend/main.py`). Opening the pages via `localhost` causes CORS errors.

**Stop:** press **Ctrl+C** in each terminal.

---

## Quick test

1. Dashboard → **+ New application** → fill in `Asha` / `asha@example.com` / `9876543210` → **Next**
2. Page 2 → choose **Pro**, tick the newsletter → **Save**
3. Review → **Submit application** → status changes to `submitted`
4. **Go to dashboard** → your application appears at the top with a green *submitted* badge
5. **Delete** → confirm → the row disappears

Try invalid input too: an empty form on page 1 shows validation errors (HTTP 422).

---

## API endpoints

| Method | Path | Purpose | Success |
|---|---|---|---|
| POST | `/api/applications` | Create (name, email, phone) | 201 |
| PATCH | `/api/applications/{id}` | Save preferences (plan, newsletter) | 200 |
| GET | `/api/applications/{id}` | Read one application | 200 |
| POST | `/api/applications/{id}/submit` | Submit (draft → submitted) | 200 |
| GET | `/api/applications?limit=5&offset=0` | Paginated list + total | 200 |
| DELETE | `/api/applications/{id}` | Delete permanently | 204 |
| GET | `/api/hello` | Smoke test | 200 |

Validation rules: name 1–100 characters, valid email, phone exactly 10 digits, plan `basic` or `pro`.
Business rules on submit: 404 if not found, 409 if already submitted, 400 if page 2 isn't completed.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `'uvicorn' is not recognized` / `ModuleNotFoundError` | The venv isn't active, or packages aren't installed: activate it and run `python -m pip install -r requirements.txt` |
| `Could not import module "backend.main"` | Run commands from the project root (the folder containing `backend/`) |
| `password authentication failed` | Wrong password in `.env`, or special characters not URL-encoded |
| `connection refused` on port 5432 | PostgreSQL isn't running. Start its service (Windows: `services.msc` → *postgresql*) |
| `relation "applications" does not exist` | Run the table-creation command (setup step 7) |
| Browser console: *blocked by CORS policy* | Open the pages via `http://127.0.0.1:5500`, not `localhost`. If it worked before, check the Uvicorn terminal: a server crash (500) also shows up as a CORS error |
| Browser console: `Failed to fetch` | The backend (terminal 1) isn't running |
| Port 8000 or 5500 already in use | Close the old terminal/server using it (`netstat -ano \| findstr :8000` shows the process ID) |
| Changes not visible | Hard-refresh with **Ctrl+F5** |

---

## Notes and limitations

This is a **learning proof of concept**, not production software:

- No authentication: anyone who can reach the API can list and delete applications.
- Delete is permanent (hard delete).
- Database schema changes require dropping and recreating the table (no migrations yet).
- SQL statements are printed to the terminal (`echo=True` in `backend/database.py`) for learning purposes.
- No automated tests yet.

## More documentation

- [`docs/COMPLETE_PROJECT_WALKTHROUGH.md`](docs/COMPLETE_PROJECT_WALKTHROUGH.md): technologies, build steps, file-by-file code explanation
- [`docs/ARCHITECTURE_AND_CRUD_FLOWS.md`](docs/ARCHITECTURE_AND_CRUD_FLOWS.md): diagrams, Create/Read/Update/Delete traces, session lifecycle
- [`docs/COMMANDS_REFERENCE.md`](docs/COMMANDS_REFERENCE.md): every command for setup, running, testing and troubleshooting
