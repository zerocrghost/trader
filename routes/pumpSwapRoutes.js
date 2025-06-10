
const express = require("express");
const { startPumpswapSubscribe, stopPumpswapSubscribe, getPumpswapSubscribeStatus } = require("../controllers/socketPumpSwapSubscribe");
const router = express.Router();

/**
 * Pump Swap
 */
router.get("/start", startPumpswapSubscribe)
router.get("/stop", stopPumpswapSubscribe)
router.get("/status", getPumpswapSubscribeStatus)

module.exports = router; 