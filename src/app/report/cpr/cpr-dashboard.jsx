import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate, useSearchParams } from "react-router-dom";
import BASE_URL from "@/config/base-url";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  ShieldAlert,
  BarChart3,
  ArrowLeft,
  LayoutGrid,
  List,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCurrentFinancialYear,
  fetchFinancialYearsFromApi,
} from "@/utils/financial-year";

const FINANCIAL_MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

// Helper: Clean chapter name by removing the word "Chapter"
// e.g. "Kochi Chapter" -> "Kochi", "Kolkata Chapter" -> "Kolkata", "Delhi" -> "Delhi"
const cleanChapterName = (rawName) => {
  if (!rawName) return "";
  const cleaned = String(rawName).replace(/\bchapter\b/gi, "").trim();
  return cleaned || String(rawName).trim();
};

// Helper: Match report month to target month
const matchesMonth = (rep, targetMonth) => {
  if (!rep || !targetMonth) return false;
  const m = String(
    rep.financial_month || rep.month || rep.cpr_details?.financial_month || ""
  )
    .trim()
    .toLowerCase();
  const target = targetMonth.trim().toLowerCase();
  if (!m) return false;
  if (m === target) return true;
  // Prefix matching (e.g. "sep" vs "september", "aug" vs "august")
  if (m.length >= 3 && target.length >= 3) {
    if (m.startsWith(target.slice(0, 3)) || target.startsWith(m.slice(0, 3))) {
      return true;
    }
  }
  return false;
};

// Helper: Match report financial year
const matchesYear = (rep, targetYear) => {
  if (!targetYear || targetYear === "all") return true;
  const y = String(
    rep.financial_year || rep.year || rep.cpr_details?.financial_year || ""
  )
    .trim()
    .toLowerCase();
  if (!y) return true;
  const target = targetYear.trim().toLowerCase();
  if (y === target) return true;
  const yStart = y.split(/[-/]/)[0];
  const targetStart = target.split(/[-/]/)[0];
  return yStart && targetStart && yStart === targetStart;
};

// Helper: Check if report status is Submitted
const isStatusSubmitted = (rep) => {
  if (!rep) return false;
  const s = String(
    rep.csr_status || rep.cpr_status || rep.status || rep.cpr_details?.csr_status || ""
  )
    .toLowerCase()
    .trim();
  return s.includes("submit") || s.includes("complete") || s === "1";
};

const CPRDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Selected month from URL query (e.g. /cpr-dashboard?month=October)
  const activeMonthParam = searchParams.get("month");

  // Superadmin check
  const userType = Cookies.get("user_type_id") || "1";
  const username = String(
    Cookies.get("username") || Cookies.get("login_username") || ""
  ).toLowerCase();
  const email = String(Cookies.get("email") || "").toLowerCase();

  const isSuperAdmin = useMemo(() => {
    if (userType === "3" || userType === "5") return true;
    const checks = [username, email];
    return checks.some(
      (v) =>
        v.includes("superadmin") ||
        v.includes("masteradmin") ||
        v.includes("testadmin")
    );
  }, [userType, username, email]);

  const currentFY = useMemo(() => getCurrentFinancialYear(), []);
  const [selectedFY, setSelectedFY] = useState(
    () => searchParams.get("year") || currentFY
  );
  const [financialYearList, setFinancialYearList] = useState(() => {
    const c = Cookies.get("currentYear") || currentFY;
    return c ? [c] : ["2026-27"];
  });

  const [chapters, setChapters] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'submitted' | 'draft' | 'not_submitted'
  const [viewMode, setViewMode] = useState("grid"); // default to 'grid'

  // Sync year if query param updates
  useEffect(() => {
    const yr = searchParams.get("year");
    if (yr && yr !== selectedFY) {
      setSelectedFY(yr);
    }
  }, [searchParams, selectedFY]);

  // Load Financial Years
  useEffect(() => {
    if (Cookies.get("currentYear")) return;
    fetchFinancialYearsFromApi().then((list) => {
      if (list && list.length > 0) {
        setFinancialYearList(list);
        if (!selectedFY || !list.includes(selectedFY)) {
          setSelectedFY(list[0]);
        }
      }
    });
  }, [currentFY, selectedFY]);

  // Fetch both: 1) /api/getChapterForm (all chapters) and 2) /api/cpr-report (reports)
  const fetchData = useCallback(async (showToast = false) => {
    try {
      setRefreshing(true);
      const token = Cookies.get("token");
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      const [chaptersRes, reportsRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/api/getChapterForm`, {
          timeout: 15000,
          headers: { ...authHeader, Accept: "application/json" },
        }),
        axios.get(`${BASE_URL}/api/cpr-report`, {
          timeout: 15000,
          headers: { ...authHeader, Accept: "application/json" },
        }),
      ]);

      // 1. Process Chapters from /api/getChapterForm
      if (chaptersRes.status === "fulfilled") {
        const rawCh = chaptersRes.value.data;
        const chList = Array.isArray(rawCh)
          ? rawCh
          : Array.isArray(rawCh?.data)
          ? rawCh.data
          : Array.isArray(rawCh?.chapters)
          ? rawCh.chapters
          : [];
        setChapters(chList);
      } else {
        console.warn("Could not load /api/getChapterForm:", chaptersRes.reason);
      }

      // 2. Process CPR Reports from /api/cpr-report
      if (reportsRes.status === "fulfilled") {
        const rawRep = reportsRes.value.data;
        let repList = [];
        if (Array.isArray(rawRep)) {
          repList = rawRep;
        } else if (Array.isArray(rawRep?.data)) {
          repList = rawRep.data;
        } else if (Array.isArray(rawRep?.cpr_report)) {
          repList = rawRep.cpr_report;
        } else if (Array.isArray(rawRep?.cpr_reports)) {
          repList = rawRep.cpr_reports;
        } else if (Array.isArray(rawRep?.cprReport)) {
          repList = rawRep.cprReport;
        } else if (Array.isArray(rawRep?.reports)) {
          repList = rawRep.reports;
        } else if (Array.isArray(rawRep?.cpr)) {
          repList = rawRep.cpr;
        } else if (Array.isArray(rawRep?.data?.data)) {
          repList = rawRep.data.data;
        }

        setReports(repList);

        // Extract unique financial years from report list if present
        const yearsFromData = repList
          .map((r) => (r.financial_year || r.year || "").trim())
          .filter(Boolean);
        if (yearsFromData.length > 0) {
          setFinancialYearList((prev) =>
            Array.from(new Set([...prev, ...yearsFromData]))
          );
        }
      } else {
        console.warn("Could not load /api/cpr-report:", reportsRes.reason);
      }

      if (showToast) {
        toast.success("CPR data refreshed successfully");
      }
    } catch (err) {
      console.error("CPRDashboard error fetching data:", err);
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to load CPR data"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combined chapters list with CPR status for the active month and financial year
  const allChapterStatusList = useMemo(() => {
    if (!activeMonthParam) return [];

    // Filter reports matching the active month and financial year
    const monthReports = reports.filter(
      (rep) => matchesMonth(rep, activeMonthParam) && matchesYear(rep, selectedFY)
    );

    // If chapters are available from /api/getChapterForm, display all chapters
    if (chapters.length > 0) {
      return chapters.map((ch, idx) => {
        const rawChName = ch.chapter_name || ch.name || "";
        const cleanName = cleanChapterName(rawChName);
        const code = String(ch.chapter_code || ch.id || "");

        // Find if this chapter has a CPR report for the active month
        const matchedReport = monthReports.find((rep) => {
          const repCode = String(
            rep.chapter_id ||
            rep.chapter_code ||
            rep.chapter?.chapter_code ||
            rep.chapter?.id ||
            rep.cpr_details?.chapter_id ||
            rep.cpr_details?.chapter_code ||
            ""
          ).trim();
          if (code && repCode && code === repCode) return true;

          const repName = cleanChapterName(
            rep.chapter_name ||
            rep.name_of_chapter ||
            rep.chapter?.chapter_name ||
            rep.chapter?.name ||
            rep.cpr_details?.chapter_name ||
            ""
          ).toLowerCase().trim();

          const targetName = cleanName.toLowerCase().trim();
          if (repName && targetName) {
            if (repName === targetName) return true;
            if (repName.includes(targetName) || targetName.includes(repName)) return true;
          }
          return false;
        });

        // 3 States: Submitted (green), Draft (orange), Not Submitted (grey)
        let status = "Not Submitted";
        let statusType = "not_submitted";
        let isSubmitted = false;

        if (matchedReport) {
          if (isStatusSubmitted(matchedReport)) {
            status = "Submitted";
            statusType = "submitted";
            isSubmitted = true;
          } else {
            status = "Draft";
            statusType = "draft";
            isSubmitted = false;
          }
        }

        return {
          id: ch.id || ch.chapter_code || idx,
          chapter_name: cleanName || rawChName,
          status,
          statusType,
          isSubmitted,
          report: matchedReport || null,
        };
      });
    }

    // Fallback: If getChapterForm is empty, use reports directly
    return monthReports.map((rep, idx) => {
      const isSub = isStatusSubmitted(rep);
      const rawChName =
        rep.chapter_name ||
        rep.chapter?.chapter_name ||
        rep.name_of_chapter ||
        "Unknown Chapter";
      return {
        id: rep.id || idx,
        chapter_name: cleanChapterName(rawChName),
        status: isSub ? "Submitted" : "Draft",
        statusType: isSub ? "submitted" : "draft",
        isSubmitted: isSub,
        report: rep,
      };
    });
  }, [chapters, reports, activeMonthParam, selectedFY]);

  // Filtered by status filter and search query
  const displayedChapters = useMemo(() => {
    return allChapterStatusList
      .filter((item) => {
        if (statusFilter === "submitted" && item.statusType !== "submitted")
          return false;
        if (statusFilter === "draft" && item.statusType !== "draft")
          return false;
        if (
          statusFilter === "not_submitted" &&
          item.statusType !== "not_submitted"
        )
          return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return item.chapter_name.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        // Priority order: Submitted (1) -> Draft (2) -> Not Submitted (3)
        const order = { submitted: 1, draft: 2, not_submitted: 3 };
        const diff = (order[a.statusType] || 4) - (order[b.statusType] || 4);
        if (diff !== 0) return diff;
        return a.chapter_name.localeCompare(b.chapter_name);
      });
  }, [allChapterStatusList, statusFilter, searchTerm]);

  // Summary counts for the tabs
  const totalMonthCount = allChapterStatusList.length;
  const submittedCount = useMemo(
    () => allChapterStatusList.filter((r) => r.statusType === "submitted").length,
    [allChapterStatusList]
  );
  const draftCount = useMemo(
    () => allChapterStatusList.filter((r) => r.statusType === "draft").length,
    [allChapterStatusList]
  );
  const notSubmittedCount = totalMonthCount - submittedCount - draftCount;

  // Navigate to month details
  const handleMonthClick = (m) => {
    navigate(
      `/cpr-dashboard?month=${encodeURIComponent(m)}&year=${encodeURIComponent(
        selectedFY
      )}`
    );
  };

  // Navigate back to months overview
  const handleBackToMonths = () => {
    navigate("/cpr-dashboard");
  };

  // Access check fallback
  if (!isSuperAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto mt-10">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-8 text-center">
            <div className="inline-flex p-3 rounded-full bg-red-100 text-red-600 mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-red-900 mb-2">
              Access Restricted
            </h2>
            <p className="text-sm text-red-700 max-w-md mx-auto mb-6">
              The CPR Dashboard is only accessible by Superadmin users. Please contact your system administrator if you believe you should have access.
            </p>
            <Button
              onClick={() => navigate("/home")}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: MONTH DETAIL PAGE (When month is selected in URL: ?month=October)
  // Shows list of all chapters from /api/getChapterForm with CPR status
  // =========================================================================
  if (activeMonthParam) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
        {/* Navigation Bar: Back to Months button + Financial Year & Refresh */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToMonths}
              className="gap-2 border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold h-[34px]"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back to Months</span>
            </Button>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-slate-800">
                {activeMonthParam} ({selectedFY})
              </span>
            </div>
          </div>

          {/* Year selector & Refresh */}
          <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <label className="text-xs font-semibold text-slate-600">
                Financial Year:
              </label>
              <select
                value={selectedFY}
                onChange={(e) => {
                  const newYr = e.target.value;
                  setSelectedFY(newYr);
                  navigate(
                    `/cpr-dashboard?month=${encodeURIComponent(
                      activeMonthParam
                    )}&year=${encodeURIComponent(newYr)}`
                  );
                }}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {financialYearList.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="text-xs gap-1.5 border-slate-300 hover:bg-slate-100 whitespace-nowrap shrink-0 h-[34px]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing ? "animate-spin text-blue-600" : ""
                }`}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Chapter CPR Status Section for Clicked Month */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-5 space-y-5">
          {/* Header: Title + Search + Status Tabs + View Toggle in ONE SINGLE LINE */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 flex-nowrap overflow-x-auto">
            <div className="shrink-0 min-w-0">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                <span>Chapter CPR Status for {activeMonthParam}</span>
                <span className="text-blue-600 font-semibold text-sm">
                  ({selectedFY})
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                Showing all chapters and their CPR status for {activeMonthParam}.
              </p>
            </div>

            {/* Controls: Search + Tabs + View Toggle in ONE single horizontal line */}
            <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
              {/* Search Box */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search chapter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-36 sm:w-44 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium placeholder:text-slate-400"
                />
              </div>

              {/* Status Tabs: All in ONE single line (NO flex-wrap, whitespace-nowrap) */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex-nowrap shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`text-xs px-2.5 py-1 rounded font-semibold whitespace-nowrap transition ${
                    statusFilter === "all"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({totalMonthCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("submitted")}
                  className={`text-xs px-2.5 py-1 rounded font-semibold whitespace-nowrap transition ${
                    statusFilter === "submitted"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Submitted ({submittedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("draft")}
                  className={`text-xs px-2.5 py-1 rounded font-semibold whitespace-nowrap transition ${
                    statusFilter === "draft"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-orange-700 hover:bg-orange-50"
                  }`}
                >
                  Draft ({draftCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("not_submitted")}
                  className={`text-xs px-2.5 py-1 rounded font-semibold whitespace-nowrap transition ${
                    statusFilter === "not_submitted"
                      ? "bg-slate-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Not Submitted ({notSubmittedCount})
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                  className={`p-1.5 rounded transition ${
                    viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                  className={`p-1.5 rounded transition ${
                    viewMode === "table"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content Body */}
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-sm font-medium">Loading chapter CPR status...</p>
            </div>
          ) : displayedChapters.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-50/50 rounded-lg border border-slate-100">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">
                No chapters match your search or filter for {activeMonthParam} ({selectedFY})
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? "Try clearing your search query."
                  : "Click Back to Months to view other financial months."}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* Compact Card Grid View - No ID#, Decreased card width */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {displayedChapters.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 border-l-4"
                  style={{
                    borderLeftColor:
                      item.statusType === "submitted"
                        ? "#10b981"
                        : item.statusType === "draft"
                        ? "#f97316"
                        : "#cbd5e1",
                  }}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="p-1.5 bg-slate-100 rounded-md text-slate-500 shrink-0">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    {item.statusType === "submitted" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Submitted</span>
                      </span>
                    ) : item.statusType === "draft" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200 shrink-0">
                        <Clock className="w-3 h-3 text-orange-600" />
                        <span>Draft</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        <AlertCircle className="w-3 h-3 text-slate-400" />
                        <span>Not Submitted</span>
                      </span>
                    )}
                  </div>
                  <div>
                    <h4
                      className="text-sm font-bold text-slate-800 tracking-tight truncate"
                      title={item.chapter_name}
                    >
                      {item.chapter_name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100/75 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {/* <th className="py-2.5 px-4 w-12 text-center">#</th> */}
                    <th className="py-2.5 px-4">CHAPTER NAME</th>
                    <th className="py-2.5 px-4 w-40 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedChapters.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* <td className="py-2.5 px-4 text-center font-medium text-slate-400">
                        {idx + 1}
                      </td> */}
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.chapter_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {item.statusType === "submitted" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Submitted</span>
                          </span>
                        ) : item.statusType === "draft" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                            <Clock className="w-3.5 h-3.5 text-orange-600" />
                            <span>Draft</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>Not Submitted</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer info */}
          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Total: <strong>{submittedCount}</strong> Submitted,{" "}
              <strong>{draftCount}</strong> Draft,{" "}
              <strong>{notSubmittedCount}</strong> Not Submitted for{" "}
              <strong>{activeMonthParam} ({selectedFY})</strong>
            </span>
            <span className="text-slate-400 text-[11px]">
              Chapters from <code>/api/getChapterForm</code> &bull; Status from <code>/api/cpr-report</code>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: MAIN DASHBOARD (12 Financial Months Grid)
  // Shows ONLY the 12 Financial Months buttons. Clicking navigates to that month.
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      {/* Top Header Card: Title + Financial Year & Refresh in ONE line */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                CPR Dashboard
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Track chapter submission progress, submitted CPRs, and pending drafts across all chapters.
            </p>
          </div>

          {/* Controls: Financial Year & Refresh in ONE line */}
          <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 whitespace-nowrap">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <label className="text-xs font-semibold text-slate-600">
                Financial Year:
              </label>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {financialYearList.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="text-xs gap-1.5 border-slate-300 hover:bg-slate-100 whitespace-nowrap shrink-0 h-[34px]"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  refreshing ? "animate-spin text-blue-600" : ""
                }`}
              />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 12 Financial Months Grid - Clicking navigates to that month's detail view */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>12 Financial Months ({selectedFY})</span>
          </label>
          <span className="text-xs text-slate-500">
            Click any month to view chapter submission status
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {FINANCIAL_MONTHS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleMonthClick(m)}
              className="py-4 px-4 rounded-xl text-center font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md transition-all cursor-pointer shadow-xs"
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CPRDashboard;
