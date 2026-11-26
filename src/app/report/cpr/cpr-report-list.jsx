import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import BASE_URL from "@/config/base-url";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, Trash2, Pencil, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

import moment from "moment";
import {
  getCurrentFinancialYear,
  fetchFinancialYearsFromApi,
} from "@/utils/financial-year";

// Helper for DD-MM-YYYY date formatting
const formatDDMMYYYY = (dateVal) => {
  if (!dateVal || dateVal === "—") return "—";
  try {
    const m = moment(dateVal);
    return m.isValid() ? m.format("DD-MM-YYYY") : String(dateVal);
  } catch {
    return String(dateVal || "—");
  }
};

const CPRReportList = ({ onStartOrCreate }) => {
  const currentFY = useMemo(() => getCurrentFinancialYear(), []);
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportToDelete, setReportToDelete] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [financialYearList, setFinancialYearList] = useState(() => {
    const c = Cookies.get("currentYear") || currentFY;
    return c ? [c] : ["2026-27"];
  });

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
  }, [currentFY]);

  const availableYears = financialYearList;

  // Fetch GET /api/cpr-report
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const token = Cookies.get("token");
      const res = await axios.get(`${BASE_URL}/api/cpr-report`, {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log("GET /api/cpr-report raw response:", res.data);
      const raw = res.data;
      let list = [];
      if (Array.isArray(raw)) {
        list = raw;
      } else if (Array.isArray(raw?.cpr_report)) {
        list = raw.cpr_report;
      } else if (Array.isArray(raw?.cpr_reports)) {
        list = raw.cpr_reports;
      } else if (Array.isArray(raw?.cprReport)) {
        list = raw.cprReport;
      } else if (Array.isArray(raw?.cprReports)) {
        list = raw.cprReports;
      } else if (Array.isArray(raw?.data)) {
        list = raw.data;
      } else if (Array.isArray(raw?.reports)) {
        list = raw.reports;
      } else if (Array.isArray(raw?.cpr)) {
        list = raw.cpr;
      } else if (Array.isArray(raw?.data?.cpr_report)) {
        list = raw.data.cpr_report;
      } else if (Array.isArray(raw?.data?.cpr_reports)) {
        list = raw.data.cpr_reports;
      } else if (Array.isArray(raw?.data?.reports)) {
        list = raw.data.reports;
      } else if (Array.isArray(raw?.data?.data)) {
        list = raw.data.data;
      } else if (Array.isArray(raw?.data?.cpr)) {
        list = raw.data.cpr;
      } else if (raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
        list = [raw.data];
      } else if (raw?.cpr_report && typeof raw.cpr_report === "object" && !Array.isArray(raw.cpr_report)) {
        list = [raw.cpr_report];
      }

      console.log("Extracted CPR reports list:", list);
      setReports(list);
    } catch (err) {
      console.error("Error fetching cpr-report list:", err);
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to load CPR reports"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle Open Delete Modal
  const handleOpenDelete = (report) => {
    const reportId = report?.id || report?.cpr_report_id;
    if (!reportId) {
      toast.error("Report ID is missing");
      return;
    }
    const statusText = (
      report.csr_status ||
      report.cpr_status ||
      report.status ||
      ""
    ).trim();
    if (statusText.toLowerCase() !== "draft") {
      toast.error("Only reports in Draft status can be deleted");
      return;
    }
    setReportToDelete({ ...report, id: reportId });
    setOpenDeleteDialog(true);
  };

  // 4. API DELETE: /api/cpr-report/{id}
  const handleConfirmDelete = async () => {
    const reportId = reportToDelete?.id || reportToDelete?.cpr_report_id;
    if (!reportId) return;

    try {
      setDeleting(true);
      const token = Cookies.get("token");

      console.log(`Submitting DELETE /api/cpr-report/${reportId}`);
      const res = await axios.delete(
        `${BASE_URL}/api/cpr-report/${reportId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(`DELETE /api/cpr-report/${reportId} response:`, res.data);
      toast.success(res.data?.message || "CPR Report deleted successfully!");
      setOpenDeleteDialog(false);
      setReportToDelete(null);
      fetchReports();
    } catch (err) {
      console.error("Error deleting CPR report:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to delete CPR report"
      );
    } finally {
      setDeleting(false);
    }
  };

  // Determine calendar year for a given financial month
  const getMonthLabel = (mName, fYear) => {
    if (!mName) return "";
    const fy = fYear || selectedFY;
    const match = fy?.match(/^(\d{4})-(\d{2})$/);
    const sYear = match ? parseInt(match[1], 10) : new Date().getFullYear();
    const eYear = sYear + 1;
    const idx = FINANCIAL_MONTHS.findIndex(
      (m) => m.toLowerCase() === mName.trim().toLowerCase()
    );
    const yr = idx >= 9 ? eYear : sYear;
    return `${mName} ${yr}`;
  };

  // Filtered reports based on selectedFY, statusFilter, and searchTerm
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // FY Filter (only if not 'all')
      if (selectedFY && selectedFY !== "all") {
        const rFY = (report.financial_year || report.year || "").trim();
        if (rFY && rFY !== selectedFY) return false;
      }

      // Status Filter
      const statusText = (
        report.csr_status ||
        report.cpr_status ||
        report.status ||
        "Draft"
      ).toString().toLowerCase();
      if (statusFilter !== "all") {
        if (statusFilter === "draft") {
          const isDraft = statusText.includes("draft") || statusText === "0" || !report.csr_status;
          if (!isDraft) return false;
        } else if (statusFilter === "submitted") {
          const isSubmitted =
            statusText.includes("submit") ||
            statusText.includes("complete") ||
            statusText === "1";
          if (!isSubmitted) return false;
        }
      }

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const ch = (report.chapter_name || report.name_of_cpp || report.cpp_name || "").toLowerCase();
        const m = (report.financial_month || report.month || "").toLowerCase();
        const rawD = String(
          report.submission_date ||
          report.submissionDate ||
          (typeof report.created_at === "string" ? report.created_at.slice(0, 10) : report.created_at || "") ||
          ""
        ).toLowerCase();
        const formattedD = rawD && rawD !== "—" ? formatDDMMYYYY(rawD).toLowerCase() : "";
        return (
          ch.includes(query) ||
          m.includes(query) ||
          fy.includes(query) ||
          rawD.includes(query) ||
          (formattedD && formattedD.includes(query)) ||
          statusText.includes(query)
        );
      }

      return true;
    });
  }, [reports, selectedFY, statusFilter, searchTerm]);

  return (
    <div className="w-full min-h-screen bg-white p-6 md:p-8">
      <div className="w-full mx-auto space-y-4">
        {/* Title and Top Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Chapter Performance Reports
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage and view monthly CPR reports ({reports.length} total)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchReports}
              disabled={loading}
              className="text-xs h-8 text-slate-500 hover:text-slate-800 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() =>
                onStartOrCreate({
                  month: "",
                  year: selectedFY === "all" ? currentFY : selectedFY,
                  reportId: null,
                  isEdit: false,
                })
              }
              className="bg-[#193b59] hover:bg-[#122c44] text-white text-xs font-semibold px-4 h-8 rounded-[4px] gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create CPR Report
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by Month, Chapter, Year, Status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 px-3 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 min-w-[200px]"
            />

            {/* Financial Year Selector */}
            <div className="flex items-center gap-2">
  {availableYears.map((fy) => (
    <button
      key={fy}
      type="button"
      onClick={() => setSelectedFY(fy)}
      className={`h-8 px-3 text-xs font-medium rounded border transition-colors ${
        selectedFY === fy
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-slate-700 border-slate-300 hover:bg-blue-50"
      }`}
    >
      {fy}
    </button>
  ))}
</div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft Only</option>
              <option value="submitted">Submitted Only</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredReports.length}</strong> of {reports.length} reports
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-none">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-[#0284c7]" />
              <p className="text-xs text-slate-500 font-medium">
                Loading CPR report data...
              </p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-slate-500 mb-3">
                {reports.length === 0
                  ? "No CPR reports found in the API."
                  : "No reports match your selected filters."}
              </p>
              {reports.length === 0 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    onStartOrCreate({
                      month: "",
                      year: selectedFY === "all" ? currentFY : selectedFY,
                      reportId: null,
                      isEdit: false,
                    })
                  }
                  className="bg-[#193b59] hover:bg-[#122c44] text-white text-xs px-4 h-8 rounded font-semibold cursor-pointer"
                >
                  + Create First CPR Report
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedFY("all");
                    setStatusFilter("all");
                  }}
                  className="text-xs h-8"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#edf3f9] text-slate-800 font-semibold border-b border-slate-200">
                    <th className="py-3 px-6">Chapter Name</th>
                    <th className="py-3 px-6">Financial Year</th>
                    <th className="py-3 px-6">Financial Month</th>
                    <th className="py-3 px-6">Submission Date</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.map((report, idx) => {
                    const statusText = (
                      report.csr_status ||
                      report.cpr_status ||
                      report.status ||
                      "Draft"
                    ).toString();
                    const isDraft =
                      statusText.toLowerCase() === "draft" ||
                      statusText === "0" ||
                      !report.csr_status;
                    const isSubmitted =
                      statusText.toLowerCase() === "submitted" ||
                      statusText.toLowerCase() === "completed" ||
                      statusText.toLowerCase() === "active" ||
                      statusText === "1";

                    const reportId = report.id || report.cpr_report_id;
                    const rChapter =
                      report.chapter_name ||
                      report.name_of_cpp ||
                      report.cpp_name ||
                      "—";
                    const rFY =
                      report.financial_year ||
                      report.year ||
                      selectedFY ||
                      "—";
                    const rMonth =
                      report.financial_month ||
                      report.month ||
                      "—";
                    const rawDate =
                      report.submission_date ||
                      report.submissionDate ||
                      (typeof report.created_at === "string" ? report.created_at.slice(0, 10) : report.created_at || "");
                    const rDate = formatDDMMYYYY(rawDate);

                    return (
                      <tr
                        key={reportId || idx}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        {/* Chapter Name */}
                        <td className="py-3.5 px-6 font-semibold text-slate-900">
                          {rChapter}
                        </td>

                        {/* Financial Year */}
                        <td className="py-3.5 px-6 text-slate-700 font-medium">
                          {rFY}
                        </td>

                        {/* Financial Month */}
                        <td className="py-3.5 px-6 font-semibold text-slate-800">
                          {rMonth}
                        </td>

                        {/* Submission Date */}
                        <td className="py-3.5 px-6 text-slate-600 font-medium">
                          {rDate}
                        </td>

                        {/* Status (csr_status) */}
                        <td className="py-3.5 px-6">
                          {isDraft ? (
                            <span className="inline-block px-3.5 py-0.5 rounded-full text-xs font-medium bg-[#fef3c7] text-[#92400e]">
                              Draft
                            </span>
                          ) : isSubmitted ? (
                            <span className="inline-block px-3.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Submitted
                            </span>
                          ) : (
                            <span className="inline-block px-3.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {statusText}
                            </span>
                          )}
                        </td>

                        {/* Action Buttons: Only edit or delete when status is Draft */}
                        <td className="py-3.5 px-6 text-right">
                          {isDraft ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  onStartOrCreate({
                                    month: report.financial_month || report.month || "",
                                    year: report.financial_year || report.year || selectedFY,
                                    reportId: reportId,
                                    isEdit: true,
                                    isView: false,
                                  })
                                }
                                className="bg-[#193b59] hover:bg-[#122c44] text-white text-xs px-3 h-7 rounded font-medium shadow-xs cursor-pointer gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDelete(report)}
                                title="Delete CPR Report"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  onStartOrCreate({
                                    month: report.financial_month || report.month || "",
                                    year: report.financial_year || report.year || selectedFY,
                                    reportId: reportId,
                                    isView: true,
                                    isEdit: false,
                                  })
                                }
                                className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs px-3 h-7 rounded font-medium cursor-pointer gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                View
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle className="w-5 h-5" />
              <AlertDialogTitle className="text-base font-bold text-slate-900">
                Delete CPR Report
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the draft CPR report for{" "}
              <strong className="text-slate-800">
                {reportToDelete?.financial_month} ({reportToDelete?.financial_year || selectedFY})
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel
              disabled={deleting}
              className="text-xs h-8"
              onClick={() => {
                setOpenDeleteDialog(false);
                setReportToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 font-semibold cursor-pointer"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Report"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CPRReportList;
