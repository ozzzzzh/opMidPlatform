import { useI18n, type Language } from './I18nContext';

const OPTIONS: Array<{ value: Language; label: string }> = [
  { value: 'zh', label: '中' },
  { value: 'en', label: 'EN' },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="language-switch" role="group" aria-label="Language">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={language === option.value ? 'active' : ''}
          onClick={() => setLanguage(option.value)}
          aria-pressed={language === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
