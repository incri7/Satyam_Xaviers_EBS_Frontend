import React from 'react';

export const PermissionSkeleton: React.FC = () => {
    return (
        <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
                <div
                    key={i}
                    className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center justify-between"
                >
                    <div className="w-1/4">
                        <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse" />
                    </div>
                    <div className="w-1/6">
                        <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
                    </div>
                    <div className="w-1/6">
                        <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
                    </div>
                    <div className="w-1/6">
                        <div className="h-4 bg-slate-100 rounded w-1/2 animate-pulse" />
                    </div>
                    <div className="w-1/6">
                        <div className="h-4 bg-slate-100 rounded w-2/3 animate-pulse" />
                    </div>
                    <div className="w-20">
                        <div className="h-8 bg-slate-100 rounded-lg w-full animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
};
