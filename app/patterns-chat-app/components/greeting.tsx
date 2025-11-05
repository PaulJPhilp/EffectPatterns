"use client";

import { motion } from "framer-motion";
import { MemoriesWelcomeBanner } from "./memories-welcome";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        {/* Memories Welcome Banner */}
        <MemoriesWelcomeBanner />

        {/* Greeting Text */}
        <div>
          <div className="font-semibold text-xl md:text-2xl">
            Hello there!
          </div>
          <div className="text-xl text-zinc-500 md:text-2xl">
            How can I help you today?
          </div>
        </div>
      </motion.div>
    </div>
  );
};
