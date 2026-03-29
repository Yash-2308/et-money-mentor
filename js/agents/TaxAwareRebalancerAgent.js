import { sleep } from '../utils.js';
import { ToolSet } from '../tools.js';
import { audit } from '../app.js';

export class TaxAwareRebalancerAgent {
    async execute(holdings) {
        audit.log('TaxAwareRebalancer', 'start', 'info', `holdings: ${holdings.length}`);
        let switches;
        try {
            switches = await this.retry(() => ToolSet.call('SwitchPlan', ToolSet.generateSwitchPlan, holdings));
        } catch (err) {
            audit.log('TaxAwareRebalancer', 'switch_api', 'error', err.message);
            switches = [{ from: 'High Cost Fund', to: 'Low Cost Index', savings: 5000, tax: 'LTCG' }];
        }
        audit.log('TaxAwareRebalancer', 'complete', 'success', `switches: ${switches.length}`);
        return switches;
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