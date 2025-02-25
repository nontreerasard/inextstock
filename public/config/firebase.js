const firebaseConfig = {
    apiKey: "AIzaSyApN2OxPBW-fH4MpYqzUNxZvTAGm78k1Zw",
    authDomain: "inextstock-65678.firebaseapp.com",
    projectId: "inextstock-65678",
    storageBucket: "inextstock-65678.firebasestorage.app",
    messagingSenderId: "507532765169",
    appId: "1:507532765169:web:18e6a5ec9514cb1b6d8650",
    measurementId: "G-06RZXCRN97"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

export { db };
