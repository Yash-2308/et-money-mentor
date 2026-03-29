import { sleep } from '../utils.js';
import { ToolSet } from '../tools.js';
import { audit } from '../app.js';

export class FIREPlannerAgent {
    async execute(input) {
        audit.log('FIREPlanner', 'start', 'info', JSON.stringify(input));
        const { age, retireAge, income, expenses, mf, ppf, epf, equity, monthlyDraw, inflation, eqReturn, debtReturn } = input;
        if (retireAge <= age) throw new Error('Retirement age must be greater than current age.');

        let marketData;
        try {
            marketData = await this.retry(() => ToolSet.call('MarketData', ToolSet.getMarketData));
        } catch (err) {
            audit.log('FIREPlanner', 'market_data', 'error', err.message);
            marketData = { equity: eqReturn, debt: debtReturn, inflation };
        }

        const yearsToRetire = retireAge - age;
        const futureMonthlyDraw = monthlyDraw * Math.pow(1 + (marketData.inflation / 100), yearsToRetire);
        const futureAnnualDraw = futureMonthlyDraw * 12;
        const requiredCorpus = futureAnnualDraw / 0.035;
        const currentCorpus = mf + ppf + epf + equity;
        const eqR = input.eqReturn || marketData.equity;
        const debtR = input.debtReturn || marketData.debt;
        const blendedReturn = (eqR / 100) * 0.65 + (debtR / 100) * 0.35;
        const fvCurrent = currentCorpus * Math.pow(1 + blendedReturn, yearsToRetire);
        const corpusGap = Math.max(0, requiredCorpus - fvCurrent);
        const monthlyReturn = blendedReturn / 12;
        const n = yearsToRetire * 12;
        let monthlySIP = 0;
        if (corpusGap > 0 && n > 0) monthlySIP = corpusGap * monthlyReturn / (Math.pow(1 + monthlyReturn, n) - 1);
        const annualSurplus = income - expenses;
        const maxMonthlySIP = annualSurplus / 12 * 0.7;
        const feasible = monthlySIP <= maxMonthlySIP;
        const insuranceNeeded = Math.max(0, (income * 15) - (input.epf || 0));

        const sipAlloc = [
            { name: 'Large Cap Index Fund', pct: 0.35, color: '#60a5fa' },
            { name: 'Mid Cap Fund', pct: 0.25, color: '#f0b429' },
            { name: 'Small Cap Fund', pct: 0.15, color: '#3dd68c' },
            { name: 'Flexi Cap / Multi-Asset', pct: 0.15, color: '#a78bfa' },
            { name: 'Debt / G-Sec Fund', pct: 0.10, color: '#f87171' }
        ];

        audit.log('FIREPlanner', 'complete', 'success', `required corpus: ${requiredCorpus}`);
        return { requiredCorpus, fvCurrent, corpusGap, monthlySIP, feasible, sipAlloc, insuranceNeeded, yearsToRetire };
    }

    async retry(fn, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try { return await fn(); }
            catch (err) {
                audit.log('FIREPlanner', 'retry', 'warning', `attempt ${i + 1} failed: ${err.message}`);
                if (i === retries - 1) throw err;
                await sleep(500 * (i + 1));
            }
        }
    }
}