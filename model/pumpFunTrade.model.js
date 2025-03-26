const mongoose = require("mongoose");

const pumpFunTradeSchema = new mongoose.Schema({
  mint: {
    type: String,
    required: true
  },
  signer: {
    type: String,
    required: true
  },
  amount: {
    type: String,
    required: true
  },
  blockTime: {
    type: String,
    required: true
  },
  slot: {
    type: String,
    required: true
  },
  progress: {
    type: String,
    required: true
  }
})

module.exports = mongoose.model("PumpFunTradeSchema", pumpFunTradeSchema);
