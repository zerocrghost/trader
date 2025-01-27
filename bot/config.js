const { Raydium } = require("@raydium-io/raydium-sdk-v2");
const { connection } = require("./constants");
const { privKey } = require("./constants");
const { getKeyPair } = require("./utils");
const owner = getKeyPair(privKey)
const cluster = "mainnet"; // 'mainnet' | 'devnet'

let raydium;
const initSdk = async (params = { loadToken: true }) => {
  if (raydium) return raydium;

  raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params.loadToken,
    blockhashCommitment: "finalized",
  });

  return raydium;
};

module.exports = {
  initSdk,
};
