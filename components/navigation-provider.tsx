"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type NavigationContextType = {
    mobileNavOpen: boolean;
    setMobileNavOpen: (open: boolean) => void;
    openMobileNav: () => void;
    closeMobileNav: () => void;
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const openMobileNav = () => setMobileNavOpen(true);
    const closeMobileNav = () => setMobileNavOpen(false);

    return (
        <NavigationContext.Provider
            value={{ mobileNavOpen, setMobileNavOpen, openMobileNav, closeMobileNav }}
        >
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error("useNavigation must be used within NavigationProvider");
    }
    return context;
}
