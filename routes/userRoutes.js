const express = require("express");
const { startSubscribe, stopSubscribe, getSubscribeStatus } = require("../controllers/socketSubscribe");
const { getBoughtList, sell, getTradeHis } = require("../controllers/controller");
const router = express.Router();

router.get("/getBoughtList", getBoughtList);
router.get("/getTradeList", getTradeHis);
router.get("/startSubscribe", startSubscribe)
router.get("/stopSubscribe", stopSubscribe)
router.get("/statusSubscribe", getSubscribeStatus)
router.post("/sell/:address", sell)

module.exports = router;
