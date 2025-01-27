const fs = require("fs")
const { sellMint, fetchTxDetail } = require("../bot/sell")
const { connection, privKey } = require("../bot/constants")
const { createTokenAccount } = require("../bot/utils")

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

const manualUpdateSellHis = async (req, res) => {
    const { mint, hash } = req.body
    let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
    existingBoughtList = JSON.parse(existingBoughtList)
    const buyIndex = existingBoughtList.map(e => e.mint).indexOf(mint)

    if (existingBoughtList[buyIndex].status === "sold") {
        return res.status(200).send({ msg: "already listed in sell history" })
    }
    const result = await fetchTxDetail(mint, hash)
    if (buyIndex >= 0) {
        existingBoughtList[buyIndex].sell = {
            Sol: result.wSolChange, Mint: result.mintChange
        }
        existingBoughtList[buyIndex].signatures.push({
            txType: "Sell",
            signature: hash,
            blockTime: result.tradeBlockTime,
            slot: result.tradeSlot
        })
        existingBoughtList[buyIndex].status = "sold"
    } else {
        existingBoughtList.push({
            sell: {
                Sol: result.wSolChange, Mint: result.mintChange
            },
            signatures: [
                {
                    txType: "Sell",
                    signature: hash,
                    blockTime: result.tradeBlockTime,
                    slot: result.tradeSlot
                }
            ],
            status: "sold"
        })
    }
    fs.writeFileSync("./tx/boughtList.json", JSON.stringify(existingBoughtList))
    return res.status(200).send({ msg: "Updated Sell History" })
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

const createAccount = async (req, res) => {
    try {
        const mint = req.body.mint
        const res = await createTokenAccount(connection, getKeyPair(privKey), mint)
        res.status(200).send({ msg: res })
    } catch (err) {
        return res.status(501).send({ msg: "Error creating token account" })
    }
}

module.exports = {
    getSnipingAccount,
    getBoughtList,
    sell,
    getTradeHis,
    manualUpdateSellHis,
    createAccount
}