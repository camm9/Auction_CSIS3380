// js/firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'

const firebaseConfig = {
    apiKey: "AIzaSyAiF5HqgfQ62kPFG3B-e_phZ1Mc4gJygS4",
    authDomain: "auctioncsis3380.firebaseapp.com",
    projectId: "auctioncsis3380",
    appId: "1:268504590272:web:e2274c61fc0a6a88140a25"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.auth = auth;

window.registerUser = async function (email, password) {
    const userCredentials = createUserWithEmailAndPassword(auth, email, password);

    // sends a post to sign-in to register user in mongoDB at same time as fb registration
    await fetch("/api/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    return userCredentials;
};

window.signInUser = function (email, password) {
    return signInWithEmailAndPassword(auth, email, password);
};

window.signOutUser = function () {
    return signOut(auth);
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Signed in as:", user.email);
    } else {
        console.log("User is signed out.");
    }
});