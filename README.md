# 🛒 Smart Grocery Telugu Translator & Cart Tracker

A premium, fully responsive bilingual (English / Telugu) grocery list builder, real-time market tracker, and mock delivery checkout portal. 

---

## 🔗 Live Deployments

* **🎨 Frontend Application:** [smart-grocery-telugu-translator-fro.vercel.app](https://smart-grocery-telugu-translator-fro.vercel.app)
* **⚙️ Backend API Service:** [smart-grocery-telugu-translator-bac.vercel.app](https://smart-grocery-telugu-translator-bac.vercel.app)

---

## ✨ Core Features

* **🌐 AI Bilingual Translator:** Instantly search and add grocery items in English, Telugu script (తెలుగు), or transliterated Telugu (e.g. *Tomato*, *టమోటా*, *Tamata*). Powered by Google Gemma LLM via OpenRouter.
* **📈 Mandi Price Estimations:** Catalog items load simulated market rates and historical price variations. Users can log their local retail purchases to calculate real-time inflation/deflation indices.
* **🔑 Secure Google OAuth Auth:** Unified single-sign-on portal utilizing Google OAuth 2.0 with persistent server-side cookie sessions.
* **💳 Premium Checkout Portal:** Features a gorgeous, interactive CSS credit card graphic synced to mock cardholder data, detailed pricing verification logs, and delivery contact address/phone number collection forms.
* **📍 Live Delivery Tracker:** Simulates delivery status progression (*Placed* ➡️ *Packing* ➡️ *Out for Delivery* ➡️ *Delivered*) in real-time based on the order's age, updating via background polling.
* **📜 Order History Logs:** Tracks all completed purchases, listing dates, address coordinates, item aggregates, and totals with a "Track Delivery" link back to the live progress map.
* **🔍 List Filtering:** Quick-search filter bar in the saved grocery lists card to find pre-staged carts instantly.

---

## 🛠️ Tech Stack

### **Frontend:**
* **Core:** React 19, Redux Toolkit (RTK Query), React Router 7.
* **Styling:** Vanilla CSS, Tailwind CSS 4, Lucide Icons.
* **Build tool:** Vite.

### **Backend & Database:**
* **Server:** Node.js, Express, Passport.js (Google OAuth Strategy).
* **Database:** MongoDB Atlas, Mongoose (schemas configured with user-matching indexes).
* **Caching:** Connect-Mongo session stores.

---

## ⚙️ Environment Variables Config

Add the following keys to your Vercel deployment project settings:

### **1. Backend Project Settings**
| Key | Example Value | Description |
| --- | --- | --- |
| `BASE_URL` | `https://smart-grocery-telugu-translator-fro.vercel.app` | **Your Frontend Domain** *(Enables first-party cookie redirects)* |
| `CLIENT_URL` | `https://smart-grocery-telugu-translator-fro.vercel.app` | Allow-CORS origin matching |
| `MONGODB_URI` | `mongodb+srv://...` | Cloud MongoDB Atlas connection string |
| `SESSION_SECRET` | `your-secure-secret-key` | Express session signature seed |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Google Cloud API OAuth ID |
| `GOOGLE_CLIENT_SECRET` | `...` | Google Cloud API OAuth Secret |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | OpenRouter model API key |

### **2. Frontend Project Settings**
| Key | Example Value | Description |
| --- | --- | --- |
| `VITE_BACKEND_URL` | `https://smart-grocery-telugu-translator-bac.vercel.app/api` | Points to your backend API subdomain |

---

## 🚀 Local Installation & Run

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd smart-grocery-telugu-translator
   ```
2. Install dependencies for the entire workspace:
   ```bash
   npm install
   ```
3. Set up environment variables inside `/backend/.env` and `/frontend/.env` directories.
4. Run both servers simultaneously:
   ```bash
   # In root directory
   npm run dev --workspaces
   ```
5. Open `http://localhost:5173` in your browser.
