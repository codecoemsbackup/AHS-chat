import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FavoriteGif, FavoriteGifInput } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function useFavoriteGifs() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryKey = ["/api/favorite-gifs", user?.id || "anonymous"];
  const { data: favorites = [] } = useQuery<FavoriteGif[]>({
    queryKey,
    queryFn: () => apiRequest("/api/favorite-gifs", "GET"),
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const favoritesByUrl = new Map(favorites.map((favorite) => [favorite.url, favorite]));

  const toggleFavorite = async (gif: FavoriteGifInput) => {
    if (!user?.id) return;
    try {
      const currentFavorites =
        queryClient.getQueryData<FavoriteGif[]>(queryKey) || favorites;
      const existing = currentFavorites.find((favorite) => favorite.url === gif.url);
      if (existing) {
        await apiRequest(`/api/favorite-gifs/${encodeURIComponent(existing.id)}`, "DELETE");
        toast({ title: "Removed from favorite GIFs" });
      } else {
        await apiRequest("/api/favorite-gifs", "POST", gif);
        toast({ title: "Added to favorite GIFs" });
      }
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      toast({
        title: "Couldn't update favorite GIFs",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    favorites,
    isFavorite: (url: string) => favoritesByUrl.has(url),
    toggleFavorite,
  };
}
