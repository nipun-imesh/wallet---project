import { useLoader } from "@/hooks/useLoader";
import { login, loginWithGoogleIdToken } from "@/services/authService";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID =
  "1085078686882-5fh5pu25mr6ddgojlvm357n3bkooimvp.apps.googleusercontent.com";
//  1085078686882-5fh5pu25mr6ddgojlvm357n3bkooimvp.apps.googleusercontent.com

const PROXY_REDIRECT_URI = "https://auth.expo.io/@nipunimesh/wallet";

const normalizeClientId = (value: unknown) => {
  const str = String(value || "").trim();
  if (!str) return "";
  // Treat template placeholders as missing.
  if (str.includes("ANDROID_CLIENT_ID") || str.includes("IOS_CLIENT_ID"))
    return "";
  return str;
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const authErrorMessage = (err: any) => {
  const code = String(err?.code || "");
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return err?.message || "Login failed. Please try again.";
  }
};

const Login = () => {
  const router = useRouter(); // import { useRouter } from "expo-router"

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const clientId = GOOGLE_WEB_CLIENT_ID;
  // const iosClientId = "";
  // const androidClientId = "";

  // Force Expo proxy redirect in dev (Expo Go)
  const redirectUri = PROXY_REDIRECT_URI;

  console.log("Google clientId:", clientId);
  console.log("Google redirectUri:", redirectUri);

  const [googleRequest, _googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      clientId,
      // iosClientId: iosClientId || clientId,
      // androidClientId: androidClientId || clientId,
      redirectUri,
    } as any);

  const { showLoader, hideLoader, isLoading } = useLoader();

  const handleLogin = async () => {
    if (isLoading) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      Alert.alert("Error", "Please enter email and password");
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
    showLoader();
    try {
      await login(cleanEmail, password);
      router.replace("/biometric-setup");
    } catch (e: any) {
      Alert.alert("Login failed", authErrorMessage(e));
    } finally {
      hideLoader();
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    if (!clientId) {
      Alert.alert("Google Login", "Missing Google Client ID");
      return;
    }

    showLoader();
    try {
      const result = await googlePromptAsync({ useProxy: true } as any);
      if (result.type !== "success") return;

      // Expo returns tokens in different shapes depending on platform/flow.
      const idToken =
        (result.authentication as any)?.idToken ||
        (result.params as any)?.id_token ||
        "";

      if (!idToken) {
        Alert.alert(
          "Google Login",
          "Could not get Google id token. Check your OAuth client configuration.",
        );
        return;
      }

      await loginWithGoogleIdToken(idToken);
      router.replace("/biometric-setup");
    } catch (e: any) {
      Alert.alert("Google Login failed", e?.message || "Please try again");
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
          <Text className="text-3xl font-bold text-app-text mt-4">Wallet</Text>
          <Text className="text-app-textMuted mt-1">
            Login to manage your money
          </Text>
        </View>

        <View className="w-full bg-app-surface rounded-3xl overflow-hidden shadow-lg">
          <View className="bg-app-primary px-7 py-5">
            <Text className="text-white text-xl font-semibold">Sign in</Text>
            <Text className="text-white/80 mt-1">Welcome back</Text>
          </View>

          <View className="p-7">
            <View className="mt-7">
              <Text className="text-app-textSecondary font-semibold mb-2">
                Email
              </Text>
              <View className="flex-row items-center bg-app-surface2 border border-app-border rounded-2xl px-4">
                <MaterialIcons name="email" size={22} color="#6B7280" />
                <TextInput
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-4 px-3 text-app-text"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>

              <Text className="text-app-textSecondary font-semibold mb-2 mt-4">
                Password
              </Text>
              <View className="flex-row items-center bg-app-surface2 border border-app-border rounded-2xl px-4">
                <MaterialIcons name="lock" size={22} color="#6B7280" />
                <TextInput
                  placeholder="Your password"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 py-4 px-3 text-app-text"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
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
            </View>

            <Pressable
              className={`mt-7 py-4 rounded-2xl ${
                isLoading ? "bg-app-primary/40" : "bg-app-primary/80"
              }`}
              onPress={handleLogin}
            >
              <Text className="text-white text-lg text-center font-semibold">
                {isLoading ? "Please wait..." : "Login"}
              </Text>
            </Pressable>

            <View className="flex-row items-center my-5">
              <View className="flex-1 h-px bg-app-border" />
              <Text className="mx-3 text-app-textMuted">OR</Text>
              <View className="flex-1 h-px bg-app-border" />
            </View>

            <Pressable
              className={`py-4 rounded-2xl border border-app-border bg-app-surface ${
                isLoading ? "opacity-60" : "opacity-100"
              }`}
              disabled={isLoading}
              onPress={() => {
                if (!googleRequest) {
                  Alert.alert(
                    "Google Login",
                    "Google login is not ready yet. Please try again in a moment. (Also check your Google client IDs in app.json)",
                  );
                  return;
                }
                handleGoogleLogin();
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="logo-google" size={20} color="#111827" />
                <Text className="text-app-text text-lg font-semibold ml-2">
                  Continue with Google
                </Text>
              </View>
            </Pressable>

            <View className="flex-row justify-center mt-5">
              <Text className="text-app-textMuted">
                Don’t have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/register")}>
                <Text className="text-app-primary font-semibold">Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default Login;
