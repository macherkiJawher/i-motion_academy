import { AnimatePresence, motion } from "framer-motion";
import { Accessibility, Contrast, Eye, Languages, Mic, Moon, Sparkles, Type, Volume2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useA11y, type Lang } from "@/hooks/useA11y";
import { cn } from "@/lib/utils";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
];

function Toggle({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  icon: typeof Eye;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/50 bg-secondary/30 px-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-electric" />
        <div className="min-w-0">
          <p className="text-sm leading-tight">{label}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

export function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const a11y = useA11y();
  const { t } = a11y;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("a11y.close") : t("a11y.open")}
        aria-expanded={open}
        className="glass-strong fixed bottom-6 start-6 z-[120] flex h-12 w-12 items-center justify-center rounded-full text-electric shadow-[var(--shadow-glow)] transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <Accessibility className="h-5 w-5" />}
        {a11y.listening && (
          <span className="absolute -end-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full bg-destructive" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label={t("a11y.title")}
            className="glass-strong fixed bottom-24 start-6 z-[120] max-h-[70vh] w-[min(22rem,calc(100vw-3rem))] overflow-y-auto rounded-3xl p-5"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-electric" />
              <h2 className="font-display text-base font-semibold">{t("a11y.title")}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t("a11y.subtitle")}</p>

            {/* language */}
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <Languages className="h-3.5 w-3.5" /> {t("a11y.language")}
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label={t("a11y.language")}>
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => a11y.set("lang", l.code)}
                    aria-pressed={a11y.lang === l.code}
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-sm transition-colors",
                      a11y.lang === l.code
                        ? "border-electric/50 bg-electric/15 text-electric"
                        : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* font size */}
            <div className="mt-5 rounded-2xl border border-border/50 bg-secondary/30 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm">
                  <Type className="h-4 w-4 text-electric" /> {t("a11y.fontSize")}
                </p>
                <span className="text-xs text-muted-foreground">{a11y.fontScale}%</span>
              </div>
              <Slider
                className="mt-3"
                min={85}
                max={150}
                step={5}
                value={[a11y.fontScale]}
                onValueChange={([v]) => a11y.set("fontScale", v ?? 100)}
                aria-label={t("a11y.fontSize")}
              />
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Toggle
                icon={Volume2}
                label={t("a11y.speaker")}
                hint={t("a11y.speakerHint")}
                checked={a11y.speaker}
                onChange={(v) => a11y.set("speaker", v)}
              />
              <Toggle
                icon={Mic}
                label={t("a11y.voice")}
                hint={a11y.voiceSupported ? t("a11y.voiceHint") : t("a11y.voiceUnsupported")}
                checked={a11y.voice}
                onChange={(v) => a11y.set("voice", v)}
                disabled={!a11y.voiceSupported}
              />
              <Toggle
                icon={Eye}
                label={t("a11y.animations")}
                checked={a11y.reduceMotion}
                onChange={(v) => a11y.set("reduceMotion", v)}
              />
              <Toggle icon={Moon} label={t("a11y.darkMode")} checked={a11y.dark} onChange={(v) => a11y.set("dark", v)} />
              <Toggle
                icon={Contrast}
                label={t("a11y.contrast")}
                checked={a11y.highContrast}
                onChange={(v) => a11y.set("highContrast", v)}
              />
            </div>

            <Button variant="glass" size="sm" className="mt-4 w-full" onClick={a11y.reset}>
              {t("a11y.reset")}
            </Button>
            {a11y.listening && (
              <p aria-live="polite" className="mt-3 text-center text-xs text-electric">
                {t("a11y.listening")}
              </p>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
