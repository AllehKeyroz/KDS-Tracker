// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBf7HkcS4ES36ujTXS7H5AHQF4h8zruG30",
  authDomain: "kds-tracker-vkoa3.firebaseapp.com",
  projectId: "kds-tracker-vkoa3",
  storageBucket: "kds-tracker-vkoa3.appspot.com",
  messagingSenderId: "31180953738",
  appId: "1:31180953738:web:5908711ebebb7dd48a7573"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
