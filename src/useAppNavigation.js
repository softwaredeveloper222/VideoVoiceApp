import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const HOME_PATH = "/";

let trappedPath = null;

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
 * When the user lands on a route with no in-app history (e.g. typing /question
 * in the URL bar), trap the browser-back action and send them to home instead
 * of leaving the app or showing a blank page.
 */
export function HistoryFallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === HOME_PATH) {
      trappedPath = null;
      return;
    }

    if (canGoBackInApp()) {
      trappedPath = null;
      return;
    }

    if (trappedPath === location.pathname) return;
    trappedPath = location.pathname;

    window.history.pushState({ backTrap: true }, "", window.location.href);

    const handlePopState = () => {
      trappedPath = null;
      navigate(HOME_PATH, { replace: true });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
}
