import { useState, useEffect } from "react";

// Recharts for the spending trend chart
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const monthlyData = [
  { month: "Aug", amount: 18500 },
  { month: "Sep", amount: 17800 },
  { month: "Oct", amount: 19200 },
  { month: "Nov", amount: 17100 },
  { month: "Dec", amount: 15800 },
  { month: "Jan", amount: 14200 },
];

const topCategories = [
  {
    name: "Food",
    icon: "🍜",
    amount: 5824,
    change: -8,
    color: "#00d4aa",
  },
  {
    name: "Transport",
    icon: "🚗",
    amount: 2548,
    change: 12,
    color: "#ff6b6b",
  },
  {
    name: "Shopping",
    icon: "🛍️",
    amount: 3276,
    change: -5,
    color: "#00d4aa",
  },
];

const overspendingAlerts = [
  {
    category: "Transport",
    icon: "🚗",
    message: "You're approaching your monthly limit",
    spent: 2548,
    limit: 3000,
    percent: 85,
    color: "#f59e0b",
  },
  {
    category: "Food",
    icon: "🍜",
    message: "Higher than usual weekend spending",
    spent: 5824,
    limit: 8000,
    percent: 73,
    color: "#f59e0b",
  },
];

const aiRecommendations = [
  {
    id: 1,
    title: "Excellent Progress",
    icon: "✅",
    impact: "high impact",
    impactColor: "#ff6b6b",
    bg: "rgba(0, 212, 170, 0.08)",
    border: "rgba(0, 212, 170, 0.2)",
    description:
      "Your spending decreased by 8.3% this month. Keep up the disciplined approach to budgeting.",
  },
  {
    id: 2,
    title: "Transportation Optimization",
    icon: "💡",
    impact: "medium impact",
    impactColor: "#f59e0b",
    bg: "rgba(59, 130, 246, 0.08)",
    border: "rgba(59, 130, 246, 0.2)",
    description:
      "Consider using public transport for daily commute. Estimated savings: ₹450 per week.",
  },
  {
    id: 3,
    title: "Weekend Spending Pattern",
    icon: "⚠️",
    impact: "medium impact",
    impactColor: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.2)",
    description:
      "Your weekend expenses are 45% higher than weekdays. Set a weekend budget to control impulse purchases.",
  },
  {
    id: 4,
    title: "Subscription Audit",
    icon: "💡",
    impact: "high impact",
    impactColor: "#ff6b6b",
    bg: "rgba(59, 130, 246, 0.08)",
    border: "rgba(59, 130, 246, 0.2)",
    description:
      "You have overlapping streaming subscriptions. Cancel duplicates to save ₹918 monthly.",
  },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#1a2332",
          border: "1px solid rgba(0,212,170,0.3)",
          borderRadius: 8,
          padding: "8px 14px",
          color: "#e2e8f0",
          fontSize: 13,
        }}
      >
        <div style={{ color: "#00d4aa", fontWeight: 600 }}>{label}</div>
        <div>₹{payload[0].value.toLocaleString("en-IN")}</div>
      </div>
    );
  }
  return null;
};

export default function InsightsPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const currentMonth = 14200;
  const lastMonth = 15480;
  const changePct = (((currentMonth - lastMonth) / lastMonth) * 100).toFixed(1);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1520",
        color: "#e2e8f0",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        padding: "32px 36px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#f1f5f9",
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          Insights
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0" }}>
          AI-powered analysis of your financial behavior
        </p>
      </div>

      {/* Monthly Spending Trend */}
      <Card style={{ marginBottom: 24 }}>
        <SectionTitle
          title="Monthly Spending Trend"
          subtitle="6-month comparison showing your progress"
        />
        <div style={{ height: 280, marginTop: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `₹${v / 1000}k`}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 22000]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#00d4aa"
                strokeWidth={2.5}
                dot={{ fill: "#00d4aa", r: 5, strokeWidth: 0 }}
                activeDot={{ r: 7, fill: "#00d4aa" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Current Month + Change */}
      <Card style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>
              Current Month
            </div>
            <div
              style={{ fontSize: 34, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-1px" }}
            >
              ₹{currentMonth.toLocaleString("en-IN")}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,212,170,0.1)",
              border: "1px solid rgba(0,212,170,0.25)",
              borderRadius: 20,
              padding: "8px 14px",
              color: "#00d4aa",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            <span style={{ fontSize: 16 }}>↘</span>
            {changePct}% vs last month
          </div>
        </div>
      </Card>

      {/* Top Spending + Overspending Alerts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* Top Spending Categories */}
        <Card>
          <SectionTitle
            title="Top Spending Categories"
            subtitle="Your highest expense areas this month"
          />
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {topCategories.map((cat) => (
              <div
                key={cat.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(0,212,170,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>
                      {cat.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: cat.change < 0 ? "#00d4aa" : "#ff6b6b",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {cat.change < 0 ? "↗" : "↗"}{" "}
                      {Math.abs(cat.change)}%{" "}
                      {cat.change < 0 ? "decrease" : "increase"}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>
                  ₹{cat.amount.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Overspending Alerts */}
        <Card>
          <SectionTitle
            title="Overspending Alerts"
            subtitle="Categories requiring attention"
          />
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            {overspendingAlerts.map((alert) => (
              <div
                key={alert.category}
                style={{
                  background: "rgba(245,158,11,0.07)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 12,
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontSize: 20, marginTop: 1 }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
                      {alert.category}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
                      {alert.message}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#94a3b8",
                        marginBottom: 6,
                      }}
                    >
                      <span>
                        ₹{alert.spent.toLocaleString("en-IN")} of ₹
                        {alert.limit.toLocaleString("en-IN")}
                      </span>
                      <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                        {alert.percent}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${alert.percent}%`,
                          background: "#f59e0b",
                          borderRadius: 4,
                          transition: "width 1s ease",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <SectionTitle
            title="AI Recommendations"
            subtitle="Personalized insights to improve your finances"
          />
          <span style={{ fontSize: 12, color: "#475569" }}>
            Last updated: Today, 10:30 AM
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {aiRecommendations.map((rec) => (
            <div
              key={rec.id}
              style={{
                background: rec.bg,
                border: `1px solid ${rec.border}`,
                borderRadius: 12,
                padding: "18px",
                transition: "transform 0.2s, border-color 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.borderColor = rec.border.replace("0.2", "0.5");
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = rec.border;
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {rec.icon}
                  </div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9", maxWidth: 140 }}
                  >
                    {rec.title}
                  </div>
                </div>
                <span
                  style={{
                    background: `${rec.impactColor}20`,
                    color: rec.impactColor,
                    border: `1px solid ${rec.impactColor}40`,
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {rec.impact}
                </span>
              </div>
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {rec.description}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: "#131f2e",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "24px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#f1f5f9",
          margin: 0,
          letterSpacing: "-0.3px",
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: "#64748b", fontSize: 12, margin: "3px 0 0" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}