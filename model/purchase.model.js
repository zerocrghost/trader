const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
    mint: {
        type: String,
        required: true
    },
    creator: {
        type: String,
        required: true
    },
    creatorStatus: {
        type: String,
        required: true
    },
    creatorSolAmt: {
        type: String,
        required: true
    },
    createdAt: {
        type: String,
        required: true
    },
    volume: {
        type: String,
        required: true
    },
    oldAt: {
        type: String,
        required: true
    },
    progress: {
        type: String,
        required: true
    },
})

module.exports = mongoose.model("PurchaseSchema", purchaseSchema);
