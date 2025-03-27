const axios = require("axios")
const httpRPC = "https://intensive-wild-scion.solana-mainnet.quiknode.pro/f6e7168b727a9a81d15feb43ed80a6eeac3cb258"
const solscanAPI = "https://api-v2.solscan.io/v2"
const pumpfunRaydiumMigration = "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"
const web3 = require('@solana/web3.js');
const { PublicKey } = require("@solana/web3.js");
const { AnchorProvider, BN } = require("@coral-xyz/anchor");
const splToken = require("@solana/spl-token");
const bs58 = require('bs58')
const { raydiumAmmProgram } = require("../raydium/program.js");
const { CustomWallet } = require("../raydium/wallet.js");
const { solMintAddress, raydiumAuthorityV4, openBook } = require("../config/constants.js");
const { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } = require("@solana/spl-token");

const totalSupply = 1000000000

const pumpFunMigrator = "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"

exports.processInitialize2Tx = (data) => {
    const signature = data.transaction.signatures[0]
    const accountKeys = data.transaction.message.accountKeys
    if (accountKeys[0] !== pumpFunMigrator) return false
    if (accountKeys.length > 21) {
        const amm = accountKeys[2]
        const ammOpenOrders = accountKeys[3]
        const lpMint = accountKeys[4]
        const poolCoinAccount = accountKeys[5]
        const poolPCAccount = accountKeys[6]
        const poolWithdrawQueue = accountKeys[7]
        const mint = accountKeys[18]
        const serumMarket = accountKeys[21]
        return { txType: "InitializeInstruction2", signature, accounts: { mint, amm, ammOpenOrders, lpMint, poolCoinAccount, poolPCAccount, poolWithdrawQueue, serumMarket } }
    } else {
        console.log(`Error: Init2 Not enough account keys (found ${accountKeys.length})`)
        return false
    }
}

exports.processWithdrawTx = (data) => {
    const signature = data.transaction.signatures[0]
    const accountKeys = data.transaction.message.accountKeys
    if (accountKeys[0] !== pumpFunMigrator) return false
    if (accountKeys.length > 10) {
        let mint = accountKeys[10]
        if (mint === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
            mint = accountKeys[9]
        }
        return { txType: "Withdraw", signature, accounts: { mint } }
    } else {
        console.log(`Error: Withdraw Not enough account keys (found ${accountKeys.length})`)
        return false
    }
}

exports.processJitotipTx = (data) => {
    const signature = data.transaction.signatures[0]
    const accountKeys = data.transaction.message.accountKeys
    if (accountKeys[0] !== pumpFunMigrator) return false
    if (accountKeys.length > 9) {
        const serumCoinVault = accountKeys[2]
        const serumPCVault = accountKeys[3]
        const serumVaultSinger = accountKeys[7]
        const mint = accountKeys[9]
        return { txType: "Jitotip", signature, accounts: { mint, serumCoinVault, serumPCVault, serumVaultSinger } }
    } else {
        console.log(`Error: Jitotip Not enough account keys (found ${accountKeys.length})`)
        return false
    }
}

exports.processSerumTx = (data) => {
    const signature = data.transaction.signatures[0]
    const accountKeys = data.transaction.message.accountKeys
    if (accountKeys[0] !== pumpFunMigrator) return false
    if (accountKeys.length > 11) {
        const serumMarket = accountKeys[1]
        const serumBids = accountKeys[4]
        const serumAsks = accountKeys[5]
        const serumEventQueue = accountKeys[3]
        const mint = accountKeys[11]
        return { txType: "Serum", signature, accounts: { mint, serumMarket, serumBids, serumAsks, serumEventQueue } }
    } else {
        console.log(`Error: Serum Create Seed Not enough account keys (found ${accountKeys.length})`)
        return false
    }

}

exports.getTokenHolders = async (address) => {
    try {
        const response = await axios({
            url: httpRPC,
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: [
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getTokenLargestAccounts",
                    params: [
                        address
                    ],
                }
            ]
        });

        return response.data[0]?.result.value
    } catch (err) {
        console.log("Get Token holders failed")
        throw (err)
    }
}

exports.getTxDetail = async (signature) => {
    try {
        const response = await axios({
            url: httpRPC,
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: [
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getTransaction",
                    params: [
                        signature,
                        {
                            "maxSupportedTransactionVersion": 0,
                            "encoding": "json"
                        }
                    ],
                }
            ]
        });
        const rawData = response?.data[0]?.result;
        return rawData
    } catch (err) {
        console.log("TX Detail failed")
        throw (err)
    }
}

exports.getTokenAccountOfRaydium = async (address) => {

}

exports.getTokenCreatorInfo = async (address) => {
    try {
        const response = await axios({
            url: `${solscanAPI}/account?address=${address}`,
            method: "get",
            headers: { "Content-Type": "application/json", "Origin": "https://solscan.io" },
        });
        const tokenInfo = response.data.data.tokenInfo
        if (!tokenInfo) {
            console.log("No Token Info: ", address)
            return false
        }
        const creator = tokenInfo.creator
        const createTx = tokenInfo.created_tx
        const decimals = tokenInfo.decimals

        // Get create tx
        const txDetailPending = this.getTxDetail(createTx)
        const creatorHoldingPending = this.getTokenAccountsByOwner(address, creator)
        const topHoldersPending = this.getTokenHolders(address)
        const promises = Promise.all([txDetailPending, creatorHoldingPending, topHoldersPending])
        const result = await promises.then()

        // Get token life time
        if (!result[0]?.blockTime) {
            console.log("TX Detail fetch failed: No Blocktime caught", address)
            console.log("Result: ", result[0])
            return false
        }
        const tokenLifeTime = new Date() - result[0].blockTime * 1000

        // Get token prebought by dev
        if (result[0]?.meta?.postTokenBalances.length < 1) {
            console.log("TX Detail fetch failed: No Token creation", address)
            return false
        }
        let devBought = 0
        const index = result[0].meta.postTokenBalances.map(p => p.owner).indexOf(creator)
        if (index > 0) devBought = result[0].meta.postTokenBalances[index].uiTokenAmount.uiAmount

        // Get token left holding by dev
        // if ()
        const devLeft = result[1]

        // Get top 10 holdings, sliced pump fun migration account holding
        let topHolders = result[2]
        let top10Holding = 0
        const migrationIndex = topHolders.map(t => t.address).indexOf(pumpfunRaydiumMigration)
        if (migrationIndex > 0) {
            console.log("Pumpfun migration account holding ranking at: ", migrationIndex + 1)
            // splice migration account holding, and slice 10 accounts
            topHolders = topHolders.splice(migrationIndex, 1)
        }
        top10Holding = topHolders.slice(0, 10).reduce((a, b) => a + b.uiAmount, 0) / totalSupply * 100

        return { tokenLifeTime, devBought, devLeft, top10Holding, decimals }
    } catch (err) {
        console.log("Get Token Creator Info failed")
        throw (err)
    }
}

exports.getTokenAccountsByOwner = async (address, owner) => {
    try {
        const response = await axios({
            url: httpRPC,
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: [
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getTokenAccountsByOwner",
                    params: [
                        owner,
                        {
                            "mint": address,
                            // "programId": TOKEN_PROGRAM_ID
                        },
                        {
                            "encoding": "jsonParsed"
                        }
                    ],
                }
            ]
        });

        const data = response.data[0]?.result?.value
        if (data?.length > 0) {
            let tokenOwnInfo
            data.forEach(d => {
                const parsedInfo = d.account.data.parsed
                if (parsedInfo.info.mint === address) {
                    tokenOwnInfo = parsedInfo.info
                }
            })
            return tokenOwnInfo.tokenAmount
        } else {
            return 0
        }
    } catch (err) {
        console.log("Get Token Accounts By Owner failed")
        throw (err)
    }
}

exports.getTokenPrice = async (mint, mintedAt) => {
    try {
        const response = await fetch("https://streaming.bitquery.io/eap", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ory_at_Zo8cK6FCIbc35_6rX7bVShuU6SsC1veJL8OUZfa-BkQ.oYEYSGzncZNdS5hJjPivEV6OQbpEqtSz3XHugXhVxjM	`
            },
            body: JSON.stringify({
                query: `
                    {
                        Solana(dataset:combined) {
                            DEXTradeByTokens(
                            orderBy: {descendingByField: "Block_Timefield"}
                            where: {Trade: {Currency: {MintAddress: {is: "${mint}"}}, Dex: {ProgramAddress: {is: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"}}}, Block: {Time: {since: "${mintedAt}"}}}
                            limit: {}
                            ) {
                            Block {
                                Timefield: Time(interval: {in: minutes, count: 1})
                            }
                            buyVolume: sum(if: {Trade: {Side: {Type: {is: buy}}}}, of: Trade_Amount)
                            sellVolume: sum(if: {Trade: {Side: {Type: {is: sell}}}}, of: Trade_Amount)
                            Trade {
                                high: Price(maximum: Trade_Price)
                                low: Price(minimum: Trade_Price)
                                open: Price(minimum: Block_Slot)
                                close: Price(maximum: Block_Slot)
                            }
                            }
                        }
                    }
                `,
                variables: "{}",
            }),
        });

        const resData = await response.json()
        return resData.data.Solana.DEXTradeByTokens
    } catch (err) {
        throw (err)
    }
}

exports.calcPNL = (prices) => {
    const priceWithAvg = prices.map(t => ({ ...t, avg: (t.Trade.open + t.Trade.close) / 2 })).reverse()
    const startPrice = priceWithAvg[0].Trade.open
    console.log("Start: ", startPrice)
    const priceSorted = [...priceWithAvg.slice(1)].sort((a, b) => b.avg - a.avg)
    const athPrice = priceSorted[0].avg
    console.log("athPrice: ", athPrice)
    let pnl = (athPrice - startPrice) / startPrice * 100
    if (pnl < 0 && pnl > -50) pnl = -50
    return { pnl, pnlAt: priceSorted[0].Block.Timefield, mintAt: priceWithAvg[0].Block.Timefield }
}

exports.getBlock = async (blockNum) => {
    try {
        const response = await axios({
            url: httpRPC,
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: [
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getBlock",
                    params: [
                        blockNum,
                        {
                            "commitment": "confirmed",
                            "encoding": "json",
                            "maxSupportedTransactionVersion": 0,
                            "transactionDetails": "full",
                            "rewards": false
                        }
                    ],
                }
            ]
        });

        return response.data[0]
    } catch (err) {
        throw (err)
    }
}

exports.getLatestBlock = async () => {
    try {
        const response = await axios({
            url: httpRPC,
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: [
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getLatestBlockhash",
                    params: [
                        {
                            "commitment": "confirmed",
                        }
                    ],
                }
            ]
        });

        return {
            slot: response.data[0].result.context.slot,
            blockHash: response.data[0].result.value.blockhash,
            blockHeight: response.data[0].result.value.lastValidBlockHeight
        }
    } catch (err) {
        throw (err)
    }
}

exports.transferNative = async (connection, from, to, amount) => {
    try {
        // let latestBlock = await connection.getLatestBlockhash('confirmed')
        let latestBlock = await this.getLatestBlock()
        let blockhash = latestBlock.blockHash;
        let slot = latestBlock.slot
        console.log("Latest Block: ", latestBlock)
        let preTransaction = new web3.Transaction().add(
            web3.SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: amount,
            }),
        );
        preTransaction.recentBlockhash = blockhash;
        preTransaction.feePayer = from.publicKey

        const response = await connection.getFeeForMessage(
            preTransaction.compileMessage(),
            'confirmed',
        );
        const feeInLamports = response.value;

        const transaction = new web3.Transaction().add(
            web3.SystemProgram.transfer({
                fromPubkey: from.publicKey,
                toPubkey: to,
                lamports: amount - feeInLamports,
            }),
        );
        const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000000 });
        transaction.add(computePriceIx);

        latestBlock = await this.getLatestBlock()
        blockhash = latestBlock.blockHash;
        slot = latestBlock.parentSlot
        console.log("Latest Block for now: ", latestBlock)
        // Sign transaction, broadcast, and confirm
        const signature = await web3.sendAndConfirmTransaction(
            connection,
            transaction,
            [from],
        );
        console.log('SIGNATURE', signature);
        const sigStatus = await this.getSignatureStatus(signature)
        console.log("Signature slot: ", sigStatus, sigStatus.slot)
        console.log(`Transfered from ${from.publicKey.toString()}, ${this.parseLam(amount)} Sol`)
    } catch (err) {
        throw (err)
    }
}

exports.parseLam = (lam) => parseFloat(lam) / web3.LAMPORTS_PER_SOL

exports.getKeyPair = (privKey) => {
    try {
        return web3.Keypair.fromSecretKey(bs58.decode(privKey))
    } catch (err) {
        throw (err)
    }
}

exports.getSignatureStatus = async (signature) => {
    try {
        const response = await axios({
            url: httpRPC,
            method: "post",
            headers: { "Content-Type": "application/json" },
            data: [
                {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getSignatureStatuses",
                    params: [
                        [signature],
                        {
                            "searchTransactionHistory": true
                        }
                    ],
                }
            ]
        });

        console.log("res: ", response.data[0].result.value)
        return response.data[0].result.value[0]
    } catch (err) {
        throw (err)
    }
}

exports.buy = async (connection, accounts, wallet, amountInLamports, amountOutLamports) => {
    try {
        console.log(`Buying ${amountOutLamports / (10 ** accounts.decimals)} ${accounts.mint} with ${amountInLamports / 1000000000} Sol`)
        const startAt = new Date()
        const provider = new AnchorProvider(
            connection,
            new CustomWallet(wallet),
            AnchorProvider.defaultOptions()
        );

        const ammProgram = raydiumAmmProgram({
            provider: provider,
        });

        // Set swapping tokens. according to this set, it determines the buy and sell option
        const coinMint = new web3.PublicKey(solMintAddress);
        const pcMint = new web3.PublicKey(accounts.mint);
        const userSourceTokenAccount = splToken.getAssociatedTokenAddressSync(coinMint, wallet.publicKey);
        const userDestinationTokenAccount = splToken.getAssociatedTokenAddressSync(pcMint, wallet.publicKey);

        // Create Instruction
        const instruction = await ammProgram.methods
            .swapBaseIn(new BN(amountInLamports), new BN(amountOutLamports))
            .accounts({
                tokenProgram: splToken.TOKEN_PROGRAM_ID,
                amm: new web3.PublicKey(accounts.amm),
                ammAuthority: new web3.PublicKey(raydiumAuthorityV4),
                ammOpenOrders: new web3.PublicKey(accounts.ammOpenOrders),
                ammTargetOrders: new web3.PublicKey(accounts.poolWithdrawQueue),
                poolCoinTokenAccount: new web3.PublicKey(accounts.poolCoinAccount),
                poolPcTokenAccount: new web3.PublicKey(accounts.poolPCAccount),
                serumProgram: new web3.PublicKey(openBook),
                serumMarket: new web3.PublicKey(accounts.serumMarket),
                serumBids: new web3.PublicKey(accounts.serumBids),
                serumAsks: new web3.PublicKey(accounts.serumAsks),
                serumEventQueue: new web3.PublicKey(accounts.serumEventQueue),
                serumCoinVaultAccount: new web3.PublicKey(accounts.serumCoinVault),
                serumPcVaultAccount: new web3.PublicKey(accounts.serumPCVault),
                serumVaultSigner: new web3.PublicKey(accounts.serumVaultSinger),
                uerSourceTokenAccount: userSourceTokenAccount,
                uerDestinationTokenAccount: userDestinationTokenAccount,
                userSourceOwner: wallet.publicKey,
            })
            .instruction();
        const transaction = new web3.Transaction({ recentBlockhash: accounts.blockHash });
        const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000000 });
        transaction.add(instruction);
        transaction.add(computePriceIx);
        const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
            commitment: "confirmed",
            skipPreflight: false,
            preflightCommitment: "confirmed",
        });
        console.log("Finish Bought: ", accounts.mint, (new Date() - startAt) / 1000)
        return txId
    } catch (err) {
        const errors = await err.getLogs()
        const errMsg = errors.toString()
        if (errMsg.indexOf("slippage limit") >= 0) {
            console.log("Slippage")
            return false
        }
        else {
            console.log("Errmsg: ", errMsg)
            return false
        }
    }
}

exports.sell = async (connection, accounts, wallet, amountInLamports, amountOutLamports) => {
    const startAt = new Date()
    const provider = new AnchorProvider(
        connection,
        new CustomWallet(wallet),
        AnchorProvider.defaultOptions()
    );

    const ammProgram = raydiumAmmProgram({
        provider: provider,
    });

    const coinMint = new web3.PublicKey(accounts.mint);
    const pcMint = new web3.PublicKey(solMintAddress);
    const userSourceTokenAccount = splToken.getAssociatedTokenAddressSync(coinMint, wallet.publicKey);
    const userDestinationTokenAccount = splToken.getAssociatedTokenAddressSync(pcMint, wallet.publicKey);

    const instruction = await ammProgram.methods
        .swapBaseIn(new BN(amountInLamports), new BN(amountOutLamports))
        .accounts({
            tokenProgram: splToken.TOKEN_PROGRAM_ID,
            amm: new web3.PublicKey(accounts.amm),
            ammAuthority: new web3.PublicKey(raydiumAuthorityV4),
            ammOpenOrders: new web3.PublicKey(accounts.ammOpenOrders),
            ammTargetOrders: new web3.PublicKey(accounts.poolWithdrawQueue),
            poolCoinTokenAccount: new web3.PublicKey(accounts.poolCoinAccount),
            poolPcTokenAccount: new web3.PublicKey(accounts.poolPCAccount),
            serumProgram: new web3.PublicKey(openBook),
            serumMarket: new web3.PublicKey(accounts.serumMarket),
            serumBids: new web3.PublicKey(accounts.serumBids),
            serumAsks: new web3.PublicKey(accounts.serumAsks),
            serumEventQueue: new web3.PublicKey(accounts.serumEventQueue),
            serumCoinVaultAccount: new web3.PublicKey(accounts.serumCoinVault),
            serumPcVaultAccount: new web3.PublicKey(accounts.serumPCVault),
            serumVaultSigner: new web3.PublicKey(accounts.serumVaultSinger),
            uerSourceTokenAccount: userSourceTokenAccount,
            uerDestinationTokenAccount: userDestinationTokenAccount,
            userSourceOwner: wallet.publicKey,
        })
        .instruction();

    // Set priorityfee
    const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000000 });

    const transaction = new web3.Transaction();
    transaction.add(instruction);
    transaction.add(computePriceIx);

    const txId = await connection.sendTransaction(transaction, [wallet]);
    console.log("TX Sent: ", (new Date() - startAt) / 1000)

    const { blockHeight, blockHash } = await this.getLatestBlock()
    await connection.confirmTransaction(
        {
            blockHash,
            blockHeight,
            signature: txId,
        },
        "confirmed"
    );
    console.log("Sell Finished: ", accounts.mint)
    return txId
}

exports.createTokenAccount = async (connection, wallet, mint) => {
    try {
        const associatedTokenAddress = await splToken.getAssociatedTokenAddress(
            new web3.PublicKey(mint),
            wallet.publicKey
        );
        const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
        if (!!accountInfo) {
            console.log("Token account already exists")
            return
        }

        const associatedAccountInstruction = splToken.createAssociatedTokenAccountInstruction(
            wallet.publicKey, // Payer of the transaction
            associatedTokenAddress, // Associated token account address
            wallet.publicKey, // Owner of the token account
            new web3.PublicKey(mint) // Mint of the token to create the account for
        );

        // create tx
        const latestBlock = await this.getLatestBlock()
        const blockhash = latestBlock.blockHash;
        const transaction = new web3.Transaction({ recentBlockhash: blockhash });
        const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 });
        transaction.add(associatedAccountInstruction);
        transaction.add(computePriceIx);
        try {
            const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
                commitment: "confirmed",
                skipPreflight: false,
                preflightCommitment: "confirmed",
            });
            return txId
        } catch (err) {
            console.log("Web3 error")
            throw (err)
        }
    } catch (err) {
        console.log("TOken account creation failed")
        throw (err)
    }
}

exports.wrapSol = async (connection, wallet) => {

    const wsolTokenAddress = await splToken.getAssociatedTokenAddress(new web3.PublicKey(solMintAddress), wallet.publicKey);
    console.log("WSOL Token address: ", wsolTokenAddress)
    const wsolAccountInfo = await connection.getAccountInfo(wsolTokenAddress);
    console.log("wsolAccountInfo: ", wsolAccountInfo)
    // create tx
    const latestBlock = await this.getLatestBlock()
    const blockhash = latestBlock.blockHash;
    const transaction = new web3.Transaction({ recentBlockhash: blockhash });

    if (!wsolAccountInfo) {
        const wsolAccountInstruction = splToken.createAssociatedTokenAccountInstruction(
            wallet.publicKey, // Payer of the transaction
            wsolTokenAddress, // Associated token account address
            wallet.publicKey, // Owner of the token account
            new web3.PublicKey(solMintAddress) // Mint of the token to create the account for
        );
        transaction.add(wsolAccountInstruction)
    }


    const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
        commitment: "confirmed",
        skipPreflight: false,
        preflightCommitment: "confirmed",
    });
    return txId
}

exports.transferSoltoWrapSolAccount = async (connection, wallet, amount) => {
    const wsolTokenAddress = await splToken.getAssociatedTokenAddress(new web3.PublicKey(solMintAddress), wallet.publicKey);
    const inputTokenAccount = await splToken.getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        new web3.PublicKey(solMintAddress),
        wallet.publicKey
    );
    // create tx
    const latestBlock = await this.getLatestBlock()
    const blockhash = latestBlock.blockHash;
    const transaction = new web3.Transaction({ recentBlockhash: blockhash });

    const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 });
    transaction.add(computePriceIx);

    const wsolInstruction1 = web3.SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: inputTokenAccount.address,
        lamports: amount,
    });
    const wsolInstruction2 = splToken.createSyncNativeInstruction(wsolTokenAddress);
    transaction.add(wsolInstruction1)
    transaction.add(wsolInstruction2)
    const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
        commitment: "confirmed",
        skipPreflight: false,
        preflightCommitment: "confirmed",
    });
    return txId
}

exports.getBondingCurveAddress = (mint) => {
    const PUMP_FUN_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
    const [bondingCurve] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("bonding-curve"),
            new PublicKey(mint).toBuffer()
        ],
        PUMP_FUN_PROGRAM);

    const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
        [
            bondingCurve.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            new PublicKey(mint).toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID);
    return { bondingCurve: bondingCurve.toString(), associatedBondingCurve: associatedBondingCurve.toString() }
}