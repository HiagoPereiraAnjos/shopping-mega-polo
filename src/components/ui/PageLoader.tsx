import React from 'react';
import { motion } from 'motion/react';

export const PageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-brand-paper/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-center gap-6">
      <div className="relative w-16 h-16">
        <motion.div 
          className="absolute inset-0 border-2 border-brand-dark/5 rounded-full"
        />
        <motion.div 
          className="absolute inset-0 border-t-2 border-brand-red rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="text-[10px] tracking-brand font-bold text-brand-dark uppercase"
      >
        Carregando...
      </motion.p>
    </div>
  );
};
