"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAYDIUM_AMM_PROGRAM_ID = void 0;
exports.raydiumAmmProgram = raydiumAmmProgram;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const coder_1 = require("./coder");
const raydiumIdl = require("../idl/raydium_idl.json")
exports.RAYDIUM_AMM_PROGRAM_ID = new web3_js_1.PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");
function raydiumAmmProgram(params) {
    return new anchor_1.Program(raydiumIdl, new web3_js_1.PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"), params === null || params === void 0 ? void 0 : params.provider, new coder_1.RaydiumAmmCoder(raydiumIdl));
}
