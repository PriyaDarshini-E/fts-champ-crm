import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building,
  Search,
  Star,
  CheckCircle2,
  Heart,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import BASE_URL from "@/config/base-url";

const ChapterSelection = () => {
  const userType = Cookies.get("user_type_id");
  const [selectedChapterName, setSelectedChapterName] = useState("All Chapter");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const containerRef = useRef(null);

  // Fetch chapters
  const {
    data: chapters = [],
    isFetching,
  } = useQuery({
    queryKey: ["chapter-selection-all"],
    queryFn: async () => {
      const token = Cookies.get("token");

      // 1. Try /api/chapter-active with auth
      try {
        const res = await axios.get(`${BASE_URL}/api/chapter-active`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 1) {
          localStorage.setItem("all_chapters_cache", JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.warn("Could not fetch /api/chapter-active", err);
      }

      // 2. Try /api/getChapterForm (returns all chapters unconditionally)
      try {
        const res = await axios.get(`${BASE_URL}/api/getChapterForm`);
        const list = res.data?.data || res.data?.chapters || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          localStorage.setItem("all_chapters_cache", JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.warn("Could not fetch /api/getChapterForm", err);
      }

      // 3. Fallback to /api/fetch-profile-chapter
      try {
        const res = await axios.get(`${BASE_URL}/api/fetch-profile-chapter`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const list = res.data?.data || [];
        if (Array.isArray(list) && list.length > 1) {
          localStorage.setItem("all_chapters_cache", JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.warn("Could not fetch /api/fetch-profile-chapter", err);
      }

      // 4. Fallback to localStorage cache
      try {
        const cached = localStorage.getItem("all_chapters_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}

      return [];
    },
    retry: 2,
    staleTime: 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Restore data from cookies
  useEffect(() => {
    const storedName = Cookies.get("selected_chapter_name");
    const favs = Cookies.get("favorite_chapters");

    if (storedName) setSelectedChapterName(storedName);
    if (favs) {
      try {
        setFavorites(JSON.parse(favs));
      } catch (e) {}
    }
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsExpanded(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered chapters for search
  const filteredChapters = chapters.filter((c) =>
    c.chapter_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle favorite
  const toggleFavorite = (chapter, e) => {
    e.stopPropagation();
    const isFav = favorites.some(
      (f) => String(f.chapter_code) === String(chapter.chapter_code)
    );
    const updated = isFav
      ? favorites.filter(
          (f) => String(f.chapter_code) !== String(chapter.chapter_code)
        )
      : [chapter, ...favorites].slice(0, 5);

    setFavorites(updated);
    Cookies.set("favorite_chapters", JSON.stringify(updated), { expires: 30 });

    if (!isFav) toast.success("Added to favorites");
    else toast.success("Removed from favorites");
  };

  // Select chapter mutation
  const selectChapterMutation = useMutation({
    mutationFn: async (chapter_code) =>
      axios.post(
        `${BASE_URL}/api/update-profile-chapter`,
        { viewer_chapter_ids: chapter_code },
        { headers: { Authorization: `Bearer ${Cookies.get("token")}` } }
      ),
    onSuccess: (res, chapter_code) => {
      const selected = chapters.find(
        (it) => String(it.chapter_code) === String(chapter_code)
      );
      if (
        (res.data?.code === 201 ||
          res.data?.code === 200 ||
          res.status === 200) &&
        selected
      ) {
        if (selected.chapter_name !== selectedChapterName) {
          Cookies.set("selected_chapter_name", selected.chapter_name, {
            expires: 7,
          });
          setSelectedChapterName(selected.chapter_name);
          toast.success(`Switched to ${selected.chapter_name}`);
          setIsExpanded(false);
          setSearchTerm("");
          setTimeout(() => window.location.reload(), 0);
        } else {
          setIsExpanded(false);
          setSearchTerm("");
        }
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  // Clear selected chapter
  const clearChapterMutation = useMutation({
    mutationFn: async () =>
      axios.post(
        `${BASE_URL}/api/update-profile-chapter-clear`,
        { viewer_chapter_ids: "1" },
        { headers: { Authorization: `Bearer ${Cookies.get("token")}` } }
      ),
    onSuccess: (res) => {
      if (
        res.data?.code === 201 ||
        res.data?.code === 200 ||
        res.status === 200
      ) {
        Cookies.remove("selected_chapter_name");
        setSelectedChapterName("All Chapter");
        toast.success("Back to all chapters");
        setIsExpanded(false);
        setSearchTerm("");
        setTimeout(() => window.location.reload(), 0);
      }
    },
    onError: () => toast.error("Something went wrong"),
  });

  if (userType !== "4" && userType !== "5" && userType !== "3") return null;

  return (
    <div ref={containerRef} className="fixed top-4 right-4 z-50">
      {/* Compact Orb */}
      <div className="relative">
        {/* Main Orb Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            w-full h-8 rounded-md px-2 relative transition-all duration-200 shadow-lg hover:shadow-xl
            flex items-center justify-center
            ${isExpanded
                ? "bg-amber-500 scale-110"
                : "bg-gradient-to-br from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500"
            }
          `}
        >
          <Building className="h-4 w-4 text-white" />
          <div className="flex items-center ">
            <div className="w-2 h-2  rounded-full" />
            <span className="font-semibold text-xs text-amber-900 dark:text-amber-100 truncate max-w-[120px]">
              {selectedChapterName}
            </span>
          </div>
          {selectedChapterName !== "All Chapter" && (
            <div className="absolute -top-0.5 -right-0.5">
              <div className="w-2 h-2 bg-green-400 rounded-md border border-white" />
            </div>
          )}
        </button>

        {/* Expanded Panel */}
        {isExpanded && (
          <div className="absolute top-11 right-0 w-72 bg-amber-50 dark:bg-amber-950/30 rounded-xl shadow-xl border border-amber-200 dark:border-amber-800 overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-2 border-b border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <span className="font-semibold text-xs text-amber-900 dark:text-amber-100 truncate max-w-[120px]">
                    {selectedChapterName}
                  </span>
                </div>
                {selectedChapterName !== "All Chapter" && (
                  <button
                    onClick={() => clearChapterMutation.mutate()}
                    className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 px-1.5 py-0.5 rounded hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-colors"
                    disabled={clearChapterMutation.isLoading}
                  >
                    {clearChapterMutation.isLoading ? "..." : "Clear"}
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-amber-200 dark:border-amber-800 bg-amber-75 dark:bg-amber-900/20">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-amber-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chapters..."
                  className="pl-7 pr-2 h-7 text-xs rounded-lg border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-900/50 focus:bg-amber-50 dark:focus:bg-amber-900/70 text-amber-900 dark:text-amber-100 placeholder-amber-500 focus:border-amber-400"
                />
              </div>
            </div>

            {/* Content */}
            <div className="max-h-64 overflow-y-auto">
              {/* Quick Access Sections */}
              {!searchTerm && favorites.length > 0 && (
                <div className="space-y-1 p-1">
                  {/* Favorites */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 px-1.5 pt-1">
                      <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                      <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                        Favorites
                      </span>
                    </div>
                    {favorites.map((chapter) => (
                      <button
                        key={`fav-${chapter.chapter_code}`}
                        onClick={() =>
                          selectChapterMutation.mutate(chapter.chapter_code)
                        }
                        className="w-full flex items-center gap-1.5 p-1.5 rounded text-xs hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors group border border-transparent hover:border-rose-200 dark:hover:border-rose-800 cursor-pointer"
                      >
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                        <span className="truncate flex-1 text-left text-amber-900 dark:text-amber-100">
                          {chapter.chapter_name}
                        </span>
                        {selectedChapterName === chapter.chapter_name ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <div className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Chapters */}
              <div className="p-1">
                <div className="flex items-center gap-1 px-1.5 mb-1">
                  <Building className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                    All Chapters {!searchTerm && `(${chapters.length})`}
                  </span>
                </div>

                {isFetching ? (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-amber-500" />
                  </div>
                ) : filteredChapters.length > 0 ? (
                  <div className="space-y-0.5">
                    {filteredChapters.map((chapter) => {
                      const isFavorite = favorites.some(
                        (f) => String(f.chapter_code) === String(chapter.chapter_code)
                      );
                      const isActive =
                        selectedChapterName?.toLowerCase() === chapter.chapter_name?.toLowerCase();

                      return (
                        <button
                          key={chapter.chapter_code}
                          onClick={() =>
                            selectChapterMutation.mutate(chapter.chapter_code)
                          }
                          disabled={isActive}
                          className={`
                            w-full flex items-center gap-1.5 p-1.5 rounded text-xs transition-all group border
                            ${
                              isActive
                                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800 cursor-default"
                                : "hover:bg-amber-100 dark:hover:bg-amber-900/30 border-transparent hover:border-amber-200 dark:hover:border-amber-800 cursor-pointer"
                            }
                            ${
                              selectChapterMutation.isLoading
                                ? "opacity-50 pointer-events-none"
                                : ""
                            }
                          `}
                        >
                          <Building
                            className={`h-3 w-3 flex-shrink-0 ${
                              isActive ? "text-green-600" : "text-amber-500"
                            }`}
                          />

                          <span className="truncate flex-1 text-left text-amber-900 dark:text-amber-100">
                            {chapter.chapter_name}
                          </span>

                          <div className="flex items-center gap-0.5">
                            {isActive ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : (
                              <Star
                                className={`h-4 w-4 transition-all ${
                                  isFavorite
                                    ? "fill-amber-400 text-amber-400 opacity-100"
                                    : "text-amber-300 opacity-0 group-hover:opacity-100 hover:text-amber-400"
                                }`}
                                onClick={(e) => toggleFavorite(chapter, e)}
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-3 text-amber-600 dark:text-amber-400">
                    <Search className="h-4 w-4 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No chapters found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-1.5 border-t border-amber-200 dark:border-amber-800 bg-amber-100 dark:bg-amber-900/40">
              <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-300">
                <span>Chapter Selector</span>
                <div className="flex items-center gap-1">
                  <Heart className="h-2 w-2 fill-rose-500 text-rose-500" />
                  <span>{favorites.length}</span>
                  <span className="mx-1">•</span>
                  <span>{chapters.length} total</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChapterSelection;
