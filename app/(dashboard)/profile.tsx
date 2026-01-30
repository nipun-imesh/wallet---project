import { useAuth } from "@/hooks/useAuth";
import { useLoader } from "@/hooks/useLoader";
import {
  changeUserPassword,
  getUserProfile,
  logoutUser,
  updateUserProfile,
} from "@/services/authService";
import {
  confirmBiometric,
  ensureBiometricAvailable,
  getBiometricEnabled,
  setBiometricEnabled,
  suppressNextBiometricPrompt,
  suppressNextBiometricPromptForUser,
} from "@/services/biometricService";
import {
  addFinanceCard,
  getFinanceSummary,
  listFinanceCards,
  setDefaultFinanceCard,
} from "@/services/financeService";
import type { FinanceCard, FinanceSummary } from "@/types/finance";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Profile = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showLoader, hideLoader, isLoading } = useLoader();

  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [cards, setCards] = useState<FinanceCard[]>([]);

  const [cardLabel, setCardLabel] = useState("Main Card");
  const [cardBrand, setCardBrand] = useState<FinanceCard["brand"]>("VISA");
  const [cardLast4, setCardLast4] = useState("");
  const [cardExp, setCardExp] = useState("05/25");

  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(false);

  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [initialProfileName, setInitialProfileName] = useState("");
  const [initialProfilePhoto, setInitialProfilePhoto] = useState<string>("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "User";

  const formatMoney = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, []);

  const balanceText = useMemo(() => {
    return formatMoney(summary?.balance ?? 0);
  }, [formatMoney, summary?.balance]);

  const refresh = useCallback(async () => {
    if (!user) return;
    showLoader();
    try {
      const [s, c] = await Promise.all([
        getFinanceSummary(),
        listFinanceCards(),
      ]);
      setSummary(s);
      setCards(c);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load profile data");
    } finally {
      hideLoader();
    }
  }, [hideLoader, showLoader, user]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      try {
        const p = await getUserProfile(user.uid);
        if (cancelled) return;
        const nextName = (p?.name || user.displayName || "").trim();
        const nextPhoto = String(p?.photoBase64 || "");
        setProfileName(nextName);
        setProfilePhoto(nextPhoto);
        setInitialProfileName(nextName);
        setInitialProfilePhoto(nextPhoto);
      } catch {
        if (cancelled) return;
        const nextName = String(user?.displayName || "").trim();
        setProfileName(nextName);
        setProfilePhoto("");
        setInitialProfileName(nextName);
        setInitialProfilePhoto("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.displayName, user?.uid]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) return;
      try {
        const enabled = await getBiometricEnabled(user.uid);
        if (!cancelled) setBiometricEnabledState(enabled);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleToggleBiometric = useCallback(
    async (next: boolean) => {
      if (!user?.uid) {
        Alert.alert("Security", "Please log in again.");
        return;
      }

      if (isLoading) return;

      if (next) {
        const available = await ensureBiometricAvailable();
        if (!available.ok) {
          Alert.alert("Fingerprint", available.reason || "Unavailable");
          return;
        }

        const ok = await confirmBiometric("Confirm fingerprint to enable");
        if (!ok) {
          Alert.alert("Fingerprint", "Confirmation cancelled");
          return;
        }
      }

      setBiometricEnabledState(next);
      try {
        await setBiometricEnabled(user.uid, next);
      } catch (e: any) {
        setBiometricEnabledState(!next);
        Alert.alert("Security", e?.message || "Failed to save setting");
      }
    },
    [isLoading, user?.uid],
  );

  const parseExp = (exp: string) => {
    const trimmed = String(exp).trim();
    const match = trimmed.match(/^(\d{1,2})\s*\/\s*(\d{2,4})$/);
    if (!match) return null;
    const month = Number(match[1]);
    let year = Number(match[2]);
    if (year < 100) year = 2000 + year;
    return { month, year };
  };

  const handleAddCard = useCallback(async () => {
    if (isLoading) return;
    const exp = parseExp(cardExp);
    if (!exp) {
      Alert.alert("Card", "Expiry must be like 05/25");
      return;
    }

    showLoader();
    try {
      await addFinanceCard({
        label: cardLabel,
        brand: cardBrand,
        last4: cardLast4,
        expMonth: exp.month,
        expYear: exp.year,
        isDefault: cards.length === 0,
      });
      setCardLast4("");
      await refresh();
      Alert.alert("Card", "Card added");
    } catch (e: any) {
      Alert.alert("Card", e?.message || "Failed to add card");
    } finally {
      hideLoader();
    }
  }, [
    cardBrand,
    cardExp,
    cardLabel,
    cardLast4,
    cards.length,
    hideLoader,
    isLoading,
    refresh,
    showLoader,
  ]);

  const handleSetDefault = useCallback(
    async (cardId: string) => {
      if (isLoading) return;
      showLoader();
      try {
        await setDefaultFinanceCard(cardId);
        await refresh();
      } catch (e: any) {
        Alert.alert("Card", e?.message || "Failed to set default");
      } finally {
        hideLoader();
      }
    },
    [hideLoader, isLoading, refresh, showLoader],
  );

  const handleLogout = useCallback(() => {
    if (isLoading) return;
    Alert.alert("Log out", "Do you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          showLoader();
          try {
            await logoutUser();
            router.replace("/(auth)/login");
          } catch (e: any) {
            Alert.alert("Log out", e?.message || "Failed to log out");
          } finally {
            hideLoader();
          }
        },
      },
    ]);
  }, [hideLoader, isLoading, showLoader]);

  const setFromAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset | undefined) => {
      const b64 = asset?.base64;
      if (!b64) return false;
      const mime = (asset as any)?.mimeType || "image/jpeg";
      setProfilePhoto(`data:${mime};base64,${b64}`);
      return true;
    },
    [],
  );

  const pickProfilePhoto = useCallback(async () => {
    if (isLoading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo", "Media library permission is required");
      return;
    }

    suppressNextBiometricPrompt();
    if (user?.uid) void suppressNextBiometricPromptForUser(user.uid);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (result.canceled) return;
    const ok = setFromAsset(result.assets?.[0]);
    if (!ok) {
      Alert.alert("Photo", "Failed to read photo");
      return;
    }
  }, [isLoading, setFromAsset]);

  const takeProfilePhoto = useCallback(async () => {
    if (isLoading) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo", "Camera permission is required");
      return;
    }

    suppressNextBiometricPrompt();
    if (user?.uid) void suppressNextBiometricPromptForUser(user.uid);

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
      cameraType: ImagePicker.CameraType.front,
    });

    if (result.canceled) return;
    const ok = setFromAsset(result.assets?.[0]);
    if (!ok) {
      Alert.alert("Photo", "Failed to read photo");
    }
  }, [isLoading, setFromAsset]);

  const handlePhotoPress = useCallback(() => {
    if (isLoading) return;
    if (!isEditingProfile) return;
    Alert.alert("Photo", "Select a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Gallery", onPress: pickProfilePhoto },
      { text: "Camera", onPress: takeProfilePhoto },
    ]);
  }, [isEditingProfile, isLoading, pickProfilePhoto, takeProfilePhoto]);

  const handleSaveProfile = useCallback(async () => {
    if (!user?.uid) {
      Alert.alert("Profile", "Please log in again.");
      return;
    }
    if (isLoading) return;
    if (!isEditingProfile) return;

    const nextName = profileName.trim();
    if (!nextName) {
      Alert.alert("Profile", "Name is required");
      return;
    }

    showLoader();
    try {
      await updateUserProfile(user.uid, {
        name: nextName,
        photoBase64: profilePhoto || "",
      });
      setInitialProfileName(nextName);
      setInitialProfilePhoto(profilePhoto || "");
      setIsEditingProfile(false);
      Alert.alert("Profile", "Updated");
    } catch (e: any) {
      Alert.alert("Profile", e?.message || "Failed to save");
    } finally {
      hideLoader();
    }
  }, [
    hideLoader,
    isEditingProfile,
    isLoading,
    profileName,
    profilePhoto,
    showLoader,
    user?.uid,
  ]);

  const handleStartEdit = useCallback(() => {
    if (isLoading) return;
    setIsEditingProfile(true);
  }, [isLoading]);

  const handleCancelEdit = useCallback(() => {
    if (isLoading) return;
    setProfileName(initialProfileName);
    setProfilePhoto(initialProfilePhoto);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsEditingProfile(false);
  }, [
    initialProfileName,
    initialProfilePhoto,
    isLoading,
    setConfirmPassword,
    setCurrentPassword,
    setNewPassword,
  ]);

  const handleChangePassword = useCallback(async () => {
    if (isLoading) return;
    if (!user?.uid) {
      Alert.alert("Password", "Please log in again.");
      return;
    }
    if (!isEditingProfile) return;

    const cur = currentPassword;
    const next = newPassword;
    const confirm = confirmPassword;

    if (!cur || !next || !confirm) {
      Alert.alert("Password", "Please fill all password fields");
      return;
    }
    if (next.length < 6) {
      Alert.alert("Password", "New password must be at least 6 characters");
      return;
    }
    if (next !== confirm) {
      Alert.alert("Password", "New passwords do not match");
      return;
    }

    showLoader();
    try {
      await changeUserPassword(cur, next);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      Alert.alert("Password", "Password updated");
    } catch (e: any) {
      Alert.alert("Password", e?.message || "Failed to update password");
    } finally {
      hideLoader();
    }
  }, [
    confirmPassword,
    currentPassword,
    hideLoader,
    isLoading,
    newPassword,
    showLoader,
    user?.uid,
  ]);

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="bg-white rounded-3xl border border-gray-200 p-5">
          <Text className="text-xs text-gray-500">Logged in as</Text>
          <Text className="text-lg font-semibold text-gray-900 mt-1">
            {displayName}
          </Text>
          <Text className="text-xs text-gray-500 mt-2">
            {user?.email || ""}
          </Text>
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 p-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">Profile</Text>

            {isEditingProfile ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleCancelEdit}
                className="px-4 py-2 rounded-2xl border border-gray-200"
              >
                <Text className="text-gray-900 font-semibold">Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleStartEdit}
                className="px-4 py-2 rounded-2xl bg-gray-900"
              >
                <Text className="text-white font-semibold">Edit profile</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row items-center mt-4">
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handlePhotoPress}
              disabled={!isEditingProfile}
              activeOpacity={0.8}
              className="w-20 h-20 rounded-3xl bg-gray-100 border border-gray-200 overflow-hidden items-center justify-center relative"
            >
              {profilePhoto ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={{ width: 80, height: 80 }}
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-gray-400 text-2xl font-semibold">
                  {String(profileName || displayName || "U")
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              )}

              <View className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-700 items-center justify-center border-2 border-white">
                <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View className="flex-1 ml-4">
              <Text className="text-gray-900 font-semibold">Profile photo</Text>
              <Text className="text-gray-500 text-xs mt-1">
                {isEditingProfile
                  ? profilePhoto
                    ? "Tap to change your photo"
                    : "Tap to add a photo"
                  : "Tap Edit profile to change"}
              </Text>
            </View>
          </View>

          <Text className="text-xs text-gray-500 mt-4">Current balance</Text>
          <Text className="text-3xl font-semibold text-gray-900 mt-1">
            {balanceText}
          </Text>
          <Text className="text-xs text-gray-500 mt-2">
            Income: {formatMoney(summary?.totalIncome ?? 0)} • Expense:{" "}
            {formatMoney(summary?.totalExpense ?? 0)}
          </Text>

          {isEditingProfile ? (
            <>
              <Text className="text-xs text-gray-500 mt-5">Name</Text>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                className="mt-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-gray-900"
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleSaveProfile}
                className="mt-4 bg-gray-900 rounded-2xl py-3 items-center"
              >
                <Text className="text-white font-semibold">Save changes</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 p-5">
          <Text className="text-lg font-semibold text-gray-900">Security</Text>
          <View className="flex-row items-center justify-between mt-4">
            <View className="flex-1 pr-4">
              <Text className="text-gray-900 font-medium">Use fingerprint</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Ask for fingerprint when opening the app
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
            />
          </View>

          {isEditingProfile ? (
            <View className="mt-5 pt-5 border-t border-gray-200">
              <Text className="text-gray-900 font-medium">Change password</Text>

              <Text className="text-xs text-gray-500 mt-3">
                Current password
              </Text>
              <View className="mt-2 flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
                <MaterialIcons name="lock" size={20} color="#6B7280" />
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 py-3 px-3 text-gray-900"
                  textContentType="password"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword((v) => !v)}
                  className="py-2 pl-2"
                >
                  <MaterialIcons
                    name={showCurrentPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-gray-500 mt-4">New password</Text>
              <View className="mt-2 flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
                <MaterialIcons name="lock" size={20} color="#6B7280" />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 py-3 px-3 text-gray-900"
                  textContentType="newPassword"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((v) => !v)}
                  className="py-2 pl-2"
                >
                  <MaterialIcons
                    name={showNewPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-gray-500 mt-4">
                Confirm new password
              </Text>
              <View className="mt-2 flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
                <MaterialIcons name="lock" size={20} color="#6B7280" />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 py-3 px-3 text-gray-900"
                  textContentType="password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  className="py-2 pl-2"
                >
                  <MaterialIcons
                    name={showConfirmPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleChangePassword}
                className="mt-4 bg-gray-900 rounded-2xl py-3 items-center"
              >
                <Text className="text-white font-semibold">
                  Update password
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View className="mt-4 bg-white rounded-3xl border border-gray-200 p-5">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleLogout}
            className="bg-red-600 rounded-2xl py-3 items-center"
          >
            <Text className="text-white font-semibold">Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
