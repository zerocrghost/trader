
const { PublicKey } = require("@solana/web3.js");
const web3 = require('@solana/web3.js');
const splToken = require("@solana/spl-token");
const idl = require("../idl/pump_fun_idl.json")
const { pumpAddr, connection, pumpGlobal, feeRecipient, systemProgram, eventAuthority } = require("../config/constants");
const { AnchorProvider, Wallet, Program, BN } = require("@coral-xyz/anchor");
const { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { getLatestBlock } = require("./utils");

exports.getBondingCurveAddress = (mint, creator) => {
  const PUMP_FUN_PROGRAM = new PublicKey(pumpAddr)
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("bonding-curve"),
      mint.toBuffer()
    ],
    PUMP_FUN_PROGRAM);

  const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
    [
      bondingCurve.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID);

  const creatorVault = PublicKey.findProgramAddressSync(
    [
      Buffer.from("creator-vault"),
      new PublicKey(creator).toBuffer()
    ],
    PUMP_FUN_PROGRAM
  )
  return { bondingCurve: bondingCurve.toString(), associatedBondingCurve: associatedBondingCurve.toString(), creatorVault: creatorVault.toString().split(",")[0] }
}

exports.createTokenAccount = async (wallet, mint) => {
  const associatedTokenAddress = await splToken.getAssociatedTokenAddress(
    new web3.PublicKey(mint),
    wallet.publicKey
  );
  const accountInfo = await connection.getAccountInfo(associatedTokenAddress);
  if (!!accountInfo) {
    console.log("Token account already exists")
    return "Already exists"
  }

  const associatedAccountInstruction = splToken.createAssociatedTokenAccountInstruction(
    wallet.publicKey, // Payer of the transaction
    associatedTokenAddress, // Associated token account address
    wallet.publicKey, // Owner of the token account
    new web3.PublicKey(mint) // Mint of the token to create the account for
  );

  // create tx
  const latestBlock = await getLatestBlock()
  const blockhash = latestBlock.blockHash;
  const transaction = new web3.Transaction({ recentBlockhash: blockhash });
  const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 });
  transaction.add(associatedAccountInstruction);
  transaction.add(computePriceIx);
  const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return txId
}

exports.pumpBuyWithFreshWallet = async (wallet, mint, creator, amount, maxSolCost) => {
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    AnchorProvider.defaultOptions()
  );

  const pumpProgram = new Program(idl, new PublicKey(pumpAddr), provider)

  const associatedTokenAddress = await splToken.getAssociatedTokenAddress(
    new web3.PublicKey(mint),
    wallet.publicKey
  );

  const tokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey, true);
  const { bondingCurve, associatedBondingCurve, creatorVault } = this.getBondingCurveAddress(mint, creator)

  const associatedAccountInstruction = splToken.createAssociatedTokenAccountInstruction(
    wallet.publicKey, // Payer of the transaction
    associatedTokenAddress, // Associated token account address
    wallet.publicKey, // Owner of the token account
    new web3.PublicKey(mint) // Mint of the token to create the account for
  );

  const instruction = await pumpProgram.methods
    .buy(new BN(amount), new BN(maxSolCost))
    .accounts({
      global: new PublicKey(pumpGlobal),
      mint,
      bondingCurve,
      associatedBondingCurve,
      user: wallet.publicKey,
      associatedUser: tokenAccount,
      feeRecipient: new PublicKey(feeRecipient),
      program: pumpProgram.programId,
      systemProgram: new PublicKey(systemProgram),
      eventAuthority: new PublicKey(eventAuthority),
      tokenProgram: TOKEN_PROGRAM_ID,
      creatorVault: creatorVault
    })
    .instruction();
  // .preInstructions([createTokenAccountInstruction])
  // .signers([wallet])
  // .rpc();
  const latestBlock = await getLatestBlock()
  // console.log("instruction: ", instruction)

  const transaction = new web3.Transaction({ recentBlockhash: latestBlock.blockHash });
  const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000000 });
  transaction.add(associatedAccountInstruction);
  transaction.add(instruction);
  transaction.add(computePriceIx);
  const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return txId
}

exports.pumpBuy = async (wallet, mint, creator, amount, maxSolCost) => {
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    AnchorProvider.defaultOptions()
  );

  const pumpProgram = new Program(idl, new PublicKey(pumpAddr), provider)

  const tokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey, true);
  const { bondingCurve, associatedBondingCurve, creatorVault } = this.getBondingCurveAddress(mint, creator)

  const instruction = await pumpProgram.methods
    .buy(new BN(amount), new BN(maxSolCost))
    .accounts({
      global: new PublicKey(pumpGlobal),
      mint,
      bondingCurve,
      associatedBondingCurve,
      user: wallet.publicKey,
      associatedUser: tokenAccount,
      feeRecipient: new PublicKey(feeRecipient),
      program: pumpProgram.programId,
      systemProgram: new PublicKey(systemProgram),
      eventAuthority: new PublicKey(eventAuthority),
      tokenProgram: TOKEN_PROGRAM_ID,
      creatorVault: creatorVault
    })
    .instruction();
  // .preInstructions([createTokenAccountInstruction])
  // .signers([wallet])
  // .rpc();
  const latestBlock = await getLatestBlock()
  // console.log("instruction: ", instruction)

  const transaction = new web3.Transaction({ recentBlockhash: latestBlock.blockHash });
  const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000000 });
  transaction.add(instruction);
  transaction.add(computePriceIx);
  const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return txId
}

exports.pumpSell = async (wallet, mint, creator, amount, minSolOutput) => {
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    AnchorProvider.defaultOptions()
  );

  const pumpProgram = new Program(idl, new PublicKey(pumpAddr), provider)

  const tokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey, true);
  const { bondingCurve, associatedBondingCurve, creatorVault } = this.getBondingCurveAddress(mint, creator)

  const instruction = await pumpProgram.methods
    .sell(new BN(amount), new BN(minSolOutput))
    .accounts({
      global: new PublicKey(pumpGlobal),
      mint,
      bondingCurve,
      associatedBondingCurve,
      user: wallet.publicKey,
      associatedUser: tokenAccount,
      feeRecipient: new PublicKey(feeRecipient),
      program: pumpProgram.programId,
      systemProgram: new PublicKey(systemProgram),
      eventAuthority: new PublicKey(eventAuthority),
      tokenProgram: TOKEN_PROGRAM_ID,
      creatorVault: creatorVault
    })
    .instruction();
  const latestBlock = await getLatestBlock()

  const transaction = new web3.Transaction({ recentBlockhash: latestBlock.blockHash });
  const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000000 });
  transaction.add(instruction);
  transaction.add(computePriceIx);
  const txId = await web3.sendAndConfirmTransaction(connection, transaction, [wallet], {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return txId
}

exports.pumpBuySell = async (wallet, mint, creator, amount, maxSolCost, minSolOutput) => {
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    AnchorProvider.defaultOptions()
  );

  const pumpProgram = new Program(idl, new PublicKey(pumpAddr), provider)

  const tokenAccount = getAssociatedTokenAddressSync(mint, wallet.publicKey, true);
  const { bondingCurve, associatedBondingCurve, creatorVault } = this.getBondingCurveAddress(mint, creator)

  const buyInstruction = await pumpProgram.methods
    .buy(new BN(amount), new BN(maxSolCost))
    .accounts({
      global: new PublicKey(pumpGlobal),
      mint,
      bondingCurve,
      associatedBondingCurve,
      user: wallet.publicKey,
      associatedUser: tokenAccount,
      feeRecipient: new PublicKey(feeRecipient),
      program: pumpProgram.programId,
      systemProgram: new PublicKey(systemProgram),
      eventAuthority: new PublicKey(eventAuthority),
      tokenProgram: TOKEN_PROGRAM_ID,
      creatorVault: creatorVault
    })
    .instruction();

  const sellInstruction = await pumpProgram.methods
    .sell(new BN(amount), new BN(minSolOutput))
    .accounts({
      global: new PublicKey(pumpGlobal),
      mint,
      bondingCurve,
      associatedBondingCurve,
      user: wallet.publicKey,
      associatedUser: tokenAccount,
      feeRecipient: new PublicKey(feeRecipient),
      program: pumpProgram.programId,
      systemProgram: new PublicKey(systemProgram),
      eventAuthority: new PublicKey(eventAuthority),
      tokenProgram: TOKEN_PROGRAM_ID,
      creatorVault: creatorVault
    })
    .instruction();
  const latestBlock = await getLatestBlock()

  const buyTransaction = new web3.Transaction({ recentBlockhash: latestBlock.blockHash });
  const buyComputePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000000 });
  buyTransaction.add(buyInstruction);
  buyTransaction.add(buyComputePriceIx);

  const sellTransaction = new web3.Transaction({ recentBlockhash: latestBlock.blockHash });
  const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000000 });
  sellTransaction.add(sellInstruction);
  sellTransaction.add(computePriceIx);
  const buyTx = web3.sendAndConfirmTransaction(connection, buyTransaction, [wallet], {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  const sellTx = web3.sendAndConfirmTransaction(connection, sellTransaction, [wallet], {
    commitment: "confirmed",
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  const txs = Promise.all([buyTx, sellTx])
  const txIds = await txs.then()
  return txIds
}