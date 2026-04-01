/**
 * Life Balancer - Core Application Logic
 */

class LifeBalancer {
    constructor() {
        this.state = {
            user: JSON.parse(localStorage.getItem('lb_user')) || null,
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
                    <button id="loginBtn" class="auth-btn">시작하기</button>
                </div>
            </div>
        `;
    }

    bindAuthEvents() {
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            const username = document.getElementById('username').value;
            if (username) {
                this.setState({ user: { name: username } });
            }
        });
    }

    // --- Dashboard Component ---
    renderDashboard() {
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        
        return `
            <div class="fade-in">
                <header class="dashboard-header">
                    <div>
                        <h2 style="font-size: 1.5rem;">안녕하세요, ${this.state.user.name}님</h2>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">${this.state.selectedDate}의 기록</p>
                    </div>
                    <button id="logoutBtn" style="background: none; color: var(--text-secondary);">로그아웃</button>
                </header>

                <div class="glass-card" style="margin-bottom: 30px;">
                    <div class="calendar-grid">
                        ${this.renderCalendar()}
                    </div>
                </div>

                <section class="glass-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3>분야별 목표 설정</h3>
                        <span style="font-size: 0.8rem; color: var(--accent-color)">가중치 합: ${this.getTotalWeight()}%</span>
                    </div>
                    
                    <div class="category-grid">
                        ${this.state.categories.map(cat => `
                            <div class="category-item">
                                <h4>
                                    ${cat.name}
                                    <input type="number" class="weight-input" data-id="${cat.id}" value="${cat.weight}">%
                                </h4>
                                <label style="font-size: 0.7rem; color: var(--text-secondary);">달성률 (0-100)</label>
                                <input type="range" class="achievement-slider" data-id="${cat.id}" min="0" max="100" value="${todayRecord[cat.id] || 0}" style="width: 100%; margin-top: 5px;">
                                <div style="text-align: right; font-size: 0.8rem;">${todayRecord[cat.id] || 0}%</div>
                            </div>
                        `).join('')}
                        <button class="add-category-btn" id="addCategory">+</button>
                    </div>
                    
                    <button id="saveRecordBtn" class="auth-btn" style="margin-top: 20px;">기록 완료</button>
                </section>

                <section class="analysis-section glass-card">
                    <h3>밸런스 시각화 (n-각형)</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                        <button class="view-toggle active" data-view="weekly">주간</button>
                        <button class="view-toggle" data-view="monthly">월간</button>
                    </div>
                    <canvas id="balanceChart"></canvas>
                    <div id="deficiencyList"></div>
                    
                    <button id="aiAnalyzeBtn" class="auth-btn" style="background: #1e293b; color: #fff; margin-top: 20px;">원인 분석 (AI)</button>
                    ${this.state.aiAnalysis ? `<div class="ai-reason-card fade-in"><strong>AI 분석 결과:</strong><br>${this.state.aiAnalysis}</div>` : ''}
                </section>
            </div>
        `;
    }

    renderCalendar() {
        const days = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            days.push(`
                <div class="calendar-day ${dateStr === this.state.selectedDate ? 'selected' : ''}" data-date="${dateStr}">
                    ${d.getDate()}
                </div>
            `);
        }
        return days.join('');
    }

    getTotalWeight() {
        return this.state.categories.reduce((sum, cat) => sum + cat.weight, 0);
    }

    bindDashboardEvents() {
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.setState({ user: null });
        });

        // Date selection
        document.querySelectorAll('.calendar-day').forEach(el => {
            el.addEventListener('click', (e) => {
                this.setState({ selectedDate: e.target.dataset.date });
            });
        });

        // Weight updates
        document.querySelectorAll('.weight-input').forEach(el => {
            el.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const val = parseInt(e.target.value);
                const categories = this.state.categories.map(c => c.id === id ? { ...c, weight: val } : c);
                this.setState({ categories });
            });
        });

        // Add Category
        document.getElementById('addCategory')?.addEventListener('click', () => {
            const name = prompt('새로운 분야 이름을 입력하세요:');
            if (name) {
                const newCat = { id: Date.now(), name, weight: 0 };
                this.setState({ categories: [...this.state.categories, newCat] });
            }
        });

        // Save Record
        document.getElementById('saveRecordBtn')?.addEventListener('click', () => {
            const currentRecord = {};
            document.querySelectorAll('.achievement-slider').forEach(el => {
                currentRecord[el.dataset.id] = parseInt(el.value);
            });
            const records = { ...this.state.records, [this.state.selectedDate]: currentRecord };
            this.setState({ records });
            alert('기록이 저장되었습니다.');
        });

        // AI Analysis
        document.getElementById('aiAnalyzeBtn')?.addEventListener('click', () => {
            this.runAiAnalysis();
        });
    }

    updateChart() {
        const ctx = document.getElementById('balanceChart')?.getContext('2d');
        if (!ctx) return;

        const labels = this.state.categories.map(c => c.name);
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        
        // Logic: Score = (Investment / Weight) * (TotalWeight / CategoryCount)
        // This ensures that higher weight categories need more "Investment" to reach 100.
        const data = this.state.categories.map(c => {
            const investment = todayRecord[c.id] || 0;
            const weightFactor = c.weight / 20; // Normalizing around 20% weight
            const score = Math.min(100, Math.round(investment / (weightFactor || 1)));
            return score;
        });

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '성과 달성도 (Score)',
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
                plugins: {
                    legend: { display: false }
                }
            }
        });

        // Update Deficiency List
        const defContainer = document.getElementById('deficiencyList');
        const deficiencies = this.state.categories
            .filter((c, i) => data[i] < 50)
            .map(c => `<div class="deficiency-alert">⚠️ '${c.name}' 분야에서 성과 결핍이 발견되었습니다! (가중치 대비 투자 부족)</div>`);
        
        defContainer.innerHTML = deficiencies.join('');
    }

    runAiAnalysis() {
        const todayRecord = this.state.records[this.state.selectedDate] || {};
        const deficiencies = this.state.categories.filter(c => (todayRecord[c.id] || 0) < 50);
        
        let message = "분석 중...";
        if (deficiencies.length === 0) {
            message = "모든 분야가 훌륭하게 균형을 이루고 있습니다! 지금의 페이스를 유지하세요.";
        } else {
            const targetNames = deficiencies.map(d => d.name).join(', ');
            message = `${targetNames} 분야의 달성률이 낮습니다. ${deficiencies[0].name}에 대한 가중치가 ${deficiencies[0].weight}%로 높은데 투자가 부족하군요. 내일은 ${deficiencies[0].name}를 위해 30분만 더 시간을 할애해보는 건 어떨까요?`;
        }
        
        this.setState({ aiAnalysis: message });
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    new LifeBalancer();
});
