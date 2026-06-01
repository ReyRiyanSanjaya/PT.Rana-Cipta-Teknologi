import React from 'react';
import { motion } from 'framer-motion';

/**
 * Wraps page content with a smooth enter/exit animation.
 * Use this inside DashboardLayout pages for consistent transitions.
 */
const PageTransition = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ 
                duration: 0.3, 
                ease: [0.25, 0.46, 0.45, 0.94] 
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
