const fs = require("fs")
const { connection, privKey } = require("../bot/constants")
const { getKeyPair, transferSoltoWrapSolAccount } = require("../bot/utils")

const wrapSol = async (req, res) => {
    try {
        const amount = req.body.amount * (10 ** 9)
        const res = await transferSoltoWrapSolAccount(connection, getKeyPair(privKey), amount)
        console.log("Res: ", res)
    } catch (err) {
        console.log("Wrap Error: ", err)
        return res.status(501).send({ msg: "Error in wrapping" })
    }
}

module.exports = {
    wrapSol
}