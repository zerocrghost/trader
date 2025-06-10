const { default: axios } = require("axios");
const { initialTokens, mintThres, runThres, pumpfunVolumeThres, pumpfunProgressThres, maxSolAmount } = require("../config/constants");
const pumpFunMintModel = require("../model/pumpFunMint.model");
const pumpFunTradeModel = require("../model/pumpFunTrade.model");
const { getBondingCurveAddress, getLeftTokensAndProgress, calcProgress } = require("../utils/utils");

const W3CWebSocket = require("websocket").w3cwebsocket;

const kols = require("../config/kol.json");
const purchaseModel = require("../model/purchase.model");
const myWalletModel = require("../model/myWallet.model");

let newMints = []

let client
let myWallets
// let lastAsked = new Date()

const startPumpSubscribe = async (req, res) => {
  try {
    // lastAsked = new Date()
    startWebsocket()
    myWallets = await myWalletModel.find({})
    return res.status(200).send({ msg: "Started Pumpfun Web Socket" })
  } catch (err) {
    return res.status(501).send({ msg: "Error starting Pumpfun web socket" })
  }
}

const stopPumpSubscribe = async (req, res) => {
  try {
    client.close()
    return res.status(200).send({ msg: "Stop web socket" })
  } catch (err) {
    return res.status(501).send({ msg: "Error stopping Pumpfun web socket" })

  }
}

const getPumpSubscribeStatus = async (req, res) => {
  try {
    // lastAsked = new Date()
    if (!client) return res.status(200).send({ msg: "Not started Socket yet" })
    else return res.status(200).send({ msg: client.readyState })
  } catch (err) {
    return res.status(501).send({ msg: "Error getting status for Pumpfun web socket" })
  }
}

const startWebsocket = () => {
  try {
    // Initialize Subscribe socket, and accounts 
    client = new W3CWebSocket(process.env.NODE_WSS)
    accounts = {}

    client.onerror = () => {
      console.log("Connection Error")
    }

    client.onclose = (msg) => {
      console.log("Close MSG: ", msg.reason)
      console.log("Client closed")
      if (msg.reason !== "Normal connection closure") {

        console.log("Client closed unexpectedly, Creating new client in one second")
        setTimeout(() => {
          startWebsocket()
        }, 1000)

      }
    }

    client.onopen = () => {
      console.log("WebSocket client connected")
      getBlockSubscribe()
    }

    client.onmessage = (e) => {
      try {
        if (typeof e.data === 'string') {
          // Catch blockNotification
          const data = JSON.parse(e.data)
          const method = data.method
          if (method !== 'blockNotification') {
            console.log("No Block Notification")
            return;
          }

          // Get Transaction information
          const txs = data?.params?.result?.value?.block?.transactions
          const slot = data.params.result?.value?.block?.parentSlot
          const blockTime = data.params.result?.value?.block?.blockTime
          if (txs.length >= 0) {
            handleTxs(txs, blockTime, slot)
          } else {
            console.log("Empty TXs")
          }
        }
      } catch (err) {
        throw (err)
      }
    }
  } catch (err) {
    console.log("Pumpfun socket start error: ", err)
  }
}

const getBlockSubscribe = async () => {
  console.log("Start pump subscribing")
  const req = {
    jsonrpc: "2.0",
    id: 1,
    method: "blockSubscribe",
    params: [
      {
        "mentionsAccountOrProgram": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
      },
      {
        "commitment": "confirmed",
        "maxSupportedTransactionVersion": 0,
        "encoding": "json",
        "showRewards": false,
        "transactionDetails": "full"
      }
    ],
  }
  client.send(JSON.stringify(req))
}

const handleTxs = async (txs, blockTime, slot) => {
  try {
    await txs.forEach(async tx => {
      try {
        const logStr = tx?.meta?.logMessages?.toString()
        if (logStr.indexOf("Program log: Instruction: InitializeMint2") >= 0 && logStr.indexOf("Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P failed") < 0) {
          const createSig = tx.transaction.signatures[0]
          let accountKeys = tx.transaction.message.accountKeys
          const signer = accountKeys[0]
          accountKeys = tx.transaction.message.accountKeys.slice(1)
          const mints = accountKeys.filter(a => a.toString().indexOf("pump") >= 0)
          if (mints.length !== 1) {
            return
          }
          const mint = mints[0]
          updateNewMints(mint, signer)
          const { bondingCurve, associatedBondingCurve } = getBondingCurveAddress(mint)
          const bondingCurveIndex = accountKeys.indexOf(bondingCurve) + 1
          let leftTokens = initialTokens;
          let progress = 0
          let tradeAmt = 0
          saveMint(mint, signer, createSig, blockTime, slot)
          if (logStr.indexOf("Program log: Instruction: Buy") >= 0) {
            // Calculate balance change
            const postTokenBalances = tx.meta.postTokenBalances

            const index = postTokenBalances.map(p => p.owner).indexOf(bondingCurve)
            if (index >= 0 && postTokenBalances[index].mint === mint) {
              leftTokens = postTokenBalances[index].uiTokenAmount.uiAmount
              tradeAmt = (Number(initialTokens) - Number(leftTokens)).toString()
              const solAmt = (Number(tx.meta.preBalances[bondingCurveIndex]) - Number(tx.meta.postBalances[bondingCurveIndex]) / 1e9).toString()
              progress = calcProgress(leftTokens)
              saveTrade(mint, signer, createSig, tradeAmt, solAmt, blockTime, slot, progress)
            }
          }
        } else if ((logStr.indexOf("Program log: Instruction: Sell") >= 0 || logStr.indexOf("Program log: Instruction: Buy") >= 0) && logStr.indexOf("Program 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P failed") < 0) {
          const signature = tx.transaction.signatures[0]
          const signer = tx.transaction.message.accountKeys[0]
          const accountKeys = tx.transaction.message.accountKeys.slice(1)
          const mintIndex = accountKeys.map(a => a.toString().slice(a.toString().length - 4)).indexOf("pump")
          if (mintIndex < 0) return
          const mint = accountKeys[mintIndex]
          const { bondingCurve, associatedBondingCurve } = getBondingCurveAddress(mint)
          const bondingCurveIndex = accountKeys.indexOf(bondingCurve) + 1
          const postTokenBalances = tx.meta.postTokenBalances
          const preTokenBalances = tx.meta.preTokenBalances

          const bondingRes = getLeftTokensAndProgress(signature, preTokenBalances, postTokenBalances, mint, bondingCurve)
          if (!bondingRes) return
          const { leftTokens, progress, tradeAmt } = bondingRes
          if (!tradeAmt) return
          const solAmt = ((Number(tx.meta.preBalances[bondingCurveIndex]) - Number(tx.meta.postBalances[bondingCurveIndex])) / 1e9).toString()

          saveTrade(mint, signer, signature, tradeAmt, solAmt, blockTime, slot, progress)
        }
      } catch (err) {
        throw (err)
      }
    });
  } catch (err) {
    console.log("handle create TX Err: ", err)
  }
}


const saveMint = async (mint, signer, createSig, blockTime, slot) => {
  try {
    const newMint = new pumpFunMintModel({
      mint, signer, createSig, blockTime, slot
    })
    await newMint.save()
    console.log("New Mint: ", mint)

    /**
     * if creator is me, then act
     */
    if (myWallets.map(w => w.publicKey).indexOf(signer) >= 0) {
      // Create TokenAccount
      const buyTxs = await Promise.all(myWallets.map(w => {
        if (w.publicKey != signer) return buy(mint, w.publicKey)
      })).then()
      console.log("BUY Txs: ", buyTxs)
    }
  } catch (err) {
    console.log("Mint Saving Error: ", err)
  }
}

const saveTrade = async (mint, signer, tx, mintAmount, solAmount, blockTime, slot, progress) => {
  try {
    // Save Trade history
    const newTrade = new pumpFunTradeModel({
      mint, signer, tx, mintAmount, solAmount, blockTime, slot, progress
    })
    await newTrade.save()
    // if (Number(progress) > 90)
    //   await fetchSocial(mint, progress)

    /**
     * Check if the signer is registered KOL
     */
    // let kolHis
    // if (kols.indexOf(signer) >= 0) {
    // console.log("New KOL Trade: ", signer)
    // kolHis = await getKolHistory(mint)
    // console.log("KOL HIS: ", kolHis)
    // }

    /**
     * Check new token trades
     */
    const mintIndex = newMints.map(m => m.mint).indexOf(mint)
    if (mintIndex >= 0) {
      newMints[mintIndex].volume += Math.abs(solAmount)
      newMints[mintIndex].progress = progress

      // If creator tx, then updates his amt
      if (signer === newMints[mintIndex].creator) {
        newMints[mintIndex].creatorSolAmt += Number(solAmount)
        newMints[mintIndex].creatorMintAmt += Number(mintAmount)
        if (newMints[mintIndex].creatorMintAmt < runThres) {
          newMints[mintIndex].creatorStatus = "run"
        } else if (newMints[mintIndex].creatorMintAmt > 0) {
          newMints[mintIndex].creatorStatus = "buy"
        }
      }

      if (newMints[mintIndex].creatorStatus === "run" && newMints[mintIndex].volume > pumpfunVolumeThres && newMints[mintIndex].progress > pumpfunProgressThres && !newMints[mintIndex].bought) {
        newMints[mintIndex].bought = true
        const newPurchase = new purchaseModel({
          mint: newMints[mintIndex].mint,
          creator: newMints[mintIndex].creator,
          creatorSolAmt: newMints[mintIndex].creatorSolAmt,
          creatorStatus: newMints[mintIndex].creatorStatus,
          createdAt: newMints[mintIndex].createdAt,
          volume: newMints[mintIndex].volume,
          progress: newMints[mintIndex].progress,
          oldAt: ((new Date() - newMints[mintIndex].createdAt) / 1000 / 60).toFixed(1)
        })

        await newPurchase.save()
      }
    }
    // console.log(`New Trade: ${mint}, Mint: ${mintAmount}, Sol: ${solAmount}, Progress: ${progress}`)
  } catch (err) {
    console.log("Trade saving error: ", err)
  }
}

const getKolHistory = async (mint) => {
  try {
    const res = await axios({
      url: `${process.env.SERVICE_URL}/api/pumpfun/kol/${mint}`,
      method: "get",
    })
    return res.data
  } catch (err) {
    console.log("Fetch Social error: ", err.response.data)
  }
}

const buy = async (mint, publicKey) => {
  try {
    const amount = Math.floor(5 * Math.random() + 10) * 1000000 * 1000000

    const res = await axios({
      url: `${process.env.SERVICE_URL}/api/pumpfun/buyWithFreshWallet`,
      method: "post",
      data: { mint, publicKey, amount, solAmt: maxSolAmount }
    })
    return res.data.data
  } catch (err) {
    console.log("Buy error: ", err.response.data)
  }
}

const fetchSocial = async (mint, progressWithDecimal) => {
  try {
    let progress = 10 * Math.floor(progressWithDecimal / 10)
    const res = await axios({
      url: `${process.env.SERVICE_URL}/api/social/lunar`,
      method: "Post",
      data: {
        mint, progress
      }
    })
    return res
  } catch (err) {
    console.log("Fetch Social error: ", err.response.data)
  }
}

const updateNewMints = (mint, creator) => {
  // Remove old mint from the list
  newMints.forEach((m, index) => {
    if (new Date() - m.createdAt > mintThres) {
      // console.log("Remove ", mint, new Date() - m.createdAt)
      newMints.splice(index, 1)
    }
  })

  newMints.push({
    mint, creator, creatorMintAmt: 0, creatorSolAmt: 0, creatorStatus: "", createdAt: new Date(), volume: 0, progress: 0
  })
  // console.log("New Mints: ", newMints)
}


module.exports = {
  startPumpSubscribe, stopPumpSubscribe, getPumpSubscribeStatus
}