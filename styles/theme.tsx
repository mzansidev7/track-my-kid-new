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

// Driver-specific color tokens requested by the designer
export const DRIVER_COLORS = {
  background: "#061A3A",
  card: "#0D2850",
  cardBorder: "#193B68",

  primary: "#0057FF",
  primaryDark: "#003FC1",

  cyan: "#22C7D6",

  success: "#25D6A2",
  warning: "#F59E0B",
  danger: "#EF5350",

  white: "#FFFFFF",
  text: "#DCE6F3",
  muted: "#7F94B1",
};

export const CLIENT_COLORS = {
  background: "#03151C",
  surface: "#052A32",
  surfaceElevated: "#07343D",

  primary: "#00D084",
  primaryBright: "#00E5B0",
  primaryDark: "#008F72",

  success: "#19D66B",
  error: "#FF4D5D",
  warning: "#E9B83F",

  textPrimary: "#F4F7F5",
  textSecondary: "#8FA6A8",
  textMuted: "#587276",

  border: "#0C454D",
  divider: "#10343A",
  overlay: "#000000",
};

export type Theme = "light" | "dark";
export type BrandName = "owner" | "driver" | "client" | "school";

export const lightTheme = {
  colors: {
    // Owner/brand teal palette (matches owner UI screenshot)
    primary: "#064E3B",
    primaryDark: "#0F766E",
    secondary: "#ECFDF5",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    background: "#FFFFFF",
    gradientStart: "#064E3B",
    gradientEnd: "#10B981",
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
    // Separate role/brand palettes for Owner, Driver, Client, School
    brands: {
      owner: {
        primary: "#064E3B",
        primaryDark: "#0F766E",
        gradientStart: "#064E3B",
        gradientEnd: "#10B981",
        surface: "#ECFDF5",
        border: "#0F766E",
        divider: "#10B981",
      },
      driver: {
        background: DRIVER_COLORS.background,
        card: DRIVER_COLORS.card,
        cardBorder: DRIVER_COLORS.cardBorder,

        primary: DRIVER_COLORS.primary,
        primaryDark: DRIVER_COLORS.primaryDark,
        gradientStart: DRIVER_COLORS.primary,
        gradientEnd: DRIVER_COLORS.cyan,
        surface: DRIVER_COLORS.card,
        border: DRIVER_COLORS.cardBorder,
        divider: DRIVER_COLORS.cyan,
      },
      client: {
        background: CLIENT_COLORS.background,
        card: CLIENT_COLORS.surface,
        cardBorder: CLIENT_COLORS.border,
        primary: CLIENT_COLORS.primary,
        primaryDark: CLIENT_COLORS.primaryDark,
        gradientStart: CLIENT_COLORS.primary,
        gradientEnd: CLIENT_COLORS.primaryBright,
        surface: CLIENT_COLORS.surface,
        border: CLIENT_COLORS.border,
        divider: CLIENT_COLORS.divider,
      },
      school: {
        primary: "#B45309",
        primaryDark: "#92400E",
        gradientStart: "#B45309",
        gradientEnd: "#F59E0B",
        surface: "#FFF7ED",
        border: "#B45309",
        divider: "#F59E0B",
      },
    },
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
    // Separate role/brand palettes for Owner, Driver, Client, School (dark variants)
    brands: {
      owner: {
        primary: "#0F766E",
        primaryDark: "#064E3B",
        gradientStart: "#0F766E",
        gradientEnd: "#10B981",
        surface: "#052E24",
        border: "#0F766E",
        divider: "#10B981",
      },
      driver: {
        background: DRIVER_COLORS.background,
        card: DRIVER_COLORS.card,
        cardBorder: DRIVER_COLORS.cardBorder,

        primary: DRIVER_COLORS.primary,
        primaryDark: DRIVER_COLORS.primaryDark,
        gradientStart: DRIVER_COLORS.primary,
        gradientEnd: DRIVER_COLORS.cyan,
        surface: DRIVER_COLORS.background,
        border: DRIVER_COLORS.cardBorder,
        divider: DRIVER_COLORS.cyan,
      },
      client: {
        background: CLIENT_COLORS.background,
        card: "#1F133D",
        cardBorder: "#7C3AED",
        primary: "#7C3AED",
        primaryDark: "#5B21B6",
        gradientStart: "#7C3AED",
        gradientEnd: "#C084FC",
        surface: "#1F133D",
        border: "#7C3AED",
        divider: "#C084FC",
      },
      school: {
        primary: "#B45309",
        primaryDark: "#92400E",
        gradientStart: "#B45309",
        gradientEnd: "#F59E0B",
        surface: "#291503",
        border: "#B45309",
        divider: "#F59E0B",
      },
    },
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
  getBrandColors: (brand: BrandName) => typeof lightTheme.colors.brands.owner;
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

  const getBrandColors = (brand: BrandName) => colors.brands[brand];

  return (
    <ThemeContext.Provider
      value={{ theme, colors, shadows, isDark, toggleTheme, getBrandColors }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
