import { getAuth } from "firebase/auth"
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where
} from "firebase/firestore"
import { db } from "./firebase"

const auth = getAuth()

const normalizeCategoryKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, "-")

export const getCategories = async () => {
  const user = auth.currentUser
  if (!user) throw new Error("User not authenticated.")

  const categoriesCollection = collection(db, "categories")
  const q = query(categoriesCollection, where("userId", "==", user.uid))
  const snapshot = await getDocs(q)

  const names = snapshot.docs
    .map((d) => String(d.data().name || "").trim())
    .filter(Boolean)

  // unique + sorted
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}

export const addCategory = async (name: string) => {
  const user = auth.currentUser
  if (!user) throw new Error("User not authenticated.")

  const cleanName = name.trim()
  if (!cleanName) throw new Error("Category name is required")

  const categoryId = `${user.uid}_${normalizeCategoryKey(cleanName)}`
  const ref = doc(db, "categories", categoryId)

  await setDoc(
    ref,
    {
      userId: user.uid,
      name: cleanName,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  )
}
