import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, BookOpen, AlertCircle } from 'lucide-react';
import { academicsService } from '../../api/services/academics.service';

interface CreateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateClassModal: React.FC<CreateClassModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: academicsService.createClass,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            onClose();
            setName('');
            setError(null);
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || err.message || 'Failed to create class');
        }
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Class name is required');
            return;
        }
        mutation.mutate({ name });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Add New Class</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Class Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Grade 10, Bachelor in CS"
                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand/20 transition-all outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="pt-2 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full py-3.5 bg-brand text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:opacity-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? 'Creating...' : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Create Class</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
