import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SiteHeaderContext = createContext(null);

/**
 * Optional overrides for the global site header (e.g. receipt: custom back + title).
 */
export function SiteHeaderProvider({ children }) {
  const [overrides, setOverrides] = useState({});

  const setSiteHeaderOverrides = useCallback((patch) => {
    setOverrides((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSiteHeaderOverrides = useCallback(() => {
    setOverrides({});
  }, []);

  const value = useMemo(
    () => ({
      overrides,
      setSiteHeaderOverrides,
      resetSiteHeaderOverrides,
    }),
    [overrides, setSiteHeaderOverrides, resetSiteHeaderOverrides]
  );

  return <SiteHeaderContext.Provider value={value}>{children}</SiteHeaderContext.Provider>;
}

export function useSiteHeader() {
  const ctx = useContext(SiteHeaderContext);
  if (!ctx) {
    return {
      overrides: {},
      setSiteHeaderOverrides: () => {},
      resetSiteHeaderOverrides: () => {},
    };
  }
  return ctx;
}
