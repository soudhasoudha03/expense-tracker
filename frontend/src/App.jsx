
import { useState, useEffect } from "react";
import "./App.css";
import Reports from "./Reports";

const API_URL = "http://localhost:5000/api/transactions";
const BUDGET_API_URL = "http://localhost:5000/api/budget";

const expenseCategories = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Entertainment",
  "Rent",
  "Other",
];

const incomeCategories = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Gift",
  "Other",
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMoney(amount) {
  return (
    "\u20B9" +
    Number(amount || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })
  );
}

function formatMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);

  return new Date(year, monthNumber - 1, 1).toLocaleDateString(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    }
  );
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food");

  const [month, setMonth] = useState(getCurrentMonth);
  const [budget, setBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState("");
  const [budgetError, setBudgetError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const categories =
    type === "income" ? incomeCategories : expenseCategories;

  // Load transactions
  useEffect(() => {
    async function loadTransactions() {
      try {
        setError("");

        const response = await fetch(API_URL);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load transactions"
          );
        }

        setTransactions(result.data);
      } catch (err) {
        console.error("Load transactions error:", err);
        setError("Could not load transactions. Check the backend.");
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  // Load the selected month's budget
  useEffect(() => {
    let cancelled = false;

    async function loadBudget() {
      setBudgetLoading(true);
      setBudgetError("");
      setBudgetMessage("");
      setBudget(null);
      setBudgetInput("");

      try {
        const response = await fetch(
          `${BUDGET_API_URL}/${month}`
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load budget"
          );
        }

        if (!cancelled) {
          setBudget(result.data);
          setBudgetInput(
            result.data ? String(result.data.amount) : ""
          );
        }
      } catch (err) {
        console.error("Load budget error:", err);

        if (!cancelled) {
          setBudgetError(
            "Could not load budget. Check the backend."
          );
        }
      } finally {
        if (!cancelled) {
          setBudgetLoading(false);
        }
      }
    }

    loadBudget();

    return () => {
      cancelled = true;
    };
  }, [month]);

  // Overall totals for all transactions
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + Number(item.amount), 0);

  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + Number(item.amount), 0);

  const balance = income - expenses;

  // Expenses for the selected month only
  const monthlyExpenses = transactions
    .filter((item) => {
      if (item.type !== "expense" || !item.date) {
        return false;
      }

      const date = new Date(item.date);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      const transactionMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      return transactionMonth === month;
    })
    .reduce((total, item) => total + Number(item.amount), 0);

  const budgetLimit = budget ? Number(budget.amount) : 0;
  const remainingBudget = budgetLimit - monthlyExpenses;

  const budgetPercent =
    budgetLimit > 0
      ? (monthlyExpenses / budgetLimit) * 100
      : 0;

  const progressWidth = Math.min(budgetPercent, 100);

  function handleTypeChange(event) {
    const newType = event.target.value;

    setType(newType);
    setCategory(newType === "income" ? "Salary" : "Food");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError("Enter a description and a valid amount.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          type,
          category,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to add transaction"
        );
      }

      setTransactions((current) => [result.data, ...current]);
      setTitle("");
      setAmount("");
    } catch (err) {
      console.error("Add transaction error:", err);
      setError(err.message || "Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function handleBudgetSubmit(event) {
    event.preventDefault();

    if (
      budgetInput.trim() === "" ||
      !Number.isFinite(Number(budgetInput)) ||
      Number(budgetInput) <= 0
    ) {
      setBudgetError("Enter a budget amount greater than zero.");
      setBudgetMessage("");
      return;
    }

    setBudgetSaving(true);
    setBudgetError("");
    setBudgetMessage("");

    try {
      const response = await fetch(
        `${BUDGET_API_URL}/${month}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Number(budgetInput),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save budget"
        );
      }

      setBudget(result.data);
      setBudgetInput(String(result.data.amount));
      setBudgetMessage("Monthly budget saved successfully!");
    } catch (err) {
      console.error("Save budget error:", err);
      setBudgetError(err.message || "Could not save budget.");
    } finally {
      setBudgetSaving(false);
    }
  }

  async function deleteTransaction(id) {
    setError("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete transaction"
        );
      }

      setTransactions((current) =>
        current.filter((item) => item._id !== id)
      );
    } catch (err) {
      console.error("Delete transaction error:", err);
      setError(err.message || "Could not delete transaction.");
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">PERSONAL FINANCE</p>
          <h1>Expense Tracker</h1>
          <p className="subtitle">
            Track your money. Build better habits.
          </p>
        </div>

        <div className="date">
          {new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </header>

      {/* Overall financial summary */}
      <section className="summary">
        <article className="summary-card balance-card">
          <p>Total Balance</p>
          <h2>{formatMoney(balance)}</h2>
          <span>Income minus expenses</span>
        </article>

        <article className="summary-card">
          <p>Total Income</p>
          <h2 className="income">{formatMoney(income)}</h2>
          <span>Money received</span>
        </article>

        <article className="summary-card">
          <p>Total Expenses</p>
          <h2 className="expense">{formatMoney(expenses)}</h2>
          <span>Money spent overall</span>
        </article>
      </section>

      {/* Monthly budget tracker */}
      <section className="panel budget-panel">
        <div className="budget-heading">
          <div>
            <p className="eyebrow">MONTHLY PLANNING</p>
            <h2>Expense Budget</h2>
            <p className="panel-description">
              Set a spending limit and keep track of your expenses.
            </p>
          </div>

          <div className="budget-month">
            <label htmlFor="budgetMonth">Select month</label>
            <input
              id="budgetMonth"
              type="month"
              value={month}
              onChange={(event) => {
                if (event.target.value) {
                  setMonth(event.target.value);
                }
              }}
            />
          </div>
        </div>

        <form className="budget-form" onSubmit={handleBudgetSubmit}>
          <div className="budget-input-group">
            <label htmlFor="monthlyBudget">
              Budget for {formatMonth(month)} ({"\u20B9"})
            </label>

            <input
              id="monthlyBudget"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 10000"
              value={budgetInput}
              onChange={(event) =>
                setBudgetInput(event.target.value)
              }
              required
            />
          </div>

          <button
            className="add-button budget-save-button"
            type="submit"
            disabled={budgetSaving || budgetLoading}
          >
            {budgetSaving
              ? "Saving..."
              : budget
                ? "Update Budget"
                : "Set Budget"}
          </button>
        </form>

        {budgetError && (
          <p className="budget-error" role="alert">
            {budgetError}
          </p>
        )}

        {budgetMessage && (
          <p className="budget-success" role="status">
            {budgetMessage}
          </p>
        )}

        {budgetLoading ? (
          <p>Loading monthly budget...</p>
        ) : budget ? (
          <>
            <div className="budget-stats">
              <article className="budget-stat">
                <span>Monthly Budget</span>
                <strong>{formatMoney(budgetLimit)}</strong>
              </article>

              <article className="budget-stat">
                <span>Spent This Month</span>
                <strong className="expense">
                  {formatMoney(monthlyExpenses)}
                </strong>
              </article>

              <article className="budget-stat">
                <span>
                  {remainingBudget >= 0
                    ? "Remaining Budget"
                    : "Over Budget"}
                </span>
                <strong
                  className={
                    remainingBudget < 0 ? "expense" : "income"
                  }
                >
                  {formatMoney(Math.abs(remainingBudget))}
                  {remainingBudget < 0 ? " over" : ""}
                </strong>
              </article>
            </div>

            <div className="budget-progress-heading">
              <span>Budget used</span>
              <strong>{budgetPercent.toFixed(1)}%</strong>
            </div>

            <div
              className="budget-progress-track"
              role="progressbar"
              aria-label="Monthly budget used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(
                Math.round(budgetPercent),
                100
              )}
            >
              <div
                className={`budget-progress-fill ${
                  budgetPercent >= 100
                    ? "over-budget"
                    : budgetPercent >= 80
                      ? "near-budget"
                      : ""
                }`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            {budgetPercent >= 100 ? (
              <p className="budget-warning" role="status">
                Budget limit reached! You have spent{" "}
                {formatMoney(monthlyExpenses)} this month.
              </p>
            ) : budgetPercent >= 80 ? (
              <p className="budget-caution" role="status">
                You have used {budgetPercent.toFixed(1)}% of your
                monthly budget. Spend carefully!
              </p>
            ) : (
              <p className="budget-hint">
                {formatMoney(Math.max(remainingBudget, 0))} left to
                spend this month.
              </p>
            )}
          </>
        ) : (
          <div className="budget-empty">
            <h3>No budget set for {formatMonth(month)}</h3>
            <p>
              Enter your monthly spending limit above and select
              Set Budget to begin tracking.
            </p>
          </div>
        )}
      </section>

      {/* Monthly Reports and Charts */}
      <Reports transactions={transactions} />

      {/* Transaction form and list */}
      <section className="content">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h2>Add Transaction</h2>
          <p className="panel-description">
            Enter your income or expense details.
          </p>

          <label htmlFor="title">Description</label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Groceries, Monthly Salary"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <label htmlFor="amount">Amount ({"\u20B9"})</label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          <label htmlFor="type">Transaction Type</label>
          <select
            id="type"
            value={type}
            onChange={handleTypeChange}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>

          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            className="add-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "+ Add Transaction"}
          </button>
        </form>

        <section className="panel transactions-panel">
          <div className="transactions-heading">
            <div>
              <h2>Recent Transactions</h2>
              <p className="panel-description">
                Your latest money activity.
              </p>
            </div>

            <span className="count">
              {transactions.length} total
            </span>
          </div>

          {loading ? (
            <p>Loading transactions...</p>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{"\u20B9"}</div>
              <h3>No transactions yet</h3>
              <p>Add your first transaction to get started.</p>
            </div>
          ) : (
            <ul className="transaction-list">
              {transactions.map((item) => (
                <li className="transaction-item" key={item._id}>
                  <div className="transaction-info">
                    <span
                      className={`transaction-icon ${item.type}`}
                    >
                      {item.type === "income" ? "\u2199" : "\u2197"}
                    </span>

                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {new Date(item.date).toLocaleDateString(
                          "en-IN"
                        )}
                        {" | "}
                        {item.category || item.type}
                      </p>
                    </div>
                  </div>

                  <div className="transaction-amount">
                    <strong className={item.type}>
                      {item.type === "income" ? "+" : "\u2212"}
                      {formatMoney(item.amount)}
                    </strong>

                    <button
                      className="delete-button"
                      type="button"
                      onClick={() => deleteTransaction(item._id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      {error && (
        <p role="alert" style={{ color: "red", marginTop: "16px" }}>
          {error}
        </p>
      )}

      <footer>
        Expense Tracker | Manage your money mindfully
      </footer>
    </main>
  );
}

export default App;


