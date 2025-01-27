const fs = require("fs")
const { getTokenPrice, calcPNL, getBlock, getBlocks, getSignatureStatus, getLatestBlock, createTokenAccount, getKeyPair, buy, sell, getTokenCreatorInfo, getTxDetail } = require("./utils")
const { connection, privKey } = require("./constants")

const main = async () => {
    const accounts = {
        mint: '6uwJVkvGqzSLT8Jyk2GkkWq2rZQi1C1i4xpF5Yqmpump',
        tokenLifeTime: 122015,
        devBought: 51095237.998956,
        devLeft: 51095237.998956,
        top10Holding: 59.2066137557115,
        decimals: 6,
        toBuy: false,
        signatures: [
            {
                txType: 'Withdraw',
                signature: '4bMkLqzGzcPA1TFgxLuZPa1jvvZ59Qpp3DZes7G8SSEfUzmUooosPvcY4QRFzCh9DAqZ9VqbgBj3JP1fv4zMfCZf',
                blockTime: 1737758343,
                slot: 316151327
            },
            {
                txType: 'Jitotip',
                signature: '3pACMW3g6Sphyr2wkrSqFzMePn7Sq37rP28Dvh5oGLwP6ZAefZ3fyXLWmUj7xzaAtaqbAFoDMrxh9dzY4ycdBXjX',
                blockTime: 1737758393,
                slot: 316151450
            },
            {
                txType: 'Serum',
                signature: '5xWYbYvgMxEBi1GVcZAjzteT2C5qssTgP88GoU5dZ7f3cKpR7f87iJDaiJ5DwQYLkfHdyyxyJJLYnPH13bCXTgFA',
                blockTime: 1737758393,
                slot: 316151450
            },
            {
                txType: 'InitializeInstruction2',
                signature: '5hAsCpenJYtLjm9wmCo7RRTsYaV8fuEo4Q6qiKuf1A6iJ9AAYRb2aSTGVWRsQXQoL7BDPdgDYq42VPP6PfnB3HdG',
                blockTime: 1737758393,
                slot: 316151450
            }
        ],
        serumCoinVault: '7fPXvW76eswJW1zXXFzC76XhSKDLf1ZqWLvx4KCv85iA',
        serumPCVault: '36RjTtnUJw8HUgvZ97pqDXYPJRDfH3QcLJGxWmUvvr9j',
        serumVaultSinger: '6CVTNTQ3Ezfo6CagFh2AQzyjcbgWGiMbDGnwjbaZkz52',
        serumMarket: 'ij7EmekHmj8HaxqRQwqVQjf1bf7qKtU73ecyEPzkHVE',
        serumBids: 'F5BHdAaURsiVdcCYPDndNWB6UfMJFQbabH7ttDEV4jC5',
        serumAsks: 'G5STgNcjzzC5dDmuQJ5gnfy97tT35w2sSE7zRY52pSgh',
        serumEventQueue: '9M4anMhVTK56eTW37UpV6TJ8eGHgNJmM3rboVxxAgCGQ',
        amm: '9d497MoNHBMDUdE3FLuGmdxCDT9xGeaQqQ8jyCcu7mL5',
        ammOpenOrders: '2Nq1iF79cfukdtrKuX9fc7QrJ454m3x2xGE4RfHm9R9G',
        lpMint: 'DUQp62B7TsUqrrkAzmLMkRn8LdhVXHgNTiHxPupAccNA',
        poolCoinAccount: 'Jiezc1928SWyryZ3BRAizZnDBHpBiEKhhdcE8B2bsH6',
        poolPCAccount: '3LWASwtvh5ZfDhCs98BNuBajoeG7YMqAxseNrxYeXAee',
        poolWithdrawQueue: '4N3HH338qKQQdTRqxCD4MWjFWKPbeB2t5eXLS4xv3RuF',
        timeStamp: '2025-01-24T22:39:56.499Z',
        blockHash: 'AGTbntwzozHJPjLpByr7BkvoSUu8HMAekTByAgR9YWUe'
    }

    const latestBlock = await getLatestBlock()
    console.log("LatestBlock: ", latestBlock)
    // res = await buy(connection, accounts, getKeyPair(privKey), 1000, 1000)
    const res = await sell(connection, accounts, getKeyPair(privKey), 2002844, 0)
    console.log("Res: ", res)
    const sigINfo = await getSignatureStatus(res)
    console.log("Sig: ", sigINfo)
    // await getSignatureStatus("2618jAQR3sdMobrvzMjVS4Mpn72nen8CjzUosTqLGfk2RgRaizfHedakmHjMxkfMFYU58EucuZJUMVLFC84d8WBw")

    // let csv = 'Token Address,Top10,Price\n'
    // existingList.filter(e => e.toBuy).map(l => ({ mint: l.mint, top10: l.top10Holding })).forEach(m => {
    //     csv += `${m.mint},${m.top10}\n`
    // })
    // fs.writeFileSync("./tx/snipingBoughtList.csv", csv)

    // // Get token price
    // const tokenPrice = await getTokenPrice("4HDDadGSouW92XagzGt2Y5fg1aQM28omKVq62RtPpump", "2025-01-17T14:32:37.922Z")
    // const pnl = calcPNL(tokenPrice)
    // console.log("PNL: ", pnl)

    // let csvAll = `TokenAddress, Top10, PNL, StartAT, PNLAT, BuyFlag\n`

    // let prices = []
    // for (let i = 0; i < existingList.length; i++) {
    //     const tokenPrice = await getTokenPrice(existingList[i].mint, existingList[i].timeStamp)
    //     const pnl = calcPNL(tokenPrice)
    //     console.log("PNL: ", existingList[i].mint, pnl.pnl)
    //     prices.push({ mint: existingList[i].mint, tokenPrice: tokenPrice })
    //     csvAll += `${existingList[i].mint}, ${existingList[i].top10Holding}, ${pnl.pnl}, ${pnl.mintAt}, ${pnl.pnlAt}, ${existingList[i].toBuy}\n`
    // }

    // fs.writeFileSync("./tx/snipingPrice.json", JSON.stringify(prices))
    // // console.log("PNL: ", pnl)
    // fs.writeFileSync("./tx/snipingAll.csv", csvAll)

}

main()