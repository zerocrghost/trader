const pumpFunMintModel = require("../model/pumpFunMint.model")
const pumpFunTradeModel = require("../model/pumpFunTrade.model")

const getCreateHisByMint = async (req, res) => {
  try {
    if (!!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const pumpFunMint = await pumpFunMintModel.findOne({ mint: req.params.mint })
    if (!!pumpFunMint) return res.status(200).send({ data: pumpFunMint })
    else return res.status(404).send({ error: "Not Found" })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const getTradeHisByMint = async (req, res) => {
  try {
    if (!!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const tradeHis = await pumpFunTradeModel.find({ mint: req.params.mint })
    if (tradeHis.length > 0) return res.status(200).send({ data: tradeHis })
    else return res.status(404).send({ error: "Not Found" })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const getBondingCurveProgress = async (req, res) => {
  try {
    if (!!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const trade = await pumpFunTradeModel.find({ mint: req.params.mint }).sort({ blockTime: -1 }).limit(1)
    if (trade.length > 0) return res.status(200).send({ data: trade.progress })
    else return res.status(404).send({ error: "Not Found" })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

module.exports = {
  getCreateHisByMint,
  getTradeHisByMint,
  getBondingCurveProgress
}