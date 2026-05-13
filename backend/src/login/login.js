const registerBtn = document.getElementById("registerBtn");

// Define what happens when clicked
registerBtn.addEventListener("click", () => {
    console.log("Redirecting to register...");
    window.location.href = "indexRegister.html"; // Or whatever your file is named
});
// todo sa verifice cu baza de date daca emailul si parola sunt corecte, daca da, sa deschida dashboard-ul

import * as DB from "/backend/db_manager.js";

const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

loginBtn.addEventListener("click", async (e) => {
    // Prevent the page from refreshing if it's inside a <form>
    e.preventDefault();

    const email = emailInput.value;
    const password = passwordInput.value;

    // 3. Simple Validation
    if (!email || !password) {
        alert("Please enter both email and password");
        return;
    }

    // 4. Call the function from your db_manager.js
    const isSuccess = await DB.login(email, password);

    if (isSuccess) {
        alert("Login successful!");
        // Redirect to your main app page
        window.location.href = "indexDashboard.html"; 
    } else {
        alert("Login failed. Check your credentials.");
    }
});