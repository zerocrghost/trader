const mongoose = require("mongoose");

const pumpFunModelMintSchema = new mongoose.Schema({
  mint: {
    type: String,
    required: true
  },
  signer: {
    type: String,
    required: true
  },
  createSig: {
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
  }
})

module.exports = mongoose.model("PumpFunModelMintSchema", pumpFunModelMintSchema);