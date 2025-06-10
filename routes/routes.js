const express = require("express");
const { getBoughtList, sell, getTradeHis, getSnipingAccount, manualUpdateSellHis, createAccount, manualUpdateBoughtHis, getAllTradeHis, getSnipingList, getTotalCounts, ignoreMint, removeBoughtHis, resetList } = require("../controllers/raydiumController");
const { getCreateHisByMint, getTradeHisByMint, getBondingCurveProgress, getTradeHisBySigner, getKolTradeHisByMint, buyPumpfun, createTokenAccount, createPumpFunAccount, sellPumpfun, buySellPumpfun, importCreateHis, importTradeHis, sellPumpfunMultiple, buyPumpfunWithFreshWallet } = require("../controllers/pumpfunController");
const { checkSocial } = require("../controllers/socialController");
const { getPumpSwapKolTradeHisByMint, getPumpswapHisBySigner } = require("../controllers/pumpswapController");
const { createNewWallet, importNewWallet, archieveWallet, restoreWallet, getWallets } = require("../controllers/walletController");
const router = express.Router();

/**
 *  Get Current Status
 */
router.get("/getSnipingList", getSnipingList)
router.get("/getBoughtList", getBoughtList);
router.get("/getTradeList", getTradeHis);
router.get("/getAllTradeHis", getAllTradeHis)
router.get("/getTotalCounts", getTotalCounts)
router.post("/getSnipingAccount", getSnipingAccount);

/**
 * Pumpfun
 */
router.get("/pumpfun/create/:mint", getCreateHisByMint)
router.get("/pumpfun/trade/:mint", getTradeHisByMint)
router.get("/pumpfun/signer/:signer", getTradeHisBySigner)
router.get("/pumpfun/progress/:mint", getBondingCurveProgress)
router.get("/pumpfun/kol/:mint", getKolTradeHisByMint)
router.post("/pumpfun/buy", buyPumpfun)
router.post("/pumpfun/buyWithFreshWallet", buyPumpfunWithFreshWallet)
router.post("/pumpfun/sell", sellPumpfun)
router.post("/pumpfun/sellmulti", sellPumpfunMultiple)
router.post("/pumpfun/buysell", buySellPumpfun)
router.post("/pumpfun/createtokenaccount", createPumpFunAccount)
router.post("/pumpfun/import/mint", importCreateHis)
router.post("/pumpfun/import/trade", importTradeHis)

/**
 * Pumpswap
 */
router.get("/pumpswap/kol/:mint", getPumpSwapKolTradeHisByMint)
router.get("/pumpswap/signer/:signer", getPumpswapHisBySigner)

/**
 * Social
 */
// router.get("/social/creators/:topic", getSocialCreators)
// router.get("/social/posts/:topic", getSocialPosts)
router.post("/social/lunar", checkSocial)

/**
 * Web3 actions
 */
router.post("/sell", sell)
router.post("/createTokenAccount", createAccount)

/**
 * Update dataset 
 */
router.post("/updateSell", manualUpdateSellHis)
router.post("/updateBuy", manualUpdateBoughtHis)
router.post("/ignore", ignoreMint)
router.post("/removeBoughtHis", removeBoughtHis)
router.post("/resetList", resetList)

/**
 * Trade
 */
router.get("/trade/wallets/:mint", getWallets)
router.post("/trade/wallet/new", createNewWallet)
router.post("/trade/wallet/import", importNewWallet)
router.post("/trade/wallet/archieve", archieveWallet)
router.post("/trade/wallet/restore", restoreWallet)

module.exports = router;