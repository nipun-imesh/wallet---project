import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export const login = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const registerUser = async (
  fullname: string,
  email: string,
  password: string,
  photoBase64?: string,
) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  await updateProfile(userCredential.user, { displayName: fullname });
  await setDoc(doc(db, "users", userCredential.user.uid), {
    name: fullname,
    role: "",
    email,
    photoBase64: photoBase64 || "",
    createAt: new Date(),
  });
  return userCredential.user;
};

export const logoutUser = async () => {
  await signOut(auth);
  AsyncStorage.clear();
  return;
};

export type UserProfileData = {
  name: string;
  email: string;
  photoBase64?: string;
};

export const getUserProfile = async (
  uid: string,
): Promise<UserProfileData | null> => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    name: String(data.name || ""),
    email: String(data.email || ""),
    photoBase64: String(data.photoBase64 || "") || undefined,
  };
};

export const updateUserProfile = async (
  uid: string,
  input: { name?: string; photoBase64?: string },
) => {
  const updates: Record<string, any> = {};
  if (typeof input.name === "string") updates.name = input.name;
  if (typeof input.photoBase64 === "string")
    updates.photoBase64 = input.photoBase64;

  await setDoc(doc(db, "users", uid), updates, { merge: true });

  // Keep Firebase Auth displayName in sync (photoURL can't use base64)
  const current = auth.currentUser;
  if (current && current.uid === uid && typeof input.name === "string") {
    await updateProfile(current, { displayName: input.name });
  }
};

export const loginWithGoogleIdToken = async (idToken: string) => {
  if (!idToken) throw new Error("Missing Google idToken");
  const credential = GoogleAuthProvider.credential(idToken);
  return await signInWithCredential(auth, credential);
};

export const changeUserPassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in again.");

  const { email, providerData } = user;
  if (!email) throw new Error("This account has no email.");

  const providerIds = (providerData || []).map((p) => p.providerId);
  const canUsePassword =
    providerIds.includes("password") || providerIds.length === 0;
  if (!canUsePassword) {
    throw new Error("Password change isn't available for this login method.");
  }

  const cur = String(currentPassword || "");
  const next = String(newPassword || "");

  if (!cur || !next) throw new Error("Please fill all password fields.");
  if (next.length < 6)
    throw new Error("New password must be at least 6 characters.");
  if (cur === next) throw new Error("New password must be different.");

  try {
    const cred = EmailAuthProvider.credential(email, cur);
    await reauthenticateWithCredential(user, cred);
  } catch (e: any) {
    const code = String(e?.code || "");
    if (code === "auth/wrong-password") {
      throw new Error("Current password is incorrect.");
    }
    if (code === "auth/too-many-requests") {
      throw new Error("Too many attempts. Try again later.");
    }
    if (code === "auth/user-mismatch" || code === "auth/user-not-found") {
      throw new Error("Please log in again.");
    }
    if (code === "auth/requires-recent-login") {
      throw new Error("Please log in again and retry.");
    }
    throw new Error(e?.message || "Failed to confirm current password.");
  }

  try {
    await updatePassword(user, next);
  } catch (e: any) {
    const code = String(e?.code || "");
    if (code === "auth/weak-password") {
      throw new Error("New password is too weak.");
    }
    if (code === "auth/requires-recent-login") {
      throw new Error("Please log in again and retry.");
    }
    throw new Error(e?.message || "Failed to update password.");
  }
};
