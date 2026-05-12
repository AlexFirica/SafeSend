import * as DB from "db_manager.js";

document.getElementById('submit').addEventListener('click', submit);

var email = document.getElementById("Email")
var parola = document.getElementById("Parola")

async function submit() {
	if (email.value == "" || parola.value == "")
		return;

	location.href = "index.html"
}
