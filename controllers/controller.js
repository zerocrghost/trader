const fs = require("fs")
const { sellMint, fetchTxDetail } = require("../bot/sell")
const { connection, privKey } = require("../bot/constants")
const { createTokenAccount, getKeyPair } = require("../bot/utils")

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

const getSnipingList = async (req, res) => {
    try {
        let existingBoughtList = fs.readFileSync("./tx/snipingList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        return res.status(200).send({ data: existingBoughtList })
    } catch (err) {
        res.status(501).send("server error")
    }
}

const getTotalCounts = async (req, res) => {
    try {
        let existingList = fs.readFileSync("./tx/snipingList.json", "utf-8")
        existingList = JSON.parse(existingList)
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        const holdings = existingBoughtList.filter((l) => l.status !== "sold" && l.status !== "ignore")
        const solds = existingBoughtList.filter((l) => l.status === "sold")
        const ignored = existingBoughtList.filter((l) => l.status === "ignore")
        return res.status(200).send({ data: { totalSniping: existingList.length, totalBoutght: existingBoughtList.length, totalHolding: holdings.length, totalSold: solds.length, totalIgnores: ignored.length } })
    } catch (err) {
        res.status(501).send("server error")
    }
}

const getAllTradeHis = async (req, res) => {
    try {
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        return res.status(200).send({ data: existingBoughtList })
    } catch (err) {
        res.status(501).send("server error")
    }
}

const getBoughtList = async (req, res) => {
    try {
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        const holdings = existingBoughtList.filter((l) => l.status !== "sold" && l.status !== "ignore")
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
        res.status(501).send("server error")
    }
}

const ignoreMint = async (req, res) => {
    try {
        const { mint } = req.body
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        const buyIndex = existingBoughtList.map(e => e.mint).indexOf(mint)
        if (buyIndex < 0) {
            return res.status(404).send({ msg: "Mint not found" })
        }
        existingBoughtList[buyIndex].status = "ignore"
        fs.writeFileSync("./tx/boughtList.json", JSON.stringify(existingBoughtList))
        return res.status(200).send({ msg: "Success" })
    } catch (err) {
        res.status(501).send("server error")
    }
}

const manualUpdateSellHis = async (req, res) => {
    try {
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
    } catch (err) {
        res.status(501).send({ msg: "Update sell history failed" })
    }
}

const manualUpdateBoughtHis = async (req, res) => {
    try {
        const { mint, hash } = req.body

        let existingList = fs.readFileSync("./tx/snipingList.json", "utf-8")
        existingList = JSON.parse(existingList)
        const index = existingList.map(e => e.mint).indexOf(mint)
        if (index < 0) {
            return res.status(404).send({ msg: "No Matched Mint" })

        }
        const accounts = existingList[index]
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        const buyIndex = existingBoughtList.map(e => e.txHash).indexOf(hash)
        if (buyIndex < 0) {
            existingBoughtList.push({ txHash: hash, signatures: accounts.signatures, mint })
            fs.writeFileSync("./tx/boughtList.json", JSON.stringify(existingBoughtList))
        } else {
            console.log("Alrd saved")
            return
        }
        return res.status(200).send({ msg: "Updated Sell History" })
    } catch (err) {
        res.status(501).send({ msg: "Update Buy his failed" })
    }
}

const removeBoughtHis = async (req, res) => {
    try {
        const { hash } = req.body
        let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
        existingBoughtList = JSON.parse(existingBoughtList)
        const buyIndex = existingBoughtList.map(e => e.txHash).indexOf(hash)
        if (buyIndex < 0) {
            return res.status(404).send({ msg: "Buy History Not found" })
        } else {
            existingBoughtList.splice(buyIndex, 1)
            fs.writeFileSync("./tx/boughtList.json", JSON.stringify(existingBoughtList))
            return res.status(200).send({ msg: "Updated BUy History" })
        }
        return res.status(200).send({ msg: "Updated Sell History" })
    } catch (err) {
        res.status(501).send({ msg: "Update Buy his failed" })
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

const createAccount = async (req, res) => {
    try {
        const mint = req.body.mint
        const res = await createTokenAccount(connection, getKeyPair(privKey), mint)
        res.status(200).send({ msg: res })
    } catch (err) {
        console.log("Error: ", err)
        return res.status(501).send({ msg: "Error creating token account" })
    }
}

module.exports = {
    getSnipingAccount,
    getBoughtList,
    sell,
    getTradeHis,
    manualUpdateSellHis,
    createAccount,
    manualUpdateBoughtHis,
    getSnipingList,
    getAllTradeHis,
    ignoreMint,
    getTotalCounts,
    removeBoughtHis
}