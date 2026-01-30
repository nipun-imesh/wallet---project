import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential
} from "firebase/auth"
import { auth, db } from "./firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import AsyncStorage from "@react-native-async-storage/async-storage"

export const login = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password)
}

export const registerUser = async (
  fullname: string,
  email: string,
  password: string,
  photoBase64?: string
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
    photoBase64: photoBase64 || "",
    createAt: new Date()
  })
  return userCredential.user
}

export const logoutUser = async () => {
  await signOut(auth)
  AsyncStorage.clear()
  return
}

export type UserProfileData = {
  name: string
  email: string
  photoBase64?: string
}

export const getUserProfile = async (uid: string): Promise<UserProfileData | null> => {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return null
  const data = snap.data() as any
  return {
    name: String(data.name || ""),
    email: String(data.email || ""),
    photoBase64: String(data.photoBase64 || "") || undefined
  }
}

export const updateUserProfile = async (uid: string, input: { name?: string; photoBase64?: string }) => {
  const updates: Record<string, any> = {}
  if (typeof input.name === "string") updates.name = input.name
  if (typeof input.photoBase64 === "string") updates.photoBase64 = input.photoBase64

  await setDoc(doc(db, "users", uid), updates, { merge: true })

  // Keep Firebase Auth displayName in sync (photoURL can't use base64)
  const current = auth.currentUser
  if (current && current.uid === uid && typeof input.name === "string") {
    await updateProfile(current, { displayName: input.name })
  }
}

export const loginWithGoogleIdToken = async (idToken: string) => {
  if (!idToken) throw new Error("Missing Google idToken")
  const credential = GoogleAuthProvider.credential(idToken)
  return await signInWithCredential(auth, credential)
}
