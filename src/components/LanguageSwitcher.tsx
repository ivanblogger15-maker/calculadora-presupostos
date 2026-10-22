import { LANGUAGES, useI18n } from '../i18n/I18nProvider';

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();

  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5" role="group" aria-label="Language">
      {LANGUAGES.map((language) => (
        <button
          key={language.id}
          type="button"
          onClick={() => setLang(language.id)}
          aria-pressed={lang === language.id}
          title={language.label}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            lang === language.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}
