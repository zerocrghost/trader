const { initialTokens } = require("../config/constants");
const pumpFunMintModel = require("../model/pumpFunMint.model");
const pumpFunTradeModel = require("../model/pumpFunTrade.model");
const { getBondingCurveAddress } = require("../utils/utils");

const W3CWebSocket = require("websocket").w3cwebsocket;

let client
// let lastAsked = new Date()

const startPumpSubscribe = async (req, res) => {
  try {
    // lastAsked = new Date()
    startWebsocket()
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

    client.onclose = () => {
      console.log("Client closed")
      // console.log("Client closed, Creating new client in one second")
      // setTimeout(() => {
      //     startWebsocket()
      // }, 1000)
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
        const logStr = tx?.meta?.logMessages.toString()
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
          const { bondingCurve, associatedBondingCurve } = getBondingCurveAddress(mint)
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
              progress = calcProgress(leftTokens)
              saveTrade(mint, signer, tradeAmt, blockTime, slot, progress)
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
          const postTokenBalances = tx.meta.postTokenBalances
          const preTokenBalances = tx.meta.preTokenBalances

          const bondingRes = getLeftTokensAndProgress(signature, preTokenBalances, postTokenBalances, mint, bondingCurve)
          if (!bondingRes) return
          const { leftTokens, progress, tradeAmt } = bondingRes
          if (!tradeAmt) return

          saveTrade(mint, signer, tradeAmt, blockTime, slot, progress)
        }
      } catch (err) {
        throw (err)
      }
    });
  } catch (err) {
    console.log("handle create TX Err: ", err)
  }
}

const calcProgress = (leftTokens) => {
  const initialRealTokenReserves = 793100000
  const progress = 100 - (((leftTokens - 206900000) * 100) / initialRealTokenReserves)
  return progress.toFixed(2).toString()
}

const saveMint = async (mint, signer, createSig, blockTime, slot) => {
  try {
    const newMint = new pumpFunMintModel({
      mint, signer, createSig, blockTime, slot
    })
    await newMint.save()
    console.log("New Token: ", mint)
  } catch (err) {
    console.log("Mint Saving Error: ", err)
  }
}

const saveTrade = async (mint, signer, amount, blockTime, slot, progress) => {
  try {
    const newTrade = new pumpFunTradeModel({
      mint, signer, amount, blockTime, slot, progress
    })
    await newTrade.save()
    console.log(`New Trade: ${mint}, ${progress}%`)
  } catch (err) {
    console.log("Trade saving error: ", err)
  }
}

const getLeftTokensAndProgress = (signature, preTokenBalances, postTokenBalances, mint, bondingCurve) => {
  const bondingPreBals = preTokenBalances.filter(p => p.mint === mint && p.owner === bondingCurve)
  if (bondingPreBals.length > 1) {
    console.log("Mint address mismatch for trade: ", signature, postTokenBalances, bondingPreBals, mint)
    return false
  }
  const bondingPostBals = postTokenBalances.filter(p => p.mint === mint && p.owner === bondingCurve)
  if (bondingPostBals.length > 1) {
    console.log("Mint address mismatch for trade: ", signature, postTokenBalances, bondingPostBals, mint)
    return false
  }

  const leftTokens = Number(bondingPostBals[0]?.uiTokenAmount?.uiAmount)
  const tradeAmt = (Number(bondingPreBals[0]?.uiTokenAmount?.uiAmount) - leftTokens).toString()
  const progress = calcProgress(leftTokens)
  return { leftTokens, progress, tradeAmt }
}

module.exports = {
  startPumpSubscribe, stopPumpSubscribe, getPumpSubscribeStatus
}