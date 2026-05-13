import * as DB from "./backend/db_manager.js";

const submitBtn = document.getElementById("submit");

submitBtn.addEventListener("click", submit);

async function submit(e) {
    if (e) e.preventDefault();

    const email = document.getElementById("email").value;
    const parola = document.getElementById("password").value;

    if (!email || !parola) {
        alert("Please fill in all fields.");
        return;
    }

    // Show loading state
    const btn = document.getElementById("submit");
    btn.disabled = true;
    btn.innerText = "Securing Account...";

    const result = await DB.generateProfile(email, parola);

    if (result.success) {
        alert("Account Created Successfully!");
        window.location.href = "index.html";
    } else {
        alert("Error: " + result.error);
        btn.disabled = false;
        btn.innerText = "Register";
    }
}