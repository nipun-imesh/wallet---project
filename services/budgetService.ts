import { getAuth } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "./firebase"

const auth = getAuth()

const getBudgetDocId = (userId: string, monthKey: string) =>
  `${userId}_${monthKey}`

export const getMonthlySalary = async (monthKey: string) => {
  const user = auth.currentUser
  if (!user) throw new Error("User not authenticated.")

  const ref = doc(db, "monthlyBudgets", getBudgetDocId(user.uid, monthKey))
  const snap = await getDoc(ref)
  if (!snap.exists()) return null

  const data = snap.data()
  const salary = Number(data.salary)
  return Number.isFinite(salary) ? salary : null
}

export const setMonthlySalary = async (monthKey: string, salary: number) => {
  const user = auth.currentUser
  if (!user) throw new Error("User not authenticated.")

  const ref = doc(db, "monthlyBudgets", getBudgetDocId(user.uid, monthKey))
  await setDoc(
    ref,
    {
      userId: user.uid,
      monthKey,
      salary,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  )
}
