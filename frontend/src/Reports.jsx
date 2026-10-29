import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./Reports.css";

const COLORS = [
  "#6c63e8",
  "#22a06b",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

function money(value) {
  return (
    "\u20B9" +
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })
  );
}

function monthKey(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function monthLabel(key) {
  if (!key) return "";

  const [year, month] = key.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function Reports({ transactions = [] }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  const [reportBudget, setReportBudget] = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Load the selected month's budget from the backend
  useEffect(() => {
    let cancelled = false;

    async function loadReportBudget() {
      setBudgetLoading(true);
      setReportBudget(null);

      try {
        const response = await fetch(
          `http://localhost:5000/api/budget/${selectedMonth}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Could not load budget");
        }

        if (!cancelled) {
          setReportBudget(result.data || null);
        }
      } catch (error) {
        console.error("Report budget loading error:", error);
      } finally {
        if (!cancelled) {
          setBudgetLoading(false);
        }
      }
    }

    loadReportBudget();

    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  // Transactions for the selected month
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(
      (item) => monthKey(item.date) === selectedMonth
    );
  }, [transactions, selectedMonth]);

  // Calculate income, expenses, savings and categories
  const report = useMemo(() => {
    const income = monthlyTransactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = monthlyTransactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const totals = {};

    monthlyTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const category = item.category || "Other";

        totals[category] =
          (totals[category] || 0) + Number(item.amount || 0);
      });

    const categories = Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return {
      income,
      expenses,
      savings: income - expenses,
      categories,
    };
  }, [monthlyTransactions]);

  const budgetLimit = reportBudget
    ? Number(reportBudget.amount || 0)
    : 0;

  const remainingBudget = budgetLimit - report.expenses;

  // Last six months chart
  const monthlyChart = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - offset,
        1
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      months.push({
        key,
        month: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        income: 0,
        expenses: 0,
      });
    }

    const lookup = Object.fromEntries(
      months.map((item) => [item.key, item])
    );

    transactions.forEach((item) => {
      const key = monthKey(item.date);

      if (!lookup[key]) return;

      if (item.type === "income") {
        lookup[key].income += Number(item.amount || 0);
      } else if (item.type === "expense") {
        lookup[key].expenses += Number(item.amount || 0);
      }
    });

    return months;
  }, [transactions]);

  // Download PDF report for the selected month
  function handleDownloadPdf() {
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text("Expense Tracker Report", 14, 20);

      doc.setFontSize(12);
      doc.text(`Month: ${monthLabel(selectedMonth)}`, 14, 30);

      doc.setFontSize(11);
      doc.text(
        `Total Income: Rs. ${report.income.toLocaleString("en-IN")}`,
        14,
        42
      );

      doc.text(
        `Total Expenses: Rs. ${report.expenses.toLocaleString("en-IN")}`,
        14,
        50
      );

      doc.text(
        `Net Savings: Rs. ${report.savings.toLocaleString("en-IN")}`,
        14,
        58
      );

      doc.setFontSize(12);
      doc.text("Monthly Budget Summary", 14, 70);

      doc.setFontSize(10);

      doc.text(
        `Budget Limit: Rs. ${budgetLimit.toLocaleString("en-IN")}`,
        14,
        79
      );

      doc.text(
        `Amount Spent: Rs. ${report.expenses.toLocaleString("en-IN")}`,
        14,
        87
      );

      const budgetStatus =
        remainingBudget >= 0 ? "Remaining Budget" : "Over Budget";

      doc.text(
        `${budgetStatus}: Rs. ${Math.abs(remainingBudget).toLocaleString("en-IN")}`,
        14,
        95
      );

      let tableStartY = 105;

      // Category-wise expenses
      if (report.categories.length > 0) {
        doc.setFontSize(12);
        doc.text("Expenses by Category", 14, 105);

        autoTable(doc, {
          startY: 109,
          head: [["Category", "Amount (Rs.)"]],
          body: report.categories.map((item) => [
            item.name,
            Number(item.amount).toLocaleString("en-IN"),
          ]),
          theme: "grid",
          styles: { fontSize: 9 },
          headStyles: { fillColor: [76, 70, 170] },
        });

        tableStartY = doc.lastAutoTable.finalY + 10;
      }

      // Transaction table
      autoTable(doc, {
        startY: tableStartY,
        head: [["Date", "Title", "Category", "Type", "Amount (Rs.)"]],
        body:
          monthlyTransactions.length > 0
            ? monthlyTransactions.map((item) => [
                item.date
                  ? new Date(item.date).toLocaleDateString("en-IN")
                  : "-",
                item.title || item.description || "-",
                item.category || "Other",
                item.type || "-",
                Number(item.amount || 0).toLocaleString("en-IN"),
              ])
            : [["-", "No transactions", "-", "-", "0"]],
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: "linebreak",
        },
        headStyles: { fillColor: [76, 70, 170] },
        columnStyles: {
          1: { cellWidth: 48 },
        },
      });

      doc.save(`expense-report-${selectedMonth}.pdf`);
    } catch (error) {
      console.error("PDF download error:", error);
      window.alert("Could not create the PDF. Please try again.");
    }
  }

  return (
    <section className="panel reports-panel">
      <div className="reports-heading">
        <div>
          <p className="reports-eyebrow">ANALYSE YOUR MONEY</p>

          <h2>Monthly Reports</h2>

          <p className="panel-description">
            Understand your income, spending and savings.
          </p>
        </div>

        <div className="reports-controls">
          <label className="reports-month">
            <span>Select month</span>

            <input
              type="month"
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth(event.target.value)
              }
            />
          </label>

          <button
            type="button"
            className="reports-pdf-button"
            onClick={handleDownloadPdf}
            disabled={budgetLoading}
          >
            {budgetLoading ? "Loading Budget..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="report-summary-grid">
        <article className="report-summary-card">
          <span>Income</span>
          <strong className="report-income">
            {money(report.income)}
          </strong>
        </article>

        <article className="report-summary-card">
          <span>Expenses</span>
          <strong className="report-expenses">
            {money(report.expenses)}
          </strong>
        </article>

        <article className="report-summary-card">
          <span>Net Savings</span>
          <strong
            className={
              report.savings < 0
                ? "report-expenses"
                : "report-income"
            }
          >
            {money(report.savings)}
          </strong>
        </article>
      </div>

      {/* Budget summary */}
      <div className="report-summary-grid">
        <article className="report-summary-card">
          <span>Monthly Budget</span>
          <strong>{money(budgetLimit)}</strong>
        </article>

        <article className="report-summary-card">
          <span>Amount Spent</span>
          <strong className="report-expenses">
            {money(report.expenses)}
          </strong>
        </article>

        <article className="report-summary-card">
          <span>
            {remainingBudget >= 0 ? "Remaining Budget" : "Over Budget"}
          </span>
          <strong
            className={
              remainingBudget < 0
                ? "report-expenses"
                : "report-income"
            }
          >
            {money(Math.abs(remainingBudget))}
          </strong>
        </article>
      </div>

      {/* Charts */}
      <div className="reports-chart-grid">
        <article className="report-chart-card">
          <h3>Income vs Expenses</h3>
          <p>Last 6 months</p>

          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) =>
                    value >= 1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value
                  }
                />

                <Tooltip formatter={(value) => money(value)} />
                <Legend />

                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#22a06b"
                />

                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#6c63e8"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="report-chart-card">
          <h3>Spending by Category</h3>
          <p>Expenses for {monthLabel(selectedMonth)}</p>

          {report.categories.length === 0 ? (
            <div className="report-empty">
              <span>No expenses for this month yet.</span>
              <small>
                Add an expense to see your category chart.
              </small>
            </div>
          ) : (
            <div className="report-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report.categories}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius="65%"
                  >
                    {report.categories.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {report.categories.length > 0 && (
            <ul className="report-category-list">
              {report.categories.map((item, index) => (
                <li key={item.name}>
                  <span>
                    <i
                      style={{
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                    {item.name}
                  </span>

                  <strong>{money(item.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}