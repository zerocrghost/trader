const mongoose = require("mongoose")

const socialPostSchema = new mongoose.Schema({
    mint: {
        type: String,
        required: true
    },
    progress: {
        type: Number,
        required: true
    },
    postId: {
        type: String,
        required: true
    },
    postTitle: {
        type: String,
        required: true
    },
    postLink: {
        type: String,
        required: true
    },
    postCreated: {
        type: String,
        required: true
    },
    postSentiment: {
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
    interactionsTotal: {
        type: String,
        required: true
    },
    interactions24H: {
        type: String,
        required: true
    },
    firstPost: {
        type: Boolean,
        required: true
    }
})

module.exports = mongoose.model("SocialPostSchema", socialPostSchema)