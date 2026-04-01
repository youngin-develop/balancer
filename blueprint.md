# Life Balancer - Blueprint

## Overview
Life Balancer is a data-driven lifestyle management service that goes beyond simple habit tracking. It helps users achieve a balanced life by visualizing their daily activities across various domains (e.g., career, health, hobbies) and identifying "deficiencies" through intuitive n-gon (radar) charts. It uses AI to analyze performance and suggest behavioral improvements.

## Detailed Outline (Project State)
### 1. Vision & Core Value
- "Beyond habit tracking, balancing life through data."
- Visualizing life as a balanced shape (n-gon).
- Action-oriented insights via AI cause analysis.

### 2. Design System (Planned)
- **Background**: Deep black with subtle noise texture for a premium feel.
- **Color Palette**: Vibrant accent colors for different life categories.
- **Typography**: Expressive, modern sans-serif.
- **Visual Effects**: Soft, deep shadows for "lifted" cards; glows for interactive elements.
- **Components**: Web Components for modularity (Custom Elements, Shadow DOM).

### 3. Key Features (Planned)
- **Login/Auth**: Secure-looking landing page.
- **Calendar Dashboard**: Main entry point for daily records.
- **Dynamic Category Management**: Square buttons to add areas and set weights (total 100%).
- **Goal Setting**: Input achievement rates (0-100) for each category.
- **Balance Visualization**:
    - Weekly/Monthly n-gon (Radar) charts.
    - Automatic "Deficiency" detection (marked in red).
    - Statistical bar/line graphs.
- **AI Analysis**: "Cause Analysis" button that triggers an AI-powered explanation for missed goals.

## Plan & Steps for Current Phase

### Step 1: Foundation & Core Layout
- Update `index.html` with basic structure and meta tags.
- Setup `style.css` with global variables (black theme, spacing, typography).
- Initialize `main.js` with a simple router/state manager.

### Step 2: Authentication & Landing
- Create a `LifeAuth` web component for the login screen.
- Implement a simple "Enter" transition to the dashboard.

### Step 3: Calendar & Dashboard
- Create `LifeCalendar` component for the daily view.
- Implement state to track records per date.

### Step 4: Daily Entry & Weights
- Create `LifeEntry` component for adding categories.
- Implement weight logic (summing to 100).
- Create `GoalInput` for each category to record daily achievement.

### Step 5: Visualization (The n-gon)
- Integrate Chart.js via CDN.
- Create `LifeBalanceChart` component using Radar charts.
- Implement logic to detect and highlight "deficiency" (low values).
- Add weekly/monthly toggle.

### Step 6: AI Analysis Integration
- Create `AiAnalysis` component with a "Analyze Cause" button.
- Implement a mock AI response logic (to be replaced with actual OpenAI API call if credentials provided, or simulated for prototype).

### Step 7: Final Polish & A11Y
- Apply "premium" textures and glows.
- Ensure mobile responsiveness.
- Validate with browser console and tests.
