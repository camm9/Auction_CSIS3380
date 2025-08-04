
window.signIn = function () {
    const firebaseConfig = {
        apiKey: "AIzaSyAiF5HqgfQ62kPFG3B-e_phZ1Mc4gJygS4",
        authDomain: "auctioncsis3380.firebaseapp.com",
        projectId: "auctioncsis3380",
        appId: "1:268504590272:web:e2274c61fc0a6a88140a25"
    };

    if (!firebase.apps?.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const ui = new firebaseui.auth.AuthUI(firebase.auth());

    const uiConfig = {
        callbacks: {
            signInSuccessWithAuthResult: () => true,
            uiShown: () => {
                const loader = document.getElementById('loader');
                if (loader) loader.style.display = 'none';
            }
        },
        signInFlow: 'popup',
        signInSuccessUrl: '/',
        signInOptions: [firebase.auth.EmailAuthProvider.PROVIDER_ID],
        tosUrl: '#',
        privacyPolicyUrl: '#'
    };

    const container = document.getElementById('firebaseui-auth-container');
    if (container) {
        ui.start('#firebaseui-auth-container', uiConfig);
    }
};

