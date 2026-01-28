import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const keyForUser = (uid: string) => `biometricEnabled:${uid}`;
const promptedKeyForUser = (uid: string) => `biometricPrompted:${uid}`;
const justEnabledKeyForUser = (uid: string) => `biometricJustEnabled:${uid}`;

export async function getBiometricEnabled(uid: string): Promise<boolean> {
  if (!uid) return false;
  const value = await AsyncStorage.getItem(keyForUser(uid));
  return value === "true";
}

export async function setBiometricEnabled(
  uid: string,
  enabled: boolean,
): Promise<void> {
  if (!uid) return;
  await AsyncStorage.setItem(keyForUser(uid), enabled ? "true" : "false");
}

export async function getBiometricPrompted(uid: string): Promise<boolean> {
  if (!uid) return false;
  const value = await AsyncStorage.getItem(promptedKeyForUser(uid));
  return value === "true";
}

export async function setBiometricPrompted(
  uid: string,
  prompted: boolean,
): Promise<void> {
  if (!uid) return;
  await AsyncStorage.setItem(
    promptedKeyForUser(uid),
    prompted ? "true" : "false",
  );
}

// Used to prevent an immediate second prompt: when user enables biometrics during setup,
// the dashboard lock screen would otherwise prompt again right away.
export async function markBiometricJustEnabled(uid: string): Promise<void> {
  if (!uid) return;
  await AsyncStorage.setItem(justEnabledKeyForUser(uid), "true");
}

export async function consumeBiometricJustEnabled(
  uid: string,
): Promise<boolean> {
  if (!uid) return false;
  const value = await AsyncStorage.getItem(justEnabledKeyForUser(uid));
  if (value === "true") {
    await AsyncStorage.removeItem(justEnabledKeyForUser(uid));
    return true;
  }
  return false;
}

export async function ensureBiometricAvailable(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware)
    return { ok: false, reason: "This device has no biometrics." };

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled)
    return {
      ok: false,
      reason: "No fingerprint/face is enrolled on this device.",
    };

  return { ok: true };
}

export async function confirmBiometric(reason: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: "Cancel",
    fallbackLabel: "Use passcode",
    disableDeviceFallback: false,
  });

  return !!result.success;
}
