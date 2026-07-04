import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Globe, ShoppingCart, LogOut, Sun, Moon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toogleLanguage, clearActiveList } from "../store/cartSlice";
import { t } from "./translations";
import { useState } from "react";

export default function Header({ lang, userData, handleLogout, cartCount }) {
  const dispatch = useDispatch();
  
  const activeListName = useSelector((state) => state.cartState.activeListName);

  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
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
        <Link to="/" className="hover:opacity-90 min-w-0 flex-1 sm:flex-initial">
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent truncate">
            {t[lang].title}
          </h1>
          {activeListName ? (
            <span className="inline-block text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold truncate max-w-full">
              Editing: {activeListName}
            </span>
          ) : (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{t[lang].subtitle}</p>
          )}
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Fresh List Button (Responsive text) */}
          {activeListName && (
            <Button
              onClick={() => dispatch(clearActiveList())}
              variant="ghost"
              size="sm"
              className="h-8 rounded-full text-xs text-muted-foreground hover:text-foreground gap-1 px-2 sm:px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New List</span>
            </Button>
          )}

          {/* User Profile */}
          {userData?.user && (
            <div className="flex items-center gap-2 border-r border-border pr-2 sm:pr-4">
              {userData.user.avatar ? (
                <img
                  src={userData.user.avatar}
                  alt={userData.user.name}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {userData.user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-muted-foreground hidden md:inline">
                {userData.user.name}
              </span>
            </div>
          )}

          {/* Cart Icon Link */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="relative rounded-full h-8 w-12 sm:w-auto sm:px-3 border-border bg-card text-foreground"
          >
            <Link to="/cart" className="flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-xs font-bold">{cartCount}</span>
            </Link>
          </Button>

          {/* Theme Toggle */}
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

          {/* Language Toggle (Responsive text) */}
          <Button
            onClick={() => dispatch(toogleLanguage())}
            className="rounded-full h-8 w-8 sm:w-auto sm:px-3 gap-1 border-border bg-card text-foreground"
            variant="outline"
            size="sm"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">{t[lang].langButton}</span>
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
