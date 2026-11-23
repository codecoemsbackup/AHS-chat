import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadLocalBackground } from "./lib/localBackground";

const storedTheme = window.localStorage.getItem("ahs-chat-theme");
const initialTheme =
  storedTheme === "dark" || storedTheme === "light"
    ? storedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
document.documentElement.classList.toggle("dark", initialTheme === "dark");
document.documentElement.style.colorScheme = initialTheme;
void loadLocalBackground().catch((error: unknown) => {
  console.error("Couldn't load the locally saved website background", error);
});

createRoot(document.getElementById("root")!).render(<App />);
