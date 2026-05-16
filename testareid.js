const userId = localStorage.getItem("id");

        // 2. Console log it
        if (userId) {
            console.log("Logged in user ID:", userId);
        } else {
            console.log("No user ID found. Redirecting to login...");
            window.location.href = "login.html"; // Safety redirect
        }