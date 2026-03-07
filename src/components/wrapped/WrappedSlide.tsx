'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface WrappedSlideProps {
  children: ReactNode
  gradient: string
  direction?: 'left' | 'right'
}

export function WrappedSlide({ children, gradient, direction = 'right' }: WrappedSlideProps) {
  return (
    <motion.div
      className={`relative w-full h-full flex flex-col items-center justify-center p-8 text-white overflow-hidden ${gradient}`}
      initial={{ opacity: 0, x: direction === 'right' ? 100 : -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction === 'right' ? -100 : 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Decorative circles */}
      <div className="absolute top-10 -right-20 w-64 h-64 rounded-full bg-white/5 blur-xl" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5 blur-xl" />
      {children}
    </motion.div>
  )
}
