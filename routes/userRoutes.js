const express = require("express");
const { startSubscribe, stopSubscribe, getSubscribeStatus } = require("../controllers/socketRaydiumSubscribe");
const { getBoughtList, sell, getTradeHis, getSnipingAccount, manualUpdateSellHis, createAccount, manualUpdateBoughtHis, getAllTradeHis, getSnipingList, getTotalCounts, ignoreMint, removeBoughtHis, resetList } = require("../controllers/raydiumController");
const { startPumpSubscribe, getPumpSubscribeStatus, stopPumpSubscribe } = require("../controllers/socketPumpSubscribe");
const { getCreateHisByMint, getTradeHisByMint, getBondingCurveProgress } = require("../controllers/pumpfunController");
const { getSocialCreators, getSocialPosts } = require("../controllers/socialController");
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
 * Raydium
 */
router.get("/raydium/start", startSubscribe)
router.get("/raydium/stop", stopSubscribe)
router.get("/raydium/status", getSubscribeStatus)
router.get("/raydium/create/:mint", getCreateHisByMint)
router.get("/raydium/trade/:mint", getTradeHisByMint)
router.get("/raydium/progress/:mint", getBondingCurveProgress)

/**
 * Social
 */
router.get("/social/creators/:topic", getSocialCreators)
router.get("/social/posts/:topic", getSocialPosts)

/**
 * Pump fun
 */
router.get("/pumpfun/start", startPumpSubscribe)
router.get("/pumpfun/stop", stopPumpSubscribe)
router.get("/pumpfun/status", getPumpSubscribeStatus)

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

module.exports = router;
