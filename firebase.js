import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCxbhvZwPoC-9ORjS7V1pv2AGumAXNBREs",
    authDomain: "fastlane-garage.firebaseapp.com",
    projectId: "fastlane-garage",
    storageBucket: "fastlane-garage.appspot.com",
    messagingSenderId: "407672210110",
    appId: "1:407672210110:web:ed86fb9f861d30ddb454ef",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SESSION_DURATION = 3600000;
let sessionTimeout;

const refreshSession = () => {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        });
    }, SESSION_DURATION);
};

document.addEventListener('mousemove', refreshSession);
document.addEventListener('keypress', refreshSession);

export { db, auth, refreshSession };