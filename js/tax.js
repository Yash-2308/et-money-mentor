export function computeTaxOldRegime(income) {
    const slabs = [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
    ];
    let tax = 0, prev = 0;
    for (let slab of slabs) {
        if (income <= prev) break;
        const taxable = Math.min(income, slab.limit) - prev;
        tax += taxable * slab.rate;
        prev = slab.limit;
    }
    if (income <= 500000) tax = 0;
    const cess = tax * 0.04;
    return tax + cess;
}

export function computeTaxNewRegime(income) {
    const slabs = [
        { limit: 300000, rate: 0 },
        { limit: 700000, rate: 0.05 },
        { limit: 1000000, rate: 0.10 },
        { limit: 1200000, rate: 0.15 },
        { limit: 1500000, rate: 0.20 },
        { limit: Infinity, rate: 0.30 }
    ];
    let tax = 0, prev = 0;
    for (let slab of slabs) {
        if (income <= prev) break;
        const taxable = Math.min(income, slab.limit) - prev;
        tax += taxable * slab.rate;
        prev = slab.limit;
    }
    if (income <= 700000) tax = 0;
    const cess = tax * 0.04;
    return tax + cess;
}