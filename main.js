/**
 * Life Balancer - Core Application Logic
 */

class LifeBalancer {
    constructor() {
        this.state = {
            user: JSON.parse(localStorage.getItem('lb_user')) || null,
            currentView: JSON.parse(localStorage.getItem('lb_user')) ? 'setup' : 'auth', 
            selectedDate: new Date().toISOString().split('T')[0],
            records: JSON.parse(localStorage.getItem('lb_records')) || {},
            dailyGoals: JSON.parse(localStorage.getItem('lb_dailyGoals')) || {}, // 날짜별 목표 텍스트
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
        localStorage.setItem('lb_dailyGoals', JSON.stringify(this.state.dailyGoals));
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
        } else if (this.state.currentView === 'dailyGoal') {
            app.innerHTML = this.renderDailyGoalView();
            this.bindDailyGoalEvents();
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

    // --- Global Category Setup ---
    renderSetupView() {
        const total = this.getTotalWeight();
        const isValid = total === 100;
        return `
            <div class="setup-container fade-in">
                <header style="margin-bottom: 30px;">
                    <h2 style="font-size: 2rem; margin-bottom: 10px;">인생 가중치 설계</h2>
                    <p style="color: var(--text-secondary); font-size: 1.1rem;">나의 삶의 영역과 중요도를 먼저 정의하세요</p>
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
                    ${this.state.categories.length < 10 ? `<div class="add-btn-card" id="addCategoryBtn">+</div>` : ''}
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
            </div>
        `;
    }

    bindSetupEvents() {
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
                        <p style="color: var(--text-secondary);">날짜를 선택해 오늘 할 일을 정해보세요</p>
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
                this.setState({ selectedDate: date, currentView: 'dailyGoal' });
            });
        });
    }

    // --- Daily Goal Setting View (AFTER Calendar) ---
    renderDailyGoalView() {
        const goals = this.state.dailyGoals[this.state.selectedDate] || {};
        return `
            <div class="fade-in">
                <button id="backToCalendar" class="back-btn">← 달력으로</button>
                <header style="margin-bottom: 30px;">
                    <h2 style="font-size: 1.8rem; margin-bottom: 5px;">오늘의 목표 작성</h2>
                    <p style="color: var(--text-secondary);">${this.state.selectedDate}</p>
                </header>
                <div class="setup-grid" style="grid-template-columns: repeat(2, 1fr);">
                    ${this.state.categories.map(cat => `
                        <div class="setup-item-card" style="aspect-ratio: 1/1; flex-direction: column; justify-content: flex-start; padding: 15px;">
                            <div style="font-weight: 700; color: var(--accent-color); margin-bottom: 10px; font-size: 1.1rem;">${cat.name}</div>
                            <textarea class="goal-textarea" data-id="${cat.id}" placeholder="오늘 이 분야에서 무엇을 하실 건가요?" 
                                style="width: 100%; height: 100%; background: none; border: none; color: white; resize: none; font-size: 0.9rem; line-height: 1.4;">${goals[cat.id] || ''}</textarea>
                        </div>
                    `).join('')}
                </div>
                <button id="finishGoalBtn" class="auth-btn" style="width: 100%; padding: 16px; background: var(--accent-color); color: #000; font-weight: 700; margin-top: 30px;">작성 완료 및 기록하기</button>
            </div>
        `;
    }

    bindDailyGoalEvents() {
        document.getElementById('backToCalendar')?.addEventListener('click', () => {
            this.setState({ currentView: 'calendar' });
        });
        document.getElementById('finishGoalBtn')?.addEventListener('click', () => {
            const goals = { ...this.state.dailyGoals[this.state.selectedDate] };
            document.querySelectorAll('.goal-textarea').forEach(area => {
                goals[area.dataset.id] = area.value;
            });
            const dailyGoals = { ...this.state.dailyGoals, [this.state.selectedDate]: goals };
            this.setState({ dailyGoals, currentView: 'record' });
        });
    }

    // --- Record & Achievement View ---
    renderDashboard() {
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        const goals = this.state.dailyGoals[this.state.selectedDate] || {};
        
        return `
            <div class="fade-in">
                <button id="backToGoal" class="back-btn">← 목표 수정</button>
                <header class="dashboard-header" style="margin-bottom: 20px;">
                    <h2 style="font-size: 1.5rem;">달성률 체크</h2>
                    <p style="color: var(--text-secondary);">${this.state.selectedDate}</p>
                </header>
                <section class="glass-card" style="margin-bottom: 30px;">
                    <div class="setup-grid">
                        ${this.state.categories.map(cat => `
                            <div class="setup-item-card" style="aspect-ratio: auto; min-height: 140px; cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; padding: 20px;" data-id="${cat.id}">
                                <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 8px;">
                                    <span style="font-weight: 700; color: var(--accent-color);">${cat.name}</span>
                                    <span style="font-size: 0.8rem; color: #666;">가중치 ${cat.weight}%</span>
                                </div>
                                <div style="font-size: 0.9rem; color: #ccc; margin-bottom: 15px; min-height: 1.2rem;">
                                    ${goals[cat.id] ? `🎯 ${goals[cat.id]}` : '<span style="color: #444;">설정된 목표 없음</span>'}
                                </div>
                                <div style="display: flex; align-items: baseline; gap: 10px;">
                                    <span style="font-size: 1.5rem; font-weight: 800; color: white;">${todayRecord[cat.id] || 0}%</span>
                                    <span style="font-size: 0.8rem; color: #555;">클릭하여 성과 입력</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button id="saveRecordBtn" class="auth-btn" style="width: 100%; padding: 16px; background: var(--accent-color); color: #000; font-weight: 700; margin-top: 25px;">성과 차트 반영</button>
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
        document.getElementById('backToGoal')?.addEventListener('click', () => {
            this.setState({ currentView: 'dailyGoal', aiAnalysis: null });
        });
        document.querySelectorAll('.setup-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const cat = this.state.categories.find(c => c.id == id);
                const val = prompt(`'${cat.name}'의 오늘의 성취도를 입력하세요 (0-100):`, this.state.records[this.state.selectedDate]?.[id] || 0);
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
        
        // 점수 계산: 중요도가 높을수록 100점에 도달하기 어렵게 설정
        const data = this.state.categories.map(c => {
            const investment = todayRecord[c.id] || 0;
            // 가중치가 20%일 때를 기준(1:1)으로, 그보다 높으면 점수 획득이 어려움
            const weightFactor = c.weight / 20; 
            return Math.min(100, Math.round(investment / (weightFactor || 1)));
        });

        const hasDeficiency = data.some(score => score < 50);
        const mainColor = hasDeficiency ? '#ff4d4d' : '#00f2ff'; // 결핍 시 빨간색
        const areaColor = hasDeficiency ? 'rgba(255, 77, 77, 0.2)' : 'rgba(0, 242, 255, 0.2)';

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '완벽한 균형 (100%)',
                        data: new Array(labels.length).fill(100),
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0
                    },
                    {
                        label: '나의 밸런스',
                        data: data,
                        backgroundColor: areaColor,
                        borderColor: mainColor,
                        borderWidth: 3,
                        pointBackgroundColor: mainColor,
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: mainColor,
                        pointRadius: 5,
                        pointHitRadius: 10
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        beginAtZero: true,
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: function(context) {
                                // 해당 분야 점수가 낮으면 라벨도 빨간색으로 표시
                                return data[context.index] < 50 ? '#ff4d4d' : '#fff';
                            },
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            display: false,
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` 점수: ${context.raw}점`;
                            }
                        }
                    }
                }
            }
        });

        // 하단 결핍 리스트 업데이트
        const defContainer = document.getElementById('deficiencyList');
        const deficiencies = this.state.categories
            .map((c, i) => ({ name: c.name, score: data[i] }))
            .filter(item => item.score < 50)
            .map(item => `
                <div class="deficiency-alert" style="background: rgba(255, 77, 77, 0.1); padding: 10px 15px; border-radius: 10px; margin-bottom: 8px; border-left: 4px solid #ff4d4d;">
                    <strong>${item.name}</strong> 분야 성취도(${item.score}점)가 낮습니다! 가중치 대비 노력이 필요합니다.
                </div>
            `);
        
        defContainer.innerHTML = deficiencies.length > 0 
            ? `<h4 style="color: #ff4d4d; margin-top: 20px; margin-bottom: 10px;">⚠️ 발견된 균형 결핍</h4>${deficiencies.join('')}`
            : '<h4 style="color: #4dff88; margin-top: 20px;">✅ 아주 이상적인 균형을 유지하고 있습니다!</h4>';
    }

    runAiAnalysis() {
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        const deficiencies = this.state.categories.filter(c => {
            const investment = todayRecord[c.id] || 0;
            const weightFactor = c.weight / 20;
            const score = investment / (weightFactor || 1);
            return score < 50;
        });
        let message = "현재 삶이 매우 조화롭게 균형을 이루고 있습니다!";
        if (deficiencies.length > 0) {
            const topDef = deficiencies.sort((a,b) => b.weight - a.weight)[0];
            message = `현재 '${topDef.name}' 분야의 성취가 낮습니다. 설정하신 목표를 다시 점검해 보세요.`;
        }
        this.setState({ aiAnalysis: message });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new LifeBalancer();
});
