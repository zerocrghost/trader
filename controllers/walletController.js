const bs58 = require('bs58')
const web3 = require('@solana/web3.js');
const myWalletModel = require('../model/myWallet.model');
const { getKeyPair } = require('../utils/utils');
const pumpFunMintModel = require('../model/pumpFunMint.model');

const createNewWallet = async (req, res) => {
  try {
    const keyPair = web3.Keypair.generate()
    const publicKey = keyPair.publicKey.toBase58()
    const privateKey = bs58.encode(keyPair.secretKey)
    const newWallet = new myWalletModel({
      publicKey, privateKey
    })
    await newWallet.save()
    return res.status(200).send({ data: publicKey })
  } catch (err) {
    console.log("Key error: ", err)
    return res.status(500).send({ msg: "Internal server error" })
  }
}

const importNewWallet = async (req, res) => {
  try {
    if (!req.body.privateKey) return res.status(400).send({ msg: "invalid private key" })
    const keyPair = getKeyPair(req.body.privateKey)
    const publicKey = keyPair.publicKey.toBase58()
    const privateKey = bs58.encode(keyPair.secretKey)
    const existingKey = await myWalletModel.findOne({ publicKey })
    if (!!existingKey) return res.status(400).send({ msg: "Already existing key" })

    const newWallet = new myWalletModel({
      publicKey, privateKey
    })
    await newWallet.save()
    return res.status(200).send({ data: publicKey })

  } catch (err) {
    console.log("Key error: ", err)
    return res.status(500).send({ msg: "Internal server error" })

  }
}

const archieveWallet = async (req, res) => {
  try {
    if (!req.body.publicKey) return res.status(400).send({ msg: "invalid private key" })
    const existingKey = await myWalletModel.findOne({ publicKey: req.body.publicKey })
    if (!existingKey) return res.status(404).send({ msg: "Not found key" })
    if (existingKey.archieved) return res.status(400).send({ msg: "Already archieved" })
    existingKey.archieved = true
    await existingKey.save()
    return res.status(200).send({ data: "Successfully archieved" })
  } catch (err) {
    console.log("Archieve Wallet error: ", err)
    return res.status(500).send({ msg: "Internal server error" })
  }
}

const restoreWallet = async (req, res) => {
  try {
    if (!req.body.publicKey) return res.status(400).send({ msg: "invalid private key" })
    const existingKey = await myWalletModel.findOne({ publicKey: req.body.publicKey })
    if (!existingKey) return res.status(404).send({ msg: "Not found key" })
    if (!existingKey.archieved) return res.status(400).send({ msg: "Not archieved" })
    existingKey.archieved = false
    await existingKey.save()
    return res.status(200).send({ data: "Successfully restored" })
  } catch (err) {
    console.log("Archieve Wallet error: ", err)
    return res.status(500).send({ msg: "Internal server error" })
  }
}

const getWallets = async (req, res) => {
  try {
    if (!req.params.mint) return res.status(400).send({ msg: "invalid mint" })
    const mint = await pumpFunMintModel.findOne({ mint: req.params.mint })
    if (!mint) return res.status(404).send({ msg: "Not Found Mint" })
    const wallets = await myWalletModel.find({ archieved: false }).select(["publicKey"])
    // Set creator wallet address at first of array
    const creatorIndex = wallets.map(w => w.publicKey).indexOf(mint.signer)
    if (creatorIndex >= 0) {
      const creator = wallets[creatorIndex]
      wallets[creatorIndex] = wallets[0]
      wallets[0] = creator
    }
    return res.status(200).send({ data: wallets })
  } catch (err) {
    console.log("Fetch Wallet error: ", err)
    return res.status(500).send({ msg: "Internal server error" })
  }
}

module.exports = {
  createNewWallet,
  importNewWallet,
  getWallets,
  archieveWallet,
  restoreWallet
}