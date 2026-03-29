export class AuditLogger {
    constructor(containerId = 'audit-log') {
        this.containerId = containerId;
        this.logs = [];
    }

    get container() {
        return document.getElementById(this.containerId);
    }

    log(agent, action, status, details = '') {
        const ts = new Date().toLocaleTimeString();
        const entry = `[${ts}] ${agent}: ${action} → ${status} ${details}`;
        this.logs.unshift(entry);
        const container = this.container;
        if (container) {
            container.innerHTML = this.logs.map(l => `<div class="audit-entry">${l}</div>`).join('');
        }
        console.log(entry);
    }
}