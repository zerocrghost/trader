const axios = require("axios");
const { socialAPI, socialToken } = require("../config/constants");

const getSocialCreators = async (req, res) => {
    try {
        if (!!req.params.topic) return res.status(400).send({ error: "Topic Undefined" })
        const response = await axios({
            url: `${socialAPI}/topic/${req.params.topic}/creators/v1`,
            method: "get",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${socialToken}`
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
                "Authorization": `Bearer ${socialToken}`
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