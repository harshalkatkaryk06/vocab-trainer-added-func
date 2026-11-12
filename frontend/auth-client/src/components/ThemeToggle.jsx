import { useTheme } from "../context/useTheme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className="vt-theme-toggle"
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${nextTheme} theme`}
      onClick={toggleTheme}
    >
      {theme === "dark" ? (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="3.25" />
          <path d="M10 1.75v2m0 12.5v2m8.25-8.25h-2m-12.5 0h-2m14.08-5.83-1.42 1.42m-8.82 8.82-1.42 1.42m11.66 0-1.42-1.42m-8.82-8.82L4.17 4.17" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
          <path d="M16.18 12.15A7 7 0 0 1 7.85 3.82 7 7 0 1 0 16.18 12.15Z" />
        </svg>
      )}
      <span>{nextTheme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
