import * as DB from "./backend/db_manager.js";

const submitBtn = document.getElementById("submit");

submitBtn.addEventListener("click", submit);

async function submit() {
    const email = document.getElementById("email").value;
    const parola = document.getElementById("password").value;

    if (email === "" || parola === "") {
        alert("Fill all fields");
        return;
    }

    // MODIFY: Store the result of the function call
    const result = await DB.generateProfile(email, parola);

    // MODIFY: Add logic to check if it actually worked
    if (result && result.success) {
        alert("Account created");
        location.href = "index.html"; 
    } else {
        alert("Failed to create account: " + (result?.error || "Unknown error"));
    }
}