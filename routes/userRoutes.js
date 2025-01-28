const express = require("express");
const { startSubscribe, stopSubscribe, getSubscribeStatus } = require("../controllers/socketSubscribe");
const { getBoughtList, sell, getTradeHis, getSnipingAccount, manualUpdateSellHis, createAccount, manualUpdateBoughtHis, getAllTradeHis, getSnipingList, getTotalCounts, ignoreMint, removeBoughtHis, resetList } = require("../controllers/controller");
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
 * Subscribe
 */
router.get("/startSubscribe", startSubscribe)
router.get("/stopSubscribe", stopSubscribe)
router.get("/statusSubscribe", getSubscribeStatus)

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
