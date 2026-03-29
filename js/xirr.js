export function xirr(transactions, guess = 0.1, maxIter = 200) {
    if (transactions.length < 2) return 0;
    transactions.sort((a, b) => a.date - b.date);
    const firstDate = transactions[0].date;
    const daysDiff = (d1, d2) => (d2 - d1) / (1000 * 60 * 60 * 24);
    const npv = (rate) => {
        let sum = 0;
        for (let t of transactions) {
            const days = daysDiff(firstDate, t.date);
            const base = 1 + rate;
            if (base <= 0) return Infinity;
            sum += t.amount / Math.pow(base, days / 365);
        }
        return sum;
    };
    let rate = guess;
    for (let i = 0; i < maxIter; i++) {
        const f = npv(rate);
        if (!isFinite(f)) return 0;
        const fp = (npv(rate + 1e-7) - f) / 1e-7;
        if (!isFinite(fp) || Math.abs(fp) < 1e-12) break;
        const newRate = rate - f / fp;
        if (Math.abs(newRate - rate) < 1e-8) return newRate;
        rate = newRate;
        if (rate < -0.999) return 0;
    }
    return isFinite(rate) ? rate : 0;
}