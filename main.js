/**
 * Life Balancer - Core Application Logic
 */

class LifeBalancer {
    constructor() {
        this.state = {
            user: JSON.parse(localStorage.getItem('lb_user')) || null,
            // 초기 뷰를 setup으로 설정 (로그인 직후 분야 설정으로 이동)
            currentView: JSON.parse(localStorage.getItem('lb_user')) ? 'setup' : 'auth', 
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
        } else if (this.state.currentView === 'setup') {
            app.innerHTML = this.renderSetupView();
            this.bindSetupEvents();
        } else if (this.state.currentView === 'calendar') {
            app.innerHTML = this.renderFullCalendar();
            this.bindCalendarEvents();
        } else {
            app.innerHTML = this.renderDashboard();
            this.bindDashboardEvents();
            this.updateChart();
        }
    }

    // --- Auth Component ---
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
                this.setState({ user: { name: username }, currentView: 'setup' });
            }
        });
    }

    // --- Setup View (Weights Management) - Now comes BEFORE Calendar ---
    renderSetupView() {
        const total = this.getTotalWeight();
        const isValid = total === 100;

        return `
            <div class="setup-container fade-in">
                <header style="margin-bottom: 30px;">
                    <h2 style="font-size: 2rem; margin-bottom: 10px;">인생 가중치 설계</h2>
                    <p style="color: var(--text-secondary); font-size: 1.1rem;">당신의 삶에서 중요한 분야를 정의하세요 (최대 10개)</p>
                </header>

                <div class="setup-grid">
                    ${this.state.categories.map(cat => `
                        <div class="setup-item-card">
                            <button class="remove-item-btn" data-id="${cat.id}">✕</button>
                            <input type="text" class="setup-item-name" data-id="${cat.id}" value="${cat.name}" placeholder="분야 이름">
                            <div class="setup-item-weight-wrapper">
                                <input type="number" class="setup-weight-input" data-id="${cat.id}" value="${cat.weight}" min="0" max="100">
                                <span style="font-size: 1rem;">%</span>
                            </div>
                        </div>
                    `).join('')}
                    
                    ${this.state.categories.length < 10 ? `
                        <div class="add-btn-card" id="addCategoryBtn">+</div>
                    ` : ''}
                </div>

                <div class="weight-status-bar">
                    <div>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">총 가중치 합계</div>
                        <div style="font-size: 1.8rem; font-weight: 800; color: ${isValid ? 'var(--success-color)' : 'var(--error-color)'}">
                            ${total} / 100
                        </div>
                    </div>
                    <button id="completeSetupBtn" class="complete-btn ${isValid ? 'active' : ''}">설계 완료 및 달력보기</button>
                </div>
                <button id="logoutBtn" style="background: none; color: var(--text-secondary); margin-top: 20px; align-self: flex-end;">로그아웃</button>
            </div>
        `;
    }

    bindSetupEvents() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.setState({ user: null });
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
            this.setState({ currentView: 'calendar' });
        });
    }

    // --- Full Calendar View ---
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
                        <h2 style="font-size: 1.8rem;">${month + 1}월 달력</h2>
                        <p style="color: var(--text-secondary); font-size: 1rem;">원하는 날짜를 선택하여 기록하세요</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button id="editSetupBtn" style="background: #222; color: white; padding: 8px 15px; border-radius: 8px;">분야 수정</button>
                        <button id="logoutBtn" style="background: none; color: var(--text-secondary);">로그아웃</button>
                    </div>
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
        document.getElementById('editSetupBtn')?.addEventListener('click', () => {
            this.setState({ currentView: 'setup' });
        });
        document.querySelectorAll('.calendar-day-square').forEach(el => {
            el.addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                this.setState({ selectedDate: date, currentView: 'record' });
            });
        });
    }

    // --- Record View ---
    renderDashboard() {
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        return `
            <div class="fade-in">
                <button id="backToCalendar" class="back-btn">← 달력으로 돌아가기</button>
                <header class="dashboard-header" style="margin-bottom: 20px;">
                    <h2 style="font-size: 1.5rem;">${this.state.selectedDate} 성과 기록</h2>
                </header>
                <section class="glass-card" style="margin-bottom: 30px;">
                    <div class="setup-grid">
                        ${this.state.categories.map(cat => `
                            <div class="setup-item-card" style="aspect-ratio: auto; min-height: 120px; cursor: pointer;" data-id="${cat.id}">
                                <div style="font-weight: 700; font-size: 1.1rem;">${cat.name}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 10px;">가중치: ${cat.weight}%</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-color);">${todayRecord[cat.id] || 0}%</div>
                                <div style="font-size: 0.7rem; color: #555; margin-top: 5px;">클릭하여 성취도 입력</div>
                            </div>
                        `).join('')}
                    </div>
                    <button id="saveRecordBtn" class="auth-btn" style="width: 100%; padding: 16px; background: var(--accent-color); color: #000; font-weight: 700; margin-top: 25px;">성과 차트 업데이트</button>
                </section>
                <section class="analysis-section glass-card">
                    <h3>인생 밸런스 리포트</h3>
                    <canvas id="balanceChart"></canvas>
                    <div id="deficiencyList"></div>
                    <button id="aiAnalyzeBtn" class="auth-btn" style="width: 100%; padding: 16px; background: #1e293b; color: #fff; font-weight: 700; margin-top: 20px;">AI 원인 분석</button>
                    ${this.state.aiAnalysis ? `<div class="ai-reason-card fade-in"><strong>분석 결과:</strong><br>${this.state.aiAnalysis}</div>` : ''}
                </section>
            </div>
        `;
    }

    getTotalWeight() {
        return this.state.categories.reduce((sum, cat) => sum + cat.weight, 0);
    }

    bindDashboardEvents() {
        document.getElementById('backToCalendar')?.addEventListener('click', () => {
            this.setState({ currentView: 'calendar', aiAnalysis: null });
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
                    label: '성과 달성도',
                    data: data,
                    backgroundColor: 'rgba(0, 242, 255, 0.2)',
                    borderColor: '#00f2ff',
                    borderWidth: 3,
                    pointBackgroundColor: '#00f2ff',
                    pointRadius: 4
                }]
            },
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { color: '#fff', font: { size: 14, weight: 'bold' } }
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
        let message = "현재 삶이 매우 조화롭게 균형을 이루고 있습니다. 이 흐름을 유지하세요!";
        if (deficiencies.length > 0) {
            const topDef = deficiencies.sort((a,b) => b.weight - a.weight)[0];
            message = `현재 '${topDef.name}' 분야에 대한 에너지가 많이 소진된 상태입니다. 이 분야의 중요도가 ${topDef.weight}%인 점을 고려할 때, 우선순위를 재조정할 필요가 있습니다.`;
        }
        this.setState({ aiAnalysis: message });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new LifeBalancer();
});
