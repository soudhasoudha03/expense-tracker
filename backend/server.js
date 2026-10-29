const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Transaction = require("./models/Transaction");
const Budget = require("./models/Budget");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Test backend
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Expense Tracker backend is running!",
  });
});

// Get all transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({
      date: -1,
    });

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Fetch transactions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
    });
  }
});

// Add transaction
app.post("/api/transactions", async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !["income", "expense"].includes(type) ||
      typeof category !== "string" ||
      !category.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid transaction details",
      });
    }

    const transactionData = {
      title: title.trim(),
      amount: Number(amount),
      type,
      category: category.trim(),
    };

    if (date) {
      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid date",
        });
      }

      transactionData.date = parsedDate;
    }

    const transaction = await Transaction.create(transactionData);

    res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Add transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to add transaction",
    });
  }
});

// Delete transaction
app.delete("/api/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const transaction = await Transaction.findByIdAndDelete(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete transaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
    });
  }
});

// Get monthly budget
app.get("/api/budget/:month", async (req, res) => {
  try {
    const { month } = req.params;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month format. Use YYYY-MM",
      });
    }

    const budget = await Budget.findOne({ month });

    res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error("Fetch budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly budget",
    });
  }
});

// Create or update monthly budget
app.put("/api/budget/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const { amount } = req.body;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Invalid month format. Use YYYY-MM",
      });
    }

    if (
      amount === undefined ||
      amount === null ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Budget must be greater than zero",
      });
    }

    const budget = await Budget.findOneAndUpdate(
      { month },
      { $set: { amount: Number(amount) } },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Monthly budget saved successfully",
      data: budget,
    });
  } catch (error) {
    console.error("Save budget error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save monthly budget",
    });
  }
});

// Connect MongoDB and start server
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from the backend .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

startServer();