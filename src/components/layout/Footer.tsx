import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle, Youtube } from 'lucide-react';
import { FALLBACK_FOOTER_SECTIONS, type FooterRuntimeSection } from '../../config/footerFallback';
import { shouldUseMockFallback } from '../../config/environment';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  listActiveFooterSectionsWithLinks,
  type FooterSectionWithLinks,
} from '../../services/footer.service';
import { createWhatsAppLink } from '../../utils/whatsapp';
import { ImageWithFallback } from '../ui/ImageWithFallback';
import NewsletterForm from '../NewsletterForm';

interface FooterRuntimeLink {
  id: string;
  footer_section_id: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

function mapToRuntimeSections(sections: FooterSectionWithLinks[]): FooterRuntimeSection[] {
  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    sort_order: section.sort_order,
    is_active: section.is_active,
    links: section.links.map((link) => ({
      id: link.id,
      footer_section_id: link.footer_section_id,
      label: link.label,
      url: link.url,
      sort_order: link.sort_order,
      is_active: link.is_active,
      open_in_new_tab: link.open_in_new_tab,
    })),
  }));
}

function normalizeText(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function isExternalUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(url);
}

function isWhatsAppShortcut(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === '#whatsapp' || normalized === 'whatsapp';
}

function resolveLinkUrl(
  link: FooterRuntimeLink,
  fallbackWhatsAppUrl: string,
): string {
  const rawUrl = normalizeText(link.url);
  const rawLabel = normalizeText(link.label).toLowerCase();

  if (isWhatsAppShortcut(rawUrl) || rawLabel.includes('whatsapp')) {
    return fallbackWhatsAppUrl;
  }

  return rawUrl;
}

function FooterLinkItem({
  link,
  fallbackWhatsAppUrl,
}: {
  link: FooterRuntimeLink;
  fallbackWhatsAppUrl: string;
}) {
  const resolvedUrl = resolveLinkUrl(link, fallbackWhatsAppUrl);
  if (!resolvedUrl) {
    return null;
  }

  const openInNewTab = link.open_in_new_tab || isExternalUrl(resolvedUrl);

  if (openInNewTab) {
    return (
      <a
        href={resolvedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-brand-red transition-colors"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link to={resolvedUrl} className="hover:text-brand-red transition-colors">
      {link.label}
    </Link>
  );
}

export default function Footer() {
  const canUseFallback = shouldUseMockFallback(true);
  const [sections, setSections] = useState<FooterRuntimeSection[]>(
    canUseFallback ? FALLBACK_FOOTER_SECTIONS : [],
  );
  const { settings } = useSiteSettings();

  const refreshSections = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSections(canUseFallback ? FALLBACK_FOOTER_SECTIONS : []);
      return;
    }

    const result = await listActiveFooterSectionsWithLinks();

    if (result.error || !result.data?.length) {
      setSections(canUseFallback ? FALLBACK_FOOTER_SECTIONS : []);
      return;
    }

    setSections(mapToRuntimeSections(result.data));
  }, [canUseFallback]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshSections();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshSections]);

  const activeSections = useMemo(
    () =>
      [...sections]
        .filter((section) => section.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [sections],
  );

  const whatsappUrl = useMemo(
    () => createWhatsAppLink(settings.whatsapp, settings.default_whatsapp_message),
    [settings.default_whatsapp_message, settings.whatsapp],
  );

  const socialLinks = useMemo(
    () => [
      {
        id: 'instagram',
        icon: Instagram,
        url: normalizeText(settings.instagram_url),
        label: `Instagram do ${settings.site_name}`,
      },
      {
        id: 'facebook',
        icon: Facebook,
        url: normalizeText(settings.facebook_url),
        label: `Facebook do ${settings.site_name}`,
      },
      {
        id: 'youtube',
        icon: Youtube,
        url: normalizeText(settings.youtube_url),
        label: `YouTube do ${settings.site_name}`,
      },
      {
        id: 'whatsapp',
        icon: MessageCircle,
        url: whatsappUrl,
        label: 'Falar com atendimento no WhatsApp',
      },
    ].filter((item) => !!item.url),
    [
      settings.facebook_url,
      settings.instagram_url,
      settings.site_name,
      settings.youtube_url,
      whatsappUrl,
    ],
  );

  const currentYear = new Date().getFullYear().toString();
  const copyrightYear = normalizeText(settings.copyright_year) || currentYear;
  const copyrightText =
    normalizeText(settings.copyright_text) ||
    normalizeText(settings.footer_copyright_text) ||
    settings.site_name;
  const institutionalPhrase = normalizeText(settings.footer_institutional_phrase);
  const legalText = normalizeText(settings.footer_legal_text);
  const newsletterTitle = normalizeText(settings.footer_newsletter_title) || 'Insights';
  const newsletterText =
    normalizeText(settings.footer_newsletter_text) || 'Receba os destaques do Bras em seu e-mail.';
  const newsletterButtonLabel =
    normalizeText(settings.footer_newsletter_button_label) || 'Cadastrar';

  return (
    <footer className="bg-brand-dark text-brand-paper py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.1fr_1fr_1fr_1fr] gap-16 border-b border-brand-paper/5 pb-24">
          <div className="space-y-8">
            <Link to="/" className="group block">
              <ImageWithFallback
                src={settings.logo_url}
                alt={settings.site_name}
                className="h-20 w-auto object-contain brightness-0 invert"
                width={260}
                height={96}
                sizes="220px"
              />
            </Link>
            <p className="text-[13px] text-brand-paper/40 leading-relaxed max-w-xs font-sans">
              {settings.short_description}
            </p>
            <div className="space-y-1 text-xs text-brand-paper/50 font-sans leading-relaxed">
              {normalizeText(settings.phone) && <p>{settings.phone}</p>}
              {normalizeText(settings.email) && <p>{settings.email}</p>}
              {normalizeText(settings.address) && <p>{settings.address}</p>}
              {normalizeText(settings.opening_hours) && <p>{settings.opening_hours}</p>}
            </div>
            <div className="flex items-center gap-4">
              {socialLinks.map((item) => {
                const Icon = item.icon;
                const hoverClass =
                  item.id === 'whatsapp'
                    ? 'hover:bg-green-600 hover:border-green-600'
                    : 'hover:bg-brand-red hover:border-brand-red';

                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className={`p-2.5 border border-brand-paper/10 rounded-md transition-all duration-300 ${hoverClass}`}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
            {normalizeText(settings.institutional_image_url) && (
              <ImageWithFallback
                src={settings.institutional_image_url}
                alt={`Selo institucional do ${settings.site_name}`}
                className="h-10 w-auto object-contain opacity-90"
                width={120}
                height={40}
                sizes="120px"
              />
            )}
          </div>

          {activeSections.map((section) => (
            <div key={section.id} className="space-y-8">
              <h4 className="text-[10px] tracking-brand text-brand-gold font-bold uppercase">
                {section.title}
              </h4>
              <ul className="space-y-4 text-sm text-brand-paper/60 font-sans">
                {section.links
                  .filter((link) => link.is_active)
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((link) => (
                    <li key={link.id}>
                      <FooterLinkItem link={link} fallbackWhatsAppUrl={whatsappUrl} />
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          <div className="space-y-8">
            <h4 className="text-[10px] tracking-brand text-brand-gold font-bold uppercase">{newsletterTitle}</h4>
            <p className="text-[13px] text-brand-paper/40 font-sans">{newsletterText}</p>
            <NewsletterForm variant="footer" buttonLabel={newsletterButtonLabel} />
          </div>
        </div>

        <div className="pt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between text-[9px] tracking-brand text-brand-paper/50 font-bold uppercase">
          <span>{`(c) ${copyrightYear} ${copyrightText}`}</span>
          <div className="flex gap-10">
            <Link to="/privacidade" className="hover:text-brand-red transition-colors uppercase">Privacidade</Link>
            <Link to="/termos" className="hover:text-brand-red transition-colors uppercase">Termos</Link>
          </div>
        </div>

        {(institutionalPhrase || legalText) && (
          <div className="pt-4 space-y-2">
            {institutionalPhrase && (
              <p className="text-[11px] text-brand-paper/45 font-semibold uppercase tracking-brand">
                {institutionalPhrase}
              </p>
            )}
            {legalText && (
              <p className="text-[11px] text-brand-paper/35 font-sans">
                {legalText}
              </p>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}

