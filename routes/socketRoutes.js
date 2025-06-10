const express = require("express");
const { startSubscribe, stopSubscribe, getSubscribeStatus } = require("../controllers/socketRaydiumSubscribe");
const { startPumpSubscribe, getPumpSubscribeStatus, stopPumpSubscribe } = require("../controllers/socketPumpSubscribe");
const router = express.Router();

/**
 * Raydium
 */
router.get("/raydium/start", startSubscribe)
router.get("/raydium/stop", stopSubscribe)
router.get("/raydium/status", getSubscribeStatus)

/**
 * Pump fun
 */
router.get("/pumpfun/start", startPumpSubscribe)
router.get("/pumpfun/stop", stopPumpSubscribe)
router.get("/pumpfun/status", getPumpSubscribeStatus)



module.exports = router;
