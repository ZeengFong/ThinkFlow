# Ayan, Tamjeed, Alec-franz, Luca, Mudit

---

# ThinkFlow 🧠🌊

A **Calgary Hacks 2026** project that helps users turn abstract problems into clear, actionable subtasks using AI-powered planning and hierarchical visual flows.

> **Think flowier, act like a plan.**

---

## 🚀 Features

- **AI Problem Breakdown:** Turn complex ideas and problems into smaller, actionable subtasks.
- **Visual Flow Mapping:** Organize projects and subtasks through interactive hierarchical flow diagrams.
- **Project Management:** Create and manage projects from one central workspace.
- **Task Tracking:** Organize and track individual tasks within a project.
- **File Uploads:** Upload project-related files to support planning and organization.
- **Interactive Interface:** Smooth animations and a modern visual experience.
- **Persistent Data:** Backend storage keeps project and task information organized.
- **Full-Stack Architecture:** Next.js frontend connected to a FastAPI backend.

---

## 📂 Project Structure

```text
ThinkFlow/
├── backend/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # SQLite database configuration
│   ├── pyproject.toml       # Backend dependencies and Python configuration
│   ├── uv.lock              # Locked Python dependencies
│   └── ...                  # Routes, models, services, and backend logic
│
├── frontend/
│   ├── src/
│   │   └── app/             # Next.js App Router pages and UI
│   ├── package.json         # Frontend dependencies and scripts
│   ├── next.config.ts       # Next.js configuration
│   ├── tsconfig.json        # TypeScript configuration
│   └── ...                  # Components, utilities, state, and styles
│
├── .gitattributes
└── README.md
```

---

## ⚙️ Installation

### Prerequisites

Before running ThinkFlow, make sure you have:

- **Git**
- **Node.js 20+**
- **npm**
- **Python 3.13+**
- **uv** recommended for the backend, or `pip` with a virtual environment

### Install Git

**Windows:**

```bash
winget install --id Git.Git -e
```

**macOS:**

```bash
brew install git
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install git
```

### Install Node.js

**Windows:**

```bash
winget install OpenJS.NodeJS.LTS
```

**macOS:**

```bash
brew install node
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install nodejs npm
```

### Install uv for the Python backend

**macOS / Linux:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**Windows PowerShell:**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

## ✅ Verify Installation

Run:

```bash
git --version
node --version
npm --version
python3 --version
uv --version
```

You should have:

- Node.js **20 or newer**
- Python **3.13 or newer**
- Git installed
- uv installed if you are using the recommended backend setup

---

## ⚡ Quick Setup

### 1. Clone the repository

```bash
git clone https://github.com/ZeengFong/ThinkFlow.git
cd ThinkFlow
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Install Backend Dependencies

#### Recommended: uv

```bash
cd backend
uv sync
cd ..
```

#### Or use pip

**macOS / Linux:**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install .
cd ..
```

**Windows:**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install .
cd ..
```

---

## ▶️ Run the Project

Open **two terminals**.

### Terminal 1 — Backend

From the ThinkFlow project folder:

```bash
cd backend
uv run uvicorn main:app --reload --port 8000
```

The backend will run on:

```text
http://localhost:8000
```

FastAPI documentation will be available at:

```text
http://localhost:8000/docs
```

You can check the backend health endpoint at:

```text
http://localhost:8000/health
```

If you installed the backend using `pip` instead of uv, activate your virtual environment and run:

```bash
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend

From the ThinkFlow project folder:

```bash
cd frontend
npm run dev
```

The frontend will normally run on:

```text
http://localhost:3000
```

---

## 🎮 How to Use

1. **Open ThinkFlow:** Visit `http://localhost:3000`.
2. **Get Started:** Enter the ThinkFlow workspace from the landing page.
3. **Create a Project:** Start a new project for an idea, goal, or problem.
4. **Describe the Problem:** Give ThinkFlow the problem or objective you want to organize.
5. **Break It Down:** Use the AI workflow to convert the problem into smaller actionable subtasks.
6. **Visualize the Flow:** View the project as a hierarchical visual flow.
7. **Manage Tasks:** Organize and update tasks as you work through the project.
8. **Upload Files:** Add relevant project files when needed.
9. **Track Progress:** Continue refining the flow until the project is complete.

---

## 📦 Tech Stack

### Frontend

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Framer Motion**
- **React Flow / XYFlow**
- **Zustand**
- **TanStack React Query**
- **Axios**
- **Radix UI**
- **Lucide React**
- **Supabase JavaScript SDK**

### Backend

- **Python 3.13+**
- **FastAPI**
- **Uvicorn**
- **SQLAlchemy**
- **SQLite**
- **OpenAI SDK**
- **Supabase Python SDK**
- **HTTPX**
- **PDFPlumber**
- **Python Multipart**
- **PyJWT**

---

## 🛠️ Features in Detail

### AI-Powered Planning

- Converts broad or abstract problems into structured, actionable subtasks.
- Provides an API layer for AI-assisted project planning.
- Helps users move from an idea to a concrete plan.

### Visual Workflow

- Displays project information through interactive flow-based visuals.
- Makes parent-child relationships between tasks easier to understand.
- Helps users see how individual subtasks connect to the larger goal.

### Project & Task Management

- Organizes work into separate projects.
- Supports task-based planning and structured project flows.
- Keeps project information accessible through a full-stack interface.

### File Support

- Includes backend upload functionality for project-related files.
- PDF processing support is available in the backend technology stack.

### Modern User Interface

- Built with Next.js and React.
- Uses Framer Motion for animations.
- Uses Tailwind CSS and reusable UI components for styling.
- Designed for an interactive and responsive experience.

### Backend API

ThinkFlow's FastAPI backend includes API areas for:

- Projects
- Flows
- Tasks
- AI
- File uploads

The backend also provides a health endpoint for checking whether the API is running.

---

## 📝 Setup Notes

- The backend creates a local SQLite database when it starts.
- Some AI or cloud-connected features may require environment variables or API credentials configured by the project team.
- Never commit API keys, passwords, tokens, or `.env` files containing secrets to GitHub.
- If the frontend cannot communicate with the backend, confirm that the backend is running on port `8000`.
- If port `3000` is already being used, Next.js may automatically start the frontend on another available port.
- Run `npm install` again if frontend dependencies change.
- Run `uv sync` again if backend dependencies change.

---

## 👥 Contributors

- **Ayan**
- **Tamjeed**
- **Alec-franz**
- **Luca**
- **Mudit**

---

Built with ❤️ for **Calgary Hacks 2026**

*Think flowier, act like a plan.*
