import { create } from 'zustand';

interface UiState {
    /** Mobile drawer state — the sidebar is always visible on lg+ screens. */
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
    isSidebarOpen: false,
    toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
}));
