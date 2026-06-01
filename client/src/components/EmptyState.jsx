import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable empty state component with consistent styling.
 * Use this when a page/section has no data to display.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Lucide icon component
 * @param {string} props.title - Main heading
 * @param {string} props.description - Supporting text
 * @param {React.ReactNode} [props.action] - Optional action button(s)
 * @param {string} [props.className] - Additional classes
 */
const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}
        >
            {Icon && (
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-indigo-400/20 rounded-full blur-xl" />
                    <div className="relative w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        <Icon size={28} className="text-slate-400 dark:text-slate-500" />
                    </div>
                </div>
            )}
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                    {description}
                </p>
            )}
            {action && (
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    {action}
                </div>
            )}
        </motion.div>
    );
};

export default EmptyState;
