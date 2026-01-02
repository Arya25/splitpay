import { getApp, getApps, initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyD67wOQ--qg21GOqaNIFYLU1DufDCgpjZ8",
  authDomain: "split-pay-2121c.firebaseapp.com",
  projectId: "split-pay-2121c",
  storageBucket: "split-pay-2121c.firebasestorage.app",
  messagingSenderId: "267109909674",
  appId: "1:267109909674:web:ed2c3f238f41422749fcd3",
}

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)
