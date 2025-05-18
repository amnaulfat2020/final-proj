import { initializeApp } from "firebase/app";
import { getStorage } from 'firebase/storage';
import {
  getAuth
} from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyADJOychWZmmMuLz4HVgC8-1R3C-NurqVk",
  authDomain: "vu-project-7e956.firebaseapp.com",
  projectId: "vu-project-7e956",
  storageBucket: "vu-project-7e956.firebasestorage.app",
  messagingSenderId: "1005236782129",
  appId: "1:1005236782129:web:5ab73299e7c67a9a93c110",
  // measurementId: "G-VRDJBMFGM8"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);
export { app, auth, db };

export const getUserIdByEmail = async (email) => {
  try {
    const userRef = doc(db, 'users', email);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.uniqueId;
    }
    return null; 
  } catch (error) {
    console.error('Error fetching user ID:', error);
    return null;
  }

};
