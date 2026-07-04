import { useSelector, useDispatch } from "react-redux";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toogleLanguage } from "../store/cartSlice";
import { t } from "./translations";

export default function AuthPage() {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.cartState.lang);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between font-mono transition-colors duration-200">
      {/* Top Header with Language Toggle */}

      {/* Brand title in Login Header */}
      <header className="p-4 flex justify-between items-center max-w-7xl w-full mx-auto">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
          {t[lang].title}
        </h1>
        <Button
          onClick={() => dispatch(toogleLanguage())}
          className="rounded-full gap-2 border-border bg-card text-foreground"
          variant="outline"
        >
          <Globe className="w-4 h-4" />
          {t[lang].langButton}
        </Button>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-2xl border border-border shadow-sm max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t[lang].welcome}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t[lang].description}
            </p>
          </div>

          <Button
            asChild
            className="w-full py-6 rounded-xl text-base shadow-sm"
          >
            {/* Direct Link to Passport.js google auth initialization */}
            <a href="http://localhost:3000/api/auth/google">
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {t[lang].button}
            </a>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground">
        &copy; 2026 Mana Grocery Tracker. Limited to India.
      </footer>
    </div>
  );
}
