import { sleep } from '../utils.js';
import { computeTaxOldRegime, computeTaxNewRegime } from '../tax.js';
import { ToolSet } from '../tools.js';
import { audit } from '../app.js';

export class TaxWizardAgent {
    async execute(input) {
        audit.log('TaxWizard', 'start', 'info', JSON.stringify(input));
        const { basic, hra, special, other, ded80c, nps, homeloan, ded80d, rent, isMetro } = input;
        const gross = basic + hra + special + other;

        const hraExempt = (() => {
            const actual = hra;
            const pct = isMetro ? 0.5 : 0.4;
            const basicPct = basic * pct;
            const rentMinus = Math.max(0, rent - basic * 0.1);
            return Math.min(actual, basicPct, rentMinus);
        })();
        audit.log('TaxWizard', 'hra_calculated', 'success', `exemption: ${hraExempt}`);

        const std = 75000;
        const taxableOld = gross - hraExempt - std - ded80c - nps - homeloan - ded80d;
        const taxableNew = gross - std;

        let oldTax = computeTaxOldRegime(Math.max(0, taxableOld));
        let newTax = computeTaxNewRegime(Math.max(0, taxableNew));

        const better = oldTax < newTax ? 'Old' : 'New';
        const saving = Math.abs(oldTax - newTax);
        const missed = [];
        if (ded80d < 75000) missed.push(`Health Insurance (80D) – can claim up to ₹75,000. Current: ₹${ded80d}`);
        if (ded80c < 150000) missed.push(`80C headroom – ₹${(150000 - ded80c) / 1000}k unused`);
        if (homeloan < 200000 && homeloan > 0) missed.push(`Home loan interest – can claim up to ₹2L (currently ₹${homeloan / 1000}k)`);

        let recommendations = [];
        try {
            recommendations = await this.retry(() => ToolSet.call('Recommendations', ToolSet.recommendInvestments, saving));
        } catch (err) {
            audit.log('TaxWizard', 'recommendations', 'error', err.message);
            recommendations = ['Consult a financial advisor for personalised advice'];
        }

        audit.log('TaxWizard', 'complete', 'success', `optimal: ${better}, saving: ${saving}`);
        return { gross, taxableOld, taxableNew, oldTax, newTax, better, saving, recommendations, hraExempt, missedDeductions: missed };
    }

    async retry(fn, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try { return await fn(); }
            catch (err) {
                audit.log('TaxWizard', 'retry', 'warning', `attempt ${i + 1} failed: ${err.message}`);
                if (i === retries - 1) throw err;
                await sleep(500 * (i + 1));
            }
        }
    }
}