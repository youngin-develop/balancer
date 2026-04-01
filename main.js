/**
 * Life Balancer - Core Application Logic
 */

class LifeBalancer {
    constructor() {
        this.state = {
            user: JSON.parse(localStorage.getItem('lb_user')) || null,
            currentView: 'calendar', // 'calendar', 'setup', 'record'
            selectedDate: new Date().toISOString().split('T')[0],
            records: JSON.parse(localStorage.getItem('lb_records')) || {},
            categories: JSON.parse(localStorage.getItem('lb_categories')) || [
                { id: 1, name: '본업', weight: 70 },
                { id: 2, name: '운동', weight: 20 },
                { id: 3, name: '취미', weight: 10 }
            ],
            aiAnalysis: null
        };
        this.chart = null;
        this.init();
    }

    init() {
        this.render();
    }

    saveState() {
        localStorage.setItem('lb_user', JSON.stringify(this.state.user));
        localStorage.setItem('lb_records', JSON.stringify(this.state.records));
        localStorage.setItem('lb_categories', JSON.stringify(this.state.categories));
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.saveState();
        this.render();
    }

    render() {
        const app = document.getElementById('app');
        if (!this.state.user) {
            app.innerHTML = this.renderAuth();
            this.bindAuthEvents();
        } else if (this.state.currentView === 'calendar') {
            app.innerHTML = this.renderFullCalendar();
            this.bindCalendarEvents();
        } else if (this.state.currentView === 'setup') {
            app.innerHTML = this.renderSetupView();
            this.bindSetupEvents();
        } else {
            app.innerHTML = this.renderDashboard();
            this.bindDashboardEvents();
            this.updateChart();
        }
    }

    renderAuth() {
        return `
            <div class="auth-container fade-in">
                <div class="auth-logo">Life Balancer</div>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">데이터로 설계하는 균형 잡힌 삶</p>
                <div class="glass-card" style="width: 100%;">
                    <input type="text" id="username" class="auth-input" placeholder="아이디" style="margin-bottom: 10px;">
                    <input type="password" id="password" class="auth-input" placeholder="비밀번호" style="margin-bottom: 20px;">
                    <button id="loginBtn" class="auth-btn" style="width: 100%; padding: 16px; background: var(--accent-color); color: #000; font-weight: 700;">시작하기</button>
                </div>
            </div>
        `;
    }

    bindAuthEvents() {
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            const username = document.getElementById('username').value;
            if (username) {
                this.setState({ user: { name: username }, currentView: 'calendar' });
            }
        });
    }

    renderFullCalendar() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const lastDay = new Date(year, month + 1, 0).getDate();

        const daySquares = [];
        for (let i = 1; i <= lastDay; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const hasRecord = this.state.records[dateStr];
            daySquares.push(`
                <div class="calendar-day-square ${hasRecord ? 'has-record' : ''}" data-date="${dateStr}">
                    <span class="calendar-day-number">${i}</span>
                </div>
            `);
        }

        return `
            <div class="calendar-container fade-in">
                <header class="calendar-header">
                    <div>
                        <h2 style="font-size: 1.8rem;">${month + 1}월</h2>
                        <p style="color: var(--text-secondary); font-size: 1rem;">반갑습니다, ${this.state.user.name}님</p>
                    </div>
                    <button id="logoutBtn" style="background: none; color: var(--text-secondary); font-size: 0.9rem;">로그아웃</button>
                </header>
                <div class="calendar-month-grid">
                    ${daySquares.join('')}
                </div>
            </div>
        `;
    }

    bindCalendarEvents() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.setState({ user: null });
        });
        document.querySelectorAll('.calendar-day-square').forEach(el => {
            el.addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                this.setState({ selectedDate: date, currentView: 'setup' });
            });
        });
    }

    renderSetupView() {
        const total = this.getTotalWeight();
        const isValid = total === 100;

        return `
            <div class="setup-container fade-in">
                <button id="backToCalendar" class="back-btn" style="width: fit-content;">← 달력으로</button>
                <header>
                    <h2 style="font-size: 1.5rem;">삶의 균형 설계</h2>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${this.state.selectedDate}의 분야별 중요도를 설정하세요 (최대 10개)</p>
                </header>

                <div class="setup-grid">
                    ${this.state.categories.map(cat => `
                        <div class="setup-item-card">
                            <button class="remove-item-btn" data-id="${cat.id}">✕</button>
                            <input type="text" class="setup-item-name" data-id="${cat.id}" value="${cat.name}">
                            <div class="setup-item-weight-wrapper">
                                <input type="number" class="setup-weight-input" data-id="${cat.id}" value="${cat.weight}">
                                <span>%</span>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${this.state.categories.length < 10 ? `
                        <div class="add-btn-card" id="addCategoryBtn">+</div>
                    ` : ''}
                </div>

                <div class="weight-status-bar">
                    <div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">현재 가중치 합계</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: ${isValid ? 'var(--success-color)' : 'var(--error-color)'}">
                            ${total} / 100
                        </div>
                    </div>
                    <button id="completeSetupBtn" class="complete-btn ${isValid ? 'active' : ''}">설정 완료</button>
                </div>
            </div>
        `;
    }

    bindSetupEvents() {
        document.getElementById('backToCalendar')?.addEventListener('click', () => {
            this.setState({ currentView: 'calendar' });
        });
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
            if (this.state.categories.length >= 10) return;
            const newCat = { id: Date.now(), name: '새 분야', weight: 0 };
            this.setState({ categories: [...this.state.categories, newCat] });
        });
        document.querySelectorAll('.remove-item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                this.setState({ categories: this.state.categories.filter(c => c.id !== id) });
            });
        });
        document.querySelectorAll('.setup-item-name').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const categories = this.state.categories.map(c => c.id === id ? { ...c, name: e.target.value } : c);
                this.setState({ categories });
            });
        });
        document.querySelectorAll('.setup-weight-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                const categories = this.state.categories.map(c => c.id === id ? { ...c, weight: val } : c);
                this.setState({ categories });
            });
        });
        document.getElementById('completeSetupBtn')?.addEventListener('click', () => {
            this.setState({ currentView: 'record' });
        });
    }

    renderDashboard() {
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        return `
            <div class="fade-in">
                <button id="backToSetup" class="back-btn">← 분야 수정</button>
                <header class="dashboard-header" style="margin-bottom: 20px;">
                    <h2 style="font-size: 1.5rem;">오늘의 성과 기록</h2>
                    <p style="color: var(--text-secondary);">${this.state.selectedDate}</p>
                </header>
                <section class="glass-card" style="margin-bottom: 30px;">
                    <div class="setup-grid">
                        ${this.state.categories.map(cat => `
                            <div class="setup-item-card" style="aspect-ratio: auto; height: 120px; cursor: pointer;" class="achieve-card" data-id="${cat.id}">
                                <div style="font-weight: 700;">${cat.name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">가중치: ${cat.weight}%</div>
                                <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-color);">${todayRecord[cat.id] || 0}%</div>
                            </div>
                        `).join('')}
                    </div>
                    <button id="saveRecordBtn" class="auth-btn" style="width: 100%; padding: 16px; background: var(--accent-color); color: #000; font-weight: 700; margin-top: 25px;">성과 데이터 반영</button>
                </section>
                <section class="analysis-section glass-card">
                    <h3>내 인생의 균형</h3>
                    <canvas id="balanceChart"></canvas>
                    <div id="deficiencyList"></div>
                    <button id="aiAnalyzeBtn" class="auth-btn" style="width: 100%; padding: 16px; background: #1e293b; color: #fff; font-weight: 700; margin-top: 20px;">AI 원인 분석</button>
                    ${this.state.aiAnalysis ? `<div class="ai-reason-card fade-in"><strong>분석 리포트:</strong><br>${this.state.aiAnalysis}</div>` : ''}
                </section>
            </div>
        `;
    }

    getTotalWeight() {
        return this.state.categories.reduce((sum, cat) => sum + cat.weight, 0);
    }

    bindDashboardEvents() {
        document.getElementById('backToSetup')?.addEventListener('click', () => {
            this.setState({ currentView: 'setup' });
        });
        document.querySelectorAll('.setup-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const cat = this.state.categories.find(c => c.id == id);
                const val = prompt(`'${cat.name}'의 오늘의 달성률을 입력하세요 (0-100):`, this.state.records[this.state.selectedDate]?.[id] || 0);
                if (val !== null) {
                    const achievement = Math.max(0, Math.min(100, parseInt(val) || 0));
                    const currentRecord = this.state.records[this.state.selectedDate] || {};
                    const records = { ...this.state.records, [this.state.selectedDate]: { ...currentRecord, [id]: achievement } };
                    this.setState({ records });
                }
            });
        });
        document.getElementById('saveRecordBtn')?.addEventListener('click', () => {
            this.updateChart();
            alert('기록이 반영되었습니다.');
        });
        document.getElementById('aiAnalyzeBtn')?.addEventListener('click', () => {
            this.runAiAnalysis();
        });
    }

    updateChart() {
        const ctx = document.getElementById('balanceChart')?.getContext('2d');
        if (!ctx) return;
        const labels = this.state.categories.map(c => c.name);
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        const data = this.state.categories.map(c => {
            const investment = todayRecord[c.id] || 0;
            const weightFactor = c.weight / 20;
            return Math.min(100, Math.round(investment / (weightFactor || 1)));
        });
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '밸런스 스코어',
                    data: data,
                    backgroundColor: 'rgba(0, 242, 255, 0.2)',
                    borderColor: '#00f2ff',
                    borderWidth: 2,
                    pointBackgroundColor: '#00f2ff'
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#fff', font: { size: 14 } }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
        const defContainer = document.getElementById('deficiencyList');
        const deficiencies = this.state.categories
            .filter((c, i) => data[i] < 50)
            .map(c => `<div class="deficiency-alert">⚠️ '${c.name}' 분야의 투자가 가중치 대비 매우 부족합니다!</div>`);
        defContainer.innerHTML = deficiencies.join('');
    }

    runAiAnalysis() {
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        const deficiencies = this.state.categories.filter(c => {
            const investment = todayRecord[c.id] || 0;
            const weightFactor = c.weight / 20;
            const score = investment / (weightFactor || 1);
            return score < 50;
        });
        let message = "현재 삶이 매우 조화롭게 균형을 이루고 있습니다. 완벽한 밸런스입니다!";
        if (deficiencies.length > 0) {
            const topDef = deficiencies.sort((a,b) => b.weight - a.weight)[0];
            message = `중요도가 높은 '${topDef.name}' 분야의 성취가 낮습니다. 에너지를 재분배하여 밸런스를 맞춰보세요.`;
        }
        this.setState({ aiAnalysis: message });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new LifeBalancer();
});
