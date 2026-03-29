import { AlertTriangle, Globe, LogOut, Moon, Ruler, Scale, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthProvider';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

const APP_VERSION = '0.3.1';

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
            value === opt.value
              ? 'font-bold bg-indigo-600 text-white shadow-lg'
              : 'font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LanguageSelector({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs font-bold py-1 px-2 rounded transition-colors ${
            value === opt.value
              ? 'text-indigo-400 bg-indigo-400/10 ring-1 ring-indigo-400/30'
              : 'text-slate-500 bg-slate-100 dark:bg-slate-950 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-slate-900/50 rounded-xl p-4 flex items-center justify-between border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 px-1">
      {children}
    </h3>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { fullName, username, logout } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { dark } = useTheme();

  const initials = fullName
    ? fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      {/* User Section */}
      <section className="flex flex-col items-center py-6">
        <div className="relative w-24 h-24 mb-4">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-indigo-500/30 p-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
            <span className="text-indigo-400 font-bold text-2xl">{initials}</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{fullName}</h2>
        <p className="text-slate-500 text-sm font-medium">@{username}</p>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <SectionHeader>{t('profile.preferences')}</SectionHeader>

        <SettingRow
          icon={dark ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-indigo-400" />}
          label={t('profile.darkMode')}
          description={t('profile.darkModeDescription')}
        >
          <button
            onClick={() => updateSettings({ darkMode: !dark })}
            className={`w-12 h-6 rounded-full relative flex items-center px-1 transition-colors ${
              dark ? 'bg-indigo-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                dark ? 'right-1' : 'left-1'
              }`}
            />
          </button>
        </SettingRow>

        <SettingRow
          icon={<Globe size={18} className="text-indigo-400" />}
          label={t('profile.language')}
          description={t('profile.languageDescription')}
        >
          <LanguageSelector
            value={settings.language}
            options={[
              { value: 'de', label: 'DE' },
              { value: 'en', label: 'EN' },
            ]}
            onChange={(v) => updateSettings({ language: v as 'en' | 'de' })}
          />
        </SettingRow>
      </section>

      {/* Units */}
      <section className="space-y-3">
        <SectionHeader>Units</SectionHeader>

        <SettingRow
          icon={<Scale size={18} className="text-indigo-400" />}
          label={t('profile.weightUnit')}
          description={t('profile.weightUnitDescription', { unit: settings.weightUnit })}
        >
          <SegmentedControl
            value={settings.weightUnit}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lbs', label: 'lbs' },
            ]}
            onChange={(v) => updateSettings({ weightUnit: v as 'kg' | 'lbs' })}
          />
        </SettingRow>

        <SettingRow
          icon={<Ruler size={18} className="text-indigo-400" />}
          label={t('profile.distanceUnit')}
          description={t('profile.distanceUnitDescription', { unit: settings.distanceUnit })}
        >
          <SegmentedControl
            value={settings.distanceUnit}
            options={[
              { value: 'km', label: 'km' },
              { value: 'mi', label: 'mi' },
            ]}
            onChange={(v) => updateSettings({ distanceUnit: v as 'km' | 'mi' })}
          />
        </SettingRow>
      </section>

      {/* Danger Zone */}
      <section className="space-y-3">
        <SectionHeader>{t('profile.signOut')}</SectionHeader>

        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-500">{t('profile.signOut')}</p>
              <p className="text-[11px] text-red-500/70">{t('profile.signOutDescription')}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20"
            >
              <LogOut size={14} />
              {t('profile.signOut')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="flex justify-center pt-2">
        <p className="text-[11px] font-medium text-slate-600">App Version {APP_VERSION}</p>
      </div>
    </div>
  );
}
