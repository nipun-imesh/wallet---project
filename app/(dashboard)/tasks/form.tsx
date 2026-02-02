import { useLoader } from "@/hooks/useLoader";
import { addTask, getTaskById, updateTask } from "@/services/taskService";
import { Task } from "@/types/task";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const TaskForm = () => {
  const router = useRouter();
  const { taskId } = useLocalSearchParams();
  const { showLoader, hideLoader, isLoading } = useLoader();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const categories = [
    "Food",
    "Transport",
    "Bills",
    "Shopping",
    "Entertainment",
    "Other",
  ];

  useEffect(() => {
    if (taskId) {
      showLoader();
      getTaskById(taskId as string)
        .then((task: Task) => {
          setTitle(task.title);
          setDescription(task.description || "");
          setAmount(
            typeof task.amount === "number" && task.amount > 0
              ? String(task.amount)
              : "",
          );
          setCategory(task.category || "");
        })
        .catch(() => Alert.alert("Error", "Failed to load task"))
        .finally(() => hideLoader());
    }
  }, [taskId]);

  const handleSubmit = async () => {
    if (isLoading) return;
    if (!title.trim() || !description.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    const trimmedAmount = amount.trim();
    let parsedAmount: number | undefined;
    if (trimmedAmount) {
      const n = Number(trimmedAmount);
      if (!Number.isFinite(n) || n <= 0) {
        Alert.alert("Error", "Enter a valid expense amount");
        return;
      }
      parsedAmount = n;
    }

    const trimmedCategory = category.trim();

    showLoader();
    try {
      if (taskId) {
        await updateTask(
          taskId as string,
          title,
          description,
          parsedAmount,
          trimmedCategory || undefined,
          trimmedAmount ? new Date().toISOString() : undefined,
        );
        Alert.alert("Success", "Task updated successfully");
      } else {
        await addTask(
          title,
          description,
          parsedAmount,
          trimmedCategory || undefined,
          trimmedAmount ? new Date().toISOString() : undefined,
        );
        Alert.alert("Success", "Task added successfully");
      }
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      hideLoader();
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-app-bg dark:bg-appDark-bg"
      contentContainerStyle={{ flexGrow: 1, padding: 24 }}
    >
      <TouchableOpacity
        className="flex-row items-center mb-6"
        onPress={() => router.back()}
      >
        <MaterialIcons
          name="arrow-back-ios"
          size={24}
          color={isDark ? "#E5E7EB" : "#111827"}
        />
        <Text className="text-app-text dark:text-appDark-text font-medium ml-1">
          Back
        </Text>
      </TouchableOpacity>

      <View className="p-6 rounded-2xl bg-app-surface dark:bg-appDark-surface border border-app-border dark:border-appDark-border shadow-md">
        <Text className="text-app-text dark:text-appDark-text text-lg font-semibold mb-2">
          Task Title
        </Text>
        <TextInput
          placeholder="Enter task title"
          placeholderTextColor="#999"
          value={title}
          onChangeText={setTitle}
          className="mb-5 p-4 rounded-xl bg-app-surface2 dark:bg-appDark-surface2 text-app-text dark:text-appDark-text border border-app-border dark:border-appDark-border text-base font-medium"
        />

        <Text className="text-app-text dark:text-appDark-text text-lg font-semibold mb-2">
          Description
        </Text>
        <TextInput
          placeholder="Enter description"
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          multiline
          className="mb-6 p-4 rounded-xl bg-app-surface2 dark:bg-appDark-surface2 text-app-text dark:text-appDark-text border border-app-border dark:border-appDark-border text-base font-medium h-32"
        />

        <Text className="text-app-text dark:text-appDark-text text-lg font-semibold mb-2">
          Expense Amount
        </Text>
        <TextInput
          placeholder="Enter amount (e.g. 1500)"
          placeholderTextColor="#999"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          className="mb-5 p-4 rounded-xl bg-app-surface2 dark:bg-appDark-surface2 text-app-text dark:text-appDark-text border border-app-border dark:border-appDark-border text-base font-medium"
        />

        <Text className="text-app-text dark:text-appDark-text text-lg font-semibold mb-2">
          Category
        </Text>

        <View className="flex-row flex-wrap mb-3">
          {categories.map((c) => {
            const active = category.trim().toLowerCase() === c.toLowerCase();
            return (
              <TouchableOpacity
                key={c}
                className={`mr-2 mb-2 px-4 py-2 rounded-full border ${
                  active
                    ? "bg-app-primary dark:bg-appDark-primary border-app-primary dark:border-appDark-primary"
                    : "bg-app-surface dark:bg-appDark-surface border-app-border dark:border-appDark-border"
                }`}
                onPress={() => setCategory(c)}
              >
                <Text
                  className={
                    active
                      ? "text-app-onPrimary dark:text-appDark-onPrimary"
                      : "text-app-textSecondary dark:text-appDark-textSecondary"
                  }
                >
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput
          placeholder="Type a category (optional)"
          placeholderTextColor="#999"
          value={category}
          onChangeText={setCategory}
          className="mb-6 p-4 rounded-xl bg-app-surface2 dark:bg-appDark-surface2 text-app-text dark:text-appDark-text border border-app-border dark:border-appDark-border text-base font-medium"
        />

        <Pressable
          className={`px-6 py-3 rounded-2xl ${
            taskId
              ? "bg-app-primary dark:bg-appDark-primary"
              : "bg-app-success dark:bg-appDark-success"
          }`}
          onPress={handleSubmit}
        >
          <Text className="text-app-onPrimary dark:text-appDark-onPrimary text-lg text-center">
            {isLoading ? "Please wait..." : taskId ? "Update Task" : "Add Task"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default TaskForm;