import { LogOut, Mail, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../auth/AuthProvider';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';

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
    <div className="flex rounded-lg bg-zinc-200 dark:bg-zinc-800 p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
            value === opt.value
              ? 'bg-blue-600 text-white'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { fullName, email, username, logout } = useAuth();
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
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t('profile.title')}</h1>

      <div className="space-y-4 max-w-2xl">
        {/* User Info */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
              <span className="text-blue-500 font-bold text-lg">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate">{fullName}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">@{username}</p>
            </div>
          </div>
          {email && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={15} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span className="text-zinc-500 dark:text-zinc-400 truncate">{email}</span>
              </div>
            </div>
          )}
        </Card>

        {/* Settings */}
        <Card className="space-y-5">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{t('profile.preferences')}</p>

          {/* Dark mode toggle */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t('profile.darkMode')}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-500">{t('profile.darkModeDescription')}</p>
            </div>
            <button
              onClick={() => updateSettings({ darkMode: !dark })}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                dark ? 'bg-blue-600' : 'bg-zinc-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center ${
                  dark ? 'translate-x-5.5' : 'translate-x-0.5'
                }`}
              >
                {dark ? <Moon size={12} className="text-blue-600" /> : <Sun size={12} className="text-amber-500" />}
              </div>
            </button>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800" />

          {/* Language */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t('profile.language')}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-500">{t('profile.languageDescription')}</p>
            </div>
            <SegmentedControl
              value={settings.language}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'de', label: 'DE' },
              ]}
              onChange={(v) => updateSettings({ language: v as 'en' | 'de' })}
            />
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800" />

          {/* Weight unit */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t('profile.weightUnit')}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-500">{t('profile.weightUnitDescription', { unit: settings.weightUnit })}</p>
            </div>
            <SegmentedControl
              value={settings.weightUnit}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lbs', label: 'lbs' },
              ]}
              onChange={(v) => updateSettings({ weightUnit: v as 'kg' | 'lbs' })}
            />
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800" />

          {/* Distance unit */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t('profile.distanceUnit')}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-500">{t('profile.distanceUnitDescription', { unit: settings.distanceUnit })}</p>
            </div>
            <SegmentedControl
              value={settings.distanceUnit}
              options={[
                { value: 'km', label: 'km' },
                { value: 'mi', label: 'mi' },
              ]}
              onChange={(v) => updateSettings({ distanceUnit: v as 'km' | 'mi' })}
            />
          </div>
        </Card>

        {/* Logout */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{t('profile.signOut')}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-500">{t('profile.signOutDescription')}</p>
            </div>
            <Button variant="default" size="sm" onClick={logout}>
              <LogOut size={14} /> {t('profile.signOut')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
