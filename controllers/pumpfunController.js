const pumpFunMintModel = require("../model/pumpFunMint.model")
const pumpFunTradeModel = require("../model/pumpFunTrade.model")
const kols = require("../config/kol.json")
const { pumpBuy, createTokenAccount, pumpSell, pumpBuySell, pumpBuyWithFreshWallet } = require("../utils/pumpUtils")
const { getKeyPair, getTxDetail, getBondingCurveAddress, getLeftTokensAndProgress } = require("../utils/utils")
const { minMintAmount, maxSolAmount } = require("../config/constants")
const { PublicKey } = require("@solana/web3.js")
const keys = require("../keys.json")
const myWalletModel = require("../model/myWallet.model")

const getCreateHisByMint = async (req, res) => {
  try {
    if (!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const pumpFunMint = await pumpFunMintModel.findOne({ mint: req.params.mint })
    if (!!pumpFunMint) return res.status(200).send({ data: pumpFunMint })
    else return res.status(404).send({ error: "Not Found" })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const importCreateHis = async (req, res) => {
  try {
    if (!req.body.tx) return res.status(400).send({ error: "TX Hash should be provided" })
    const mintHis = await pumpFunMintModel.findOne({ createSig: req.body.tx })
    if (!!mintHis) return res.status(400).send({ msg: "Already listed tx" })

    // Get tx
    const tx = await getTxDetail(req.body.tx)
    if (!tx) return res.status(400).send({ msg: "TX detail not fetched" })
    let accountKeys = tx.transaction.message.accountKeys
    const signer = accountKeys[0]
    accountKeys = tx.transaction.message.accountKeys.slice(1)
    const mints = accountKeys.filter(a => a.toString().indexOf("pump") >= 0)
    if (mints.length !== 1) {
      return res.status(400).send({ msg: "Mint address not found" })
    }
    const mint = mints[0]
    const createSig = tx.transaction.signatures[0]
    const blockTime = tx.blockTime
    const slot = tx.slot
    const newHis = new pumpFunMintModel({
      mint, createSig, signer, blockTime, slot
    })
    await newHis.save()
    return res.status(200).send({ msg: "Saved mint tx" })


  } catch (err) {
    console.log("ERr: ", err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const importTradeHis = async (req, res) => {
  try {
    if (!req.body.tx) return res.status(400).send({ error: "TX Hash should be provided" })
    const tradeHis = await pumpFunTradeModel.findOne({ tx: req.body.tx })
    if (!!tradeHis) return res.status(400).send({ msg: "Already listed tx" })

    // Get tx
    const tx = await getTxDetail(req.body.tx)
    if (!tx) return res.status(400).send({ msg: "TX detail not fetched" })
    const signature = tx.transaction.signatures[0]
    const signer = tx.transaction.message.accountKeys[0]
    const accountKeys = tx.transaction.message.accountKeys.slice(1)
    const mintIndex = accountKeys.map(a => a.toString().slice(a.toString().length - 4)).indexOf("pump")
    if (mintIndex < 0) return
    const mint = accountKeys[mintIndex]
    const { bondingCurve } = getBondingCurveAddress(mint)
    const bondingCurveIndex = accountKeys.indexOf(bondingCurve) + 1
    const postTokenBalances = tx.meta.postTokenBalances
    const preTokenBalances = tx.meta.preTokenBalances

    const blockTime = tx.blockTime
    const slot = tx.slot
    const bondingRes = getLeftTokensAndProgress(signature, preTokenBalances, postTokenBalances, mint, bondingCurve)
    if (!bondingRes) return
    const { leftTokens, progress, tradeAmt } = bondingRes
    if (!tradeAmt) return
    const solAmount = ((Number(tx.meta.preBalances[bondingCurveIndex]) - Number(tx.meta.postBalances[bondingCurveIndex])) / 1e9).toString()

    const newHis = new pumpFunTradeModel({
      mint, signer, tx: signature, solAmount, mintAmount: tradeAmt, blockTime, slot, progress
    })

    await newHis.save()
    return res.status(200).send({ msg: "Saved trade tx" })

  } catch (err) {
    console.log("ERr: ", err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const getTradeHisByMint = async (req, res) => {
  try {
    if (!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const tradeHis = await pumpFunTradeModel.find({ mint: req.params.mint })
    if (tradeHis.length > 0) return res.status(200).send({ data: tradeHis })
    else return res.status(404).send({ error: "Not Found" })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const getKolTradeHisByMint = async (req, res) => {
  try {
    if (!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const tradeHis = await pumpFunTradeModel.find({ mint: req.params.mint })
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
    console.log(`Pumpfun Kol: ${req.params.mint}, Buys: ${buys.length}, ${netBuy}, Sells: ${sells.length}, ${netSell}, Total: ${netBuy + netSell}`)
    return res.status(200).send({ buys: buys.length, sells: sells.length, netBuy, netSell })
  } catch (err) {
    console.error(err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const getTradeHisBySigner = async (req, res) => {
  try {
    if (!req.params.signer) return res.status(400).send({ error: "Signer address can not be undefined" })
    const tradeHis = await pumpFunTradeModel.find({ signer: req.params.signer })
    return res.status(200).send({ data: tradeHis })
  } catch (err) {
    return res.status(500).send({ error: "Server Error" })
  }
}

const getBondingCurveProgress = async (req, res) => {
  try {
    if (!req.params.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const trade = await pumpFunTradeModel.find({ mint: req.params.mint }).sort({ blockTime: -1 }).limit(1)

    if (trade.length > 0) return res.status(200).send({ data: trade[0].progress })
    else return res.status(404).send({ error: "Not Found" })
  } catch (err) {
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const createPumpFunAccount = async (req, res) => {
  try {
    if (!req.body.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const mint = await pumpFunMintModel.find({ mint: req.body.mint })
    if (mint.length === 0) return res.status(404).send({ msg: "Not Found" })
    if (!req.body.publicKey) return res.status(400).send({ msg: "Key number invalid" })
    const keyPair = await myWalletModel.findOne({ publicKey: req.body.publicKey })
    /**
     * Create Account
     */
    const wallet = getKeyPair(keyPair.privateKey)
    const txId = await createTokenAccount(wallet, new PublicKey(req.body.mint))
    return res.status(200).send({ data: txId })
  } catch (err) {
    console.log(err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const buyPumpfun = async (req, res) => {
  try {
    if (!req.body.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const mint = await pumpFunMintModel.find({ mint: req.body.mint })
    if (mint.length === 0) return res.status(404).send({ msg: "Not Found" })
    if (!mint[0].signer) return res.status(400).send({ error: "Mint address can not be undefined" })
    if (!req.body.amount || req.body.amount < minMintAmount) return res.status(400).send({ msg: "Mint amount invalid" })
    if (!req.body.solAmt || req.body.solAmt > maxSolAmount) return res.status(400).send({ msg: "Sol amount invalid" })
    if (!req.body.publicKey) return res.status(400).send({ msg: "Key number invalid" })
    const keyPair = await myWalletModel.findOne({ publicKey: req.body.publicKey })
    /**
     * Pump Buy
     */
    const wallet = getKeyPair(keyPair.privateKey)
    const txId = await pumpBuy(wallet, new PublicKey(req.body.mint), new PublicKey(mint[0].signer), req.body.amount, req.body.solAmt)
    return res.status(200).send({ data: txId })
  } catch (err) {
    console.log(err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const buyPumpfunWithFreshWallet = async (req, res) => {
  try {
    if (!req.body.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const mint = await pumpFunMintModel.find({ mint: req.body.mint })
    if (mint.length === 0) return res.status(404).send({ msg: "Not Found" })
    if (!mint[0].signer) return res.status(400).send({ error: "Mint address can not be undefined" })
    if (!req.body.amount || req.body.amount < minMintAmount) return res.status(400).send({ msg: "Mint amount invalid" })
    if (!req.body.solAmt || req.body.solAmt > maxSolAmount) return res.status(400).send({ msg: "Sol amount invalid" })
    if (!req.body.publicKey) return res.status(400).send({ msg: "Key number invalid" })
    const keyPair = await myWalletModel.findOne({ publicKey: req.body.publicKey })
    /**
     * Pump Buy
     */
    const wallet = getKeyPair(keyPair.privateKey)
    const txId = await pumpBuyWithFreshWallet(wallet, new PublicKey(req.body.mint), new PublicKey(mint[0].signer), req.body.amount, req.body.solAmt)
    return res.status(200).send({ data: txId })
  } catch (err) {
    console.log(err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const sellPumpfun = async (req, res) => {
  try {
    if (!req.body.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const mint = await pumpFunMintModel.find({ mint: req.body.mint })
    if (mint.length === 0) return res.status(404).send({ msg: "Not Found" })
    if (!mint[0].signer) return res.status(400).send({ error: "Mint address can not be undefined" })
    if (!req.body.amount || req.body.amount < minMintAmount) return res.status(400).send({ msg: "Mint amount invalid" })
    if (!req.body.publicKey) return res.status(200).send({ msg: "Key number invalid" })
    const keyPair = await myWalletModel.findOne({ publicKey: req.body.publicKey })
    /**
     * Pump Sell
     */
    const wallet = getKeyPair(keyPair.privateKey)
    const txId = await pumpSell(wallet, new PublicKey(req.body.mint), new PublicKey(mint[0].signer), req.body.amount, req.body.solAmt)
    return res.status(200).send({ data: txId })
  } catch (err) {
    console.log(err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const sellPumpfunMultiple = async (req, res) => {
  try {
    if (!req.body.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const mint = await pumpFunMintModel.find({ mint: req.body.mint })
    if (mint.length === 0) return res.status(404).send({ msg: "Not Found" })
    if (!mint[0].signer) return res.status(400).send({ error: "Mint address can not be undefined" })
    if (!req.body.amounts || !req.body.amounts.length > 0) return res.status(400).send({ msg: "Mint amount invalid" })
    if (!req.body.publicKeys || !req.body.publicKeys.length > 0) return res.status(200).send({ msg: "Key number invalid" })
    const keyPairs = await Promise.all(req.body.publicKeys.map(k => myWalletModel.findOne({ publicKey: k }))).then()
    /**
     * Pump Sells
     */
    const txs = await Promise.all(keyPairs.map((k, index) => pumpSell(getKeyPair(k.privateKey), new PublicKey(req.body.mint), new PublicKey(mint[0].signer), req.body.amounts[index], 0))).then()
    return res.status(200).send({ data: txs })
  } catch (err) {
    console.log(err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

const buySellPumpfun = async (req, res) => {
  try {
    if (!req.body.mint) return res.status(400).send({ error: "Mint address can not be undefined" })
    const mint = await pumpFunMintModel.find({ mint: req.body.mint })
    if (mint.length === 0) return res.status(404).send({ msg: "Not Found" })
    if (!mint[0].signer) return res.status(400).send({ error: "Mint address can not be undefined" })
    if (!req.body.amount || req.body.amount < minMintAmount) return res.status(400).send({ msg: "Mint amount invalid" })
    if (!req.body.maxSolAmt || req.body.solAmt > maxSolAmount) return res.status(400).send({ msg: "Sol amount invalid" })
    if (!req.body.publicKey) return res.status(200).send({ msg: "Key number invalid" })
    const keyPair = await myWalletModel.findOne({ publicKey: req.body.publicKey })
    /**
      * Pump Buy And Sell
      */
    const wallet = getKeyPair(keyPair.privateKey)
    const txIds = await pumpBuySell(wallet, new PublicKey(req.body.mint), new PublicKey(mint[0].signer), req.body.amount, req.body.maxSolAmt, req.body.minSolAmt)
    return res.status(200).send({ data: txIds })
  } catch (err) {
    console.log(err)
    return res.status(500).send({ error: "Internal Server Error" })
  }
}

module.exports = {
  getCreateHisByMint,
  getTradeHisByMint,
  getTradeHisBySigner,
  getBondingCurveProgress,
  getKolTradeHisByMint,
  buyPumpfun,
  createPumpFunAccount,
  sellPumpfun,
  buySellPumpfun,
  importCreateHis,
  importTradeHis,
  sellPumpfunMultiple,
  buyPumpfunWithFreshWallet
}