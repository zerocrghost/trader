const mongoose = require("mongoose");

const pumpSwapTradeSchema = new mongoose.Schema({
  mint: {
    type: String,
    required: true
  },
  signer: {
    type: String,
    required: true
  },
  tx: {
    type: String,
    required: true
  },
  solAmount: {
    type: String,
    required: true
  },
  mintAmount: {
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
  method: {
    type: String,
    required: true
  },
})

module.exports = mongoose.model("PumpSwapTradeSchema", pumpSwapTradeSchema);
