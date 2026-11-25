import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "./use-mutation";

export const useGetMutation = (key, url, params = {}, options = {}) => {
  const { trigger } = useApiMutation();
  const queryClient = useQueryClient();

  const buildUrl = (baseUrl, extraParams = {}) => {
    const hasQuery = baseUrl.includes("?");
    const connector = hasQuery ? "&" : "?";
    const merged = { ...extraParams };
    // In all search don't pass the page number
    const hasSearch = Boolean(
      merged.search ||
      merged.search_term ||
      merged.searchTerm ||
      (typeof merged.search === "string" && merged.search.trim())
    );
    if (hasSearch) {
      delete merged.page;
    }
    const searchParams = new URLSearchParams(merged).toString();
    return `${baseUrl}${searchParams ? `${connector}${searchParams}` : ""}`;
  };

  const hasActiveSearch = Boolean(
    params.search ||
    params.search_term ||
    params.searchTerm ||
    (typeof params.search === "string" && params.search.trim())
  );

  const query = useQuery({
    queryKey: [key, params],
    queryFn: async () => {
      const finalUrl = buildUrl(url, params);
      const response = await trigger({ url: finalUrl });
      return response || [];
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
    ...options,
  });

  const prefetchPage = async (extraParams) => {
    // In all search don't prefetch or pass the page number
    if (hasActiveSearch || extraParams?.search) {
      return;
    }
    const finalUrl = buildUrl(url, { ...params, ...extraParams });

    await queryClient.prefetchQuery({
      queryKey: [key, { ...params, ...extraParams }],
      queryFn: async () => {
        const response = await trigger({ url: finalUrl });
        return response || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { ...query, prefetchPage };
};
