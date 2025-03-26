const mongoose = require("mongoose");
const { mongoUrl } = require("./constants");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(mongoUrl);
        console.log(
            `Connected to MongoDB Database ${conn.connection.host}`
        );
    } catch (error) {
        console.log(`Error in MongoDB ${error}`);
    }
};

module.exports = connectDB;
