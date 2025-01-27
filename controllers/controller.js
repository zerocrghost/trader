const fs = require("fs")
const { sellMint } = require("../bot/sell")
const getBoughtList = async (req, res) => {
    try {
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        const holdings = existingBoughtList.filter((l) => l.status !== "sold")
        return res.status(200).send({ data: holdings })
    } catch (err) {
        res.status(501).send("server error")
    }
}

const getTradeHis = async (req, res) => {
    try {
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        const holdings = existingBoughtList.filter((l) => l.status === "sold")
        return res.status(200).send({ data: holdings })

    } catch (err) {

    }
}

const sell = async (req, res) => {
    try {
        const mint = req.body.mint
        const hash = await sellMint(mint)
        return res.status(200).send({ msg: hash })
    } catch (err) {
        res.status(501).send("Error Selling")
    }
}

module.exports = {
    getBoughtList,
    sell,
    getTradeHis
}