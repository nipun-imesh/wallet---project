import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential
} from "firebase/auth"
import { auth, db } from "./firebase"
import { doc, setDoc } from "firebase/firestore"
import AsyncStorage from "@react-native-async-storage/async-storage"

export const login = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password)
}

export const registerUser = async (
  fullname: string,
  email: string,
  password: string
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )
  await updateProfile(userCredential.user, { displayName: fullname })
  await setDoc(doc(db, "users", userCredential.user.uid), {
    name: fullname,
    role: "",
    email,
    createAt: new Date()
  })
  return userCredential.user
}

export const logoutUser = async () => {
  await signOut(auth)
  AsyncStorage.clear()
  return
}

export const loginWithGoogleIdToken = async (idToken: string) => {
  if (!idToken) throw new Error("Missing Google idToken")
  const credential = GoogleAuthProvider.credential(idToken)
  return await signInWithCredential(auth, credential)
}
