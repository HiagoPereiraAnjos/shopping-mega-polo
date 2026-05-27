import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Lock, Store, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { useAuth } from '../hooks/useAuth';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { hasValidEmail } from '../utils/validation';

interface LoginLocationState {
  from?: string;
}

function getRedirectTarget(state: LoginLocationState | null): string {
  if (state?.from && state.from.startsWith('/admin')) {
    return state.from;
  }

  if (state?.from === '/dashboard') {
    return '/admin';
  }

  return '/admin';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSiteSettings();
  const { isAuthenticated, isLoading, signIn, resetPassword } = useAuth();

  const redirectTarget = useMemo(() => {
    return getRedirectTarget((location.state as LoginLocationState | null) ?? null);
  }, [location.state]);

  const loginTitle = settings.login_title?.trim() || 'Area do Lojista';
  const loginSubtitle =
    settings.login_subtitle?.trim() ||
    'Acesse para gerenciar sua loja, lancamentos e informacoes comerciais.';
  const loginImage = settings.login_image_url?.trim() || settings.logo_url;
  const copyrightYear = settings.copyright_year?.trim() || new Date().getFullYear().toString();
  const copyrightText = settings.copyright_text?.trim() || settings.site_name;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTarget]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError('Por favor, preencha e-mail e senha.');
      return;
    }

    if (!hasValidEmail(trimmedEmail)) {
      setError('Informe um e-mail valido.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter ao menos 6 caracteres.');
      return;
    }

    setError('');
    setInfoMessage('');
    setIsSubmitting(true);

    const result = await signIn(trimmedEmail, password);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    navigate(redirectTarget, { replace: true });
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    setError('');
    setInfoMessage('');

    if (!trimmedEmail || !hasValidEmail(trimmedEmail)) {
      setError('Informe um e-mail valido para recuperar a senha.');
      return;
    }

    setIsResettingPassword(true);
    const result = await resetPassword(trimmedEmail);
    setIsResettingPassword(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setInfoMessage('Enviamos um link de recuperacao para seu e-mail.');
  };

  return (
    <div className="min-h-screen bg-brand-paper flex items-center justify-center p-6">
      <SEO
        title={loginTitle}
        description={loginSubtitle}
        canonical="/login"
        robots="noindex,nofollow"
        ogImage={settings.default_og_image_url || settings.logo_url}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full py-12"
      >
        <div className="bg-white p-6 md:p-12 rounded-[32px] shadow-2xl border border-brand-dark/5 space-y-10">
          <div className="text-center space-y-6">
            <Link to="/" className="inline-block">
              <ImageWithFallback
                src={loginImage}
                alt="Mega Polo Moda"
                className="h-24 mx-auto w-auto object-contain"
                loading="eager"
                width={280}
                height={120}
                sizes="280px"
              />
            </Link>

            <div className="space-y-2">
              <h1 className="text-3xl font-serif font-bold italic">{loginTitle}</h1>
              <p className="text-brand-dark/60 text-sm font-sans leading-relaxed">{loginSubtitle}</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold text-center border border-red-100 italic"
                  role="alert"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {infoMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-brand-paper text-brand-dark/80 p-4 rounded-xl text-xs font-bold text-center border border-brand-dark/10 italic"
                  role="status"
                  aria-live="polite"
                >
                  {infoMessage}
                </motion.div>
              )}
            </AnimatePresence>

            {isLoading && (
              <div
                className="bg-brand-paper text-brand-dark/70 p-4 rounded-xl text-xs font-bold text-center border border-brand-dark/10"
                role="status"
                aria-live="polite"
              >
                Verificando sessao...
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2 group">
                <label
                  htmlFor="login-email"
                  className="text-xs tracking-premium font-bold text-brand-dark/60 uppercase pl-1"
                >
                  E-mail *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40 group-focus-within:text-brand-red transition-colors" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="exemplo@marca.com.br"
                    className="w-full bg-brand-paper p-5 pl-12 rounded-2xl text-sm font-sans focus:outline-none focus:ring-1 focus:ring-brand-red/20 transition-all border border-transparent focus:border-brand-red/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-required="true"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <div className="flex justify-between items-center px-1">
                  <label
                    htmlFor="login-password"
                    className="text-xs tracking-premium font-bold text-brand-dark/60 uppercase"
                  >
                    Senha *
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResettingPassword || isSubmitting}
                    className="text-xs tracking-premium font-bold text-brand-red hover:underline uppercase italic disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isResettingPassword ? 'Enviando...' : 'Esqueci minha senha'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40 group-focus-within:text-brand-red transition-colors" />
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-brand-paper p-5 pl-12 rounded-2xl text-sm font-sans focus:outline-none focus:ring-1 focus:ring-brand-red/20 transition-all border border-transparent focus:border-brand-red/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-required="true"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-6 bg-brand-dark text-white rounded-2xl text-[11px] tracking-brand font-bold shadow-xl hover:bg-brand-red transition-all uppercase flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-10 border-t border-brand-dark/5 text-center space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-bold text-brand-dark/50 uppercase tracking-widest">
                Sua loja ja esta no Mega Polo?
              </p>
              <Link
                to="/abra-sua-loja"
                className="inline-flex items-center gap-3 px-8 py-4 bg-brand-paper rounded-full text-xs tracking-premium font-bold text-brand-dark hover:text-brand-red hover:bg-white border border-brand-dark/5 transition-all uppercase"
              >
                <Store className="w-4 h-4" />
                Reivindicar minha loja
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-xs tracking-premium text-brand-dark/40 font-bold uppercase">
          {`© ${copyrightYear} ${copyrightText} • Central do Lojista`}
        </p>
      </motion.div>
    </div>
  );
}
