const fs = require("fs")
const W3CWebSocket = require("websocket").w3cwebsocket;
const { processInitialize2Tx, getTokenCreatorInfo, processWithdrawTx, processJitotipTx, processSerumTx, getBlock, getKeyPair, buy, createTokenAccount } = require("../bot/utils.js");
const { wss, openBook, connection, privKey, amountBuy, amountOutExpect } = require("../bot/constants.js");

const attemptNum = 100
const buyAttempNum = 10
// Accounts info gathered by several txs
let client
let lastAsked = new Date()
let accounts = {}

const startSubscribe = async (req, res) => {
    try {
        startWebsocket()
        return res.status(200).send({ msg: "Started Web Socket" })
    } catch (err) {
        return res.status(501).send({ msg: "Error starting web socket" })
    }
}

const startWebsocket = () => {
    // Initialize Subscribe socket, and accounts 
    client = new W3CWebSocket(wss)
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
        // if lastAsked is bigger than 20 Sec, close client
        if (new Date() - lastAsked < 20000)
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
        else console.log("Waiting for reconnecting from end user")
    }
}

const stopSubscribe = async (req, res) => {
    client.close()
    client
    return res.status(200).send({ msg: "Stop web socket" })
}

const getSubscribeStatus = async (req, res) => {
    lastAsked = new Date()
    if (!client) return res.status(200).send({ msg: "Not started Socket yet" })
    else return res.status(200).send({ msg: client.readyState })
}

const handleTxs = async (txs, blockTime, slot) => {
    try {
        await txs.forEach(async tx => {
            try {
                const logStr = tx?.meta?.logMessages.toString()
                if (logStr.indexOf("Program log: Instruction: Withdraw") >= 0) {
                    // Remove liquidity from Pump Fun
                    console.log("Remove liquidity from Pump Fun, starting to get accounts information")
                    accounts = {}
                    const txInfo = processWithdrawTx(tx)
                    // Save mint address
                    accounts.mint = txInfo.accounts.mint

                    // Get token information and decide to buy or not
                    const tokenInfo = await getTokenCreatorInfo(accounts.mint)
                    if (!tokenInfo) return
                    Object.keys(tokenInfo).forEach(key => {
                        accounts[key] = tokenInfo[key]
                    })
                    // If token is not older than 2 mins, if dev holds token more than 10 M, if top ten holding exceed 50% do not buy
                    if (tokenInfo.tokenLifeTime < 120000 || tokenInfo.devLeft.uiAmount > 10000000 || tokenInfo.top10Holding > 50) accounts.toBuy = false
                    else accounts.toBuy = true
                    // console.log("Accounts at withdraw: ", accounts)
                    saveWithdrawTx(accounts, txInfo.signature, txInfo.txType, blockTime, slot)

                    try {
                        // If toBuy token, then create token account
                        if (true) {
                            // if (tokenInfo.toBuy) {
                            const res = await createTokenAccount(connection, getKeyPair(privKey), txInfo.accounts.mint)
                            console.log("Token Account created: ", txInfo.accounts.mint)
                        }
                    } catch (err) {
                        console.log("Token Account creation failed: ", err)
                        return
                    }
                    // Start checking blocks from now
                    console.log("Starting New Fetch Process for ", txInfo.accounts.mint)
                    const totalAccounts = await fetchingBlock(txInfo.accounts.mint, slot, 0)
                    if (!totalAccounts) {
                        console.log("Did not find matched InitializeInstruction2 transaction")
                    } else {
                        // Start buy from here
                        console.log("Accounts Finished")
                        if (true) {
                            // if (totalAccounts.toBuy) {
                            // Try buy
                            await tryBuy(totalAccounts, 0)
                        }

                    }
                }
            } catch (err) {
                throw (err)
            }
        });
    } catch (err) {
        console.log("handle Withdraw TX Err: ", err)
    }
}

const tryBuy = async (accounts, round) => {
    // console.log("Trying Attempt: ", round)
    return new Promise(async (resolve, reject) => {
        try {
            setTimeout(async () => {
                try {
                    const amountOutInLamports = amountOutExpect * 10 ** accounts.decimals
                    const res = await buy(connection, accounts, getKeyPair(privKey), amountBuy, amountOutInLamports)
                    saveBoughtTx(res, accounts.signatures, accounts.mint)
                    return resolve(true)
                } catch (err) {
                    round++
                    console.log("Buy Error: ", err)
                    if (round >= buyAttempNum) resolve(false)
                    else return resolve(await tryBuy(accounts, round))
                }
            }, 400)
        } catch (err) {
            reject(err)
        }
    })
}

const fetchingBlock = async (mint, slot, round) => {
    // console.log("Start Fetching Round: ", round)
    return new Promise((resolve, reject) => {
        try {
            setTimeout(async () => {
                // console.log(`Fetching for Mint: ${mint}, Slot: ${slot}`)
                const slots = [slot + 120, slot + 121, slot + 122, slot + 123, slot + 124, slot + 125, slot + 126, slot + 127, slot + 128]
                const promises = Promise.all(slots.map(b => getBlock(b)))
                const blockData = await promises.then()
                let unfinishedBlocks = 0
                for (let i = 0; i < blockData.length; i++) {
                    if (!!blockData[i].result) {
                        const blockTime = blockData[i].result.blockTime
                        const slot = blockData[i].result.parentSlot
                        const blockHash = blockData[i].result.blockhash
                        const res = handleInitializeBlock(blockData[i].result.transactions, mint, blockTime, slot + 1, blockHash)
                        if (!!res) return resolve(res)
                    } else {
                        unfinishedBlocks++
                    }
                }
                // console.log("Unfinished blocks: ", unfinishedBlocks)
                if (unfinishedBlocks === 0) {
                    return resolve(false)
                }
                else {
                    round++
                    if (round >= attemptNum) resolve(false)
                    else return resolve(await fetchingBlock(mint, slot, round))
                }
            }, 1000)
        } catch (err) {
            return reject(err)
        }
    })
    // .then(async res => {
    //     if (res === true) resolve(true)
    //     else if (typeof res === "number" && res < attemptNum) resolve(await fetchingBlock(mint, slot, round))
    //     else resolve(false)
    // }).catch(err => {
    //     reject(err)
    // })
}

const handleInitializeBlock = (txs, mint, blockTime, slot, blockHash) => {
    // Lets assume that one block has one initialize
    const accounts = { mint, signatures: [] }
    let foundTxNum = 0
    if (!txs || txs.length === 0) return false
    for (let i = 0; i < txs.length; i++) {
        const tx = txs[i]
        try {
            const logStr = tx?.meta?.logMessages.toString()
            const jitotipBalChange = tx?.meta?.postBalances[1] - tx?.meta?.preBalances[1]
            const signerBalChange = tx?.meta?.preBalances[0] - tx?.meta?.postBalances[0]
            if (jitotipBalChange === 100000000 && signerBalChange > 104000000) {
                // console.log("Jitotip transfer")
                const txInfo = processJitotipTx(tx)
                if (!txInfo) continue
                // If mint address is not the same with withdraw tx, then revert
                if (accounts.mint && txInfo.accounts.mint !== accounts.mint) {
                    // console.log("Different Mint at Jitotip: ", accounts.mint, txInfo.accounts.mint, txInfo.signature)
                    // throw Error("Different mint initialze");
                } else {
                    Object.keys(txInfo.accounts).forEach(key => {
                        accounts[key] = txInfo.accounts[key]
                    })
                    accounts.signatures.push({ txType: txInfo.txType, signature: txInfo.signature })
                    foundTxNum++
                    // console.log("Accounts: ", accounts)
                }
            } else if (logStr.indexOf(openBook) >= 0 && logStr.indexOf("Program log: initialize2: InitializeInstruction2") < 0) {
                // console.log("Serum creation")
                const txInfo = processSerumTx(tx)
                if (!txInfo) continue
                // If mint address is not the same with withdraw tx, then revert
                if (accounts.mint && txInfo.accounts.mint !== accounts.mint) {
                    // console.log("Different Mint at Serum: ", accounts.mint, txInfo.accounts.mint, txInfo.signature)
                    // throw Error("Different mint initialze");
                } else {
                    Object.keys(txInfo.accounts).forEach(key => {
                        accounts[key] = txInfo.accounts[key]
                    })
                    accounts.signatures.push({ txType: txInfo.txType, signature: txInfo.signature })
                    foundTxNum++
                    // console.log("Accounts: ", accounts)
                }
            } else if (logStr.indexOf("Program log: initialize2: InitializeInstruction2") >= 0) {
                // console.log("Initialize Tx... Preparing Buy")
                const txInfo = processInitialize2Tx(tx)
                if (!txInfo) continue
                // If mint address is not the same with withdraw tx, then revert
                if (accounts.mint && txInfo.accounts.mint !== accounts.mint) {
                    // console.log("Different Mint at Initialize: ", accounts.mint, txInfo.accounts.mint, txInfo.signature)
                    // throw Error("Different mint initialze");
                } else {

                    // If serum market is not matched, then revert
                    if (accounts.serumMarket && txInfo.accounts.serumMarket !== accounts.serumMarket) {
                        // console.log("Different serum market at Initialize: ", txInfo.accounts.serumMarket, accounts.serumMarket, txInfo.signature)
                        // throw Error("Different serum market");
                    } else {

                        Object.keys(txInfo.accounts).forEach(key => {
                            accounts[key] = txInfo.accounts[key]
                        })
                        accounts.signatures.push({ txType: txInfo.txType, signature: txInfo.signature })
                        foundTxNum++
                        // console.log("Accounts: ", accounts)
                    }
                }
            }
        } catch (err) {
            throw (err)
        }
    }

    if (foundTxNum > 0) {
        const sigs = accounts.signatures.map(s => s.txType)
        if (sigs.indexOf('InitializeInstruction2') >= 0 && sigs.indexOf('Jitotip') >= 0 && sigs.indexOf('Serum') >= 0) {
            // Have all 3 txs
            const totalAccountsInfo = saveInitTx(accounts, blockTime, slot, blockHash)
            return totalAccountsInfo
        } else {
            console.log("Found txs, but only: ", sigs.toString())
            return false
        }
    } else {
        return false
    }
}

const getBlockSubscribe = async () => {
    console.log("Start block subscribing")
    const req = {
        jsonrpc: "2.0",
        id: 1,
        method: "blockSubscribe",
        params: [
            {
                "mentionsAccountOrProgram": "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"
            },
            {
                "commitment": "confirmed",
                "maxSupportedTransactionVersion": 0,
                "encoding": "json",
                "showRewards": true,
                "transactionDetails": "full"
            }
        ],
    }

    client.send(JSON.stringify(req))
}

const saveWithdrawTx = (data, signature, txType, blockTime, slot) => {
    // Load existing list from saved file
    let existingList = fs.readFileSync("./tx/snipingList.json", "utf-8")
    existingList = JSON.parse(existingList)
    const index = existingList.map(e => e.mint).indexOf(data.mint)
    if (index >= 0) throw Error("Duplicate Mint")
    existingList.push({ ...data, signatures: [{ txType, signature, blockTime, slot }] })
    fs.writeFileSync("./tx/snipingList.json", JSON.stringify(existingList))
}

const saveInitTx = (data, blockTime, slot, blockHash) => {
    // Load existing list from saved file
    let existingList = fs.readFileSync("./tx/snipingList.json", "utf-8")
    existingList = JSON.parse(existingList)
    const index = existingList.map(e => e.mint).indexOf(data.mint)
    if (index < 0) {
        throw Error("No Withdraw Recorded")
    } else {
        const signatures = existingList[index].signatures
        const sigs = signatures.map(s => s.txType)
        if (sigs.indexOf('InitializeInstruction2') >= 0 && sigs.indexOf('Jitotip') >= 0 && sigs.indexOf('Serum') >= 0) {
            // Have all 3 txs
            return
        }
        data.signatures.forEach(s => {
            if (sigs.indexOf(s.txType) < 0) {
                signatures.push({ txType: s.txType, signature: s.signature, blockTime, slot })
            }
        })
        existingList[index] = { ...existingList[index], ...data, signatures, timeStamp: new Date(), blockHash }
    }
    fs.writeFileSync("./tx/snipingList.json", JSON.stringify(existingList))
    return existingList[index]
}

const saveBoughtTx = (txHash, signatures, mint) => {
    // Load existing list from saved file
    let existingList = fs.readFileSync("./tx/boughtList.json", "utf-8")
    existingList = JSON.parse(existingList)
    const index = existingList.map(e => e.txHash).indexOf(txHash)
    if (index < 0) {
        existingList.push({ txHash, signatures, mint })
        fs.writeFileSync("./tx/boughtList.json", JSON.stringify(existingList))
    } else {
        console.log("Alrd saved")
        return
    }
}

module.exports = {
    startSubscribe,
    stopSubscribe,
    getSubscribeStatus
}