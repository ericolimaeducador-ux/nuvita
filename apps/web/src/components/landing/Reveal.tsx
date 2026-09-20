import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

// Entrada sutil (fade + slide-up) ao rolar. Roda uma vez por elemento; com
// "reduzir movimento" ativo no sistema, o <MotionConfig> da landing a desliga.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}
