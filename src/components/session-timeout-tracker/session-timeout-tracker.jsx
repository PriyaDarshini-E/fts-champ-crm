import React from "react";
import { AlertTriangle } from "lucide-react";
import Cookies from "js-cookie";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { isAuthRoute } from "@/routes/common/route-paths";

const SessionTimeoutTracker = ({ expiryTime, onLogout }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isInitialized, setIsInitialized] = React.useState(false);

  const isPublicPage = isAuthRoute(location.pathname);

  React.useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
    }, 3000);

    return () => clearTimeout(initTimer);
  }, []);

  const isTokenPresent = () => {
    const token = Cookies.get("token");
    return !!token;
  };

  const validateExpiryTime = (expiryTime) => {
    if (!expiryTime) {
      return null;
    }

    try {
      const expiryDate = new Date(expiryTime);
      if (isNaN(expiryDate.getTime())) {
        return null;
      }

      return expiryDate;
    } catch (error) {
      console.error("❌ Error parsing expiry time:", error);
      return null;
    }
  };

  const calculateTimeUntilExpiry = (expiryDate) => {
    const now = new Date();
    const timeUntil = expiryDate - now;
    return timeUntil;
  };

  React.useEffect(() => {
    if (!isInitialized || isPublicPage) return;

    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      const url = args[0] || "";
      if (typeof url === "string" && url.includes("/api/")) {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();

          if (data?.message === "Unauthenticated." && isTokenPresent()) {
            onLogout();
          }
        } catch (error) {
          // Ignore JSON parsing errors
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [onLogout, isInitialized, isPublicPage]);

  React.useEffect(() => {
    if (!isInitialized || isPublicPage) return;

    const checkCookieChange = () => {
      queryClient.invalidateQueries({ queryKey: ["session-validation"] });
    };

    const interval = setInterval(checkCookieChange, 3000);

    return () => clearInterval(interval);
  }, [queryClient, isInitialized, isPublicPage]);

  const { data: sessionStatus } = useQuery({
    queryKey: ["session-validation", expiryTime],
    queryFn: () => {
      if (!isInitialized || isPublicPage) {
        return { status: "initializing", countdown: null };
      }

      if (!isTokenPresent()) {
        return { status: "no-token-warning", countdown: null };
      }

      const expiryDate = validateExpiryTime(expiryTime);
      if (!expiryDate) {
        return { status: "valid", countdown: null };
      }

      const timeUntilExpiry = calculateTimeUntilExpiry(expiryDate);
      const fiveMinutes = 5 * 60 * 1000;

      if (timeUntilExpiry <= -6) {
        return { status: "expired", countdown: 0 };
      }

      if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0) {
        return {
          status: "expiring",
          countdown: Math.floor(timeUntilExpiry / 1000),
        };
      }

      return { status: "valid", countdown: null };
    },
    refetchInterval: (query) => {
      if (!isInitialized || isPublicPage) return false;

      const state = query.state.data;

      if (state?.status === "expiring") {
        return 1000;
      }

      if (state?.status === "no-token-warning") {
        return 5000;
      }

      if (state?.status === "valid") {
        return 30000;
      }

      return false;
    },
    refetchOnWindowFocus: !isPublicPage,
    staleTime: 0,
    enabled: isInitialized && !isPublicPage,
  });

  React.useEffect(() => {
    if (!isPublicPage && sessionStatus?.status === "expired" && isTokenPresent()) {
      onLogout();
    }
  }, [sessionStatus?.status, onLogout, isPublicPage]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (
    !isInitialized ||
    isPublicPage ||
    sessionStatus?.status !== "expiring" ||
    !isTokenPresent()
  ) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md animate-slide-down">
      <div className="mx-4">
        <div className="bg-white rounded-lg shadow-xl border border-gray-300">
          <div
            className="h-1 bg-red-600 rounded-tl-lg"
            style={{
              width: `${(sessionStatus.countdown / 300) * 100}%`,
              transition: "width 1s linear",
            }}
          />
          <div className="p-2">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 rounded-full p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <div className="text-gray-800 text-sm">
                  Session timeout in{" "}
                  <span className="text-red-600 font-bold font-mono">
                    {formatTime(sessionStatus.countdown)}
                  </span>
                </div>
                <div className="text-gray-600 text-xs mt-1">
                  Save your work to prevent data loss
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutTracker;
