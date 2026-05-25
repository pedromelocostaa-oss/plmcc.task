import { useEffect } from "react";
import { useTheme } from "@/hooks/use-theme";

const colorByTheme: Record<string, string> = {
  light: "#F2F2F7",
  dark:  "#1A1A1A",
};

export function useThemeColor(override?: string) {
  const { theme } = useTheme();
  useEffect(() => {
    const color = override ?? colorByTheme[theme] ?? colorByTheme.dark;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = color;
  }, [theme, override]);
}
