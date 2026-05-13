function openItRegister() {
    window.open("indexRegister.html", "_self");
}

// todo sa verifice cu baza de date daca emailul si parola sunt corecte, daca da, sa deschida dashboard-ul

import * as DB from "./db_manager.js";

const loginBtn = document.getElementById("loginBtn");

loginBtn.addEventListener("click", handleLogin);

async function handleLogin() {
    const email = document.getElementById("email").value;
    const parola = document.getElementById("password").value;

    if (email === "" || parola === "") {
        alert("Please enter both email and password");
        return;
    }

    // Call the login function from db_manager
    const success = await DB.login(email, parola);

    if (success) {
        alert("Login successful!");
        // Redirect the user to the main dashboard or index
        window.location.href = "indexDashboard.html"; 
    } else {
        alert("Invalid email or password. Please try again.");
    }
}