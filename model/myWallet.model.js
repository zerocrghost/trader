const mongoose = require("mongoose");

const myWalletSchema = new mongoose.Schema({
  publicKey: {
    type: String,
    required: true
  },
  privateKey: {
    type: String,
    required: true
  },
  archieved: {
    type: Boolean,
    default: false
  }
})

module.exports = mongoose.model("MyWalletSchema", myWalletSchema);
