const express = require("express"); // Pentru crearea router-ului și gestionarea rutelor
const bcrypt = require("bcrypt"); // Pentru hashing-ul parolelor
const jwt = require("jsonwebtoken"); // Pentru generarea și verificarea token-urilor JWT

const pool = require("../db/server"); // Importăm conexiunea la baza de date
const keys = require("../config/test"); //importam secretul (key) pentru JWT

const router = express.Router(); // Creăm un router pentru gestionarea rutelor de autentificare

//
// *todo - Implementarea rutelor de autentificare (login) din baza de date



const login=require("../login/login");

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
});
// end todo

module.exports = router;