# Neural Trace

Neural Trace is an advanced, AI-assisted RTL (Register Transfer Level) verification planning system. Built to mirror the functionality of a modern IDE, Neural Trace enables hardware engineers to seamlessly edit RTL code, analyze the exact impact of their changes, and view AI-generated dependency graphs and verification suggestions—all in real time.

## 🚀 Key Features

- **Real-time RTL Editing:** Integrated powerful, VS Code-like editor utilizing Monaco Editor.
- **Git-like Version Control & Commits:** Track codebase states over time with an intuitive evolution timeline.
- **Diff Analysis:** Compare any two commits or your current working copy against a baseline.
- **AI-Driven Impact Analysis:** Powered by Groq AI (via Llama 3) through an optimized FastAPI backend. Automatically analyzes `old_rtl` versus `new_rtl` to identify modified modules, signals, and code blocks.
- **Dynamic Dependency Graphs:** Automatically visualizes impact mapping and data flow implications using React Flow and Dagre.
- **Intelligent Verification Suggestions:** Provides risk assessments and tailored verification scoping based on localized code changes.

## 🛠 Tech Stack

**Frontend**
- **Framework:** React 18, Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS, PostCSS, Framer Motion
- **Editor:** Monaco Editor (`@monaco-editor/react`)
- **Visuals & Graphing:** React Flow, Dagre, Lucide React

**Backend**
- **Framework:** FastAPI
- **Language:** Python
- **AI Integration:** Groq API (via `core.ai`)
- **Server:** Uvicorn

## 📂 Project Structure

```
NeuralTrace/
├── backend/                  # FastAPI backend server
│   ├── core/                 # Core logic, including Gemini AI engine
│   ├── main.py               # Main API application entry point
│   ├── requirements.txt      # Python dependencies
│   └── test_models.py        # Model testing utilities
├── frontend/                 # Vite + React frontend application
│   ├── src/                  # Application source code
│   ├── public/               # Public static assets
│   ├── package.json          # Node dependencies and scripts
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   └── vite.config.ts        # Vite configuration
├── .gitignore                # Root .gitignore for repository hygiene
└── README.md                 # Project documentation
```

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python 3.9+

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```
2. **Create a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables:**
   Ensure you configure your `.env` file inside the `backend/` directory with your Google Gemini API key or any other needed configurations.
5. **Run the backend server:**
   ```bash
   uvicorn main:app --reload
   ```
   The backend will start at `http://localhost:8000` (Development) or `https://sandisk.onrender.com/` (Production).

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run the development server:**
   ```bash
   npm run dev
   ```
4. **Access the application:**
   Open your browser and navigate to the URL provided by Vite (typically `http://localhost:5173`).

## 💡 Usage

1. Open the Neural Trace frontend.
2. Ensure the backend FastAPI server is running.
3. Paste or write your baseline RTL design in the editor.
4. Make new changes and watch as the backend diffs the `old_rtl` and `new_rtl`.
5. View the real-time AI-generated **Impact Analysis Graph** outlining precisely which modules and signals have been affected.
6. Check the **Suggestions Panel** for your tailored RTL verification test plan modifications.
