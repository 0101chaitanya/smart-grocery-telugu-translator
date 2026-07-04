import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Globe, ShoppingCart, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toogleLanguage } from "../store/cartSlice";
import { t } from "./translations";
import { useState, useEffect } from "react";

export default function Header({ lang, userData, handleLogout, cartCount }) {
  const dispatch = useDispatch();

  // Track state of current theme
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark"),
  );

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  return (
    <header className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="hover:opacity-90">
          {/* Brand Logo with a clean gradient */}
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            {t[lang].title}
          </h1>
          <p className="text-xs text-muted-foreground">{t[lang].subtitle}</p>
        </Link>

        <div className="flex items-center gap-3">
          {/* User Profile */}
          {userData?.user && (
            <div className="flex items-center gap-2 border-r border-border pr-4">
              {userData.user.avatar ? (
                <img
                  src={userData.user.avatar}
                  alt={userData.user.name}
                  referrerPolicy="no-referrer" /* Prevents Google from blocking the image request */
                  className="w-8 h-8 rounded-full border border-border"
                />
              ) : (
                /* Fallback Circle with first letter of User's Name */
                <div className="w-8 h-8 rounded-full border border-border bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {userData.user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                {userData.user.name}
              </span>
            </div>
          )}

          {/* Cart link */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="relative rounded-full h-8 border-border bg-card text-foreground"
          >
            <Link to="/cart" className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-semibold">{cartCount}</span>
            </Link>
          </Button>

          {/* Theme Toggle Button */}
          <Button
            onClick={toggleTheme}
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8 border-border bg-card text-foreground"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
          </Button>

          {/* Language Toggle */}
          <Button
            onClick={() => dispatch(toogleLanguage())}
            className="rounded-full gap-2 h-8 border-border bg-card text-foreground"
            variant="outline"
            size="sm"
          >
            <Globe className="w-4 h-4" />
            {t[lang].langButton}
          </Button>

          {/* Logout */}
          <Button
            onClick={handleLogout}
            className="rounded-full h-8 w-8 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
            variant="ghost"
            size="icon"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
