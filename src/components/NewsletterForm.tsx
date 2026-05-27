import React, { useId, useState } from 'react';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribeNewsletter } from '../services/newsletter.service';
import { maskPhone } from '../utils/masks';
import { hasValidEmail, hasValidPhone } from '../utils/validation';

interface NewsletterFormProps {
  variant?: 'default' | 'footer' | 'compact';
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  showCategory?: boolean;
}

const SUBMIT_DEBOUNCE_MS = 1200;

export default function NewsletterForm({
  variant = 'default',
  title,
  subtitle,
  buttonLabel = 'CADASTRAR',
  showCategory = false,
}: NewsletterFormProps) {
  const formId = useId();
  const ids = {
    name: `${formId}-name`,
    email: `${formId}-email`,
    whatsapp: `${formId}-whatsapp`,
    category: `${formId}-category`,
    footerEmail: `${formId}-footer-email`,
    errorName: `${formId}-error-name`,
    errorEmail: `${formId}-error-email`,
    errorWhatsapp: `${formId}-error-whatsapp`,
    errorForm: `${formId}-error-form`,
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    category: '',
    honeypot: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSubmitAt, setLastSubmitAt] = useState(0);

  const isCompactNameRequired = variant === 'default' || variant === 'compact';

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (isCompactNameRequired && !formData.name.trim()) {
      newErrors.name = 'Nome e obrigatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail e obrigatorio';
    } else if (!hasValidEmail(formData.email.trim())) {
      newErrors.email = 'E-mail invalido';
    }

    if (formData.whatsapp.trim() && !hasValidPhone(formData.whatsapp)) {
      newErrors.whatsapp = 'WhatsApp invalido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'loading') {
      return;
    }

    if (formData.honeypot.trim()) {
      setStatus('error');
      setFormError('Nao foi possivel concluir o envio. Tente novamente.');
      return;
    }

    if (Date.now() - lastSubmitAt < SUBMIT_DEBOUNCE_MS) {
      setStatus('error');
      setFormError('Aguarde um instante antes de enviar novamente.');
      return;
    }

    setFormError(null);

    if (!validate()) {
      setStatus('error');
      return;
    }

    setStatus('loading');

    const result = await subscribeNewsletter({
      email: formData.email.trim(),
      name: isCompactNameRequired ? formData.name.trim() || undefined : undefined,
      consent: true,
    });

    setLastSubmitAt(Date.now());

    if (result.error) {
      setStatus('error');
      setFormError(result.error);
      return;
    }

    setStatus('success');
    setErrors({});
    setFormError(null);
    setFormData({ name: '', email: '', whatsapp: '', category: '', honeypot: '' });
    setTimeout(() => setStatus('idle'), 5000);
  };

  if (variant === 'footer') {
    return (
      <div className="space-y-4">
        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 text-brand-gold text-xs font-bold tracking-premium uppercase animate-pulse"
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="w-4 h-4" />
            E-mail cadastrado com sucesso.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="relative" noValidate>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={formData.honeypot}
              onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
              className="hidden"
              aria-hidden="true"
            />
            <label htmlFor={ids.footerEmail} className="sr-only">
              E-mail profissional
            </label>
            <input
              id={ids.footerEmail}
              type="email"
              placeholder="E-mail profissional"
              className={`w-full bg-transparent border-b ${errors.email ? 'border-brand-red' : 'border-brand-paper/10'} py-3 text-sm focus:outline-none focus:border-brand-red transition-colors pr-10 font-sans`}
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
                if (formError) setFormError(null);
              }}
              disabled={status === 'loading'}
              required
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? ids.errorEmail : undefined}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="absolute right-0 bottom-3 text-brand-gold hover:text-brand-red transition-colors disabled:opacity-50 text-[10px] tracking-brand font-bold uppercase"
              aria-label="Enviar cadastro de e-mail"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  {buttonLabel}
                  <Send className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
            {errors.email && (
              <span id={ids.errorEmail} className="absolute -bottom-6 left-0 text-xs text-brand-red font-bold" role="alert">
                {errors.email}
              </span>
            )}
            {formError && (
              <span
                id={ids.errorForm}
                className="absolute -bottom-11 left-0 text-xs text-brand-red font-bold"
                role="alert"
              >
                {formError}
              </span>
            )}
          </form>
        )}
      </div>
    );
  }

  return (
    <div className={variant === 'default' ? 'space-y-10' : 'space-y-6'}>
      {(title || subtitle) && (
        <div className="space-y-4">
          {title && <h3 className="text-4xl font-serif">{title}</h3>}
          {subtitle && <p className="text-brand-dark/60 font-sans">{subtitle}</p>}
        </div>
      )}

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-green-50 border border-green-600/10 p-8 rounded-2xl flex flex-col items-center text-center gap-4"
            role="status"
            aria-live="polite"
          >
            <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-brand-dark font-bold text-sm">CADASTRO REALIZADO!</p>
              <p className="text-brand-dark/70 text-xs">Voce recebera novidades do Mega Polo Moda em breve.</p>
            </div>
            <button onClick={() => setStatus('idle')} className="mt-2 text-xs font-bold tracking-brand text-green-700 hover:underline uppercase">
              NOVO CADASTRO
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-4 text-left" noValidate>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={formData.honeypot}
              onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
              className="hidden"
              aria-hidden="true"
            />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor={ids.name} className="text-xs font-bold tracking-premium text-brand-dark/60 uppercase pl-1">
                  Seu Nome {isCompactNameRequired ? '*' : ''}
                </label>
                <input
                  id={ids.name}
                  type="text"
                  placeholder="Ex: Joao Silva"
                  className={`w-full bg-white border ${errors.name ? 'border-brand-red' : 'border-brand-dark/5'} p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition-all font-sans text-sm`}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (errors.name) setErrors({ ...errors, name: '' });
                    if (formError) setFormError(null);
                  }}
                  required={isCompactNameRequired}
                  aria-required={isCompactNameRequired}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? ids.errorName : undefined}
                />
                {errors.name && (
                  <span id={ids.errorName} className="text-xs text-brand-red font-bold pl-1" role="alert">
                    {errors.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor={ids.email} className="text-xs font-bold tracking-premium text-brand-dark/60 uppercase pl-1">
                    E-mail *
                  </label>
                  <input
                    id={ids.email}
                    type="email"
                    placeholder="E-mail profissional"
                    className={`w-full bg-white border ${errors.email ? 'border-brand-red' : 'border-brand-dark/5'} p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition-all font-sans text-sm`}
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) setErrors({ ...errors, email: '' });
                      if (formError) setFormError(null);
                    }}
                    required
                    aria-required="true"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? ids.errorEmail : undefined}
                  />
                  {errors.email && (
                    <span id={ids.errorEmail} className="text-xs text-brand-red font-bold pl-1" role="alert">
                      {errors.email}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={ids.whatsapp} className="text-xs font-bold tracking-premium text-brand-dark/60 uppercase pl-1">
                    WhatsApp
                  </label>
                  <input
                    id={ids.whatsapp}
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className={`w-full bg-white border ${errors.whatsapp ? 'border-brand-red' : 'border-brand-dark/5'} p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition-all font-sans text-sm`}
                    value={formData.whatsapp}
                    onChange={(e) => {
                      setFormData({ ...formData, whatsapp: maskPhone(e.target.value) });
                      if (errors.whatsapp) setErrors({ ...errors, whatsapp: '' });
                      if (formError) setFormError(null);
                    }}
                    aria-invalid={!!errors.whatsapp}
                    aria-describedby={errors.whatsapp ? ids.errorWhatsapp : undefined}
                  />
                  {errors.whatsapp && (
                    <span id={ids.errorWhatsapp} className="text-xs text-brand-red font-bold pl-1" role="alert">
                      {errors.whatsapp}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-brand-dark/60 px-1">Seu e-mail sera usado para enviar novidades e comunicados do Mega Polo Moda.</p>

              {showCategory && (
                <div className="space-y-1.5">
                  <label htmlFor={ids.category} className="text-xs font-bold tracking-premium text-brand-dark/60 uppercase pl-1">
                    Segmento de Interesse
                  </label>
                  <select
                    id={ids.category}
                    className="w-full bg-white border border-brand-dark/5 p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/10 transition-all font-sans text-sm appearance-none"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Selecione um segmento</option>
                    <option value="jeans">JEANS</option>
                    <option value="plus-size">PLUS SIZE</option>
                    <option value="festa">MODA FESTA</option>
                    <option value="feminino">FEMININO</option>
                    <option value="masculino">MASCULINO</option>
                  </select>
                </div>
              )}
            </div>

            {formError && (
              <p id={ids.errorForm} className="text-xs text-brand-red font-bold px-1" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full py-5 bg-brand-dark text-white text-xs tracking-brand font-bold rounded-lg hover:bg-brand-red transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-xl"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                <>
                  {buttonLabel} <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
