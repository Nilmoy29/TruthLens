"use client"

import { motion } from "framer-motion"

export function LoadingState({ message = "Analyzing..." }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <motion.div
        className="relative mb-6"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        <div className="w-16 h-16 border-4 border-gray-200 border-t-red-600 rounded-full"></div>
      </motion.div>

      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="text-2xl font-serif font-bold text-gray-900 mb-2 shine-effect">TruthLens</div>
        <p className="text-sm text-gray-600">{message}</p>
      </motion.div>
    </motion.div>
  )
}
