require("dotenv").config();

const express = require("express");

const authRoutes = require("./src/routes/auth");

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);

const PORT = 5500;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});