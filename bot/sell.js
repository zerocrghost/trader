const fs = require("fs")
const { getTokenAccountsByOwner, sell, getTxDetail, getKeyPair } = require("../utils/utils")
const { pubKey, connection, solMintAddress, privKey } = require("../config/constants")

exports.sellMint = async (mint) => {
    if (!mint) {
        console.log("Mint address is needed")
        return
    }

    let existingList = fs.readFileSync("./tx/snipingList.json", "utf-8")
    existingList = JSON.parse(existingList)
    const index = existingList.map(e => e.mint).indexOf(mint)
    if (index < 0) {
        throw Error("No history in snipingList")
    }
    const accounts = existingList[index]
    let existingBoughtList = fs.readFileSync("./tx/boughtList.json", "utf-8")
    existingBoughtList = JSON.parse(existingBoughtList)
    const buyIndex = existingBoughtList.map(e => e.mint).indexOf(mint)

    const mintAmount = await getTokenAccountsByOwner(mint, pubKey)

    // TODO: calculate minimum output
    const minOutPut = 0
    const hash = await sell(connection, accounts, getKeyPair(privKey), mintAmount.amount, minOutPut)

    console.log("Fetch tx detail for: ", mint, hash)

    const res = await this.fetchTxDetail(mint, hash)
    if (buyIndex >= 0) {
        existingBoughtList[buyIndex].sell = {
            Sol: res.wSolChange, Mint: res.mintChange
        }
        existingBoughtList[buyIndex].signatures.push({
            txType: "Sell",
            signature: hash,
            blockTime: res.tradeBlockTime,
            slot: res.tradeSlot
        })
        existingBoughtList[buyIndex].status = "sold"
    } else {
        existingBoughtList.push({
            sell: {
                Sol: res.wSolChange, Mint: res.mintChange
            },
            signatures: [
                {
                    txType: "Sell",
                    signature: hash,
                    blockTime: res.tradeBlockTime,
                    slot: res.tradeSlot
                }
            ],
            status: "sold"
        })
    }
    fs.writeFileSync("./tx/boughtList.json", JSON.stringify(existingBoughtList))
    return hash
}

exports.fetchTxDetail = async (mint, hash) => {
    return new Promise((resolve, reject) => {
        try {
            setTimeout(async () => {
                const res = await getTxDetail(hash)
                if (!res) return resolve(await this.fetchTxDetail(mint, hash))
                // If txinfo out
                // Calculate Slot difference
                const tradeBlockTime = res.blockTime
                const tradeSlot = res.slot

                // Calculate balance change
                const preTokenBalances = res.meta.preTokenBalances
                const postTokenBalances = res.meta.postTokenBalances
                // Find WSOL Balance Change
                const preIndex = preTokenBalances.map(p => (`${p.mint}, ${p.owner}`)).indexOf(`${solMintAddress}, ${pubKey}`)
                if (preIndex < 0) {
                    // TODO: How to handle this kind of issue
                    return
                }
                const preWSOLBal = preTokenBalances[preIndex].uiTokenAmount.uiAmount
                const postIndex = postTokenBalances.map(p => (`${p.mint}, ${p.owner}`)).indexOf(`${solMintAddress}, ${pubKey}`)
                if (postIndex < 0) {
                    // TODO: How to handle this kind of issue
                    return
                }
                const postWSOLBal = postTokenBalances[postIndex].uiTokenAmount.uiAmount
                const wSolChange = postWSOLBal - preWSOLBal
                // Find Mint Balance Change
                const preMintIndex = preTokenBalances.map(p => (`${p.mint}, ${p.owner}`)).indexOf(`${mint}, ${pubKey}`)
                if (preIndex < 0) {
                    // TODO: How to handle this kind of issue
                    return
                }
                const preMintBal = preTokenBalances[preMintIndex].uiTokenAmount.uiAmount
                const postMintIndex = postTokenBalances.map(p => (`${p.mint}, ${p.owner}`)).indexOf(`${mint}, ${pubKey}`)
                if (postMintIndex < 0) {
                    // TODO: How to handle this kind of issue
                    return
                }
                //Should need number conversion, cause uiAmount returns null when it is 0
                const postMintBal = Number(postTokenBalances[postMintIndex].uiTokenAmount.uiAmount)
                const mintChange = preMintBal - postMintBal

                return resolve({ wSolChange, mintChange, tradeBlockTime, tradeSlot })
            }, 2000)
        } catch (err) {
            reject(err)
        }
    })
}
