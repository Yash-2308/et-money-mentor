import { sleep } from './utils.js';
import { computeTaxOldRegime, computeTaxNewRegime } from './tax.js';
import { audit } from './app.js';

export const TOOL_FAILURE_RATE = 0.25;
export let simulateFailure = false;

export class ToolSet {
    static async call(name, fn, ...args) {
        audit.log(`Tool:${name}`, 'call', 'start', JSON.stringify(args).slice(0,100));
        await sleep(300 + Math.random() * 500);
        if (simulateFailure || Math.random() < TOOL_FAILURE_RATE) {
            audit.log(`Tool:${name}`, 'call', 'error', 'Service temporarily unavailable');
            throw new Error(`${name} API failed`);
        }
        const result = await fn(...args);
        audit.log(`Tool:${name}`, 'call', 'success', typeof result === 'object' ? JSON.stringify(result).slice(0,100) : String(result).slice(0,100));
        return result;
    }

    static async calculateTax(gross, deductions) {
        const taxable = Math.max(0, gross - deductions);
        return { tax: computeTaxOldRegime(taxable), taxable };
    }

    static async getMarketData() {
        return { equity: 12, debt: 7, inflation: 6 };
    }

    static async getPortfolioData(holdings) {
        return holdings.map(h => ({ ...h, riskScore: Math.random() * 10 }));
    }

    static async recommendInvestments(savingsPotential) {
        return savingsPotential > 50000
            ? ['Increase ELSS by ₹20k', 'Add NPS ₹10k', 'Consider tax-saving FDs']
            : ['Consider ELSS or PPF', 'Review 80C limits'];
    }

    static async assessRisk(holdings) {
        const total = holdings.reduce((s, h) => s + h.units * h.currentNav, 0);
        const largest = Math.max(...holdings.map(h => h.units * h.currentNav));
        const concentration = largest / total;
        const stockCount = new Set();
        holdings.forEach(h => (h.topStocks || []).forEach(s => stockCount.add(s)));
        const uniqueStocks = stockCount.size;
        const diversificationScore = Math.min(10, Math.round(uniqueStocks / 3));
        return { concentration, diversificationScore, uniqueStocks, total, riskLevel: concentration > 0.3 ? 'High' : 'Moderate' };
    }

    static async generateSwitchPlan(holdings) {
        const DIRECT_PLAN_ER = 0.15;
        const highER = holdings.filter(h => h.expenseRatio > DIRECT_PLAN_ER);
        return highER.map(h => ({
            from: h.name,
            to: `${h.category} Index Direct`,
            savings: (h.expenseRatio - DIRECT_PLAN_ER) / 100 * h.units * h.currentNav,
            tax: Math.random() > 0.5 ? 'LTCG' : 'STCG'
        }));
    }

    static async getNewsSentimentSimulated(topic) {
        const headlines = [
            { text: `${topic} shares gain 2% after strong quarterly results`, sentiment: 'positive', url: 'https://economictimes.indiatimes.com' },
            { text: `Analysts maintain 'buy' on ${topic}, raise target price`, sentiment: 'positive', url: 'https://economictimes.indiatimes.com' },
            { text: `${topic} faces headwinds from regulatory changes`, sentiment: 'negative', url: 'https://economictimes.indiatimes.com' },
            { text: `Market volatility: ${topic} consolidates after recent rally`, sentiment: 'neutral', url: 'https://economictimes.indiatimes.com' }
        ];
        const randomHeadlines = headlines.sort(() => 0.5 - Math.random()).slice(0, 3);
        const positiveCount = randomHeadlines.filter(h => h.sentiment === 'positive').length;
        const negativeCount = randomHeadlines.filter(h => h.sentiment === 'negative').length;
        const overall = positiveCount > negativeCount ? 'positive' : (negativeCount > positiveCount ? 'negative' : 'neutral');
        return {
            headlines: randomHeadlines,
            overallSentiment: overall,
            suggestedFunds: overall === 'positive' ? [`${topic} Focused Fund`, `${topic} Sector ETF`] : [`Balanced Advantage Fund`, `Value Discovery Fund`]
        };
    }
}