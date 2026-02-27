# TODO: Implement AI-Powered Behavioral Insights & Budget Progress

## Task Overview
1. AI-Powered Behavioral Insights: Weekend vs Weekday spending analysis
2. Dynamic Progress & Overspending Alerts: Budget progress bars

## Files to Edit

### 1. src/services/ai.ts
- [ ] Add new interfaces for Budget and WeekendWeekday
- [ ] Update GroundTruth interface to include budgetProgress and weekendVsWeekday
- [ ] Implement getWeekendVsWeekday() function to analyze spending patterns
- [ ] Implement getBudgetProgress() function with budget management
- [ ] Update buildGroundTruth() to include both features

### 2. src/services/db.ts
- [ ] Add getBudgets() method to retrieve category budgets
- [ ] Add setBudget() method to save category budgets
- [ ] Update localStorage key for budgets

## Implementation Details

### Feature 1: Weekend vs Weekday
- Compare current weekend's total against 4-week average
- If variance > 20%, generate alert message
- Group transactions by weekend (Sat-Sun) vs weekday (Mon-Fri)

### Feature 2: Budget Progress
- Add default budgets for categories
- Calculate spent vs budget percentage
- Status: safe (<80%), warning (80-100%), danger (>100%)
