import { AuditLogger } from './audit.js';
import { simulateFailure, ToolSet } from './tools.js';
import { CrewLeader } from './crewLeader.js';
import * as ui from './ui.js';
import { sleep, fmt, fmtL, parseNumber } from './utils.js';
import { computeTaxOldRegime, computeTaxNewRegime } from './tax.js';
import { xirr } from './xirr.js';

const GEMINI_MODEL = 'gemini-2.5-flash';

export let audit = new AuditLogger();
export let holdings = [];
export let crewLeader;
export let geminiApiKey = localStorage.getItem('gemini_api_key') || null;

window.showSettingsModal = () => {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('api-key-input').value = geminiApiKey || '';
    }
};
window.closeSettingsModal = () => {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.remove('active');
};
window.testApiKey = async () => {
    const key = document.getElementById('api-key-input').value.trim();
    const resDiv = document.getElementById('api-test-result');
    if (!key) {
        resDiv.innerHTML = '❌ Enter a key.';
        resDiv.style.color = 'var(--red)';
        return;
    }
    resDiv.innerHTML = '⏳ Testing...';
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({ contents: [{ parts: [{ text: "Say 'API key works!' in under 10 words." }] }], generationConfig: { maxOutputTokens: 20 } })
            });
            clearTimeout(timeout);
            const data = await resp.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                resDiv.innerHTML = '✅ API key is valid!';
                resDiv.style.color = 'var(--green)';
                success = true;
                break;
            } else {
                resDiv.innerHTML = '❌ Invalid API key or error: ' + (data.error?.message || 'Unknown');
                resDiv.style.color = 'var(--red)';
                if (data.error?.message?.includes('quota') || data.error?.message?.includes('rate')) {
                    await sleep(1000);
                    continue;
                }
                break;
            }
        } catch (err) {
            console.warn(`Test attempt ${attempt+1} failed:`, err);
            if (attempt < 2) {
                resDiv.innerHTML = `⏳ Retrying (${attempt+1}/3)...`;
                await sleep(1000);
            } else {
                resDiv.innerHTML = '❌ Network error. Please check your connection.';
                resDiv.style.color = 'var(--red)';
            }
        }
    }
    if (!success && resDiv.innerHTML === '⏳ Testing...') {
        resDiv.innerHTML = '❌ Failed after 3 attempts. Check network or API key.';
        resDiv.style.color = 'var(--red)';
    }
};
window.saveApiKey = () => {
    const newKey = document.getElementById('api-key-input').value.trim();
    if (newKey) {
        geminiApiKey = newKey;
        localStorage.setItem('gemini_api_key', newKey);
        window.geminiApiKey = newKey;
    } else {
        geminiApiKey = null;
        localStorage.removeItem('gemini_api_key');
        window.geminiApiKey = null;
    }
    window.closeSettingsModal();
    updateAIStatus();
};
window.openAddFundModal = ui.openAddFundModal;
window.closeAddFundModal = ui.closeAddFundModal;
window.closeHoldingsQuizModal = ui.closeHoldingsQuizModal;
window.resolveHoldingsQuiz = (choice) => {
    ui.closeHoldingsQuizModal();
    if (crewLeader && crewLeader.holdingsResolve) {
        crewLeader.holdingsResolve(choice);
        crewLeader.holdingsResolve = null;
    }
};
window.addCustomFund = () => {
    const name = document.getElementById('new-fund-name').value.trim();
    if (!name) { alert('Please enter a fund name'); return; }
    const category = document.getElementById('new-fund-category').value;
    const invested = parseNumber(document.getElementById('new-fund-invested').value);
    const nav = parseNumber(document.getElementById('new-fund-nav').value);
    const units = parseNumber(document.getElementById('new-fund-units').value);
    const date = document.getElementById('new-fund-date').value;
    const expenseRatio = parseNumber(document.getElementById('new-fund-er').value);
    const stocksStr = document.getElementById('new-fund-stocks').value;
    const topStocks = stocksStr ? stocksStr.split(',').map(s => s.trim()) : [];
    // Update the global window.holdings directly
    window.holdings.push({ name, category, invested, currentNav: nav, units, purchaseDate: date, expenseRatio, topStocks });
    renderHoldings();
    ui.closeAddFundModal();
    // Reset form fields
    document.getElementById('new-fund-name').value = '';
    document.getElementById('new-fund-invested').value = '100000';
    document.getElementById('new-fund-nav').value = '100';
    document.getElementById('new-fund-units').value = '1000';
    document.getElementById('new-fund-date').value = '2023-01-01';
    document.getElementById('new-fund-er').value = '0.8';
    document.getElementById('new-fund-stocks').value = '';
};
window.removeHolding = (i) => {
    window.holdings.splice(i, 1);
    renderHoldings();
};
window.toggleAuditPanel = ui.toggleAuditPanel;
window.switchPanel = ui.switchPanel;
window.loadTaxScenario = ui.loadTaxScenario;
window.loadFIREScenario = ui.loadFIREScenario;
window.loadMFScenario = () => {
    const SCENARIO_FUNDS = [
        { name: 'Mirae Asset Large Cap Fund – Direct', invested: 300000, currentNav: 105, units: 2800, purchaseDate: '2022-04-01', category: 'Large Cap', expenseRatio: 0.52, topStocks: ['Reliance', 'HDFC Bank', 'Infosys', 'TCS'] },
        { name: 'Axis Bluechip Fund – Direct', invested: 250000, currentNav: 52, units: 4700, purchaseDate: '2021-09-15', category: 'Large Cap', expenseRatio: 0.45, topStocks: ['Reliance', 'HDFC Bank', 'Infosys', 'Bajaj Finance'] },
        { name: 'Nippon India Large Cap – Direct', invested: 200000, currentNav: 72, units: 2700, purchaseDate: '2023-01-10', category: 'Large Cap', expenseRatio: 0.85, topStocks: ['Reliance', 'HDFC Bank', 'Infosys', 'HUL'] },
        { name: 'HDFC Mid-Cap Opportunities – Direct', invested: 150000, currentNav: 140, units: 1050, purchaseDate: '2022-06-01', category: 'Mid Cap', expenseRatio: 0.95, topStocks: ['Voltas', 'Mphasis', 'Cholamandalam'] },
        { name: 'SBI Small Cap Fund – Direct', invested: 100000, currentNav: 130, units: 760, purchaseDate: '2021-03-20', category: 'Small Cap', expenseRatio: 0.68, topStocks: ['Sansera', 'Avalon Tech'] },
        { name: 'Parag Parikh Flexi Cap – Direct', invested: 200000, currentNav: 68, units: 2900, purchaseDate: '2020-11-01', category: 'Flexi Cap', expenseRatio: 0.58, topStocks: ['HDFC Bank', 'ITC', 'Alphabet'] }
    ];
    // Modify the global holdings array in place
    window.holdings.length = 0;
    window.holdings.push(...SCENARIO_FUNDS.map(f => ({ ...f, topStocks: [...f.topStocks] })));
    renderHoldings();
};
window.loadCrewExample = ui.loadCrewExample;
window.loadResearchExample = ui.loadResearchExample;
window.closeCrewQuestionModal = ui.closeCrewQuestionModal;
window.submitCrewAnswers = () => ui.submitCrewAnswers(crewLeader);

// renderHoldings now uses window.holdings as the single source of truth
function renderHoldings() {
    const el = document.getElementById('mf-holdings');
    if (!el) return;
    const hList = window.holdings;
    if (!hList.length) {
        el.innerHTML = `<div style="font-family:var(--font-mono);font-size:11px;color:var(--text3);padding:1rem 0;">No funds added. Click "Load Scenario Pack" or "Add Custom Fund".</div>`;
        return;
    }
    el.innerHTML = hList.map((h, i) => `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
            <div style="flex:1;"><div style="font-family:var(--font-head);font-size:12px;font-weight:600;">${h.name}</div><div style="font-family:var(--font-mono);font-size:10px;color:var(--text3);">${h.category} · ER: ${h.expenseRatio}%</div></div>
            <div style="text-align:right;"><div>${fmt(h.units * h.currentNav)}</div><div style="font-size:10px;color:${h.units * h.currentNav >= h.invested ? 'var(--green)' : 'var(--red)'};">${((h.units * h.currentNav / h.invested - 1) * 100).toFixed(1)}%</div></div>
            <button onclick="removeHolding(${i})" style="background:var(--red-dim);border:1px solid rgba(248,113,113,0.2);color:var(--red);border-radius:4px;padding:4px 8px;cursor:pointer;">×</button>
        </div>
    `).join('');
}

function updateAIStatus() {
    const statusDiv = document.getElementById('ai-mode-status');
    if (window.geminiApiKey) {
        statusDiv.innerHTML = '🤖 AI: Gemini active';
        statusDiv.style.color = 'var(--green)';
    } else {
        statusDiv.innerHTML = '🤖 AI: Smart fallback';
        statusDiv.style.color = 'var(--text3)';
    }
}

// Keep the exported holdings variable in sync with window.holdings
// This allows other modules that import 'holdings' to see updates
Object.defineProperty(window, 'holdings', {
    get() { return holdings; },
    set(val) { holdings = val; }
});

document.addEventListener('DOMContentLoaded', () => {
    if (geminiApiKey) window.geminiApiKey = geminiApiKey;
    crewLeader = new CrewLeader();
    window.crewLeader = crewLeader;
    renderHoldings();
    updateAIStatus();
    const toggle = document.getElementById('simulate-failure-toggle');
    if (toggle) {
        toggle.addEventListener('change', (e) => {
            window.simulateFailure = e.target.checked;
            audit.log('System', 'failure_simulation', window.simulateFailure ? 'enabled' : 'disabled', '');
        });
    }
});

window.audit = audit;
window.simulateFailure = false;