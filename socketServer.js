const express = require("express");
require("dotenv").config();
const socketRoutes = require("./routes/socketRoutes.js");
const { initSdk } = require("./raydium/raydiumInit.js");
// const { fetchInterval } = require("./bot/fetch.js");
const connectDB = require("./config/db.js");

initSdk(); // to save init time, it takes about 4s at first.

connectDB()

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;

app.use("/socket", socketRoutes);

app.listen(PORT, () => {
    console.log(`Socket Server is running on port ${PORT}`);
});
