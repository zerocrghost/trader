const axios = require("axios");
const { socialAPI } = require("../config/constants");

const getSocialCreators = async (req, res) => {
    try {
        if (!!req.params.topic) return res.status(400).send({ error: "Topic Undefined" })
        const response = await axios({
            url: `${socialAPI}/topic/${req.params.topic}/creators/v1`,
            method: "get",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LUNAR_TOKEN}`
            },

        });

        return response.data[0]
    } catch (err) {
        throw (err)
    }
}

const getSocialPosts = async (req, res) => {
    try {
        if (!!req.params.topic) return res.status(400).send({ error: "Topic Undefined" })
        const response = await axios({
            url: `${socialAPI}/topic/${req.params.topic}/posts/v1`,
            method: "get",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LUNAR_TOKEN}`
            },

        });

        return response.data[0]
    } catch (err) {
        throw (err)
    }
}

module.exports = {
    getSocialCreators, getSocialPosts
}