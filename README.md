# ET Money Mentor — Multi‑Agent AI Financial Advisor

**Hackathon:** ET AI Hackathon 2026  
**Track:** 9 – AI Money Mentor  
**Technologies:** Vanilla JavaScript (ES modules), HTML5, CSS3, Gemini AI (optional)

---

## 📌 Overview

ET Money Mentor is an **agentic AI system** that delivers personalised financial advice through six specialised agents, orchestrated by an intelligent Crew Leader. The system is built to demonstrate real‑world enterprise workflows including tax optimisation, retirement planning, portfolio diagnostics, risk assessment, tax‑aware rebalancing, and market sentiment analysis.

The Crew Leader understands your financial goal (e.g., “I want to retire at 55, minimise taxes, and research technology stocks”), asks only the necessary questions, and runs the relevant agents – then synthesises the outputs into an actionable plan.

---

## 🧠 Agent Capabilities

- **Tax Wizard** – Compares Old vs New tax regimes using correct slab rates, finds missed deductions (80C, 80D, home loan), and recommends tax‑saving investments.
- **FIRE Planner** – Builds a month‑by‑month retirement roadmap with SIP allocation, insurance gap analysis, and dynamic scenario testing.
- **MF X‑Ray** – Calculates true XIRR (per‑fund weighted average), detects stock overlap across funds, measures expense ratio drag, and suggests tax‑aware rebalancing.
- **Risk Assessor** – Evaluates concentration risk and diversification score based on your mutual fund holdings.
- **Tax‑Aware Rebalancer** – Recommends fund switches considering LTCG/STCG tax implications.
- **Research Agent** – Fetches real‑time financial news (RSS from ET Markets) and performs sentiment analysis, suggesting funds based on market mood.

---

## 🏗️ Architecture

- **Pure JavaScript, no external frameworks** – Agents are implemented as ES classes with clear responsibilities.
- **Orchestrator‑Specialist pattern** – The `CrewLeader` decides which agents to run based on user input.
- **Simulated enterprise tools** – `ToolSet` class simulates APIs (TaxAPI, MarketDataAPI, PortfolioAPI) with configurable failure rates to demonstrate error recovery.
- **Audit trail** – Every agent action, tool call, and retry is logged in a floating panel.
- **Gemini AI integration** – Optional (free API key) for intelligent goal decomposition and natural‑language synthesis; falls back to smart rule‑based advice.

---

## 🚀 How to Run

1. **Download or clone** this repository.
2. **Serve the folder** with a local web server (required for ES modules):
   - **Python:** `python -m http.server` (then open `http://localhost:8000`)
   - **Node:** `npx serve .` (then open the URL shown)
   - **VS Code:** Install Live Server extension, right‑click `index.html` → Open with Live Server
3. **Open the URL** in a modern browser (Chrome, Edge, Firefox).
4. **Optional:** Add a free Gemini API key – click the ⚙️ button in the top‑right and paste your key from [Google AI Studio](https://aistudio.google.com/apikey). Without a key, the system falls back to smart rule‑based advice.

---

## 📂 Project Structure

```
et-money-mentor/
├── index.html               # Main entry point
├── css/
│   └── style.css            # Full styles (dark theme)
├── js/
│   ├── app.js               # Global initialisation, exports
│   ├── utils.js             # fmt, fmtL, sleep, parseNumber
│   ├── audit.js             # AuditLogger class
│   ├── tax.js               # computeTaxOldRegime, computeTaxNewRegime
│   ├── xirr.js              # xirr function (Newton‑Raphson)
│   ├── tools.js             # ToolSet (simulated APIs, failure injection)
│   ├── agents/
│   │   ├── TaxWizardAgent.js
│   │   ├── FIREPlannerAgent.js
│   │   ├── MFXRayAgent.js
│   │   ├── RiskAssessorAgent.js
│   │   ├── TaxAwareRebalancerAgent.js
│   │   └── ResearchAgent.js
│   ├── crewLeader.js        # CrewLeader class (orchestrator)
│   └── ui.js                # UI helpers (switchPanel, load scenarios)
├── README.md                # This file
└── requirements.txt         # (optional) indicates no Python dependencies
```

---

## 🛠️ Technologies Used

- **HTML5 / CSS3** – custom dark theme, responsive layout
- **JavaScript (ES2020)** – modular architecture, async/await, ES modules
- **Google Fonts** – Syne, DM Mono, Newsreader
- **Gemini 1.5 Flash** – optional LLM for natural language understanding
- **RSS Feeds** – ET Markets (via `allorigins.win` CORS proxy)

---

## 🔧 Customisation & Extensibility

- **Adding a new agent** – create a new class in `js/agents/` and add it to the Crew Leader.
- **Changing tax slabs** – update the functions in `js/tax.js` (old and new regime slabs are clearly defined).
- **Modifying the audit trail** – extend the `AuditLogger` class.

---

## 📝 License

This project is created for the ET AI Hackathon 2026. All code is open for educational and evaluation purposes.

---

**Built with ❤️ for the ET AI Hackathon 2026 – Track 9.**  
*Your financial future, intelligently guided.*
```