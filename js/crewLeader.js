import { sleep, fmt, fmtL, parseNumber } from './utils.js';
import { TaxWizardAgent } from './agents/TaxWizardAgent.js';
import { FIREPlannerAgent } from './agents/FIREPlannerAgent.js';
import { MFXRayAgent } from './agents/MFXRayAgent.js';
import { RiskAssessorAgent } from './agents/RiskAssessorAgent.js';
import { TaxAwareRebalancerAgent } from './agents/TaxAwareRebalancerAgent.js';
import { ResearchAgent } from './agents/ResearchAgent.js';
import { audit } from './app.js';

export class CrewLeader {
    constructor() {
        this.taxAgent = new TaxWizardAgent();
        this.fireAgent = new FIREPlannerAgent();
        this.mfAgent = new MFXRayAgent();
        this.riskAgent = new RiskAssessorAgent();
        this.rebalAgent = new TaxAwareRebalancerAgent();
        this.researchAgent = new ResearchAgent();
        this.holdingsResolve = null;
        this.pendingQuestions = null;
    }

    async callAI(prompt, data = null) {
        if (window.geminiApiKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.geminiApiKey}`;
                const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 500 } }) });
                if (!resp.ok) return null;
                const response = await resp.json();
                return response?.candidates?.[0]?.content?.parts[0]?.text || null;
            } catch (e) { console.warn(e); }
        }
        if (data && data.better) return `The ${data.better} regime saves you ${fmt(data.saving)}. Maximise 80C (₹1.5L), NPS ₹50K, and submit proofs before March 31.`;
        if (data && data.monthlySIP) return `Invest ${fmtL(data.monthlySIP)} monthly for ${data.yearsToRetire} years. Increase SIP yearly by 10% to reduce pressure.`;
        if (data && data.xirr) return `XIRR is ${data.xirr.toFixed(1)}%. Reduce overlap and shift to direct plans to cut expense ratio.`;
        return "⚠️ AI unavailable. Showing rule-based insights.";
    }

    async synthesize(goal, agentResults) {
        let summary = "";
        if (agentResults.TaxWizard) {
            const tax = agentResults.TaxWizard;
            summary += `Tax: ${tax.better} regime saves ${fmt(tax.saving)}. `;
        }
        if (agentResults.FIREPlanner) {
            const fire = agentResults.FIREPlanner;
            summary += `FIRE: Need ${fmtL(fire.monthlySIP)}/mo for ${fire.yearsToRetire} yrs. `;
        }
        if (agentResults.MFXRay) {
            const mf = agentResults.MFXRay;
            summary += `MF: XIRR ${mf.avgXirr.toFixed(1)}%. `;
        }
        if (agentResults.RiskAssessor) {
            const risk = agentResults.RiskAssessor;
            summary += `Risk: ${(risk.concentration * 100).toFixed(1)}% concentration. `;
        }
        if (agentResults.TaxAwareRebalancer) {
            const switches = agentResults.TaxAwareRebalancer;
            if (switches.length) summary += `Rebalance: Save ${fmt(switches[0].savings)}/yr. `;
        }
        if (agentResults.ResearchAgent) {
            const research = agentResults.ResearchAgent;
            summary += `Market sentiment: ${research.overallSentiment}. `;
        }
        if (!summary) summary = "No agent results available.";
        const prompt = `User goal: "${goal}"\nSummary: ${summary}\nGive a sharp actionable plan in 2–3 sentences.`;
        const aiResponse = await this.callAI(prompt);
        return aiResponse || summary;
    }

    async askQuestionsForAgents(agents) {
        return new Promise((resolve) => {
            this.pendingQuestions = { agents, answers: {}, resolve };
            const container = document.getElementById('crew-questions-container');
            container.innerHTML = '';
            let html = '';
            for (const agent of agents) {
                if (agent === 'TaxWizard') {
                    html += `<div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                        <strong>📋 Tax Wizard</strong>
                        <div class="form-grid" style="margin-top: 0.5rem;">
                            <div class="field"><label>Basic Salary (Annual ₹)</label><input type="number" id="q_t_basic" value="${document.getElementById('t-basic')?.value || '1800000'}"></div>
                            <div class="field"><label>HRA Component (Annual ₹)</label><input type="number" id="q_t_hra" value="${document.getElementById('t-hra')?.value || '360000'}"></div>
                            <div class="field"><label>Special Allowance (Annual ₹)</label><input type="number" id="q_t_special" value="${document.getElementById('t-special')?.value || '200000'}"></div>
                            <div class="field"><label>Other Income (Annual ₹)</label><input type="number" id="q_t_other" value="${document.getElementById('t-other')?.value || '0'}"></div>
                            <div class="field"><label>80C (₹)</label><input type="number" id="q_t_80c" value="${document.getElementById('t-80c')?.value || '150000'}"></div>
                            <div class="field"><label>NPS (₹)</label><input type="number" id="q_t_nps" value="${document.getElementById('t-nps')?.value || '50000'}"></div>
                            <div class="field"><label>Home Loan Interest (₹)</label><input type="number" id="q_t_homeloan" value="${document.getElementById('t-homeloan')?.value || '40000'}"></div>
                            <div class="field"><label>Health Insurance (80D) (₹)</label><input type="number" id="q_t_80d" value="${document.getElementById('t-80d')?.value || '25000'}"></div>
                            <div class="field"><label>Rent Paid (Annual ₹)</label><input type="number" id="q_t_rent" value="${document.getElementById('t-rent')?.value || '240000'}"></div>
                            <div class="field"><label>City Type</label><select id="q_t_city"><option value="metro" ${document.getElementById('t-city')?.value === 'metro' ? 'selected' : ''}>Metro</option><option value="nonmetro" ${document.getElementById('t-city')?.value === 'nonmetro' ? 'selected' : ''}>Non-Metro</option></select></div>
                        </div>
                    </div>`;
                }
                if (agent === 'FIREPlanner') {
                    html += `<div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                        <strong>🔥 FIRE Planner</strong>
                        <div class="form-grid" style="margin-top: 0.5rem;">
                            <div class="field"><label>Current Age</label><input type="number" id="q_f_age" value="${document.getElementById('f-age')?.value || '34'}"></div>
                            <div class="field"><label>Target Retirement Age</label><input type="number" id="q_f_retire_age" value="${document.getElementById('f-retire-age')?.value || '50'}"></div>
                            <div class="field"><label>Annual Income (₹)</label><input type="number" id="q_f_income" value="${document.getElementById('f-income')?.value || '2400000'}"></div>
                            <div class="field"><label>Annual Expenses (₹)</label><input type="number" id="q_f_expenses" value="${document.getElementById('f-expenses')?.value || '1200000'}"></div>
                            <div class="field"><label>MF Value (₹)</label><input type="number" id="q_f_mf" value="${document.getElementById('f-mf')?.value || '1800000'}"></div>
                            <div class="field"><label>PPF Balance (₹)</label><input type="number" id="q_f_ppf" value="${document.getElementById('f-ppf')?.value || '600000'}"></div>
                            <div class="field"><label>EPF Balance (₹)</label><input type="number" id="q_f_epf" value="${document.getElementById('f-epf')?.value || '500000'}"></div>
                            <div class="field"><label>Direct Equity (₹)</label><input type="number" id="q_f_equity" value="${document.getElementById('f-equity')?.value || '0'}"></div>
                            <div class="field"><label>Monthly Draw (Today's ₹)</label><input type="number" id="q_f_monthly_draw" value="${document.getElementById('f-monthly-draw')?.value || '150000'}"></div>
                            <div class="field"><label>Inflation (%)</label><input type="number" id="q_f_inflation" value="${document.getElementById('f-inflation')?.value || '6'}"></div>
                            <div class="field"><label>Equity Return (%)</label><input type="number" id="q_f_eq_return" value="${document.getElementById('f-eq-return')?.value || '12'}"></div>
                            <div class="field"><label>Debt Return (%)</label><input type="number" id="q_f_debt_return" value="${document.getElementById('f-debt-return')?.value || '7'}"></div>
                        </div>
                    </div>`;
                }
                if (agent === 'ResearchAgent') {
                    html += `<div style="margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
                        <strong>🔍 Research Agent</strong>
                        <div class="form-grid" style="margin-top: 0.5rem;">
                            <div class="field full"><label>Stock / Sector to research</label><input type="text" id="q_research_topic" value="${document.getElementById('research-topic')?.value || 'Reliance'}"></div>
                            <div class="field full"><label><input type="checkbox" id="q_use_realtime" ${document.getElementById('use-realtime-news')?.checked ? 'checked' : ''}> Use real‑time news (RSS)</label></div>
                        </div>
                    </div>`;
                }
            }
            if (html === '') {
                resolve({});
                return;
            }
            container.innerHTML = html;
            document.getElementById('crew-question-modal').classList.add('active');
        });
    }

    submitAnswers() {
        const answers = {};
        for (const agent of this.pendingQuestions.agents) {
            if (agent === 'TaxWizard') {
                answers.tax = {
                    basic: parseNumber(document.getElementById('q_t_basic')?.value),
                    hra: parseNumber(document.getElementById('q_t_hra')?.value),
                    special: parseNumber(document.getElementById('q_t_special')?.value),
                    other: parseNumber(document.getElementById('q_t_other')?.value),
                    ded80c: parseNumber(document.getElementById('q_t_80c')?.value),
                    nps: parseNumber(document.getElementById('q_t_nps')?.value),
                    homeloan: parseNumber(document.getElementById('q_t_homeloan')?.value),
                    ded80d: parseNumber(document.getElementById('q_t_80d')?.value),
                    rent: parseNumber(document.getElementById('q_t_rent')?.value),
                    isMetro: document.getElementById('q_t_city')?.value === 'metro'
                };
            }
            if (agent === 'FIREPlanner') {
                answers.fire = {
                    age: parseNumber(document.getElementById('q_f_age')?.value),
                    retireAge: parseNumber(document.getElementById('q_f_retire_age')?.value),
                    income: parseNumber(document.getElementById('q_f_income')?.value),
                    expenses: parseNumber(document.getElementById('q_f_expenses')?.value),
                    mf: parseNumber(document.getElementById('q_f_mf')?.value),
                    ppf: parseNumber(document.getElementById('q_f_ppf')?.value),
                    epf: parseNumber(document.getElementById('q_f_epf')?.value),
                    equity: parseNumber(document.getElementById('q_f_equity')?.value),
                    monthlyDraw: parseNumber(document.getElementById('q_f_monthly_draw')?.value),
                    inflation: parseNumber(document.getElementById('q_f_inflation')?.value),
                    eqReturn: parseNumber(document.getElementById('q_f_eq_return')?.value),
                    debtReturn: parseNumber(document.getElementById('q_f_debt_return')?.value)
                };
            }
            if (agent === 'ResearchAgent') {
                answers.research = {
                    topic: document.getElementById('q_research_topic')?.value || 'Reliance',
                    useReal: document.getElementById('q_use_realtime')?.checked || false
                };
            }
        }
        if (answers.tax) {
            document.getElementById('t-basic').value = answers.tax.basic;
            document.getElementById('t-hra').value = answers.tax.hra;
            document.getElementById('t-special').value = answers.tax.special;
            document.getElementById('t-other').value = answers.tax.other;
            document.getElementById('t-80c').value = answers.tax.ded80c;
            document.getElementById('t-nps').value = answers.tax.nps;
            document.getElementById('t-homeloan').value = answers.tax.homeloan;
            document.getElementById('t-80d').value = answers.tax.ded80d;
            document.getElementById('t-rent').value = answers.tax.rent;
            document.getElementById('t-city').value = answers.tax.isMetro ? 'metro' : 'nonmetro';
        }
        if (answers.fire) {
            document.getElementById('f-age').value = answers.fire.age;
            document.getElementById('f-retire-age').value = answers.fire.retireAge;
            document.getElementById('f-income').value = answers.fire.income;
            document.getElementById('f-expenses').value = answers.fire.expenses;
            document.getElementById('f-mf').value = answers.fire.mf;
            document.getElementById('f-ppf').value = answers.fire.ppf;
            document.getElementById('f-epf').value = answers.fire.epf;
            document.getElementById('f-equity').value = answers.fire.equity;
            document.getElementById('f-monthly-draw').value = answers.fire.monthlyDraw;
            document.getElementById('f-inflation').value = answers.fire.inflation;
            document.getElementById('f-eq-return').value = answers.fire.eqReturn;
            document.getElementById('f-debt-return').value = answers.fire.debtReturn;
        }
        if (answers.research) {
            document.getElementById('research-topic').value = answers.research.topic;
            document.getElementById('use-realtime-news').checked = answers.research.useReal;
        }
        document.getElementById('crew-question-modal').classList.remove('active');
        this.pendingQuestions.resolve(answers);
        this.pendingQuestions = null;
    }

    createPipeline(title, steps, pipelineId) {
        const stepsHtml = steps.map((s, i) => `<div class="pipeline-step"><div class="step-dot ${i === 0 ? 'active' : ''}">${i + 1}</div><div class="step-label">${s}</div></div>`).join('');
        return `<div class="pipeline" id="${pipelineId}"><div class="pipeline-title">Agent Pipeline — ${title}</div><div class="pipeline-steps">${stepsHtml}</div></div>`;
    }

    setPipelineStep(containerId, total, activeIdx) {
        const pipeline = document.getElementById(containerId);
        if (!pipeline) return;
        const dots = pipeline.querySelectorAll('.step-dot');
        dots.forEach((d, i) => {
            d.className = 'step-dot';
            if (i < activeIdx) { d.classList.add('done'); d.textContent = '✓'; }
            else if (i === activeIdx) { d.classList.add('active'); d.textContent = i + 1; }
            else d.textContent = i + 1;
        });
    }

    _getNumber(id, def = 0) { return parseNumber(document.getElementById(id)?.value, def); }
    _getString(id, def = '') { return document.getElementById(id)?.value || def; }

    async runTax(silent = false) {
        const btn = document.getElementById('tax-btn');
        if (btn) btn.disabled = true;
        const resultsDiv = document.getElementById('tax-results');
        if (!silent && resultsDiv) {
            resultsDiv.innerHTML = this.createPipeline('Tax Wizard', ['Parse inputs', 'Calculate HRA', 'Call Tax API', 'Get recommendations', 'Generate plan'], 'tax-pipeline');
            await sleep(300);
            this.setPipelineStep('tax-pipeline', 5, 0);
        }
        const input = {
            basic: this._getNumber('t-basic'),
            hra: this._getNumber('t-hra'),
            special: this._getNumber('t-special'),
            other: this._getNumber('t-other'),
            ded80c: Math.min(this._getNumber('t-80c'), 150000),
            nps: Math.min(this._getNumber('t-nps'), 50000),
            homeloan: Math.min(this._getNumber('t-homeloan'), 200000),
            ded80d: this._getNumber('t-80d'),
            rent: this._getNumber('t-rent'),
            isMetro: document.getElementById('t-city')?.value === 'metro'
        };
        if (!silent && resultsDiv) { await sleep(400); this.setPipelineStep('tax-pipeline', 5, 1); }
        const result = await this.taxAgent.execute(input);
        if (!silent && resultsDiv) {
            await sleep(500);
            this.setPipelineStep('tax-pipeline', 5, 2);
            this.renderTaxResults(result, resultsDiv);
            await sleep(500);
            this.setPipelineStep('tax-pipeline', 5, 3);
            const aiDiv = document.createElement('div');
            aiDiv.className = 'output-card';
            aiDiv.innerHTML = `<div class="card-header"><div class="card-title">🤖 AI Agent — Missed Deductions & Recommendations</div><div class="card-badge badge-amber">Analysing...</div></div><div class="card-body"><div class="stream-text" id="tax-ai-text"></div></div>`;
            resultsDiv.appendChild(aiDiv);
            const aiText = document.getElementById('tax-ai-text');
            if (aiText) {
                aiText.innerHTML = '<span class="stream-cursor"></span>';
                const missedStr = result.missedDeductions.length ? result.missedDeductions.join(', ') : 'None';
                const prompt = `User: gross income ${fmt(result.gross)}, better regime ${result.better} (saves ${fmt(result.saving)}). Missed deductions: ${missedStr}. Give 2-3 specific tax-saving actions with exact amounts, one must-do before March 31, and one edge case (e.g., LTCG). Keep under 150 words.`;
                const aiResp = await this.callAI(prompt, { better: result.better, saving: result.saving, missed: result.missedDeductions });
                await this.typeText(aiText, aiResp);
            }
            aiDiv.querySelector('.card-badge').className = 'card-badge badge-green';
            aiDiv.querySelector('.card-badge').textContent = 'Done';
            this.setPipelineStep('tax-pipeline', 5, 4);
        }
        if (btn) btn.disabled = false;
        return result;
    }

    renderTaxResults(result, container) {
        const outputDiv = document.createElement('div');
        outputDiv.innerHTML = `
            <div class="output-card">
                <div class="card-header"><div class="card-title">📊 Regime Comparison</div><div class="card-badge ${result.better === 'Old' ? 'badge-green' : 'badge-blue'}">${result.better} Regime Optimal</div></div>
                <div class="card-body"><table class="tax-table"><thead> <th>Component</th><th>Old Regime</th><th>New Regime</th> </thead><tbody>
                    <tr><td>Gross Income</td><td>${fmt(result.gross)}</td><td>${fmt(result.gross)}</td></tr>
                    <tr><td>HRA Exemption</td><td>− ${fmt(result.hraExempt)}</td><td>Not allowed</td></tr>
                    <tr><td>Standard Deduction</td><td>− ₹75,000</td><td>− ₹75,000</td></tr>
                    <tr><td>Taxable Income</td><td>${fmt(result.taxableOld)}</td><td>${fmt(result.taxableNew)}</td></tr>
                    <tr class="highlight"><td><strong>Total Tax</strong></td><td><strong>${fmt(result.oldTax)}</strong></td><td><strong>${fmt(result.newTax)}</strong></td></tr>
                </tbody></table></div>
            </div>
            <div class="metric-row">
                <div class="metric"><div class="metric-label">Optimal Regime</div><div class="metric-value ${result.better === 'Old' ? 'green' : 'blue'}">${result.better}</div></div>
                <div class="metric"><div class="metric-label">Annual Saving</div><div class="metric-value green">${fmt(result.saving)}</div></div>
                <div class="metric"><div class="metric-label">Effective Tax Rate</div><div class="metric-value amber">${((result.better === 'Old' ? result.oldTax : result.newTax) / result.gross * 100).toFixed(1)}%</div></div>
            </div>
            <div class="output-card"><div class="card-header"><div class="card-title">📈 Investment Recommendations</div></div><div class="card-body"><ul style="margin-left:1.5rem; color:var(--text2);">${result.recommendations.map(r => `<li>${r}</li>`).join('')}</ul></div></div>
        `;
        container.appendChild(outputDiv);
        this.addDisclaimer(container);
    }

    async runFIRE(silent = false) {
        const btn = document.getElementById('fire-btn');
        if (btn) btn.disabled = true;
        const resultsDiv = document.getElementById('fire-results');
        if (!silent && resultsDiv) {
            resultsDiv.innerHTML = this.createPipeline('FIRE Planner', ['Load inputs', 'Fetch market data', 'Calculate corpus', 'SIP plan', 'AI insights'], 'fire-pipeline');
            await sleep(300);
            this.setPipelineStep('fire-pipeline', 5, 0);
        }
        const input = {
            age: this._getNumber('f-age'),
            retireAge: this._getNumber('f-retire-age'),
            income: this._getNumber('f-income'),
            expenses: this._getNumber('f-expenses'),
            mf: this._getNumber('f-mf'),
            ppf: this._getNumber('f-ppf'),
            epf: this._getNumber('f-epf'),
            equity: this._getNumber('f-equity'),
            monthlyDraw: this._getNumber('f-monthly-draw'),
            inflation: this._getNumber('f-inflation', 6),
            eqReturn: this._getNumber('f-eq-return', 12),
            debtReturn: this._getNumber('f-debt-return', 7)
        };
        if (!silent && resultsDiv) { await sleep(400); this.setPipelineStep('fire-pipeline', 5, 1); }
        let result;
        try {
            result = await this.fireAgent.execute(input);
        } catch (err) {
            if (!silent && resultsDiv) resultsDiv.innerHTML += `<div class="output-card"><div class="card-header">❌ Error</div><div class="card-body">${err.message}</div></div>`;
            if (btn) btn.disabled = false;
            return null;
        }
        if (!silent && resultsDiv) {
            await sleep(500);
            this.setPipelineStep('fire-pipeline', 5, 2);
            const fireOutput = document.createElement('div');
            fireOutput.innerHTML = `
                <div class="metric-row">
                    <div class="metric"><div class="metric-label">Required Corpus</div><div class="metric-value amber">${fmtL(result.requiredCorpus)}</div></div>
                    <div class="metric"><div class="metric-label">Current Trajectory</div><div class="metric-value ${result.fvCurrent >= result.requiredCorpus ? 'green' : 'amber'}">${fmtL(result.fvCurrent)}</div></div>
                    <div class="metric"><div class="metric-label">Monthly SIP Needed</div><div class="metric-value ${result.feasible ? 'green' : 'red'}">${fmtL(result.monthlySIP)}</div></div>
                </div>
                <div class="output-card"><div class="card-header"><div class="card-title">📂 Recommended SIP Allocation</div><div class="card-badge badge-blue">Total ${fmt(result.monthlySIP)}/mo</div></div><div class="card-body">${result.sipAlloc.map(s => `<div class="sip-row"><div class="sip-label">${s.name}</div><div class="sip-track"><div class="sip-fill" style="width:${s.pct * 100}%;background:${s.color}"></div></div><div class="sip-amount">${fmt(result.monthlySIP * s.pct)}/mo</div></div>`).join('')}</div></div></div>
                <div class="output-card"><div class="card-header"><div class="card-title">🛡️ Insurance Gap Analysis</div></div><div class="card-body"><div class="metric"><div class="metric-label">Term Cover Needed</div><div class="metric-value red">${fmtL(result.insuranceNeeded)}</div><div class="metric-sub">15x income minus EPF</div></div></div></div>
            `;
            resultsDiv.appendChild(fireOutput);
            await sleep(500);
            this.setPipelineStep('fire-pipeline', 5, 3);
            const aiDiv = document.createElement('div');
            aiDiv.className = 'output-card';
            aiDiv.innerHTML = `<div class="card-header"><div class="card-title">🤖 AI Agent — Personalised FIRE Roadmap</div><div class="card-badge badge-amber">Generating...</div></div><div class="card-body"><div class="stream-text" id="fire-ai-text"></div></div>`;
            resultsDiv.appendChild(aiDiv);
            const aiText = document.getElementById('fire-ai-text');
            if (aiText) {
                aiText.innerHTML = '<span class="stream-cursor"></span>';
                const prompt = `FIRE plan: need ${fmtL(result.monthlySIP)}/mo SIP for ${result.yearsToRetire} years. Corpus target ${fmtL(result.requiredCorpus)}. Give one immediate action, one hidden risk, and effect of retiring 5 years later. 150 words.`;
                const aiResp = await this.callAI(prompt, { monthlySIP: result.monthlySIP, yearsToRetire: result.yearsToRetire, requiredCorpus: result.requiredCorpus });
                await this.typeText(aiText, aiResp);
            }
            aiDiv.querySelector('.card-badge').className = 'card-badge badge-green';
            aiDiv.querySelector('.card-badge').textContent = 'Done';
            this.setPipelineStep('fire-pipeline', 5, 4);
        }
        if (btn) btn.disabled = false;
        this.addDisclaimer(resultsDiv);
        return result;
    }

    async runMFXRay(silent = false) {
        if (window.holdings && window.holdings.length === 0) {
            if (!silent) this.showHoldingsRequiredModal();
            return null;
        }
        const btn = document.getElementById('mf-btn');
        if (btn) btn.disabled = true;
        const resultsDiv = document.getElementById('mf-results');
        if (!silent && resultsDiv) {
            resultsDiv.innerHTML = this.createPipeline('MF X-Ray', ['Load holdings', 'Fetch portfolio data', 'Calculate XIRR', 'Overlap & expense', 'AI insights'], 'mf-pipeline');
            await sleep(300);
            this.setPipelineStep('mf-pipeline', 5, 0);
        }
        const result = await this.mfAgent.execute(window.holdings);
        if (!silent && resultsDiv) {
            await sleep(500);
            this.setPipelineStep('mf-pipeline', 5, 1);
            const mfOutput = document.createElement('div');
            mfOutput.innerHTML = `
                <div class="metric-row">
                    <div class="metric"><div class="metric-label">Total Invested</div><div class="metric-value">${fmtL(result.totalInv)}</div></div>
                    <div class="metric"><div class="metric-label">Current Value</div><div class="metric-value green">${fmtL(result.totalCurr)}</div></div>
                    <div class="metric"><div class="metric-label">Portfolio XIRR</div><div class="metric-value ${result.avgXirr > 12 ? 'green' : result.avgXirr > 8 ? 'amber' : 'red'}">${result.avgXirr.toFixed(1)}%</div></div>
                </div>
            `;
            resultsDiv.appendChild(mfOutput);

            if (result.overlapping.length) {
                const overlapDiv = document.createElement('div');
                overlapDiv.className = 'output-card';
                overlapDiv.innerHTML = `
                    <div class="card-header"><div class="card-title">🔍 Stock Overlap Analysis</div><div class="card-badge badge-red">${result.overlapping.length} high‑overlap stocks</div></div>
                    <div class="card-body">
                        <table class="tax-table"><thead> <th>Stock</th><th>Appears in</th> </thead>
                        <tbody>${result.overlapping.map(([s, c]) => `<tr><td>${s}</td><td style="text-align:center">${c} of ${window.holdings.length}</td></tr>`).join('')}</tbody>
                        </table>
                        <div style="margin-top:0.5rem;font-size:10px;">⚠ You're paying multiple expense ratios for the same core holdings.</div>
                    </div>`;
                resultsDiv.appendChild(overlapDiv);
            }

            await sleep(500);
            this.setPipelineStep('mf-pipeline', 5, 2);
            const dragDiv = document.createElement('div');
            dragDiv.className = 'output-card';
            dragDiv.innerHTML = `
                <div class="card-header"><div class="card-title">💸 Expense Ratio Drag</div><div class="card-badge badge-amber">Annual cost: ${fmt(result.annualDrag)}</div></div>
                <div class="card-body"><div class="metric-row"><div class="metric"><div class="metric-label">Your Avg ER</div><div class="metric-value amber">${result.weightedER.toFixed(2)}%</div></div><div class="metric"><div class="metric-label">Direct Plan Avg</div><div class="metric-value green">0.15%</div></div><div class="metric"><div class="metric-label">Annual Drag</div><div class="metric-value red">${fmt(result.annualDrag)}</div></div></div></div></div>
            `;
            resultsDiv.appendChild(dragDiv);
            await sleep(500);
            this.setPipelineStep('mf-pipeline', 5, 3);
            const rebal = result.highERfunds.map(f => `<div class="rec-item"><div class="rec-dot"></div><div class="rec-text"><strong>SWITCH:</strong> ${f.name} (ER ${f.expenseRatio}%) → direct plan to save ~${fmt((f.expenseRatio - 0.15) / 100 * f.units * f.currentNav)}/yr.</div></div>`).join('');
            const rebalDiv = document.createElement('div');
            rebalDiv.className = 'output-card';
            rebalDiv.innerHTML = `<div class="card-header"><div class="card-title">⚖️ Rebalancing Plan — Tax‑Aware</div></div><div class="card-body"><div class="rec-list">${rebal || '<div class="rec-item"><div class="rec-dot"></div><div class="rec-text">No high‑cost funds. Maintain diversification.</div></div>'}</div></div></div>`;
            resultsDiv.appendChild(rebalDiv);
            const aiDiv = document.createElement('div');
            aiDiv.className = 'output-card';
            aiDiv.innerHTML = `<div class="card-header"><div class="card-title">🤖 AI Agent — Cross‑Agent Synthesis</div><div class="card-badge badge-amber">Generating...</div></div><div class="card-body"><div class="stream-text" id="mf-ai-text"></div></div>`;
            resultsDiv.appendChild(aiDiv);
            const aiText = document.getElementById('mf-ai-text');
            if (aiText) {
                aiText.innerHTML = '<span class="stream-cursor"></span>';
                const prompt = `Portfolio: ${window.holdings.length} funds, XIRR ${result.avgXirr.toFixed(1)}%, overlapping in ${result.overlapping.map(o => o[0]).join(',')}. Give one immediate action, one tax implication, and one thing to keep. 120 words.`;
                const aiResp = await this.callAI(prompt, { xirr: result.avgXirr, overlap: result.overlapping });
                await this.typeText(aiText, aiResp);
            }
            aiDiv.querySelector('.card-badge').className = 'card-badge badge-green';
            aiDiv.querySelector('.card-badge').textContent = 'Done';
            this.setPipelineStep('mf-pipeline', 5, 4);
        }
        if (btn) btn.disabled = false;
        this.addDisclaimer(resultsDiv);
        return result;
    }

    async runRiskAssessor(silent = false) {
        if (window.holdings && window.holdings.length === 0) {
            if (!silent) this.showHoldingsRequiredModal();
            return null;
        }
        const res = await this.riskAgent.execute(window.holdings);
        if (!silent) {
            const div = document.getElementById('risk-results');
            if (div) {
                div.innerHTML = `<div class="output-card">
                    <div class="card-header">
                        <div class="card-title">⚠️ Risk Assessment</div>
                        <div class="card-badge ${res.riskLevel === 'High' ? 'badge-red' : 'badge-amber'}">${res.riskLevel}</div>
                    </div>
                    <div class="card-body">
                        <div style="margin-bottom:8px;"><strong>Concentration Risk:</strong> ${(res.concentration * 100).toFixed(1)}% of portfolio in a single fund</div>
                        <div style="margin-bottom:8px;"><strong>Risk Level:</strong> ${res.riskLevel}</div>
                        <div style="margin-bottom:8px;"><strong>Diversification Score:</strong> ${res.diversificationScore} / 10</div>
                        <div><strong>Unique Stocks:</strong> ${res.uniqueStocks}</div>
                        ${res.concentration > 0.3 ? '<div class="disclaimer" style="margin-top:12px;">⚠️ High concentration risk – consider diversifying across more funds.</div>' : ''}
                    </div>
                </div>`;
                this.addDisclaimer(div);
            }
        }
        return res;
    }

    async runRebalancer(silent = false) {
        if (window.holdings && window.holdings.length === 0) {
            if (!silent) this.showHoldingsRequiredModal();
            return null;
        }
        const switches = await this.rebalAgent.execute(window.holdings);
        if (!silent) {
            const div = document.getElementById('rebal-results');
            if (div) {
                div.innerHTML = `<div class="output-card">
                    <div class="card-header"><div class="card-title">🔄 Tax‑Aware Switch Plan</div></div>
                    <div class="card-body">
                        ${switches.map(s => `<div>• ${s.from} → ${s.to} (Save ${fmt(s.savings)}/yr, Tax impact: ${s.tax})</div>`).join('')}
                        <div class="disclaimer" style="margin-top:12px;">Note: LTCG on equity above ₹1L is taxed at 10%; STCG at 15%. Consider holding periods before switching.</div>
                    </div>
                </div>`;
                this.addDisclaimer(div);
            }
        }
        return switches;
    }

    async runResearch(silent = false) {
        const topic = this._getString('research-topic', 'Reliance');
        const resultsDiv = document.getElementById('research-results');
        if (!silent && resultsDiv) {
            resultsDiv.innerHTML = `<div class="pipeline"><div class="pipeline-title">Research Agent</div><div class="stream-text"><div class="loader"></div> Fetching latest news...</div></div>`;
        }
        const res = await this.researchAgent.execute(topic);
        if (!silent) {
            const div = document.getElementById('research-results');
            if (div) {
                div.innerHTML = `<div class="output-card"><div class="card-header">🔍 Research: ${topic}</div><div class="card-body">
                    <div><strong>Overall Sentiment:</strong> ${res.overallSentiment.toUpperCase()}</div>
                    <div style="margin-top:8px;"><strong>Headlines:</strong><ul>${res.headlines.map(h => `<li><a href="${h.url}" target="_blank" style="color:var(--blue); text-decoration:none;">${h.text}</a> (${h.sentiment})</li>`).join('')}</ul></div>
                    <div><strong>Suggested Funds:</strong> ${res.suggestedFunds.join(', ')}</div>
                </div></div>`;
                this.addDisclaimer(div);
            }
        }
        return res;
    }

    showHoldingsRequiredModal() {
        document.getElementById('holdings-quiz-modal').classList.add('active');
    }

    addDisclaimer(container) {
        if (!container) return;
        if (container.querySelector('.sebi-disclaimer')) return;
        const disclaimer = document.createElement('div');
        disclaimer.className = 'disclaimer sebi-disclaimer';
        disclaimer.style.marginTop = '1rem';
        disclaimer.style.background = 'var(--surface)';
        disclaimer.style.borderLeft = '3px solid var(--accent)';
        disclaimer.innerHTML = `<strong>SEBI Disclaimer:</strong> This is an AI‑generated analysis for educational purposes only. It does not constitute investment advice or a recommendation to buy/sell any security. Past performance does not guarantee future returns. Please consult a SEBI‑registered investment advisor before making any investment decisions.`;
        container.appendChild(disclaimer);
    }

    async typeText(el, text) {
        el.innerHTML = '';
        const words = text.split(' ');
        for (let i = 0; i < words.length; i++) {
            el.textContent += (i ? ' ' : '') + words[i];
            if (i % 5 === 0) await sleep(18);
        }
    }

    async decomposeAndExecute() {
        let goal = this._getString('crew-goal', '');
        if (!goal.trim()) goal = "Provide a comprehensive financial plan covering tax optimisation, retirement planning, and portfolio analysis.";
        audit.log('CrewLeader', 'decompose', 'start', goal);
        const decomposition = await this.callAI(`You are a Crew Leader for financial planning. The user said: "${goal}". Decide which agents to run from the list: TaxWizard, FIREPlanner, MFXRay, RiskAssessor, TaxAwareRebalancer, ResearchAgent. Return ONLY a JSON array of agent names, no other text. Example: ["TaxWizard","FIREPlanner"]`);
        let agentsToRun = [];
        if (decomposition && decomposition.includes('[')) {
            try {
                const match = decomposition.match(/\[[\s\S]*\]/);
                if (match) agentsToRun = JSON.parse(match[0]);
            } catch (e) { console.warn(e); }
        }
        if (!agentsToRun.length) agentsToRun = ['TaxWizard', 'FIREPlanner', 'MFXRay', 'RiskAssessor', 'TaxAwareRebalancer', 'ResearchAgent'];

        await this.askQuestionsForAgents(agentsToRun);

        const resultsDiv = document.getElementById('crew-results');
        resultsDiv.innerHTML = `<div class="pipeline"><div class="pipeline-title">Crew Leader Thinking...</div><div id="crew-thinking"></div></div>`;
        const thinkingEl = document.getElementById('crew-thinking');
        thinkingEl.innerHTML = `🤖 I will run: ${agentsToRun.join(', ')}. Starting execution...`;
        await sleep(1000);

        const agentResults = {};
        for (const agentName of agentsToRun) {
            audit.log('CrewLeader', 'delegate', 'info', `Running ${agentName}`);
            thinkingEl.innerHTML += `<br>▶️ Running ${agentName}...`;
            let result = null;
            switch (agentName) {
                case 'TaxWizard': result = await this.runTax(true); break;
                case 'FIREPlanner': result = await this.runFIRE(true); break;
                case 'MFXRay': result = await this.runMFXRay(true); break;
                case 'RiskAssessor': result = await this.runRiskAssessor(true); break;
                case 'TaxAwareRebalancer': result = await this.runRebalancer(true); break;
                case 'ResearchAgent': result = await this.runResearch(true); break;
            }
            if (result !== null) agentResults[agentName] = result;
            thinkingEl.innerHTML += ` ✅`;
            await sleep(800);
        }

        thinkingEl.innerHTML += `<br>🎯 All agents completed. Generating final plan...`;
        const finalPlan = await this.synthesize(goal, agentResults);
        thinkingEl.innerHTML = `<div class="output-card">${finalPlan}</div>`;
        audit.log('CrewLeader', 'complete', 'success', 'All agents executed');
    }

    async runFullCrew() {
        await this.decomposeAndExecute();
    }
}