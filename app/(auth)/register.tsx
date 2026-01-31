import { useLoader } from "@/hooks/useLoader";
import { registerUser } from "@/services/authService";
import { suppressNextBiometricPrompt } from "@/services/biometricService";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const authErrorMessage = (err: any) => {
  const code = String(err?.code || "");
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    default:
      return err?.message || "Registration failed. Please try again.";
  }
};

const Register = () => {
  const router = useRouter(); // import { useRouter } from "expo-router"

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [conPassword, setConPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photoDataUri, setPhotoDataUri] = useState<string>("");

  const avatarInitial = String(name || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const { showLoader, hideLoader, isLoading } = useLoader();

  const setFromAsset = (asset: ImagePicker.ImagePickerAsset | undefined) => {
    const b64 = asset?.base64;
    if (!b64) return false;
    const mime = (asset as any)?.mimeType || "image/jpeg";
    setPhotoDataUri(`data:${mime};base64,${b64}`);
    return true;
  };

  const pickPhoto = async () => {
    if (isLoading) return;

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo", "Media library permission is required");
      return;
    }

    suppressNextBiometricPrompt();

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
  };

  const takePhoto = async () => {
    if (isLoading) return;

    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photo", "Camera permission is required");
      return;
    }

    suppressNextBiometricPrompt();

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
  };

  const handlePhotoPress = () => {
    if (isLoading) return;
    Alert.alert("Photo", "Select a photo source", [
      { text: "Cancel", style: "cancel" },
      { text: "Gallery", onPress: pickPhoto },
      { text: "Camera", onPress: takePhoto },
    ]);
  };

  const handleRegister = async () => {
    if (isLoading) return;

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password || !conPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (password !== conPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    showLoader();
    try {
      await registerUser(
        cleanName,
        cleanEmail,
        password,
        photoDataUri || undefined,
      );
      Alert.alert("Success", "Account created");
      router.replace("/login");
    } catch (e: any) {
      Alert.alert("Registration failed", authErrorMessage(e));
    } finally {
      hideLoader();
    }
  };

  return (
    <View
      className="flex-1 bg-app-bg px-6 justify-center"
      style={{ position: "relative" }}
    >
      <Pressable
        style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
        onPress={Keyboard.dismiss}
      />

      <View style={{ zIndex: 1, position: "relative" }}>
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-3xl bg-app-primary items-center justify-center">
            <Image
              source={require("../../assets/images/icon.png")}
              style={{ width: 52, height: 52 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mt-4">Wallet</Text>
          <Text className="text-gray-600 mt-1">
            Create your account to continue
          </Text>
        </View>

        <View className="w-full bg-app-surface rounded-3xl overflow-hidden shadow-lg">
          <View className="bg-app-primary px-7 py-5">
            <Text className="text-white text-xl font-semibold">Sign up</Text>
            <Text className="text-white/80 mt-1">
              It takes less than a minute
            </Text>
          </View>

          <View className="p-7">
            <View className="flex-row items-center">
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handlePhotoPress}
                className="w-20 h-20 rounded-3xl bg-gray-100 border border-gray-200 overflow-hidden items-center justify-center relative"
                activeOpacity={0.8}
              >
                {photoDataUri ? (
                  <Image
                    source={{ uri: photoDataUri }}
                    style={{ width: 80, height: 80 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-gray-400 text-3xl font-semibold">
                    {avatarInitial}
                  </Text>
                )}

                <View className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-app-primary items-center justify-center border-2 border-white">
                  <MaterialIcons
                    name="photo-camera"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
              </TouchableOpacity>

              <View className="flex-1 ml-4">
                <Text className="text-gray-900 font-semibold">
                  Profile photo
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  {photoDataUri
                    ? "Tap to change your photo"
                    : "Tap to add a photo (optional)"}
                </Text>
              </View>
            </View>

            <View className="mt-7">
              <Text className="text-gray-800 font-semibold mb-2">
                Full name
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
                <MaterialIcons name="person" size={22} color="#6B7280" />
                <TextInput
                  placeholder="Your name"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-4 px-3 text-gray-900"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="name"
                />
              </View>

              <Text className="text-gray-800 font-semibold mb-2 mt-4">
                Email
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
                <MaterialIcons name="email" size={22} color="#6B7280" />
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-4 px-3 text-gray-900"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>

              <Text className="text-gray-800 font-semibold mb-2 mt-4">
                Password
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
                <MaterialIcons name="lock" size={22} color="#6B7280" />
                <TextInput
                  placeholder="At least 6 characters"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-4 px-3 text-gray-900"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  className="py-2 pl-2"
                >
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              <Text className="text-gray-800 font-semibold mb-2 mt-4">
                Confirm password
              </Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4">
                <MaterialIcons name="lock" size={22} color="#6B7280" />
                <TextInput
                  placeholder="Re-enter password"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-4 px-3 text-gray-900"
                  value={conPassword}
                  onChangeText={setConPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  className="py-2 pl-2"
                >
                  <MaterialIcons
                    name={showConfirmPassword ? "visibility" : "visibility-off"}
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Pressable
              className={`mt-7 py-4 rounded-2xl ${
                isLoading ? "bg-app-primary/40" : "bg-app-primary/80"
              }`}
              onPress={handleRegister}
            >
              <Text className="text-white text-lg text-center font-semibold">
                {isLoading ? "Please wait..." : "Register"}
              </Text>
            </Pressable>

            <View className="flex-row justify-center mt-5">
              <Text className="text-gray-600">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace("/login")}>
                <Text className="text-app-primary font-semibold">Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Register;
