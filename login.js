import { auth, refreshSession } from './firebase.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("errorMessage");
    const loadingOverlay = document.getElementById("loadingOverlay");
    const currentTimeElement = document.getElementById("currentTime");

    // Check if elements exist before accessing them
    if (currentTimeElement) {
        // Update current time
        setInterval(() => {
            const now = new Date();
            currentTimeElement.textContent = now.toISOString().replace('T', ' ').substring(0, 19);
        }, 1000);
    }

    // Login attempt management
    let loginAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
    let lockoutUntil = localStorage.getItem('lockoutUntil');
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

    function updateLockoutUI() {
        if (lockoutUntil && new Date(lockoutUntil) > new Date()) {
            const remainingTime = Math.ceil((new Date(lockoutUntil) - new Date()) / 1000);
            errorMessage.textContent = `Account locked. Try again in ${remainingTime} seconds.`;
            loginForm.querySelector('button[type="submit"]').disabled = true;
            return true;
        }
        return false;
    }

    // Check remembered email
    const rememberedEmail = localStorage.getItem('rememberEmail');
    if (rememberedEmail) {
        const emailInput = document.getElementById("email");
        if (emailInput) emailInput.value = rememberedEmail;
        
        const rememberCheckbox = document.getElementById("rememberMe");
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }

    // Password visibility toggle
    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            if (!passwordInput) return;
            
            const icon = this.querySelector('i');
            if (!icon) return;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
                this.setAttribute('aria-label', 'Hide password');
            } else {
                passwordInput.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
                this.setAttribute('aria-label', 'Show password');
            }
        });
    }

    // Form submission
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (updateLockoutUI()) return;

            const emailInput = document.getElementById("email");
            const passwordInput = document.getElementById("password");
            const rememberMeCheckbox = document.getElementById("rememberMe");
            
            if (!emailInput || !passwordInput || !rememberMeCheckbox) {
                console.error("Form elements not found");
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const rememberMe = rememberMeCheckbox.checked;
            const submitButton = loginForm.querySelector('button[type="submit"]');

            // Input validation
            if (!email || !password) {
                errorMessage.textContent = "Please fill in all fields";
                return;
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                errorMessage.textContent = "Please enter a valid email address";
                return;
            }

            // Show loading state
            if (submitButton) submitButton.disabled = true;
            if (loadingOverlay) loadingOverlay.style.display = "flex";
            errorMessage.textContent = "";

            try {
                await signInWithEmailAndPassword(auth, email, password);
                
                // Reset login attempts on success
                loginAttempts = 0;
                localStorage.removeItem('loginAttempts');
                localStorage.removeItem('lockoutUntil');

                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('rememberEmail', email);
                } else {
                    localStorage.removeItem('rememberEmail');
                }

                // Refresh session and redirect
                refreshSession();
                window.location.href = "manager.html";
            } catch (error) {
                loginAttempts++;
                localStorage.setItem('loginAttempts', loginAttempts);

                if (loginAttempts >= MAX_ATTEMPTS) {
                    const lockoutTime = new Date(Date.now() + LOCKOUT_DURATION);
                    localStorage.setItem('lockoutUntil', lockoutTime.toISOString());
                    updateLockoutUI();
                } else {
                    let message = "Login failed. ";
                    switch (error.code) {
                        case 'auth/wrong-password':
                            message += "Incorrect password.";
                            break;
                        case 'auth/user-not-found':
                            message += "No account found with this email.";
                            break;
                        case 'auth/too-many-requests':
                            message += "Too many attempts. Please try again later.";
                            break;
                        default:
                            message += "Please check your credentials and try again.";
                    }
                    errorMessage.textContent = message;
                }
            } finally {
                if (submitButton) submitButton.disabled = false;
                if (loadingOverlay) loadingOverlay.style.display = "none";
            }
        });
    }

    // Check lockout status on page load
    updateLockoutUI();
});