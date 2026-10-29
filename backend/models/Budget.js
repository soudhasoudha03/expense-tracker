const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  {
    timestamps: true,
  }
);

budgetSchema.index({ month: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);