const fs = require("fs")
const { getTxDetail, getSignatureStatus } = require("./utils")
const { solMintAddress, pubKey } = require("./constants")

exports.fetchInterval = () => {
    setInterval(async () => {
        const res = await fetch()
        console.log("Updated Num: ", res)
    }, 2000)
}

const fetch = async () => {
    let existingList = fs.readFileSync("./tx/boughtList.json", "utf-8")
    existingList = JSON.parse(existingList)
    let fetchedNum = 0
    for (let i = 0; i < existingList.length; i++) {
        if (!existingList[i].status) {
            // Fetch tx information
            console.log("Fetching for tx: ", existingList[i].txHash)
            const res = await getTxDetail(existingList[i].txHash)
            if (!res) return

            // Calculate Slot difference
            const tradeBlockTime = res.blockTime
            const tradeSlot = res.slot
            console.log("Trade Slot: ", tradeSlot)
            const slotDiff = tradeSlot - existingList[i].signatures[3].slot
            console.log("Slot passed after initialize: ", slotDiff)

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
            const wSolChange = preWSOLBal - postWSOLBal
            // Find Mint Balance Change
            const preMintIndex = preTokenBalances.map(p => (`${p.mint}, ${p.owner}`)).indexOf(`${existingList[i].mint}, ${pubKey}`)
            if (preIndex < 0) {
                // TODO: How to handle this kind of issue
                return
            }
            const preMintBal = preTokenBalances[preMintIndex].uiTokenAmount.uiAmount
            const postMintIndex = postTokenBalances.map(p => (`${p.mint}, ${p.owner}`)).indexOf(`${existingList[i].mint}, ${pubKey}`)
            if (postMintIndex < 0) {
                // TODO: How to handle this kind of issue
                return
            }
            const postMintBal = postTokenBalances[postMintIndex].uiTokenAmount.uiAmount
            const mintChange = postMintBal - preMintBal

            existingList[i].signatures.push({
                txType: "Buy",
                signature: existingList[i].txHash,
                blockTime: tradeBlockTime,
                slot: tradeSlot
            })
            existingList[i].status = "fetched"
            existingList[i].buy = {
                Sol: wSolChange, Mint: mintChange
            }
            fs.writeFileSync("./tx/boughtList.json", JSON.stringify(existingList))
            fetchedNum++
        }
    }
    return fetchedNum
}
