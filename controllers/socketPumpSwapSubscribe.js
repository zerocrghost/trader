const { default: axios } = require("axios");
const pumpFunTradeModel = require("../model/pumpFunTrade.model");
const fs = require("fs");
const { pumpSwapAddr, okxAddr, pumpSwapAccountLength, pumpSwapMintIndex, pumpSwapBaseMintIndex, pumpSwapQuoteMintIndex, solMintAddress, pumpSwapBasePoolMintIndex, pumpSwapQuotePoolMintIndex } = require("../config/constants");
const pumpSwapTradeModel = require("../model/pumpSwapTrade.model");
const W3CWebSocket = require("websocket").w3cwebsocket;
let client
const kols = require("../config/kol.json")

const startPumpswapSubscribe = async (req, res) => {
  try {
    // lastAsked = new Date()
    startWebsocket()
    return res.status(200).send({ msg: "Started Pumpfun Web Socket" })
  } catch (err) {
    return res.status(501).send({ msg: "Error starting Pumpfun web socket" })
  }
}

const stopPumpswapSubscribe = async (req, res) => {
  try {
    client.close()
    return res.status(200).send({ msg: "Stop web socket" })
  } catch (err) {
    return res.status(501).send({ msg: "Error stopping Pumpfun web socket" })

  }
}

const getPumpswapSubscribeStatus = async (req, res) => {
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
    client = new W3CWebSocket(process.env.NODE_WSS, null, null, null, null, {
      maxReceivedFrameSize: 10000000000,
      maxReceivedMessageSize: 10000000000,
    })
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
    console.log("PumpSwap socket start error: ", err)
  }
}


const getBlockSubscribe = async () => {
  console.log("Start pumpswap subscribing")
  const req = {
    jsonrpc: "2.0",
    id: 1,
    method: "blockSubscribe",
    params: [
      {
        "mentionsAccountOrProgram": pumpSwapAddr
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

        if (!!tx?.meta?.err || logStr.indexOf("Program log: err") >= 0) {
          // console.log("Error: ", tx?.transaction?.signatures[0])
          return
        }
        if (logStr.indexOf("Program log: Instruction: Buy") >= 0) {
          const createSig = tx.transaction.signatures[0]
          const accountKeys = [...tx.transaction.message.accountKeys, ...tx.meta.loadedAddresses.writable, ...tx.meta.loadedAddresses.readonly]
          const signer = accountKeys[0]
          const ids = tx.transaction.message.instructions.map(i => i.programIdIndex)
          let progIndex = accountKeys.indexOf(pumpSwapAddr)
          let instructionIndex = ids.indexOf(progIndex)


          if (progIndex < 0) {
            console.log("Undefined Prog: ", createSig)
            return
          }

          let instructionKeys

          // There could be possibly 2 amm buys, but ignore that now 
          const instructions = tx.transaction.message.instructions
          for (let i = 0; i < instructions.length; i++) {
            if (instructions[i].programIdIndex === progIndex && instructions[i]?.accounts?.length === pumpSwapAccountLength) {
              instructionKeys = instructions[i].accounts
            }
          }

          // If there is no instruction keys detected, then search for inner instructions
          if (!instructionKeys) {
            tx.meta.innerInstructions.forEach(inner => {

              inner.instructions.forEach(i => {
                if (i.programIdIndex === progIndex && i.accounts.length === pumpSwapAccountLength)
                  instructionKeys = i.accounts
              })
            })

            if (!instructionKeys)
              console.log("Prog Not Found: ", createSig, progIndex)
            return
          }

          const baseMint = accountKeys[instructionKeys[[pumpSwapBaseMintIndex]]]
          const quoteMint = accountKeys[instructionKeys[[pumpSwapQuoteMintIndex]]]
          const baseMintPoolIndex = instructionKeys[[pumpSwapBasePoolMintIndex]]
          const quoteMintPoolIndex = instructionKeys[[pumpSwapQuotePoolMintIndex]]

          let swapAmt, method, mint
          if (baseMint === solMintAddress) {
            swapAmt = getSwapAmt(quoteMint, baseMintPoolIndex, tx, signer)
            method = "Sell"
            mint = quoteMint
          } else {
            swapAmt = getSwapAmt(baseMint, quoteMintPoolIndex, tx, signer)
            method = "Buy"
            mint = baseMint
          }

          saveTrade(mint, signer, createSig, swapAmt.solAmt, swapAmt.mintAmt, blockTime, slot, method)
        }
      } catch (err) {
        throw (err)
      }
    });
  } catch (err) {
    console.log("handle create TX Err: ", err)
  }
}

const getSwapAmt = (mint, poolIndex, tx, signer) => {
  const preMintBalances = tx.meta.preTokenBalances.filter(p => p.mint === mint && p.owner === signer)
  const preMintBal = preMintBalances.length > 0 ? preMintBalances[0].uiTokenAmount?.uiAmount : 0
  const postMintBalances = tx.meta.postTokenBalances.filter(p => p.mint === mint && p.owner === signer)
  const postMintBal = postMintBalances.length > 0 ? postMintBalances[0].uiTokenAmount?.uiAmount : 0

  const mintAmt = (Math.abs(postMintBal - preMintBal)).toString()

  if (tx.meta.postBalances.length < poolIndex || tx.meta.preBalances.length < poolIndex) return { solAmt: 0, mintAmt }
  const solAmt = (Math.abs(tx.meta.postBalances[poolIndex] - tx.meta.preBalances[poolIndex]) / 1e9).toString()

  return { solAmt, mintAmt }
}

const saveTrade = async (mint, signer, tx, solAmount, mintAmount, blockTime, slot, method) => {
  try {
    // Save Trade history
    const newTrade = new pumpSwapTradeModel({
      mint, signer, tx, solAmount, mintAmount, blockTime, slot, method
    })
    await newTrade.save()
    /**
      * Check if the signer is registered KOL
      */
    let kolHis
    if (kols.indexOf(signer) >= 0) {
      console.log("KOL: ", mint, signer)
      kolHis = await getKolHistory(mint)
    }
    // console.log(`${method}: ${solAmount} Sol, ${mintAmount} ${mint}`)
  } catch (err) {
    console.log("Trade saving error: ", err)
  }
}

const getKolHistory = async (mint) => {
  try {
    const res = await axios({
      url: `${process.env.SERVICE_URL}/api/pumpswap/kol/${mint}`,
      method: "get",
    })
    return res.data
  } catch (err) {
    console.log("Fetch Social error: ", err.response.data)
  }
}

module.exports = {
  startPumpswapSubscribe, stopPumpswapSubscribe, getPumpswapSubscribeStatus
}