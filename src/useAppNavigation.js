import { useCallback, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const HOME_PATH = "/";

export function canGoBackInApp() {
  return (window.history.state?.idx ?? 0) > 0;
}

export function navigateBackOrHome(navigate, homePath = HOME_PATH) {
  if (canGoBackInApp()) {
    navigate(-1);
  } else {
    navigate(homePath, { replace: true });
  }
}

export function useNavigateBack(homePath = HOME_PATH) {
  const navigate = useNavigate();
  return useCallback(
    () => navigateBackOrHome(navigate, homePath),
    [navigate, homePath],
  );
}

/**
 * When the user lands directly on a deep link (no in-app history), seed home
 * so browser-back goes to "/" instead of leaving the app.
 */
export function HistoryFallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const seededRef = useRef(false);

  useLayoutEffect(() => {
    if (seededRef.current) return;
    if (location.pathname === HOME_PATH) return;
    if (canGoBackInApp()) return;

    seededRef.current = true;
    const target = `${location.pathname}${location.search}${location.hash}`;
    navigate(HOME_PATH, { replace: true });
    navigate(target);
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
