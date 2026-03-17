import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  getListJunctionsQueryKey, 
  getListSignalsQueryKey, 
  getListAlertsQueryKey,
  getListIncidentsQueryKey
} from "@workspace/api-client-react";

/**
 * Custom hook to simulate real-time updates by polling the API
 * In a real app this would be WebSockets or SSE.
 */
export function useTrafficPolling(intervalMs = 3000) {
  const queryClient = useQueryClient();
  const savedCallback = useRef(() => {
    queryClient.invalidateQueries({ queryKey: getListJunctionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListSignalsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
  });

  useEffect(() => {
    const tick = () => savedCallback.current();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
