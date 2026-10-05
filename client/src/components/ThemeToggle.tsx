import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "ahs-chat-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  const [lightModeWarningOpen, setLightModeWarningOpen] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: Theme =
      storedTheme === "dark" || storedTheme === "light"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  const switchTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  };

  const toggleTheme = () => {
    if (theme === "dark") {
      setLightModeWarningOpen(true);
      return;
    }
    switchTheme("dark");
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          "glass-control inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-all hover:text-foreground",
          className,
        )}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <AlertDialog open={lightModeWarningOpen} onOpenChange={setLightModeWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>warning flashbang ahead</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to light mode may be bright.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction asChild>
              <Button
                onClick={() => {
                  switchTheme("light");
                  setLightModeWarningOpen(false);
                }}
              >
                okay
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}