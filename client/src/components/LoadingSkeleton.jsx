import React from 'react';

/**
 * Reusable loading skeleton component for dashboard pages.
 * Provides visual feedback while content is loading.
 */

export const SkeletonCard = ({ className = '' }) => (
    <div className={`animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 ${className}`}>
        <div className="flex items-start justify-between mb-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="space-y-2">
            <div className="h-8 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800/50" />
        </div>
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="h-12 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800" />
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800/50" />
                <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-800/50 ml-auto" />
            </div>
        ))}
    </div>
);

export const SkeletonChart = ({ className = '' }) => (
    <div className={`animate-pulse rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 ${className}`}>
        <div className="space-y-2 mb-6">
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-56 rounded bg-slate-100 dark:bg-slate-800/50" />
        </div>
        <div className="flex items-end gap-3 h-48">
            {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
                <div
                    key={i}
                    className="flex-1 rounded-t bg-slate-200 dark:bg-slate-800"
                    style={{ height: `${h}%` }}
                />
            ))}
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-8">
        <div className="space-y-2">
            <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-4 w-96 rounded bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <SkeletonChart className="lg:col-span-2" />
            <SkeletonCard />
        </div>
    </div>
);

export default DashboardSkeleton;
