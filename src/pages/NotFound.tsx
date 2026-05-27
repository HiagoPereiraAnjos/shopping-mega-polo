import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { SEO } from '../components/ui/SEO';

export default function NotFound() {
  return (
    <div className="bg-brand-paper min-h-[70vh] flex items-center justify-center px-6 py-20">
      <SEO
        title="Página não encontrada | Mega Polo Moda"
        description="A página solicitada não foi encontrada."
        robots="noindex,nofollow"
      />
      <div className="max-w-xl w-full bg-white border border-brand-dark/5 rounded-[28px] shadow-soft p-8 md:p-12 text-center space-y-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-brand-paper flex items-center justify-center">
          <SearchX className="w-8 h-8 text-brand-dark/30" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-serif font-bold italic">Página não encontrada</h1>
          <p className="text-brand-dark/60 font-sans">
            A página que você procura não existe ou foi movida.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-7 py-3 rounded-lg bg-brand-dark text-white text-[11px] tracking-brand font-bold uppercase hover:bg-brand-red transition-colors"
          >
            Voltar para Home
          </Link>
          <Link
            to="/lojas"
            className="px-7 py-3 rounded-lg border border-brand-dark/15 text-brand-dark text-[11px] tracking-brand font-bold uppercase hover:border-brand-red hover:text-brand-red transition-colors"
          >
            Ver lojas
          </Link>
        </div>
      </div>
    </div>
  );
}
