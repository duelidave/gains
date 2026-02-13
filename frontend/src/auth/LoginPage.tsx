import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dumbbell } from 'lucide-react';

interface Props {
  registrationEnabled: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, displayName: string) => Promise<void>;
}

export function LoginPage({ registrationEnabled, onLogin, onRegister }: Props) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister(email, password, displayName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Dumbbell size={48} className="text-blue-500 mb-2" />
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {t('app.name', 'Fitness Tracker')}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white text-center">
            {mode === 'login' ? t('auth.login', 'Sign In') : t('auth.register', 'Create Account')}
          </h2>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {t('auth.displayName', 'Display Name')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {t('auth.email', 'Email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {t('auth.password', 'Password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading
              ? t('common.loading', 'Loading...')
              : mode === 'login'
                ? t('auth.login', 'Sign In')
                : t('auth.register', 'Create Account')}
          </button>

          {registrationEnabled && (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              {mode === 'login' ? (
                <>
                  {t('auth.noAccount', "Don't have an account?")}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError('');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('auth.register', 'Create Account')}
                  </button>
                </>
              ) : (
                <>
                  {t('auth.hasAccount', 'Already have an account?')}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t('auth.login', 'Sign In')}
                  </button>
                </>
              )}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
