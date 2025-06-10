const mongoose = require("mongoose");

const myTradeSchema = new mongoose.Schema({
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
  }
})

module.exports = mongoose.model("MyTradeSchema", myTradeSchema);
