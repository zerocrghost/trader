const express = require("express");
require("dotenv").config();
const userRoutes = require("./routes/userRoutes.js");
const { initSdk } = require("./bot/config.js");
const { fetchInterval } = require("./bot/fetch.js");

initSdk(); // to save init time, it takes about 4s at first.

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.use("/api", userRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
