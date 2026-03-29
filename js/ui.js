export function switchPanel(name) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const panel = document.getElementById(`panel-${name}`);
    if (panel) panel.classList.add('active');
    const navMap = { home: 0, crew: 1, tax: 2, fire: 3, mf: 4, risk: 5, rebal: 6, research: 7 };
    const idx = navMap[name];
    if (idx !== undefined) {
        const items = document.querySelectorAll('.nav-item');
        if (items[idx]) items[idx].classList.add('active');
    }
}

export function loadTaxScenario() {
    document.getElementById('t-basic').value = '1800000';
    document.getElementById('t-hra').value = '360000';
    document.getElementById('t-special').value = '200000';
    document.getElementById('t-other').value = '0';
    document.getElementById('t-80c').value = '150000';
    document.getElementById('t-nps').value = '50000';
    document.getElementById('t-homeloan').value = '40000';
    document.getElementById('t-80d').value = '25000';
    document.getElementById('t-rent').value = '240000';
    document.getElementById('t-city').value = 'metro';
}

export function loadFIREScenario() {
    document.getElementById('f-age').value = '34';
    document.getElementById('f-retire-age').value = '50';
    document.getElementById('f-income').value = '2400000';
    document.getElementById('f-expenses').value = '1200000';
    document.getElementById('f-mf').value = '1800000';
    document.getElementById('f-ppf').value = '600000';
    document.getElementById('f-epf').value = '500000';
    document.getElementById('f-equity').value = '0';
    document.getElementById('f-monthly-draw').value = '150000';
    document.getElementById('f-inflation').value = '6';
    document.getElementById('f-eq-return').value = '12';
    document.getElementById('f-debt-return').value = '7';
}

export function loadCrewExample() {
    document.getElementById('crew-goal').value = 'I want to retire at 55, minimise taxes, and research opportunities in technology stocks.';
}

export function loadResearchExample() {
    document.getElementById('research-topic').value = 'Banking';
}

export function openAddFundModal() {
    document.getElementById('add-fund-modal').classList.add('active');
}

export function closeAddFundModal() {
    document.getElementById('add-fund-modal').classList.remove('active');
}

export function closeHoldingsQuizModal() {
    document.getElementById('holdings-quiz-modal').classList.remove('active');
}

export function resolveHoldingsQuiz(choice, crewLeader) {
    closeHoldingsQuizModal();
    if (crewLeader && crewLeader.holdingsResolve) {
        crewLeader.holdingsResolve(choice);
        crewLeader.holdingsResolve = null;
    }
}

export function closeCrewQuestionModal() {
    document.getElementById('crew-question-modal').classList.remove('active');
}

export function submitCrewAnswers(crewLeader) {
    if (crewLeader) crewLeader.submitAnswers();
}

export function toggleAuditPanel() {
    const panel = document.getElementById('audit-panel');
    if (panel.classList.contains('minimized')) {
        panel.classList.remove('minimized');
        panel.querySelector('.minimize-btn').textContent = '−';
    } else {
        panel.classList.add('minimized');
        panel.querySelector('.minimize-btn').textContent = '+';
    }
}