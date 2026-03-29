import { sleep } from '../utils.js';
import { xirr } from '../xirr.js';
import { audit } from '../app.js';

export class MFXRayAgent {
    async execute(holdings) {
        audit.log('MFXRay', 'start', 'info', `holdings count: ${holdings.length}`);
        const fundData = [];
        const now = new Date();
        for (let h of holdings) {
            const purchaseDate = new Date(h.purchaseDate);
            const daysHeld = (now - purchaseDate) / (1000 * 60 * 60 * 24);
            let xirrValue = null;
            if (daysHeld >= 30) {
                const txns = [
                    { date: purchaseDate, amount: -h.invested },
                    { date: now, amount: h.units * h.currentNav }
                ];
                txns.sort((a, b) => a.date - b.date);
                try {
                    const raw = xirr(txns);
                    xirrValue = isFinite(raw) ? raw * 100 : 0;
                } catch (e) { xirrValue = 0; }
            }
            const currentVal = h.units * h.currentNav;
            fundData.push({ xirr: xirrValue, currentVal });
        }
        let totalWeight = 0, sumWeighted = 0;
        for (let fd of fundData) {
            if (fd.xirr !== null && fd.currentVal > 0) {
                sumWeighted += fd.xirr * fd.currentVal;
                totalWeight += fd.currentVal;
            }
        }
        const avgXirr = totalWeight > 0 ? sumWeighted / totalWeight : 0;

        const totalInv = holdings.reduce((s, h) => s + h.invested, 0);
        const totalCurr = holdings.reduce((s, h) => s + h.units * h.currentNav, 0);
        const stockCount = {};
        holdings.forEach(h => (h.topStocks || []).forEach(s => stockCount[s] = (stockCount[s] || 0) + 1));
        const overlapping = Object.entries(stockCount).filter(([, c]) => c >= 3);
        const DIRECT_PLAN_ER = 0.15;
        const weightedER = holdings.reduce((s, h) => s + h.expenseRatio * (h.units * h.currentNav), 0) / totalCurr;
        const annualDrag = totalCurr * (weightedER - DIRECT_PLAN_ER) / 100;
        const highERfunds = holdings.filter(h => h.expenseRatio > DIRECT_PLAN_ER);

        audit.log('MFXRay', 'complete', 'success', `XIRR: ${avgXirr.toFixed(1)}%, overlap: ${overlapping.length}`);
        return { totalInv, totalCurr, avgXirr, overlapping, weightedER, annualDrag, highERfunds };
    }

    async retry(fn, retries = 2) {
        for (let i = 0; i < retries; i++) {
            try { return await fn(); }
            catch (err) {
                audit.log('MFXRay', 'retry', 'warning', `attempt ${i + 1} failed: ${err.message}`);
                if (i === retries - 1) throw err;
                await sleep(500 * (i + 1));
            }
        }
    }
}