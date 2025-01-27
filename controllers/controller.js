const fs = require("fs")
const { sellMint } = require("../bot/sell")

const getSnipingAccount = async (req, res) => {
    try {
        let existingList = fs.readFileSync("./tx/snipingList.json", "utf-8")
        existingList = JSON.parse(existingList)
        const index = existingList.map(e => e.mint).indexOf(req.body.mint)
        if (index < 0) {
            return res.status(404).send({ msg: "Not found in history" })
        }
        return res.status(200).send({ data: existingList[index] })
    } catch (err) {
        res.status(501).send("server error")
    }
}
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
    getSnipingAccount,
    getBoughtList,
    sell,
    getTradeHis
}