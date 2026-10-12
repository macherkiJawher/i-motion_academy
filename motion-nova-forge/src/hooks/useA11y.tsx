import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePageTranslation } from "@/lib/i18n";

/* ------------------------------------------------------------------ i18n -- */

export type Lang = "en" | "fr" | "ar";

const dict = {
  en: {
    "nav.home": "Home",
    "nav.about": "About",
    "nav.trainings": "Trainings",
    "nav.sessions": "Sessions",
    "nav.contact": "Contact",
    "nav.login": "Log in",
    "nav.join": "Join the academy",
    "nav.account": "My account",
    "nav.openMenu": "Open menu",
    "nav.closeMenu": "Close menu",
    "a11y.title": "Accessibility",
    "a11y.subtitle": "Tune the experience to the way you browse.",
    "a11y.open": "Open accessibility options",
    "a11y.close": "Close accessibility options",
    "a11y.language": "Language",
    "a11y.speaker": "Smart speaker (hover)",
    "a11y.speakerHint": "Reads aloud whatever you point at.",
    "a11y.voice": "Voice commands",
    "a11y.voiceHint": "Say: home, trainings, sessions, contact, login, account, top, scroll down.",
    "a11y.voiceUnsupported": "Not supported by this browser.",
    "a11y.fontSize": "Font size",
    "a11y.animations": "Disable animations",
    "a11y.darkMode": "Dark mode",
    "a11y.contrast": "High contrast",
    "a11y.reset": "Reset to defaults",
    "a11y.listening": "Listening…",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.about": "À propos",
    "nav.trainings": "Formations",
    "nav.sessions": "Sessions",
    "nav.contact": "Contact",
    "nav.login": "Connexion",
    "nav.join": "Rejoindre l'académie",
    "nav.account": "Mon compte",
    "nav.openMenu": "Ouvrir le menu",
    "nav.closeMenu": "Fermer le menu",
    "a11y.title": "Accessibilité",
    "a11y.subtitle": "Adaptez l'expérience à votre façon de naviguer.",
    "a11y.open": "Ouvrir les options d'accessibilité",
    "a11y.close": "Fermer les options d'accessibilité",
    "a11y.language": "Langue",
    "a11y.speaker": "Lecteur intelligent (survol)",
    "a11y.speakerHint": "Lit à voix haute l'élément survolé.",
    "a11y.voice": "Commandes vocales",
    "a11y.voiceHint": "Dites : accueil, formations, sessions, contact, connexion, compte, haut, bas.",
    "a11y.voiceUnsupported": "Non pris en charge par ce navigateur.",
    "a11y.fontSize": "Taille du texte",
    "a11y.animations": "Désactiver les animations",
    "a11y.darkMode": "Mode sombre",
    "a11y.contrast": "Contraste élevé",
    "a11y.reset": "Réinitialiser",
    "a11y.listening": "Écoute…",
  },
  ar: {
    "nav.home": "الرئيسية",
    "nav.about": "من نحن",
    "nav.trainings": "التكوينات",
    "nav.sessions": "الحصص",
    "nav.contact": "اتصل بنا",
    "nav.login": "تسجيل الدخول",
    "nav.join": "انضم إلى الأكاديمية",
    "nav.account": "حسابي",
    "nav.openMenu": "فتح القائمة",
    "nav.closeMenu": "إغلاق القائمة",
    "a11y.title": "إمكانية الوصول",
    "a11y.subtitle": "اضبط التجربة حسب طريقة تصفحك.",
    "a11y.open": "فتح خيارات إمكانية الوصول",
    "a11y.close": "إغلاق خيارات إمكانية الوصول",
    "a11y.language": "اللغة",
    "a11y.speaker": "القارئ الذكي (عند المرور)",
    "a11y.speakerHint": "يقرأ بصوت عالٍ ما تشير إليه.",
    "a11y.voice": "الأوامر الصوتية",
    "a11y.voiceHint": "قل: الرئيسية، التكوينات، الحصص، اتصل، دخول، حسابي، أعلى، أسفل.",
    "a11y.voiceUnsupported": "غير مدعوم في هذا المتصفح.",
    "a11y.fontSize": "حجم الخط",
    "a11y.animations": "تعطيل الحركات",
    "a11y.darkMode": "الوضع الداكن",
    "a11y.contrast": "تباين عالٍ",
    "a11y.reset": "إعادة الضبط",
    "a11y.listening": "جارٍ الاستماع…",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

/* -------------------------------------------------------------- settings -- */

export interface A11ySettings {
  lang: Lang;
  speaker: boolean;
  voice: boolean;
  fontScale: number;
  reduceMotion: boolean;
  dark: boolean;
  highContrast: boolean;
}

const DEFAULTS: A11ySettings = {
  lang: "fr",
  speaker: false,
  voice: false,
  fontScale: 100,
  reduceMotion: false,
  dark: true,
  highContrast: false,
};

const KEY = "imotion.a11y";

interface A11yContextValue extends A11ySettings {
  set: <K extends keyof A11ySettings>(key: K, value: A11ySettings[K]) => void;
  reset: () => void;
  t: (key: TKey) => string;
  listening: boolean;
  voiceSupported: boolean;
  speak: (text: string) => void;
}

const A11yContext = createContext<A11yContextValue | null>(null);

const LOCALES: Record<Lang, string> = { en: "en-US", fr: "fr-FR", ar: "ar-TN" };

export function A11yProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULTS);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  usePageTranslation(settings.lang);

  /* hydrate from storage after mount (no SSR mismatch) */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<A11ySettings>) });
    } catch {
      /* ignore */
    }
    setVoiceSupported(
      typeof window !== "undefined" &&
        Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    );
  }, []);

  const set = useCallback<A11yContextValue["set"]>((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /* apply document-level effects */
  useEffect(() => {
    const html = document.documentElement;
    html.lang = settings.lang;
    html.dir = settings.lang === "ar" ? "rtl" : "ltr";
    html.classList.toggle("dark", settings.dark);
    html.classList.toggle("light", !settings.dark);
    html.classList.toggle("a11y-contrast", settings.highContrast);
    html.classList.toggle("a11y-no-motion", settings.reduceMotion);
    html.style.setProperty("--a11y-font-scale", String(settings.fontScale / 100));
  }, [settings]);

  /* smart speaker: reads the element under the pointer */
  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const clean = text.replace(/\s+/g, " ").trim().slice(0, 220);
      if (!clean) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = LOCALES[settings.lang];
      utter.rate = 1;
      window.speechSynthesis.speak(utter);
    },
    [settings.lang],
  );

  useEffect(() => {
    if (!settings.speaker || typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = "";

    const onOver = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        "a,button,h1,h2,h3,h4,p,li,label,summary,[data-speak]",
      ) as HTMLElement | null;
      if (!target) return;
      const text = target.getAttribute("data-speak") || target.getAttribute("aria-label") || target.innerText;
      if (!text || text === last) return;
      last = text;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => speak(text), 260);
    };

    document.addEventListener("mouseover", onOver);
    return () => {
      document.removeEventListener("mouseover", onOver);
      if (timer) clearTimeout(timer);
      window.speechSynthesis?.cancel();
    };
  }, [settings.speaker, speak]);

  /* voice commands */
  useEffect(() => {
    if (!settings.voice || typeof window === "undefined") return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = LOCALES[settings.lang];

    const routes: { words: string[]; path: string }[] = [
      { words: ["home", "accueil", "الرئيسية"], path: "/" },
      { words: ["about", "à propos", "a propos", "من نحن"], path: "/about" },
      { words: ["training", "formation", "التكوين"], path: "/trainings" },
      { words: ["session", "حصة", "الحصص"], path: "/sessions" },
      { words: ["contact", "اتصل"], path: "/contact" },
      { words: ["login", "connexion", "دخول"], path: "/login" },
      { words: ["account", "compte", "حسابي", "dashboard"], path: "/dashboard" },
    ];

    recognition.onresult = (event: any) => {
      const transcript = String(event.results[event.results.length - 1][0].transcript).toLowerCase().trim();
      if (/\b(top|haut|أعلى)\b/.test(transcript)) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (/\b(down|bas|أسفل|scroll)\b/.test(transcript)) {
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
        return;
      }
      const match = routes.find((r) => r.words.some((w) => transcript.includes(w)));
      if (match) window.location.assign(match.path);
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    };
    recognition.onerror = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }

    return () => {
      recognitionRef.current = null;
      setListening(false);
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
    };
  }, [settings.voice, settings.lang]);

  const t = useCallback((key: TKey) => dict[settings.lang][key] ?? dict.en[key], [settings.lang]);

  const value = useMemo<A11yContextValue>(
    () => ({ ...settings, set, reset, t, listening, voiceSupported, speak }),
    [settings, set, reset, t, listening, voiceSupported, speak],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y() {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error("useA11y must be used inside <A11yProvider>");
  return ctx;
}

/** Translation helper for components that only need strings. */
export function useT() {
  return useA11y().t;
}
