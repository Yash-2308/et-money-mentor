export const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');

export const fmtL = n => {
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' L';
    return fmt(n);
};

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function parseNumber(input, defaultValue = 0) {
    const num = parseFloat(input);
    return isNaN(num) ? defaultValue : num;
}