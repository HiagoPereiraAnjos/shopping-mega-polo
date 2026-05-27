import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Clock,
  Copy,
  Download,
  Info,
  LayoutGrid,
  Map,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Share2,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SEO } from '../components/ui/SEO';
import { usePlanning } from '../hooks/usePlanning';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useStores } from '../hooks/useStores';
import { allowMockFallback } from '../config/environment';
import { createWhatsAppLink } from '../utils/whatsapp';
import { buildBreadcrumbStructuredData, buildOrganizationStructuredData } from '../utils/seo';
import type { Store as PublicStore } from '../types';

interface RouteItemView {
  identity: string;
  addedAt: string;
  displayName: string;
  floor: string;
  storeNumber: string;
  whatsapp?: string;
  note?: string;
  image?: string;
  hasStoreReference: boolean;
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim();
}

function floorRank(value: string): number {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('subsolo')) {
    return -1;
  }

  if (normalized.includes('terreo')) {
    return 0;
  }

  const numberMatch = normalized.match(/(\d+)/);
  if (numberMatch) {
    return Number(numberMatch[1]);
  }

  return 99;
}

function floorSort(a: string, b: string): number {
  const rankDelta = floorRank(a) - floorRank(b);
  if (rankDelta !== 0) {
    return rankDelta;
  }

  return a.localeCompare(b, 'pt-BR');
}

function buildStoreLookup(stores: PublicStore[]): Map<string, PublicStore> {
  const map = new Map<string, PublicStore>();
  for (const store of stores) {
    map.set(`id:${store.id}`, store);
    map.set(`slug:${store.slug}`, store);
  }
  return map;
}

function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}

export default function MyRoute() {
  const {
    items,
    removeItem,
    updateNote,
    clearPlanning,
    moveItem,
    getItemIdentity,
    generateShareMessage,
    getPrintableHtml,
  } = usePlanning();
  const { settings } = useSiteSettings();
  const { publicStores } = useStores({
    publishedOnly: true,
    fallbackToMock: allowMockFallback,
  });

  const [feedback, setFeedback] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const storeLookup = useMemo(() => buildStoreLookup(publicStores), [publicStores]);

  const resolvedItems = useMemo<RouteItemView[]>(() => {
    return items.map((item) => {
      const identity = getItemIdentity(item);
      const storeFromLookup =
        storeLookup.get(`id:${item.store_id}`) ??
        storeLookup.get(`slug:${item.slug}`);

      return {
        identity,
        addedAt: item.added_at,
        displayName: storeFromLookup?.name || item.name,
        floor: normalizeText(storeFromLookup?.floor) || item.floor,
        storeNumber: normalizeText(storeFromLookup?.unit) || item.store_number,
        whatsapp: normalizeText(storeFromLookup?.whatsapp) || item.whatsapp,
        note: item.note,
        image: storeFromLookup?.image,
        hasStoreReference: !!storeFromLookup,
      };
    });
  }, [getItemIdentity, items, storeLookup]);

  const groupedByFloor = useMemo(() => {
    const map = new Map<string, RouteItemView[]>();

    for (const routeItem of resolvedItems) {
      const floor = normalizeText(routeItem.floor) || 'Piso nao informado';
      const currentGroup = map.get(floor) ?? [];
      currentGroup.push(routeItem);
      map.set(floor, currentGroup);
    }

    return Array.from(map.entries()).sort(([a], [b]) => floorSort(a, b));
  }, [resolvedItems]);

  const floors = useMemo(
    () => groupedByFloor.map(([floor]) => floor),
    [groupedByFloor],
  );
  const estimatedTime = resolvedItems.length * 20;
  const unavailableCount = resolvedItems.filter((item) => !item.hasStoreReference).length;

  const shareMessage = useMemo(
    () => generateShareMessage('Roteiro de compras | Mega Polo Moda'),
    [generateShareMessage],
  );
  const shareWhatsAppUrl = useMemo(
    () => buildWhatsAppShareUrl(shareMessage),
    [shareMessage],
  );
  const mapsUrl = useMemo(() => {
    const address = settings.address?.trim() || 'Rua Barao de Ladario, 670 - Bras, Sao Paulo - SP';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }, [settings.address]);

  const handleCopyRoute = async () => {
    const copied = await copyToClipboard(shareMessage);
    if (copied) {
      showFeedback('Roteiro copiado com sucesso.');
      return;
    }
    showFeedback('Nao foi possivel copiar o roteiro.');
  };

  const handlePDFDownload = () => {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=820');
    if (!printWindow) {
      showFeedback('Nao foi possivel abrir a janela para exportacao em PDF.');
      return;
    }

    const html = getPrintableHtml('Roteiro de Compras - Mega Polo Moda');
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const structuredData = useMemo(
    () => [
      buildOrganizationStructuredData(settings),
      buildBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Meu Roteiro', path: '/meu-roteiro' },
      ]),
    ],
    [settings],
  );

  return (
    <div className="bg-brand-paper min-h-screen pt-32 pb-24">
      <SEO
        title="Meu Roteiro de Compras"
        description="Organize suas lojas favoritas e planeje sua visita ao Mega Polo Moda."
        canonical="/meu-roteiro"
        robots="noindex,follow"
        structuredData={structuredData}
      />

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-[100] bg-brand-dark text-white px-8 py-4 rounded-full text-[10px] tracking-premium font-bold shadow-2xl flex items-center gap-3 border border-white/10 uppercase italic"
            role="status"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 text-brand-gold" />
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-12 space-y-4">
          <h1 className="text-4xl md:text-6xl font-serif">Meu Roteiro de Compras</h1>
          <p className="text-brand-dark/40 text-sm md:text-base font-sans max-w-3xl">
            Salve lojas por piso, registre observacoes e compartilhe um roteiro de visita mais organizado para sua equipe.
          </p>
        </header>

        {resolvedItems.length === 0 ? (
          <div className="py-32 text-center space-y-8 bg-white rounded-2xl border border-dashed border-brand-dark/10">
            <div className="w-20 h-20 bg-brand-paper rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="w-10 h-10 text-brand-dark/10" />
            </div>
            <div className="space-y-2 px-6">
              <h2 className="text-2xl font-serif">Seu roteiro ainda esta vazio</h2>
              <p className="text-brand-dark/40 max-w-md mx-auto font-sans">
                Monte seu roteiro para otimizar o tempo no Brás e visitar as lojas com mais estratégia.
              </p>
            </div>
            <Link
              to="/lojas"
              className="inline-flex items-center gap-3 px-10 py-5 bg-brand-dark text-white text-[11px] tracking-brand font-bold rounded-md hover:bg-brand-red transition-all shadow-xl uppercase"
            >
              Ir para guia de lojas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2 space-y-8">
              {unavailableCount > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 px-5 py-4 text-sm flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    {unavailableCount} {unavailableCount === 1 ? 'loja foi removida ou despublicada' : 'lojas foram removidas ou despublicadas'}.
                    O roteiro foi mantido com dados salvos para não perder seu planejamento.
                  </p>
                </div>
              )}

              {groupedByFloor.map(([floor, floorItems]) => (
                <section key={floor} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm tracking-brand font-bold text-brand-gold uppercase">
                      {floor} • {floorItems.length} {floorItems.length === 1 ? 'loja' : 'lojas'}
                    </h2>
                  </div>

                  {floorItems.map((routeItem) => {
                    const index = resolvedItems.findIndex(
                      (item) => item.identity === routeItem.identity,
                    );

                    return (
                      <div
                        key={routeItem.identity}
                        className="bg-white p-6 md:p-8 rounded-xl shadow-soft border border-brand-dark/5 flex flex-col gap-6"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <h3 className="text-2xl font-serif font-bold text-brand-dark">
                              {routeItem.displayName}
                            </h3>
                            <p className="text-[10px] tracking-brand font-bold text-brand-dark/40 uppercase">
                              Adicionada em{' '}
                              {new Date(routeItem.addedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveItem(routeItem.identity, 'up')}
                              disabled={index <= 0}
                              className="p-2 rounded-md border border-brand-dark/10 text-brand-dark/60 hover:text-brand-dark hover:border-brand-dark/30 disabled:opacity-35 disabled:cursor-not-allowed"
                              aria-label={`Mover ${routeItem.displayName} para cima`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveItem(routeItem.identity, 'down')}
                              disabled={index < 0 || index >= resolvedItems.length - 1}
                              className="p-2 rounded-md border border-brand-dark/10 text-brand-dark/60 hover:text-brand-dark hover:border-brand-dark/30 disabled:opacity-35 disabled:cursor-not-allowed"
                              aria-label={`Mover ${routeItem.displayName} para baixo`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(routeItem.identity)}
                              className="p-2 rounded-md border border-red-100 text-red-600 hover:border-red-300 hover:bg-red-50"
                              aria-label={`Remover ${routeItem.displayName} do roteiro`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-bold text-brand-dark/60 font-sans">
                          <span className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-brand-red" />
                            {routeItem.floor} • {routeItem.storeNumber}
                          </span>
                          {!routeItem.hasStoreReference && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-700 text-[10px] uppercase tracking-brand">
                              <AlertCircle className="w-3 h-3" />
                              Loja indisponivel
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor={`route-note-${routeItem.identity}`}
                            className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase flex items-center gap-2"
                          >
                            <Info className="w-3 h-3" />
                            Observacao
                          </label>
                          <textarea
                            id={`route-note-${routeItem.identity}`}
                            placeholder="Ex: Ver pedido minimo e prazo de entrega..."
                            className="w-full bg-brand-paper/50 border border-brand-dark/5 rounded-md p-4 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-brand-red/10 h-24 resize-none transition-all"
                            value={routeItem.note || ''}
                            onChange={(event) => updateNote(routeItem.identity, event.target.value)}
                          />
                        </div>

                        {routeItem.whatsapp && (
                          <div>
                            <a
                              href={createWhatsAppLink(
                                routeItem.whatsapp,
                                `Ola ${routeItem.displayName}, estou organizando meu roteiro no Mega Polo Moda e gostaria de mais informacoes.`,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-[10px] tracking-brand font-bold text-brand-red hover:underline uppercase"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Falar com a loja
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>

            <aside className="space-y-6 sticky top-32">
              <div className="bg-brand-dark p-8 rounded-2xl text-white space-y-8 shadow-2xl">
                <h3 className="text-xl font-serif italic border-b border-white/10 pb-4">
                  Resumo da Visita
                </h3>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-white/40">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-widest font-bold">
                        Total de Lojas
                      </span>
                    </div>
                    <span className="font-serif text-2xl italic">{resolvedItems.length}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-white/40">
                      <LayoutGrid className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-widest font-bold">
                        Pisos no roteiro
                      </span>
                    </div>
                    <span className="font-serif text-2xl italic">{floors.length}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-white/40">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-widest font-bold">
                        Tempo Sugerido
                      </span>
                    </div>
                    <span className="font-serif text-2xl italic">{estimatedTime} min</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4">
                  <h4 className="text-[10px] tracking-brand font-bold text-brand-gold uppercase">
                    Compartilhar roteiro
                  </h4>
                  <p className="text-sm text-white/60 font-sans leading-relaxed">
                    Envie o roteiro no WhatsApp, copie o conteúdo ou exporte em PDF para levar na visita.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <a
                    href={shareWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-brand-red rounded-lg text-[10px] tracking-brand font-bold hover:bg-white hover:text-brand-red transition-all uppercase"
                  >
                    <Share2 className="w-4 h-4" />
                    Enviar por WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleCopyRoute()}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-lg text-[10px] tracking-brand font-bold hover:bg-white/10 transition-all uppercase"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar roteiro
                  </button>
                  <button
                    type="button"
                    onClick={handlePDFDownload}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-lg text-[10px] tracking-brand font-bold hover:bg-white/10 transition-all uppercase"
                  >
                    <Download className="w-4 h-4" />
                    Baixar roteiro em PDF
                  </button>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 rounded-lg text-[10px] tracking-brand font-bold hover:bg-white/10 transition-all uppercase"
                  >
                    <Map className="w-4 h-4" />
                    Ver como chegar
                  </a>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-soft border border-brand-dark/5 space-y-4">
                <p className="text-[10px] tracking-brand font-bold text-brand-gold uppercase">
                  Pisos envolvidos
                </p>
                <div className="flex flex-wrap gap-2">
                  {floors.map((floor) => (
                    <span
                      key={floor}
                      className="px-3 py-1.5 bg-brand-paper rounded text-xs font-bold text-brand-dark/60 uppercase"
                    >
                      {floor}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-brand-dark/10 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-200 text-red-700 text-[10px] tracking-brand font-bold hover:bg-red-50 transition-all uppercase"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar roteiro inteiro
                  </button>
                  <Link
                    to="/lojas"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-brand-dark/15 text-brand-dark text-[10px] tracking-brand font-bold hover:border-brand-red hover:text-brand-red transition-all uppercase"
                  >
                    Ver mais lojas
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-route-title"
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.97, opacity: 0, y: 8 }}
              className="w-full max-w-md rounded-2xl bg-white border border-brand-dark/10 shadow-2xl p-6 space-y-5"
            >
              <div className="space-y-2">
                <h3 id="clear-route-title" className="text-xl font-serif font-bold text-brand-dark">
                  Limpar roteiro inteiro?
                </h3>
                <p className="text-sm text-brand-dark/70">
                  Esta acao remove todas as lojas salvas no seu roteiro atual.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearPlanning();
                    setShowClearConfirm(false);
                    showFeedback('Roteiro limpo com sucesso.');
                  }}
                  className="px-4 py-2 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
                >
                  Limpar tudo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
