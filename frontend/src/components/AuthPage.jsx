import { useSelector, useDispatch } from "react-redux";
import { Globe, Sparkles, Languages, Image, TrendingUp, ClipboardList, Key, Mail, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toogleLanguage } from "../store/cartSlice";
import { useSellerLoginMutation } from "../store/apiSlice";
import { t } from "./translations";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.cartState.lang);

  const [showSellerForm, setShowSellerForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [sellerLogin, { isLoading: isLoggingIn }] = useSellerLoginMutation();

  const googleLoginUrl = import.meta.env.PROD
    ? "/api/auth/google"
    : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api"}/auth/google`;

  const handleSellerLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      await sellerLogin({ email, password }).unwrap();
    } catch (err) {
      setLoginError(err.data?.error || "Invalid seller credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between font-sans overflow-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* 1. Decorative Soft Background Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      {/* 2. Top Header with Language Toggle */}
      <header className="relative p-4 flex justify-between items-center max-w-6xl w-full mx-auto z-10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
          {t[lang].title}
        </h1>
        <Button
          onClick={() => dispatch(toogleLanguage())}
          className="rounded-full gap-2 border-border bg-card hover:bg-muted text-foreground transition shadow-sm h-9"
          variant="outline"
        >
          <Globe className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold">{t[lang].langButton}</span>
        </Button>
      </header>

      {/* 3. Main Glassmorphism Landing Page */}
      <main className="relative flex-1 flex items-center justify-center p-4 z-10">
        <div className="bg-card/75 backdrop-blur-lg p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xl max-w-xl w-full flex flex-col space-y-6">
          
          {/* Header Introduction */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-1">
              <Sparkles className="w-6 h-6 text-emerald-500" />
            </div>
            {/* Dynamic App Title */}
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent tracking-tight">
              {t[lang].title}
            </h1>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {t[lang].welcome}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              {t[lang].description}
            </p>
          </div>

          {/* Feature List detailing Website Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Feature 1 */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex gap-3 items-start">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Bilingual Translator</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Translates list items to Telugu variations with Google Gemma.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex gap-3 items-start">
              <div className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                <Image className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">AI Stock Photos</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Automatically visualizes items dynamically using Pollinations.ai.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex gap-3 items-start">
              <div className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Indian Mandi Prices</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Tracks live price drops and compares against historical averages.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 flex gap-3 items-start">
              <div className="p-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Inflation Trackers</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Save multiple lists and track cost increases in real-time.
                </p>
              </div>
            </div>

          </div>

          {/* Authentication Section */}
          <div className="pt-2">
            {!showSellerForm ? (
              <div className="space-y-4">
                <Button
                  asChild
                  className="w-full py-6 rounded-xl text-sm font-bold shadow-md hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* Link to Google auth callback */}
                  <a href={googleLoginUrl}>
                    <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
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
                    {t[lang].loginButton}
                  </a>
                </Button>

                <div className="text-center">
                  <Button
                    onClick={() => {
                      setShowSellerForm(true);
                      setLoginError("");
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                  >
                    <Store className="w-3.5 h-3.5 mr-1.5 text-orange-500" />
                    Store Manager (Seller) Login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSellerLogin} className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                    <Store className="w-4 h-4" />
                    Store Manager Access
                  </h3>
                  <p className="text-xs text-muted-foreground text-center">
                    Enter your merchant credentials to manage inventory & prices
                  </p>
                </div>

                {loginError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 text-center font-semibold">
                    {loginError}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      required
                      placeholder="Seller Username (e.g. sellerUser1)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 text-xs bg-muted/30 border-border"
                    />
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-11 text-xs bg-muted/30 border-border"
                    />
                  </div>

                  {/* Autofill Demo Credentials */}
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground select-none">
                      <input
                        type="checkbox"
                        checked={email === 'sellerUser1' && password === 'sellerAdmin@123'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEmail("sellerUser1");
                            setPassword("sellerAdmin@123");
                          } else {
                            setEmail("");
                            setPassword("");
                          }
                        }}
                        className="rounded border-border bg-card text-orange-600 focus:ring-orange-500/20 w-3.5 h-3.5"
                      />
                      <span>Auto-fill Store Credentials</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-md transition-all duration-200"
                  >
                    {isLoggingIn ? "Logging in..." : "Login as Seller"}
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowSellerForm(false);
                        setEmail("");
                        setPassword("");
                        setLoginError("");
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground font-semibold"
                    >
                      ← Back to Buyer Sign In
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="relative p-4 text-center text-xs text-muted-foreground z-10 border-t border-border/40">
        &copy; 2026 Mana grocery store. Limited to India.
      </footer>
    </div>
  );
}
