import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("errorMessage");

    if (!loginForm) {
        console.error("Form with ID 'loginForm' not found.");
        return;
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
            const auth = getAuth();
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "manager.html"; // Redirect on success
        } catch (error) {
            errorMessage.textContent = "Login failed: " + error.message;
        }
    });
});
