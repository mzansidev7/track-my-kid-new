import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import { getStoredTheme, saveTheme } from "../store/themeStore/themeStore";

export type Theme = "light" | "dark";

export const lightTheme = {
  colors: {
    primary: "#0EA5E9",
    primaryDark: "#0284C7",
    secondary: "#F3F4F6",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    background: "#FFFFFF",
    gradientStart: "#3B82F6",
    gradientEnd: "white",
    surface: "#F9FAFB",
    surfaceHover: "#F3F4F6",
    text: {
      primary: "#1F2937",
      secondary: "#6B7280",
      tertiary: "#9CA3AF",
      inverse: "#FFFFFF",
    },
    border: "#E5E7EB",
    divider: "#F3F4F6",
  },
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
  },
};

export const darkTheme = {
  colors: {
    primary: "#0EA5E9",
    primaryDark: "#0284C7",
    secondary: "#374151",
    success: "#22C55E",
    warning: "#F59E0B",
    error: "#EF4444",
    background: "#141c29",
    gradientStart: "white",
    gradientEnd: "#3B82F6",
    surface: "#1F2937",
    surfaceHover: "#374151",
    text: {
      primary: "#F3F4F6",
      secondary: "#D1D5DB",
      tertiary: "#9CA3AF",
      inverse: "#111827",
    },
    border: "#374151",
    divider: "#1F2937",
  },
  shadows: {
    sm: {
      shadowColor: "white",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "white",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 3,
    },
    lg: {
      shadowColor: "white ",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 5,
    },
  },
};

type ThemeContextType = {
  theme: Theme;
  colors: typeof lightTheme.colors;
  shadows: typeof lightTheme.shadows;
  isDark: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({
  children,
}): React.ReactElement => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(() =>
    systemColorScheme === "dark" ? "dark" : "light",
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await getStoredTheme();
      if (stored) {
        setTheme(stored);
      } else if (systemColorScheme) {
        setTheme(systemColorScheme);
      }
      setIsReady(true);
    };

    loadTheme();
  }, [systemColorScheme]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    saveTheme(theme);
  }, [theme, isReady]);

  useEffect(() => {
    if (!isReady && systemColorScheme) {
      return;
    }

    if (isReady && !theme) {
      setTheme(systemColorScheme || "light");
    }
  }, [systemColorScheme, isReady, theme]);

  const colors = theme === "dark" ? darkTheme.colors : lightTheme.colors;
  const shadows = theme === "dark" ? darkTheme.shadows : lightTheme.shadows;
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider
      value={{ theme, colors, shadows, isDark, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
