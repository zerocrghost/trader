const pumpSwapTradeModel = require("../model/pumpSwapTrade.model")
const kols = require("../config/kol.json")

const getPumpSwapKolTradeHisByMint = async (req, res) => {
  try {
    if (!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const tradeHis = await pumpSwapTradeModel.find({ mint: req.params.mint })
    const kolTrades = tradeHis.filter(t => kols.indexOf(t.signer) >= 0 && Number(t.amount) != 0)
    let buys = []
    let sells = []
    let netBuy = 0
    let netSell = 0
    kolTrades.forEach((k => {
      if (Number(k.amount) > 0 && buys.indexOf(k.signer) < 0) {
        buys.push(k.signer)
        netBuy += Number(k.amount)
      }
      if (Number(k.amount) < 0 && sells.indexOf(k.signer) < 0) {
        sells.push(k.signer)
        netSell += Number(k.amount)
      }
    }))
    console.log(`Pumpswap Kol: ${req.params.mint}, Buys: ${buys}, Sells: ${sells}, ${netBuy}, ${netSell}, Total: ${netBuy + netSell}\n`)
    return res.status(200).send({ buys, sells, netBuy, netSell })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const getPumpswapHisBySigner = async (req, res) => {
  try {
    if (!req.params.signer) return res.status(400).send({ error: "signer address can not be undefined" })
    const tradeHis = await pumpSwapTradeModel.find({ signer: req.params.signer })
    return res.status(200).send({ data: tradeHis })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

module.exports = {
  getPumpSwapKolTradeHisByMint,
  getPumpswapHisBySigner
}