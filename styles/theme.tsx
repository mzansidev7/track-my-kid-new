import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { getStoredTheme, saveTheme } from "../store/themeStore/themeStore";

export const DRIVER_COLORS = {
  background: "#05090B",
  card: "#0C1719",
  surfaceRaised: "#102225",
  cardBorder: "#1C3C3D",

  primary: "#00B9A7",
  primaryDark: "#073A3A",

  cyan: "#3DE0D2",

  success: "#38D6A4",
  successSurface: "#12342F",
  warning: "#F2B84B",
  warningSurface: "#382D1B",
  danger: "#FF7777",
  dangerSurface: "#3B1D20",
  infoSurface: "#152A3B",
  neutralSurface: "#182527",

  white: "#F5FAFA",
  text: "#F5FAFA",
  muted: "#9AB0B1",
};

export const CLIENT_COLORS = {
  background: "#07040B",
  surface: "#130D1A",
  surfaceElevated: "#1C1026",

  primary: "#9B2BE7",
  primaryBright: "#C14BFF",
  primaryDark: "#7016B6",

  success: "#43D17A",
  error: "#FF4D5D",
  warning: "#E9B83F",

  textPrimary: "#FBF8FF",
  textSecondary: "#B9AFC4",
  textMuted: "#84788E",

  border: "#352341",
  divider: "#261831",
  overlay: "#000000",
};

export const OWNER_COLORS = {
  background: "#050907",
  surface: "#0D1713",
  surfaceElevated: "#13231D",
  primary: "#00B894",
  primaryBright: "#35D9B3",
  primaryDark: "#087A62",
  success: "#35D9B3",
  error: "#FF6673",
  warning: "#F2B84B",
  textPrimary: "#F4FBF8",
  textSecondary: "#B1C4BC",
  textMuted: "#82968D",
  border: "#294238",
  divider: "#1C3028",
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
    background: "#141c29", // Need to change this to a light background color, e.g., "#F9FAFB" when we complete the theme for the entire app. For now, keeping it dark to match the current UI.
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
        background: OWNER_COLORS.background,
        card: OWNER_COLORS.surface,
        cardBorder: OWNER_COLORS.border,
        primary: OWNER_COLORS.primary,
        primaryDark: OWNER_COLORS.primaryDark,
        gradientStart: OWNER_COLORS.primaryDark,
        gradientEnd: OWNER_COLORS.primaryBright,
        surface: OWNER_COLORS.surface,
        border: OWNER_COLORS.border,
        divider: OWNER_COLORS.divider,
      },
      driver: {
        background: DRIVER_COLORS.background,
        card: DRIVER_COLORS.card,
        cardBorder: DRIVER_COLORS.cardBorder,

        primary: DRIVER_COLORS.primary,
        primaryDark: DRIVER_COLORS.primaryDark,
        gradientStart: DRIVER_COLORS.primaryDark,
        gradientEnd: DRIVER_COLORS.primary,
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
        gradientStart: CLIENT_COLORS.primaryDark,
        gradientEnd: CLIENT_COLORS.primaryBright,
        surface: CLIENT_COLORS.surface,
        border: CLIENT_COLORS.border,
        divider: CLIENT_COLORS.divider,
      },
      school: {
        background: "#291503",
        card: "#FFF7ED",
        cardBorder: "#B45309",
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
        background: OWNER_COLORS.background,
        card: OWNER_COLORS.surface,
        cardBorder: OWNER_COLORS.border,
        primary: OWNER_COLORS.primary,
        primaryDark: OWNER_COLORS.primaryDark,
        gradientStart: OWNER_COLORS.primaryDark,
        gradientEnd: OWNER_COLORS.primaryBright,
        surface: OWNER_COLORS.surface,
        border: OWNER_COLORS.border,
        divider: OWNER_COLORS.divider,
      },
      driver: {
        background: DRIVER_COLORS.background,
        card: DRIVER_COLORS.card,
        cardBorder: DRIVER_COLORS.cardBorder,

        primary: DRIVER_COLORS.primary,
        primaryDark: DRIVER_COLORS.primaryDark,
        gradientStart: DRIVER_COLORS.primaryDark,
        gradientEnd: DRIVER_COLORS.primary,
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
        gradientStart: CLIENT_COLORS.primaryDark,
        gradientEnd: CLIENT_COLORS.primaryBright,
        surface: CLIENT_COLORS.surface,
        border: CLIENT_COLORS.border,
        divider: CLIENT_COLORS.divider,
      },
      school: {
        background: "#1A0D02",
        card: "#291503",
        cardBorder: "#B45309",
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

export const useDriverTheme = () => {
  const context = useTheme();
  const { colors } = context;

  return {
    ...context,
    colors: {
      ...colors,
      primary: DRIVER_COLORS.primary,
      primaryDark: DRIVER_COLORS.primaryDark,
      secondary: DRIVER_COLORS.surfaceRaised,
      success: DRIVER_COLORS.success,
      warning: DRIVER_COLORS.warning,
      error: DRIVER_COLORS.danger,
      background: DRIVER_COLORS.background,
      gradientStart: DRIVER_COLORS.primaryDark,
      gradientEnd: DRIVER_COLORS.primary,
      surface: DRIVER_COLORS.card,
      surfaceHover: DRIVER_COLORS.surfaceRaised,
      text: {
        ...colors.text,
        primary: DRIVER_COLORS.text,
        secondary: DRIVER_COLORS.muted,
        tertiary: DRIVER_COLORS.muted,
        inverse: DRIVER_COLORS.background,
      },
      border: DRIVER_COLORS.cardBorder,
      divider: DRIVER_COLORS.cardBorder,
    },
  };
};

export const useClientTheme = () => {
  const context = useTheme();
  const { colors } = context;
  const clientColors = {
    ...colors,
    primary: CLIENT_COLORS.primary,
    primaryDark: CLIENT_COLORS.primaryDark,
    secondary: CLIENT_COLORS.surfaceElevated,
    success: CLIENT_COLORS.success,
    warning: CLIENT_COLORS.warning,
    error: CLIENT_COLORS.error,
    background: CLIENT_COLORS.background,
    gradientStart: CLIENT_COLORS.primaryDark,
    gradientEnd: CLIENT_COLORS.primaryBright,
    surface: CLIENT_COLORS.surface,
    surfaceHover: CLIENT_COLORS.surfaceElevated,
    text: {
      ...colors.text,
      primary: CLIENT_COLORS.textPrimary,
      secondary: CLIENT_COLORS.textSecondary,
      tertiary: CLIENT_COLORS.textMuted,
      inverse: CLIENT_COLORS.background,
    },
    border: CLIENT_COLORS.border,
    divider: CLIENT_COLORS.divider,
    brands: {
      ...colors.brands,
      client: {
        background: CLIENT_COLORS.background,
        card: CLIENT_COLORS.surface,
        cardBorder: CLIENT_COLORS.border,
        primary: CLIENT_COLORS.primary,
        primaryDark: CLIENT_COLORS.primaryDark,
        gradientStart: CLIENT_COLORS.primaryDark,
        gradientEnd: CLIENT_COLORS.primaryBright,
        surface: CLIENT_COLORS.surface,
        border: CLIENT_COLORS.border,
        divider: CLIENT_COLORS.divider,
      },
    },
  };

  return { ...context, colors: clientColors };
};

export const useOwnerTheme = () => {
  const context = useTheme();
  const { colors } = context;
  const ownerColors = {
    ...colors,
    primary: OWNER_COLORS.primary,
    primaryDark: OWNER_COLORS.primaryDark,
    secondary: OWNER_COLORS.surfaceElevated,
    success: OWNER_COLORS.success,
    warning: OWNER_COLORS.warning,
    error: OWNER_COLORS.error,
    background: OWNER_COLORS.background,
    gradientStart: OWNER_COLORS.primaryDark,
    gradientEnd: OWNER_COLORS.primaryBright,
    surface: OWNER_COLORS.surface,
    surfaceHover: OWNER_COLORS.surfaceElevated,
    text: {
      ...colors.text,
      primary: OWNER_COLORS.textPrimary,
      secondary: OWNER_COLORS.textSecondary,
      tertiary: OWNER_COLORS.textMuted,
      inverse: OWNER_COLORS.background,
    },
    border: OWNER_COLORS.border,
    divider: OWNER_COLORS.divider,
    brands: {
      ...colors.brands,
      owner: {
        background: OWNER_COLORS.background,
        card: OWNER_COLORS.surface,
        cardBorder: OWNER_COLORS.border,
        primary: OWNER_COLORS.primary,
        primaryDark: OWNER_COLORS.primaryDark,
        gradientStart: OWNER_COLORS.primaryDark,
        gradientEnd: OWNER_COLORS.primaryBright,
        surface: OWNER_COLORS.surface,
        border: OWNER_COLORS.border,
        divider: OWNER_COLORS.divider,
      },
    },
  };

  return {
    ...context,
    colors: ownerColors,
    getBrandColors: (brand: BrandName) =>
      brand === "owner" ? ownerColors.brands.owner : context.getBrandColors(brand),
  };
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: FC<ThemeProviderProps> = ({
  children,
}): React.ReactElement => {
  const [theme, setTheme] = useState<Theme>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await getStoredTheme();
      if (stored) {
        setTheme(stored);
      }
      setIsReady(true);
    };

    loadTheme();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    saveTheme(theme);
  }, [theme, isReady]);

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
