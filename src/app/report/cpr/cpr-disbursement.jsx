import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import moment from "moment";
import BASE_URL from "@/config/base-url";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  RefreshCw,
  Search,
  AlertCircle,
  Plus,
  Trash2,
  Pencil,
  Building2,
  Calendar,
  IndianRupee,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

import {
  getCurrentFinancialYear,
  fetchFinancialYearsFromApi,
} from "@/utils/financial-year";
import { MASTER_ANCHAL_LIST } from "@/utils/anchal";

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

// Helper to get current month name (e.g. "October")
const getCurrentMonthName = () => {
  const now = new Date();
  return now.toLocaleString("en-US", { month: "long" });
};

// Helper to get available months up to current month for current year
const getAvailableMonths = (selectedYear, currYear) => {
  if (!selectedYear || selectedYear === currYear) {
    const currMonth = getCurrentMonthName();
    const currMonthIdx = FINANCIAL_MONTHS.indexOf(currMonth);
    if (currMonthIdx !== -1) {
      return FINANCIAL_MONTHS.slice(0, currMonthIdx + 1);
    }
  }
  return FINANCIAL_MONTHS;
};

// Helper to get today's date formatted as YYYY-MM-DD
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to extract clean label from anchal item
const getAnchalLabel = (item, idx = 0) => {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  const val =
    item.achal ||
    item.anchal_name ||
    item.anchal ||
    item.achal_name ||
    item.name ||
    item.title ||
    item.label ||
    item.anchal_master_name;
  if (val && typeof val === "string") return val.trim();
  if (val) return String(val);
  return idx !== undefined && idx !== null ? `Anchal ${idx + 1}` : "";
};

const CPRDisbursement = () => {
  const currentYear = useMemo(() => getCurrentFinancialYear(), []);
  const currentMonth = useMemo(() => getCurrentMonthName(), []);
  const todayDate = useMemo(() => getTodayDateString(), []);

  // List Data & UI state
  const [disbursementList, setDisbursementList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Anchals list from POST /api/getAnchal (defaults to MASTER_ANCHAL_LIST for all base URLs)
  const [anchalOptions, setAnchalOptions] = useState(MASTER_ANCHAL_LIST);
  const [loadingAnchals, setLoadingAnchals] = useState(false);

  // Financial Year list strictly from API + fallback years
  const [financialYearList, setFinancialYearList] = useState(() => {
    const c = Cookies.get("currentYear") || currentYear;
    const match = c?.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const startYr = parseInt(match[1], 10);
      return [
        c,
        `${startYr - 1}-${String(startYr).slice(-2)}`,
        `${startYr - 2}-${String(startYr - 1).slice(-2)}`,
      ];
    }
    return [c || "2026-27", "2025-26", "2024-25"];
  });

  useEffect(() => {
    fetchFinancialYearsFromApi().then((list) => {
      const cy = Cookies.get("currentYear") || currentYear;
      const combined = new Set(list || []);
      if (cy) combined.add(cy);
      const match = cy?.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const startYr = parseInt(match[1], 10);
        for (let i = 1; i <= 3; i++) {
          const prevY = startYr - i;
          combined.add(`${prevY}-${String(prevY + 1).slice(-2)}`);
        }
      }
      const sortedYears = Array.from(combined).sort().reverse();
      setFinancialYearList(sortedYears);
    });
  }, [currentYear]);

  // Create Modal State (POST /api/cpr-disbursement)
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [formData, setFormData] = useState({
    financial_year: currentYear,
    financial_month: currentMonth,
    subs: [
      {
        funding_anchal: "",
        no_of_acharyas_paid: "",
        up_to_month_paid: currentMonth,
        report_when_received: "",
        remittance_date: "",
        total_remittance_last_month: "",
        total_remittance_this_month: "",
        anchal_name: "",
        no_of_acharyas: "",
        amount: "",
      },
    ],
  });

  // Edit Modal State (GET cpr-disbursement/{id} & PUT cpr-disbursement/{id})
  const [openEditModal, setOpenEditModal] = useState(false);
  const [fetchingEdit, setFetchingEdit] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    financial_year: currentYear,
    financial_month: currentMonth,
    funding_anchal: "",
    no_of_acharyas_paid: "",
    up_to_month_paid: currentMonth,
    report_when_received: "",
    remittance_date: "",
    total_remittance_last_month: "",
    total_remittance_this_month: "",
    anchal_name: "",
    no_of_acharyas: "",
    amount: "",
  });

  // Delete State (DELETE cpr-disbursement/{id})
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Anchals for Financial Year: POST /api/getAnchal
  const fetchAnchals = useCallback(async (year) => {
    try {
      setLoadingAnchals(true);
      const token = Cookies.get("token");
      const targetYear = year || currentYear;
      console.log("Calling POST /api/getAnchal payload with year:", targetYear);

      // Helper to parse list from raw API response
      const parseList = (raw) => {
        let list = [];
        if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.data)) list = raw.data;
        else if (Array.isArray(raw?.anchal)) list = raw.anchal;
        else if (Array.isArray(raw?.anchals)) list = raw.anchals;
        else if (Array.isArray(raw?.data?.anchal)) list = raw.data.anchal;
        else if (Array.isArray(raw?.data?.anchals)) list = raw.data.anchals;
        else if (Array.isArray(raw?.anchal_list)) list = raw.anchal_list;
        else if (Array.isArray(raw?.data?.anchal_list)) list = raw.data.anchal_list;
        else if (Array.isArray(raw?.result)) list = raw.result;
        else if (Array.isArray(raw?.data?.result)) list = raw.data.result;
        else if (raw?.data && typeof raw.data === "object") {
          list = Object.values(raw.data).filter(Boolean);
        }
        return list;
      };

      // Single API call to POST /api/getAnchal
      let list = [];
      try {
        const payload = targetYear ? { financial_year: targetYear } : {};
        const config = {
          timeout: 5000,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          params: targetYear ? { financial_year: targetYear } : {},
        };
        const res = await axios.post(`${BASE_URL}/api/getAnchal`, payload, config);
        list = parseList(res.data);
      } catch (callErr) {
        console.warn("POST /api/getAnchal network error:", callErr);
      }

      // If backend database has records (e.g. ftschamp.com), use them.
      // If backend database is empty (e.g. agstest.in test server), use MASTER_ANCHAL_LIST.
      if (!list || list.length === 0) {
        list = MASTER_ANCHAL_LIST;
      }

      setAnchalOptions(list);
    } catch (err) {
      console.error("Error in fetchAnchals:", err);
      setAnchalOptions((prev) => (prev && prev.length > 0 ? prev : MASTER_ANCHAL_LIST));
    } finally {
      setLoadingAnchals(false);
    }
  }, [currentYear]);

  // 1. Fetch List: GET /api/cpr-disbursement
  const fetchDisbursementData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const token = Cookies.get("token");

      console.log("Triggering GET /api/cpr-disbursement");
      const response = await axios.get(`${BASE_URL}/api/cpr-disbursement`, {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log("GET /api/cpr-disbursement response:", response.data);

      const raw = response.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.cpr_disbursement)
        ? raw.cpr_disbursement
        : Array.isArray(raw?.disbursements)
        ? raw.disbursements
        : raw?.data && typeof raw.data === "object"
        ? [raw.data]
        : [];

      setDisbursementList(list);
    } catch (error) {
      console.error("Error fetching cpr-disbursement:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to fetch CPR Disbursement data";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisbursementData();
    fetchAnchals(currentYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const location = useLocation();
  useEffect(() => {
    if (location.state?.openCreate) {
      handleOpenCreate();
    }
  }, [location.state]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const initialMonth = currentMonth;
    setFormData({
      financial_year: currentYear,
      financial_month: initialMonth,
      subs: [
        {
          funding_anchal: "",
          no_of_acharyas_paid: "",
          up_to_month_paid: initialMonth,
          report_when_received: "",
          remittance_date: "",
          total_remittance_last_month: "",
          total_remittance_this_month: "",
          anchal_name: "",
          no_of_acharyas: "",
          amount: "",
        },
      ],
    });
    fetchAnchals(currentYear);
    setOpenCreateModal(true);
  };

  // Add sub-row in Create modal
  const handleAddSubRow = () => {
    setFormData((prev) => ({
      ...prev,
      subs: [
        ...prev.subs,
        {
          funding_anchal: "",
          no_of_acharyas_paid: "",
          up_to_month_paid: prev.financial_month || currentMonth,
          report_when_received: "",
          remittance_date: "",
          total_remittance_last_month: "",
          total_remittance_this_month: "",
          anchal_name: "",
          no_of_acharyas: "",
          amount: "",
        },
      ],
    }));
  };

  // Remove sub-row in Create modal
  const handleRemoveSubRow = (index) => {
    if (formData.subs.length <= 1) {
      toast.error("At least one entry is required");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      subs: prev.subs.filter((_, idx) => idx !== index),
    }));
  };

  // Update field in sub-row
  const handleSubChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.subs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, subs: updated };
    });
  };

  // Handle Anchal Selection for sub-row
  const handleSelectAnchalForSub = (index, anchalVal) => {
    const matched = anchalOptions.find(
      (a, aIdx) =>
        getAnchalLabel(a, aIdx) === anchalVal ||
        String(a?.id) === anchalVal ||
        a?.achal === anchalVal ||
        a?.anchal_name === anchalVal ||
        a?.anchal === anchalVal
    );
    const matchedName = matched ? getAnchalLabel(matched) : anchalVal;
    setFormData((prev) => {
      const updated = [...prev.subs];
      updated[index] = {
        ...updated[index],
        anchal_name: matchedName,
        funding_anchal:
          matched?.funding_anchal ||
          matched?.fundingAnchal ||
          updated[index].funding_anchal ||
          "",
        no_of_acharyas:
          matched?.no_of_acharyas ||
          matched?.acharyas ||
          matched?.acharyasCount ||
          matched?.no_of_acharyas_paid ||
          updated[index].no_of_acharyas ||
          "",
        amount:
          matched?.amount ||
          matched?.annualTarget ||
          matched?.target ||
          updated[index].amount ||
          "",
      };
      return { ...prev, subs: updated };
    });
  };

  // 2. POST /api/cpr-disbursement (Create)
  const handleSubmitCreate = async (e) => {
    e.preventDefault();

    if (!formData.financial_year.trim()) {
      toast.error("Please select a financial year");
      return;
    }
    if (!formData.financial_month.trim()) {
      toast.error("Please select a financial month");
      return;
    }
    if (formData.subs.length === 0) {
      toast.error("Please add at least one disbursement entry");
      return;
    }

    // Validate all fields for each sub entry
    for (let i = 0; i < formData.subs.length; i++) {
      const s = formData.subs[i];
      const entryNum = i + 1;

      if (!s.anchal_name?.trim()) {
        toast.error(`Entry #${entryNum}: Anchal Name is required`);
        return;
      }
      if (!s.funding_anchal?.trim()) {
        toast.error(`Entry #${entryNum}: Funding Anchal is required`);
        return;
      }
      if (!s.no_of_acharyas || Number(s.no_of_acharyas) < 0) {
        toast.error(`Entry #${entryNum}: No. of Acharyas is required`);
        return;
      }
      if (!s.amount || Number(s.amount) < 0) {
        toast.error(`Entry #${entryNum}: Amount is required`);
        return;
      }
      if (!s.no_of_acharyas_paid || Number(s.no_of_acharyas_paid) < 0) {
        toast.error(`Entry #${entryNum}: No. of Acharyas Paid is required`);
        return;
      }
      if (!s.up_to_month_paid?.trim()) {
        toast.error(`Entry #${entryNum}: Up to Month Paid is required`);
        return;
      }
      if (!s.report_when_received) {
        toast.error(`Entry #${entryNum}: Report When Received date is required`);
        return;
      }
      if (s.report_when_received > todayDate) {
        toast.error(`Entry #${entryNum}: Report When Received cannot be a future date`);
        return;
      }
      if (!s.remittance_date) {
        toast.error(`Entry #${entryNum}: Remittance Date is required`);
        return;
      }
      if (s.remittance_date > todayDate) {
        toast.error(`Entry #${entryNum}: Remittance Date cannot be a future date`);
        return;
      }
      if (s.total_remittance_last_month === "" || Number(s.total_remittance_last_month) < 0) {
        toast.error(`Entry #${entryNum}: Total Remittance Last Month is required`);
        return;
      }
      if (s.total_remittance_this_month === "" || Number(s.total_remittance_this_month) < 0) {
        toast.error(`Entry #${entryNum}: Total Remittance This Month is required`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setCreateError(null);
      const token = Cookies.get("token");

      const payload = {
        financial_year: formData.financial_year.trim(),
        financial_month: formData.financial_month.trim(),
        subs: formData.subs.map((item) => ({
          funding_anchal: item.funding_anchal.trim(),
          no_of_acharyas_paid: String(item.no_of_acharyas_paid),
          up_to_month_paid: item.up_to_month_paid.trim(),
          report_when_received: item.report_when_received,
          remittance_date: item.remittance_date,
          total_remittance_last_month: String(item.total_remittance_last_month),
          total_remittance_this_month: String(item.total_remittance_this_month),
          anchal_name: item.anchal_name.trim(),
          no_of_acharyas: String(item.no_of_acharyas),
          amount: String(item.amount),
        })),
      };

      console.log("Submitting POST /api/cpr-disbursement payload:", payload);

      const response = await axios.post(
        `${BASE_URL}/api/cpr-disbursement`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("POST /api/cpr-disbursement response:", response.data);
      toast.success(
        response.data?.message || "CPR Disbursement created successfully!"
      );
      setOpenCreateModal(false);
      fetchDisbursementData();
    } catch (error) {
      console.error("Error creating CPR Disbursement:", error);
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const errorList = Object.values(serverErrors).flat();
        setCreateError(errorList);
      } else {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to save CPR Disbursement data";
        setCreateError([msg]);
      }
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save CPR Disbursement data"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 3. API GET by id: cpr-disbursement/{id} (Open Edit Modal)
  const handleOpenEdit = async (item) => {
    if (!item?.id) {
      toast.error("Record ID is missing");
      return;
    }
    setSelectedItem(item);
    setEditError(null);

    // Pre-fill immediate values from clicked row
    const finYear = item.financial_year || currentYear;
    const finMonth = item.financial_month || currentMonth;
    setEditFormData({
      financial_year: finYear,
      financial_month: finMonth,
      funding_anchal: item.funding_anchal || "",
      no_of_acharyas_paid: item.no_of_acharyas_paid ?? "",
      up_to_month_paid: item.up_to_month_paid || finMonth,
      report_when_received: item.report_when_received || "",
      remittance_date: item.remittance_date || "",
      total_remittance_last_month: item.total_remittance_last_month ?? "",
      total_remittance_this_month: item.total_remittance_this_month ?? "",
      anchal_name: item.anchal_name || item.achal || "",
      no_of_acharyas: item.no_of_acharyas ?? "",
      amount: item.amount ?? "",
    });
    setOpenEditModal(true);
    setFetchingEdit(true);
    fetchAnchals(finYear);

    try {
      const token = Cookies.get("token");
      const res = await axios.get(`${BASE_URL}/api/cpr-disbursement/${item.id}`, {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log(`GET /api/cpr-disbursement/${item.id} response:`, res.data);
      const detail = res.data?.data || res.data?.cpr_disbursement || res.data;
      if (detail && typeof detail === "object") {
        setEditFormData({
          financial_year: detail.financial_year || item.financial_year || currentYear,
          financial_month: detail.financial_month || item.financial_month || currentMonth,
          funding_anchal: detail.funding_anchal ?? item.funding_anchal ?? "",
          no_of_acharyas_paid: detail.no_of_acharyas_paid ?? item.no_of_acharyas_paid ?? "",
          up_to_month_paid: detail.up_to_month_paid ?? item.up_to_month_paid ?? currentMonth,
          report_when_received: detail.report_when_received ?? item.report_when_received ?? "",
          remittance_date: detail.remittance_date ?? item.remittance_date ?? "",
          total_remittance_last_month: detail.total_remittance_last_month ?? item.total_remittance_last_month ?? "",
          total_remittance_this_month: detail.total_remittance_this_month ?? item.total_remittance_this_month ?? "",
          anchal_name: detail.anchal_name ?? detail.achal ?? item.anchal_name ?? item.achal ?? "",
          no_of_acharyas: detail.no_of_acharyas ?? item.no_of_acharyas ?? "",
          amount: detail.amount ?? item.amount ?? "",
        });
      }
    } catch (err) {
      console.error("Error fetching CPR Disbursement by ID:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load disbursement details"
      );
    } finally {
      setFetchingEdit(false);
    }
  };

  // 4. API PUT: cpr-disbursement/{id} (Update)
  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    if (!selectedItem?.id) return;

    if (!editFormData.financial_year?.trim()) {
      toast.error("Financial Year is required");
      return;
    }
    if (!editFormData.financial_month?.trim()) {
      toast.error("Financial Month is required");
      return;
    }
    if (!editFormData.anchal_name?.trim()) {
      toast.error("Anchal Name is required");
      return;
    }
    if (!editFormData.funding_anchal?.trim()) {
      toast.error("Funding Anchal is required");
      return;
    }
    if (!editFormData.no_of_acharyas || Number(editFormData.no_of_acharyas) < 0) {
      toast.error("No. of Acharyas is required");
      return;
    }
    if (!editFormData.amount || Number(editFormData.amount) < 0) {
      toast.error("Amount is required");
      return;
    }
    if (!editFormData.no_of_acharyas_paid || Number(editFormData.no_of_acharyas_paid) < 0) {
      toast.error("No. of Acharyas Paid is required");
      return;
    }
    if (!editFormData.up_to_month_paid?.trim()) {
      toast.error("Up to Month Paid is required");
      return;
    }
    if (!editFormData.report_when_received) {
      toast.error("Report When Received date is required");
      return;
    }
    if (editFormData.report_when_received > todayDate) {
      toast.error("Report When Received cannot be a future date");
      return;
    }
    if (!editFormData.remittance_date) {
      toast.error("Remittance Date is required");
      return;
    }
    if (editFormData.remittance_date > todayDate) {
      toast.error("Remittance Date cannot be a future date");
      return;
    }
    if (editFormData.total_remittance_last_month === "" || Number(editFormData.total_remittance_last_month) < 0) {
      toast.error("Total Remittance Last Month is required");
      return;
    }
    if (editFormData.total_remittance_this_month === "" || Number(editFormData.total_remittance_this_month) < 0) {
      toast.error("Total Remittance This Month is required");
      return;
    }

    try {
      setUpdating(true);
      setEditError(null);
      const token = Cookies.get("token");

      // Flat fields matching PUT specification
      const payload = {
        financial_year: editFormData.financial_year.trim(),
        financial_month: editFormData.financial_month.trim(),
        funding_anchal: editFormData.funding_anchal.trim(),
        no_of_acharyas_paid: String(editFormData.no_of_acharyas_paid),
        up_to_month_paid: editFormData.up_to_month_paid.trim(),
        report_when_received: editFormData.report_when_received,
        remittance_date: editFormData.remittance_date,
        total_remittance_last_month: String(editFormData.total_remittance_last_month),
        total_remittance_this_month: String(editFormData.total_remittance_this_month),
        anchal_name: editFormData.anchal_name.trim(),
        no_of_acharyas: String(editFormData.no_of_acharyas),
        amount: String(editFormData.amount),
      };

      console.log(`Submitting PUT /api/cpr-disbursement/${selectedItem.id} payload:`, payload);

      const response = await axios.put(
        `${BASE_URL}/api/cpr-disbursement/${selectedItem.id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("PUT cpr-disbursement response:", response.data);
      toast.success(
        response.data?.message || "CPR Disbursement updated successfully!"
      );
      setOpenEditModal(false);
      fetchDisbursementData();
    } catch (error) {
      console.error("Error updating CPR Disbursement:", error);
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const errorList = Object.values(serverErrors).flat();
        setEditError(errorList);
      } else {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update CPR Disbursement";
        setEditError([msg]);
      }
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update CPR Disbursement"
      );
    } finally {
      setUpdating(false);
    }
  };

  // 5. API DELETE: cpr-disbursement/{id} (Delete)
  const handleOpenDelete = (item) => {
    setItemToDelete(item);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete?.id) return;

    try {
      setDeleting(true);
      const token = Cookies.get("token");

      const response = await axios.delete(
        `${BASE_URL}/api/cpr-disbursement/${itemToDelete.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`DELETE /api/cpr-disbursement/${itemToDelete.id} response:`, response.data);
      toast.success(
        response.data?.message || "CPR Disbursement deleted successfully!"
      );
      setOpenDeleteDialog(false);
      setItemToDelete(null);
      fetchDisbursementData();
    } catch (error) {
      console.error("Error deleting cpr-disbursement:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete CPR Disbursement"
      );
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    if (!search.trim()) return disbursementList;
    const term = search.toLowerCase();
    return disbursementList.filter((item) => {
      const anchalName = String(item.anchal_name || item.achal || "").toLowerCase();
      const fundingAnchal = String(item.funding_anchal || "").toLowerCase();
      const fMonth = String(item.financial_month || "").toLowerCase();
      const fYear = String(item.financial_year || "").toLowerCase();
      return (
        anchalName.includes(term) ||
        fundingAnchal.includes(term) ||
        fMonth.includes(term) ||
        fYear.includes(term)
      );
    });
  }, [disbursementList, search]);

  const availableYears = financialYearList;

  return (
    <div className="w-full min-h-screen bg-white p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                CPR Disbursement
              </h1>
              <p className="text-xs text-slate-500">
                Manage and track disbursement remittances to Anchals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchDisbursementData}
            disabled={loading}
            className="text-xs h-9 gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="bg-[#193b59] hover:bg-[#122c44] text-white text-xs font-semibold h-9 px-4 rounded-[4px] gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Disbursement
          </Button>
        </div>
      </div>

      {/* Search & Counter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by Anchal name, funding..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Records:{" "}
          <span className="font-bold text-slate-900">{filteredList.length}</span>
        </div>
      </div>

      {/* Main Table: Only records from API */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-none">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-[#193b59]" />
            <p className="text-xs text-slate-500 font-medium">
              Loading CPR Disbursement records...
            </p>
          </div>
        ) : errorMsg && disbursementList.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <p className="text-xs font-medium text-rose-600">{errorMsg}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchDisbursementData}
              className="text-xs h-8"
            >
              Try Again
            </Button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                No Disbursement records found
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {search
                  ? "No matches found for your search"
                  : "Click 'Add Disbursement' to create your first record"}
              </p>
            </div>
            {!search && (
              <Button
                type="button"
                size="sm"
                onClick={handleOpenCreate}
                className="bg-[#193b59] hover:bg-[#122c44] text-white text-xs px-4 h-8 rounded-[4px] mt-1"
              >
                + Add First Disbursement
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#edf3f9] text-slate-800 font-semibold border-b border-slate-200">
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-800">
                    Financial Year
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-800">
                    Month
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-800">
                    Anchal Name
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-800">
                    Funding Anchal
                  </TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold text-slate-800 text-center">
                    Acharyas
                  </TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold text-slate-800 text-right">
                    Amount (₹)
                  </TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold text-slate-800 text-center">
                    Acharyas Paid
                  </TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold text-slate-800">
                    Up To Month
                  </TableHead>
                  <TableHead className="py-3 px-3 text-xs font-semibold text-slate-800">
                    Remittance Date
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-800 text-right">
                    This Month (₹)
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-semibold text-slate-800 text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((item, idx) => (
                  <TableRow
                    key={item.id || idx}
                    className="hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                  >
                    <TableCell className="py-3 px-4 text-xs font-medium text-slate-900">
                      {item.financial_year || "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-slate-700">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                        {item.financial_month || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs font-semibold text-slate-800">
                      {item.anchal_name || item.achal || "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-slate-600">
                      {item.funding_anchal || "—"}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-xs text-center text-slate-700">
                      {item.no_of_acharyas ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-xs text-right font-medium text-slate-800">
                      {item.amount !== undefined && item.amount !== null
                        ? `₹${Number(item.amount).toLocaleString("en-IN")}`
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-xs text-center text-slate-700 font-medium">
                      {item.no_of_acharyas_paid ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-xs text-slate-700">
                      {item.up_to_month_paid || "—"}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-xs text-slate-700">
                      {item.remittance_date
                        ? moment(item.remittance_date).isValid()
                          ? moment(item.remittance_date).format("DD-MM-YYYY")
                          : item.remittance_date
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-xs text-right font-semibold text-emerald-700">
                      {item.total_remittance_this_month !== undefined &&
                      item.total_remittance_this_month !== null
                        ? `₹${Number(item.total_remittance_this_month).toLocaleString("en-IN")}`
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="h-8 w-8 text-slate-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                          title="Edit Disbursement"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(item)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Delete Disbursement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE DISBURSEMENT (POST /api/cpr-disbursement) ================= */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Add CPR Disbursement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record Anchal disbursements with remittance and Acharyas paid details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4 pt-2">
            {/* Server Error Alert Banner */}
            {createError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  Validation Error from Server:
                </div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {createError.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Header: Financial Year and Financial Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Financial Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.financial_year}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    const availMonths = getAvailableMonths(newYear, currentYear);
                    const newMonth = availMonths.includes(formData.financial_month)
                      ? formData.financial_month
                      : availMonths[availMonths.length - 1];
                    setFormData({
                      ...formData,
                      financial_year: newYear,
                      financial_month: newMonth,
                    });
                    fetchAnchals(newYear);
                  }}
                  className="w-full h-9 border border-slate-300 rounded-md px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                  required
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Financial Month <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.financial_month}
                  onChange={(e) =>
                    setFormData({ ...formData, financial_month: e.target.value })
                  }
                  className="w-full h-9 border border-slate-300 rounded-md px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                  required
                >
                  {getAvailableMonths(formData.financial_year, currentYear).map(
                    (m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Subs: Dynamic list of Disbursement rows */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Disbursement Entries ({formData.subs.length})
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSubRow}
                  className="text-xs h-7 gap-1 border-dashed text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Entry
                </Button>
              </div>

              {formData.subs.map((sub, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-50/60 rounded-lg border border-slate-200 shadow-xs space-y-3 relative"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Entry #{idx + 1}
                    </span>
                    {formData.subs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubRow(idx)}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Anchal Name */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Anchal Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={sub.anchal_name}
                          onChange={(e) =>
                            handleSelectAnchalForSub(idx, e.target.value)
                          }
                          className="w-full h-9 border border-slate-300 rounded-md px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none pr-8 font-medium"
                          required
                        >
                          <option value="">-- Select Anchal --</option>
                          {anchalOptions.map((a, aIdx) => {
                            const aName = getAnchalLabel(a, aIdx);
                            return (
                              <option key={a?.id || aIdx} value={aName}>
                                {aName}
                              </option>
                            );
                          })}
                          {sub.anchal_name &&
                            !anchalOptions.some(
                              (a, aIdx) =>
                                getAnchalLabel(a, aIdx) === sub.anchal_name
                            ) && (
                              <option value={sub.anchal_name}>
                                {sub.anchal_name}
                              </option>
                            )}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </div>

                    {/* Funding Anchal */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Funding Anchal <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={sub.funding_anchal}
                        onChange={(e) =>
                          handleSubChange(idx, "funding_anchal", e.target.value)
                        }
                        placeholder="e.g. Kolkata Chapter / Self"
                        className="text-xs h-9 bg-white"
                        required
                      />
                    </div>

                    {/* No of Acharyas */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        No. of Acharyas <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={sub.no_of_acharyas}
                        onChange={(e) =>
                          handleSubChange(idx, "no_of_acharyas", e.target.value)
                        }
                        placeholder="e.g. 30"
                        className="text-xs h-9 bg-white text-right"
                        required
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sub.amount}
                        onChange={(e) =>
                          handleSubChange(idx, "amount", e.target.value)
                        }
                        placeholder="e.g. 50000"
                        className="text-xs h-9 bg-white text-right"
                        required
                      />
                    </div>

                    {/* No of Acharyas Paid */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        No. of Acharyas Paid <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={sub.no_of_acharyas_paid}
                        onChange={(e) =>
                          handleSubChange(idx, "no_of_acharyas_paid", e.target.value)
                        }
                        placeholder="e.g. 28"
                        className="text-xs h-9 bg-white text-right"
                        required
                      />
                    </div>

                    {/* Up to Month Paid */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Up To Month Paid <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={sub.up_to_month_paid}
                        onChange={(e) =>
                          handleSubChange(idx, "up_to_month_paid", e.target.value)
                        }
                        className="w-full h-9 border border-slate-300 rounded-md px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                        required
                      >
                        {getAvailableMonths(formData.financial_year || currentYear, currentYear).map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Report When Received (no future date) */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Report When Received <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        max={todayDate}
                        value={sub.report_when_received}
                        onChange={(e) =>
                          handleSubChange(idx, "report_when_received", e.target.value)
                        }
                        className="text-xs h-9 bg-white"
                        required
                      />
                    </div>

                    {/* Remittance Date (no future date) */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Remittance Date <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="date"
                        max={todayDate}
                        value={sub.remittance_date}
                        onChange={(e) =>
                          handleSubChange(idx, "remittance_date", e.target.value)
                        }
                        className="text-xs h-9 bg-white"
                        required
                      />
                    </div>

                    {/* Total Remittance Last Month */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Total Remittance Last Month (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sub.total_remittance_last_month}
                        onChange={(e) =>
                          handleSubChange(
                            idx,
                            "total_remittance_last_month",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 45000"
                        className="text-xs h-9 bg-white text-right"
                        required
                      />
                    </div>

                    {/* Total Remittance This Month */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Total Remittance This Month (₹) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sub.total_remittance_this_month}
                        onChange={(e) =>
                          handleSubChange(
                            idx,
                            "total_remittance_this_month",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 50000"
                        className="text-xs h-9 bg-white text-right font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenCreateModal(false)}
                disabled={submitting}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#193b59] hover:bg-[#122c44] text-white text-xs h-8 px-4 font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  "Create Disbursement"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: EDIT DISBURSEMENT (PUT /api/cpr-disbursement/{id}) ================= */}
      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Edit CPR Disbursement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update Anchal disbursement record details.
            </DialogDescription>
          </DialogHeader>

          {fetchingEdit ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#193b59]" />
              <p className="text-xs text-slate-500 font-medium">
                Loading disbursement details...
              </p>
            </div>
          ) : (
            <form onSubmit={handleConfirmEdit} className="space-y-4 pt-1 text-xs">
              {/* Server Error Alert Banner */}
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    Validation Error from Server:
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {editError.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Financial Year & Financial Month (Editable Dropdowns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Financial Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.financial_year}
                    onChange={(e) => {
                      const newYear = e.target.value;
                      const availMonths = getAvailableMonths(newYear, currentYear);
                      const newMonth = availMonths.includes(editFormData.financial_month)
                        ? editFormData.financial_month
                        : availMonths[availMonths.length - 1];
                      setEditFormData({
                        ...editFormData,
                        financial_year: newYear,
                        financial_month: newMonth,
                      });
                      fetchAnchals(newYear);
                    }}
                    className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                    required
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                    {editFormData.financial_year &&
                      !availableYears.includes(editFormData.financial_year) && (
                        <option value={editFormData.financial_year}>
                          {editFormData.financial_year}
                        </option>
                      )}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Financial Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.financial_month}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        financial_month: e.target.value,
                      })
                    }
                    className="w-full h-8 border border-slate-300 rounded px-2.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                    required
                  >
                    {getAvailableMonths(editFormData.financial_year, currentYear).map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Anchal Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Anchal Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editFormData.anchal_name}
                      onChange={(e) => {
                        const anchalVal = e.target.value;
                        const matched = anchalOptions.find(
                          (a, aIdx) =>
                            getAnchalLabel(a, aIdx) === anchalVal ||
                            String(a?.id) === anchalVal ||
                            a?.achal === anchalVal ||
                            a?.anchal_name === anchalVal ||
                            a?.anchal === anchalVal
                        );
                        const matchedName = matched
                          ? getAnchalLabel(matched)
                          : anchalVal;
                        setEditFormData({
                          ...editFormData,
                          anchal_name: matchedName,
                          funding_anchal:
                            matched?.funding_anchal ||
                            matched?.fundingAnchal ||
                            editFormData.funding_anchal ||
                            "",
                          no_of_acharyas:
                            matched?.no_of_acharyas ||
                            matched?.acharyas ||
                            matched?.acharyasCount ||
                            editFormData.no_of_acharyas ||
                            "",
                          amount:
                            matched?.amount ||
                            matched?.annualTarget ||
                            matched?.target ||
                            editFormData.amount ||
                            "",
                        });
                      }}
                      className="w-full h-9 border border-slate-300 rounded-md px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none pr-8 font-medium"
                      required
                    >
                      <option value="">-- Select Anchal --</option>
                      {anchalOptions.map((a, aIdx) => {
                        const aName = getAnchalLabel(a, aIdx);
                        return (
                          <option key={a?.id || aIdx} value={aName}>
                            {aName}
                          </option>
                        );
                      })}
                      {editFormData.anchal_name &&
                        !anchalOptions.some(
                          (a, aIdx) =>
                            getAnchalLabel(a, aIdx) === editFormData.anchal_name
                        ) && (
                          <option value={editFormData.anchal_name}>
                            {editFormData.anchal_name}
                          </option>
                        )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Funding Anchal */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Funding Anchal <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={editFormData.funding_anchal}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        funding_anchal: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white"
                    required
                  />
                </div>

                {/* No of Acharyas */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. of Acharyas <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editFormData.no_of_acharyas}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        no_of_acharyas: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white text-right"
                    required
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Amount (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        amount: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white text-right"
                    required
                  />
                </div>

                {/* No of Acharyas Paid */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. of Acharyas Paid <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={editFormData.no_of_acharyas_paid}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        no_of_acharyas_paid: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white text-right"
                    required
                  />
                </div>

                {/* Up To Month Paid */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Up To Month Paid <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editFormData.up_to_month_paid}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        up_to_month_paid: e.target.value,
                      })
                    }
                    className="w-full h-9 border border-slate-300 rounded-md px-3 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    required
                  >
                    {getAvailableMonths(editFormData.financial_year || currentYear, currentYear).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Report When Received (no future date) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Report When Received <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    max={todayDate}
                    value={editFormData.report_when_received}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        report_when_received: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white"
                    required
                  />
                </div>

                {/* Remittance Date (no future date) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Remittance Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    max={todayDate}
                    value={editFormData.remittance_date}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        remittance_date: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white"
                    required
                  />
                </div>

                {/* Total Remittance Last Month */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Remittance Last Month (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.total_remittance_last_month}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        total_remittance_last_month: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white text-right"
                    required
                  />
                </div>

                {/* Total Remittance This Month */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Total Remittance This Month (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editFormData.total_remittance_this_month}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        total_remittance_this_month: e.target.value,
                      })
                    }
                    className="text-xs h-9 bg-white text-right font-medium"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenEditModal(false)}
                  disabled={updating}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updating}
                  className="bg-[#193b59] hover:bg-[#122c44] text-white text-xs h-8 px-4 font-semibold"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Updating...
                    </>
                  ) : (
                    "Update Disbursement"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= ALERT DIALOG: DELETE CONFIRMATION ================= */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Delete Disbursement Record
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              Are you sure you want to delete the disbursement record for{" "}
              <span className="font-semibold text-slate-900">
                {itemToDelete?.anchal_name || itemToDelete?.achal || "this Anchal"}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="text-xs h-8"
              onClick={() => setItemToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CPRDisbursement;
