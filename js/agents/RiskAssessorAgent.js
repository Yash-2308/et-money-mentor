import { sleep } from '../utils.js';
import { ToolSet } from '../tools.js';
import { audit } from '../app.js';

export class RiskAssessorAgent {
    async execute(holdings) {
        audit.log('RiskAssessor', 'start', 'info', `holdings: ${holdings.length}`);
        let riskData;
        try {
            riskData = await this.retry(() => ToolSet.call('RiskAPI', ToolSet.assessRisk, holdings));
        } catch (err) {
            audit.log('RiskAssessor', 'risk_api', 'error', err.message);
            const total = holdings.reduce((s, h) => s + h.units * h.currentNav, 0);
            const largest = Math.max(...holdings.map(h => h.units * h.currentNav));
            riskData = { concentration: largest / total, diversificationScore: 5, uniqueStocks: 5, total, riskLevel: 'Moderate' };
        }
        audit.log('RiskAssessor', 'complete', 'success', `risk: ${riskData.riskLevel}`);
        return riskData;
    }

    async retry(fn, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try { return await fn(); }
            catch (e) {
                if (i === retries - 1) throw e;
                await sleep(500 * (i + 1));
            }
        }
    }
}