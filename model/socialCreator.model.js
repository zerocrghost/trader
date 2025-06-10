const mongoose = require("mongoose")

const socialCreatorSchema = new mongoose.Schema({
    mint: {
        type: String,
        required: true
    },
    creatorName: {
        type: String,
        required: true
    },
    creatorId: {
        type: String,
        required: true
    },
    creatorFollowers: {
        type: String,
        required: true
    },
    interactions24H: {
        type: String,
        required: true
    },
})

module.exports = mongoose.model("SocialCreatorSchema", socialCreatorSchema)