import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import moment from "moment";
import BASE_URL from "@/config/base-url";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import {
  Plus,
  Download,
  Upload,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  X,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import CPRPrintReport from "./cpr-print-report";
import { fetchFinancialYearsFromApi } from "@/utils/financial-year";
import { MASTER_ANCHAL_LIST } from "@/utils/anchal";
import { useSidebar } from "@/components/ui/sidebar";

const useSafeSidebar = () => {
  try {
    return useSidebar();
  } catch {
    return null;
  }
};

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

// Helper to get current financial year
const getCurrentFinancialYear = () => {
  const cookieYear = Cookies.get("currentYear");
  if (cookieYear) return cookieYear;
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth();
  const startYr = calMonth < 3 ? calYear - 1 : calYear;
  return `${startYr}-${String(startYr + 1).slice(-2)}`;
};

// Helper to get current month name (e.g. "October")
const getCurrentMonthName = () => {
  const now = new Date();
  return now.toLocaleString("en-US", { month: "long" });
};

// Helper to get available months (all 12 months available per Priority Matrix)
const getAvailableMonths = () => {
  return FINANCIAL_MONTHS;
};

// Return financial year coming from API / active config
const getAvailableFinancialYears = (currYear) => {
  return currYear ? [currYear] : ["2026-27"];
};

// Helper for Indian Currency Formatting
const formatINR = (val) => {
  if (val === undefined || val === null || val === "" || isNaN(val)) return "";
  const num = Number(val);
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

// Helper to get today's date formatted as YYYY-MM-DD
const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to safely clean string/number values from API or state, ensuring null/undefined/"null" are converted to ""
const cleanVal = (val) => {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  if (s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return "";
  return s;
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

const CPRForm = ({
  initialMonth = "",
  initialYear = "",
  reportId = null,
  isView: initialIsView = false,
  isEdit = false,
  onBack = null,
}) => {
  const navigate = useNavigate();
  const sidebar = useSafeSidebar();
  const bottomBarLeft = useMemo(() => {
    if (!sidebar || sidebar.isMobile) return "0px";
    return sidebar.open ? "var(--sidebar-width, 16rem)" : "var(--sidebar-width-icon, 3rem)";
  }, [sidebar?.isMobile, sidebar?.open]);

  const [currentReportId, setCurrentReportId] = useState(reportId);

  useEffect(() => {
    if (reportId) {
      setCurrentReportId(reportId);
    }
  }, [reportId]);

  // Top Header State - all cleared
  const todayDate = useMemo(() => getTodayDateString(), []);
  const [chapterName, setChapterName] = useState("");
  const [monthIndex, setMonthIndex] = useState("");
  const [monthName, setMonthName] = useState(initialMonth || "");
  const [cppName, setCppName] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");
  const [subChapters, setSubChapters] = useState([]);
  const [newSubChapter, setNewSubChapter] = useState("");
  const [showSubChapterInput, setShowSubChapterInput] = useState(false);
  const [financialYear, setFinancialYear] = useState(
    initialYear || Cookies.get("currentYear") || "2026-27"
  );
  const [financialYearList, setFinancialYearList] = useState(() => {
    const active = initialYear || Cookies.get("currentYear") || "2026-27";
    return [active];
  });
  const [chapterList, setChapterList] = useState([]);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get(`${BASE_URL}/api/chapter-active`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          setChapterList(
            list
              .map((c) => (typeof c === "string" ? c : c.chapter_name || c.name || ""))
              .filter(Boolean)
          );
        }
      } catch (err) {
        console.warn("Could not fetch chapters list", err);
      }
    };
    fetchChapters();
  }, []);

  // Track which fields/sections were auto-filled from DB
  const [dbAutoFilled, setDbAutoFilled] = useState({
    header: false,
    membership: false,
    meetings: false,
    ots: false,
    otsPrp: false,
    donations: false,
    events: false,
    banks: false,
    vanyatras: false,
    disbursements: false,
    boxes: false,
    investments: false,
    cashInHand: false,
    samagri: false,
    donorBoards: false,
    schoolProgress: false,
  });

  useEffect(() => {
    if (Cookies.get("currentYear")) return;
    fetchFinancialYearsFromApi().then((list) => {
      if (list && list.length > 0) {
        const finalYears =
          initialYear && !list.includes(initialYear)
            ? [...list, initialYear]
            : list;
        setFinancialYearList(finalYears);
        if (!financialYear || !finalYears.includes(financialYear)) {
          setFinancialYear(finalYears[0]);
        }
      }
    });
  }, [initialYear]);

  const currentFY = useMemo(() => getCurrentFinancialYear(), []);
  const availableMonths = useMemo(
    () => getAvailableMonths(financialYear, currentFY),
    [financialYear, currentFY]
  );

  const [csrStatus, setCsrStatus] = useState("Draft");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedAt, setSavedAt] = useState("");

  const isSubmittedReport =
    String(csrStatus || "").toLowerCase() === "submitted" ||
    String(csrStatus || "").toLowerCase() === "completed" ||
    String(csrStatus || "").toLowerCase() === "active" ||
    String(csrStatus || "") === "1";

  const [isEditApiTriggered, setIsEditApiTriggered] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  const isView = Boolean(initialIsView || isSubmittedReport);
  const isEditMode = Boolean(reportId || isEdit || isEditApiTriggered || isDraftSaved);

  // Manual fields are editable when status is Draft (not submitted/completed).
  // Auto-filled fields (membership, OTS, donations, banks, etc.) remain locked
  // by their own dbAutoFilled flags regardless.
  const isManualFieldDisabled = isSubmittedReport;

  useEffect(() => {
    if (initialMonth && availableMonths.includes(initialMonth)) {
      setMonthName(initialMonth);
      const idx = FINANCIAL_MONTHS.indexOf(initialMonth);
      if (idx !== -1) {
        setMonthIndex(String(idx + 1));
      }
    }
  }, [initialMonth, availableMonths]);

  // If currently selected month is not in availableMonths (e.g. future month), clear it
  useEffect(() => {
    if (monthName && !availableMonths.includes(monthName)) {
      setMonthName("");
      setMonthIndex("");
    }
  }, [availableMonths, monthName]);

  // Section A: Membership Data - cleared
  const [memberships, setMemberships] = useState({
    chapter: { asOnMarch: "", added: "", tillDate: "" },
    yuva: { asOnMarch: "", added: "", tillDate: "" },
    mahila: { asOnMarch: "", added: "", tillDate: "" },
    renewal: { asOnMarch: "", added: "", tillDate: "" },
    newMember: { asOnMarch: "", added: "", tillDate: "" },
  });

  const sectionATotals = useMemo(() => {
    const marchSum =
      (Number(memberships.chapter.asOnMarch) || 0) +
      (Number(memberships.yuva.asOnMarch) || 0) +
      (Number(memberships.mahila.asOnMarch) || 0);

    const addedSum =
      (Number(memberships.chapter.added) || 0) +
      (Number(memberships.yuva.added) || 0) +
      (Number(memberships.mahila.added) || 0) +
      (Number(memberships.renewal.added) || 0) +
      (Number(memberships.newMember.added) || 0);

    const tillDateSum =
      (Number(memberships.chapter.tillDate || memberships.chapter.added) || 0) +
      (Number(memberships.yuva.tillDate || memberships.yuva.added) || 0) +
      (Number(memberships.mahila.tillDate || memberships.mahila.added) || 0) +
      (Number(memberships.renewal.tillDate || memberships.renewal.added) || 0) +
      (Number(memberships.newMember.tillDate || memberships.newMember.added) || 0);

    const getRowCumulative = (row) => {
      const march = Number(row?.asOnMarch) || 0;
      const td = Number(row?.tillDate !== undefined && row?.tillDate !== "" ? row?.tillDate : row?.added) || 0;
      return march + td;
    };

    const cumulativeSum =
      getRowCumulative(memberships.chapter) +
      getRowCumulative(memberships.yuva) +
      getRowCumulative(memberships.mahila) +
      getRowCumulative(memberships.renewal) +
      getRowCumulative(memberships.newMember);

    const amountSum = tillDateSum * 1000;

    return {
      asOnMarch: marchSum || "",
      added: addedSum || "",
      tillDate: tillDateSum || "",
      cumulative: cumulativeSum || "",
      amount: amountSum ? formatINR(amountSum) : "",
    };
  }, [memberships]);

  // Section B: Executive Committee Meetings - cleared
  const [noMeetingHeld, setNoMeetingHeld] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState({
    date: "",
    type: "Executive Committee Meeting",
    membersCount: "",
    invited: "",
    attended: "",
    agenda: "",
  });

  const handleAddMeeting = () => {
    setMeetings((prev) => [
      ...prev,
      {
        id: Date.now(),
        meetingOf: "Choose",
        type: "Executive Committee Meeting",
        date: "",
        membersCount: "",
        invited: "",
        attended: "",
        agenda: "",
        outcome: "",
      },
    ]);
  };

  const handleRemoveMeeting = (index) => {
    setMeetings((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMeeting = (index, field, value) => {
    setMeetings((prev) =>
      prev.map((m, i) => {
        if (i !== index) return m;
        const updated = { ...m, [field]: value };
        if (field === "meetingOf") updated.type = value;
        if (field === "type") updated.meetingOf = value;
        return updated;
      })
    );
  };

  // Section C: OTS Details & Collection - cleared
  const [otsPRP, setOtsPRP] = useState("");
  const [otsCountDuringMonth, setOtsCountDuringMonth] = useState("");
  const [otsCountTillDateInput, setOtsCountTillDateInput] = useState("");
  const [otsTotalAmountDuringMonth, setOtsTotalAmountDuringMonth] = useState("");
  const [otsTotalAmountTillDate, setOtsTotalAmountTillDate] = useState("");
  const [otsExtraAmountDuringMonth, setOtsExtraAmountDuringMonth] = useState("");
  const [otsExtraAmountTillDate, setOtsExtraAmountTillDate] = useState("");

  const otsCountTillDate = otsCountTillDateInput !== "" ? otsCountTillDateInput : otsCountDuringMonth;

  // Derivations for Regular, Extra, and Total OTS:
  // 1 regular OTS = ₹30,000
  const otsCountDuringNum = Number(otsCountDuringMonth) || 0;
  const otsCountTillNum = Number(otsCountTillDate) || 0;

  const otsRegularDuring = otsCountDuringNum > 0 ? otsCountDuringNum * 30000 : 0;
  const otsRegularTill = otsCountTillNum > 0 ? otsCountTillNum * 30000 : 0;

  // Monthly Extra & Total OTS
  let otsTotalDuring = 0;
  let otsExtraDuring = 0;
  if (otsTotalAmountDuringMonth !== "") {
    otsTotalDuring = Number(otsTotalAmountDuringMonth) || 0;
    otsExtraDuring = Math.max(0, otsTotalDuring - otsRegularDuring);
  } else if (otsExtraAmountDuringMonth !== "") {
    otsExtraDuring = Number(otsExtraAmountDuringMonth) || 0;
    otsTotalDuring = otsRegularDuring + otsExtraDuring;
  } else {
    otsExtraDuring = 0;
    otsTotalDuring = otsRegularDuring;
  }

  // Till Date Extra & Total OTS
  let otsTotalTill = 0;
  let otsExtraTill = 0;
  if (otsTotalAmountTillDate !== "") {
    otsTotalTill = Number(otsTotalAmountTillDate) || 0;
    otsExtraTill = Math.max(0, otsTotalTill - otsRegularTill);
  } else if (otsExtraAmountTillDate !== "") {
    otsExtraTill = Number(otsExtraAmountTillDate) || 0;
    otsTotalTill = otsRegularTill + otsExtraTill;
  } else {
    otsExtraTill = otsExtraDuring;
    otsTotalTill = otsRegularTill + otsExtraTill;
  }

  const otsAmountDuringMonth = otsTotalDuring;
  const otsAmountTillDate = otsTotalTill;

  // Input change handlers to auto-classify Regular and Extra OTS
  const handleOtsCountDuringChange = (val) => {
    setOtsCountDuringMonth(val);
    const countNum = Number(val) || 0;
    const reg = countNum * 30000;
    if (otsTotalAmountDuringMonth !== "") {
      const tot = Number(otsTotalAmountDuringMonth) || 0;
      setOtsExtraAmountDuringMonth(String(Math.max(0, tot - reg)));
    } else if (otsExtraAmountDuringMonth !== "") {
      const ext = Number(otsExtraAmountDuringMonth) || 0;
      setOtsTotalAmountDuringMonth(String(reg + ext));
    }
  };

  const handleOtsCountTillChange = (val) => {
    setOtsCountTillDateInput(val);
    const countNum = Number(val) || 0;
    const reg = countNum * 30000;
    if (otsTotalAmountTillDate !== "") {
      const tot = Number(otsTotalAmountTillDate) || 0;
      setOtsExtraAmountTillDate(String(Math.max(0, tot - reg)));
    } else if (otsExtraAmountTillDate !== "") {
      const ext = Number(otsExtraAmountTillDate) || 0;
      setOtsTotalAmountTillDate(String(reg + ext));
    }
  };

  const handleOtsTotalDuringChange = (val) => {
    setOtsTotalAmountDuringMonth(val);
    if (val === "") {
      setOtsExtraAmountDuringMonth("");
    } else {
      const tot = Number(val) || 0;
      setOtsExtraAmountDuringMonth(String(Math.max(0, tot - otsRegularDuring)));
    }
  };

  const handleOtsTotalTillChange = (val) => {
    setOtsTotalAmountTillDate(val);
    if (val === "") {
      setOtsExtraAmountTillDate("");
    } else {
      const tot = Number(val) || 0;
      setOtsExtraAmountTillDate(String(Math.max(0, tot - otsRegularTill)));
    }
  };

  const handleOtsExtraDuringChange = (val) => {
    setOtsExtraAmountDuringMonth(val);
    if (val === "") {
      setOtsTotalAmountDuringMonth(otsRegularDuring ? String(otsRegularDuring) : "");
    } else {
      const ext = Number(val) || 0;
      setOtsTotalAmountDuringMonth(String(otsRegularDuring + ext));
    }
  };

  const handleOtsExtraTillChange = (val) => {
    setOtsExtraAmountTillDate(val);
    if (val === "") {
      setOtsTotalAmountTillDate(otsRegularTill ? String(otsRegularTill) : "");
    } else {
      const ext = Number(val) || 0;
      setOtsTotalAmountTillDate(String(otsRegularTill + ext));
    }
  };

  // Section D: Donation & CSR Details - cleared
  const [donations, setDonations] = useState({
    general: { donors: "", during: "", till: "" },
    csr: { donors: "", during: "", till: "" },
    nonCsr: { donors: "", during: "", till: "" },
    other: { donors: "", during: "", till: "" },
  });

  const donationTotals = useMemo(() => {
    const nonCsrObj = donations.nonCsr || donations.other || {};
    const totalDonors =
      (Number(donations.general?.donors) || 0) +
      (Number(donations.csr?.donors) || 0) +
      (Number(nonCsrObj?.donors) || 0);

    const during =
      (Number(donations.general?.during) || 0) +
      (Number(donations.csr?.during) || 0) +
      (Number(nonCsrObj?.during) || 0);

    const till =
      (Number(donations.general?.till) || 0) +
      (Number(donations.csr?.till) || 0) +
      (Number(nonCsrObj?.till) || 0);

    return {
      donors: totalDonors || "",
      during: during ? formatINR(during) : "",
      till: till ? formatINR(till) : "",
      duringRaw: during,
      tillRaw: till,
    };
  }, [donations]);

  // Section E: Collection Boxes - cleared
  const [collectionBoxes, setCollectionBoxes] = useState({
    boxesThisMonth: "",
    boxesTillDate: "",
    amountThisMonth: "",
    amountTillDate: "",
  });

  // Section F: Investment (As on Date) - cleared
  const [investments, setInvestments] = useState({
    fd: "",
    mutualFund: "",
    others: "",
    othersSpecify: "",
  });

  const totalInvestment = useMemo(() => {
    const sum =
      (Number(investments.fd) || 0) +
      (Number(investments.mutualFund) || 0) +
      (Number(investments.others) || 0);
    return sum ? formatINR(sum) : "";
  }, [investments]);

  // Section G: Cash & Bank Balance - cleared
  const [cashInHand, setCashInHand] = useState("");
  const [bankBalances, setBankBalances] = useState([]);

  const totalBankBalance = useMemo(() => {
    const sum = bankBalances.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
    return sum ? formatINR(sum) : "";
  }, [bankBalances]);

  const totalCashAndBank = useMemo(() => {
    const bankSum = bankBalances.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
    const total = (Number(cashInHand) || 0) + bankSum;
    return total ? formatINR(total) : "";
  }, [cashInHand, bankBalances]);

  // Section H: Vanyatra - cleared
  const [vanyatras, setVanyatras] = useState([]);
  const [showVanyatraModal, setShowVanyatraModal] = useState(false);
  const [newVanyatra, setNewVanyatra] = useState({
    date: "",
    yatrisCount: "",
    vidyalayasVisited: "",
    pravasDone: "No",
    remarks: "",
  });

  // Section I: Events During the Month - cleared
  const [noEventHeld, setNoEventHeld] = useState(false);
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState({
    date: "",
    type: "",
    committee: "Youth",
    photos: 0,
  });

  const handleAddEvent = () => {
    setEvents((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        description: "",
        date: "",
        time: "",
        type: "Public Event",
        eventFor: "Youth",
        committee: "Youth",
        image: null,
        subs: [],
        photos: 0,
      },
    ]);
  };

  const handleRemoveEvent = (index) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateEvent = (index, field, value) => {
    setEvents((prev) =>
      prev.map((ev, i) => {
        if (i !== index) return ev;
        const updated = { ...ev, [field]: value };
        if (field === "eventFor") updated.committee = value;
        if (field === "committee") updated.eventFor = value;
        return updated;
      })
    );
  };

  // Section J: Annexure 1 - Disbursement to Anchal - cleared
  const [anchals, setAnchals] = useState([]);
  const [showAnchalModal, setShowAnchalModal] = useState(false);
  const [anchalOptions, setAnchalOptions] = useState(MASTER_ANCHAL_LIST);
  const [loadingAnchals, setLoadingAnchals] = useState(false);
  const [newAnchal, setNewAnchal] = useState({
    name: "",
    acharyasCount: "",
    annualTarget: "",
    remittanceLastMonth: "",
    remittanceThisMonth: "",
  });

  // Fetch Anchals for Financial Year: POST /api/getAnchal
  const fetchAnchals = useCallback(async (year) => {
    try {
      setLoadingAnchals(true);
      const token = Cookies.get("token");
      const targetYear = year || financialYear;

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
        console.warn("POST /api/getAnchal error in CPRForm:", callErr);
      }

      // If backend database has records (e.g. ftschamp.com), use them.
      // If backend database is empty (e.g. agstest.in test server), use MASTER_ANCHAL_LIST.
      if (!list || list.length === 0) {
        list = MASTER_ANCHAL_LIST;
      }

      setAnchalOptions(list);
    } catch (err) {
      console.error("Error fetching getAnchal in CPRForm:", err);
      setAnchalOptions((prev) => (prev && prev.length > 0 ? prev : MASTER_ANCHAL_LIST));
    } finally {
      setLoadingAnchals(false);
    }
  }, [financialYear]);

  useEffect(() => {
    fetchAnchals(financialYear);
  }, [fetchAnchals, financialYear]);

  // Section K: Annexure 2 - Monthly Summary / Check Points - cleared
  const [samagriReached, setSamagriReached] = useState("No");
  const [samagriRemarks, setSamagriRemarks] = useState("");

  const [donorBoard, setDonorBoard] = useState({
    nonCsr: { total: "", sent: "", remarks: "" },
    csr: { total: "", sent: "", remarks: "" },
  });

  const [schoolProgressSent, setSchoolProgressSent] = useState("No");
  const [progressRemarks, setProgressRemarks] = useState("");

  const [selectedMonitoringAnchal, setSelectedMonitoringAnchal] = useState("Choose");
  const [monitoringAnchalsList, setMonitoringAnchalsList] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);

  const getImageUrl = (imageFor, filename) => {
    if (!filename) return null;
    if (filename.startsWith("http://") || filename.startsWith("https://")) return filename;
    const entry = imageUrls.find(
      (u) => (u.image_for || "").toLowerCase() === (imageFor || "").toLowerCase()
    );
    if (entry && entry.image_url) {
      const base = entry.image_url.endsWith("/") ? entry.image_url : entry.image_url + "/";
      return base + filename;
    }
    return `${BASE_URL}/storage/${filename}`;
  };

  // Sign & Submit & PDF / Excel refs
  const [signedFile, setSignedFile] = useState(null);
  const [existingSignedCprUrl, setExistingSignedCprUrl] = useState("");
  const [rawExcelFile, setRawExcelFile] = useState(null);
  const [existingRawExcelUrl, setExistingRawExcelUrl] = useState("");
  const rawExcelInputRef = useRef(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const fileInputRef = useRef(null);
  const printableRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active section tracking for left sticky sidebar
  const [activeNav, setActiveNav] = useState("section-report-details");

  const scrollToSection = (id) => {
    setActiveNav(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const [loadingDetails, setLoadingDetails] = useState(false);

  // Auto-fill fields returned by POST /api/getCPRReportDetails
  const applyReportDetails = useCallback((data) => {
    if (!data || typeof data !== "object") return;
    console.log("Applying auto-fill details from getCPRReportDetails:", data);

    const cpr =
      data.cpr_details && typeof data.cpr_details === "object"
        ? data.cpr_details
        : data;

    // Report ID - only update if already in edit mode
    if (cpr.id && (reportId || isEdit || isEditApiTriggered)) {
      setCurrentReportId(cpr.id);
    }

    // Financial Year from API
    const fy = data.financial_year || cpr.financial_year;
    if (fy) {
      setFinancialYear(fy);
      setFinancialYearList((prev) =>
        prev.includes(fy) ? prev : [...prev, fy]
      );
    }

    // Chapter Name & CPP Info

    const chName =
      data.chapter_name ||
      cpr.chapter?.chapter_name ||
      cpr.chapter_name ||
      data.chapter?.chapter_name ||
      data.name_of_chapter;
    if (chName && (!chapterName || !isEditMode)) {
      setChapterName(chName);
    }

    // CPP Name:
    // When creating (!isEditMode), take from getCPRReportDetails API.
    // When editing (isEditMode), take from GET /api/cpr-report/{id} and do NOT overwrite!
    if (!isEditMode) {
      const cpName =
        data.cpp_name ||
        cpr.name_of_cpp ||
        cpr.cpp_name ||
        data.name_of_cpp ||
        data.chairman;
      if (cpName) {
        setCppName(cpName);
      }
    }

    const subDate = data.submission_date || cpr.submission_date;
    if (subDate) {
      setSubmissionDate(subDate);
    }

    if (Array.isArray(data.sub_chapters)) {
      setSubChapters(data.sub_chapters);
    }

    // Section A: Membership Details (supports membership_DataBeforeMonth & membership_DataCurrentMonth & renewal_members/new_members)
    const hasMembershipData =
      Array.isArray(data.membership_DataBeforeMonth) ||
      Array.isArray(data.membership_DataCurrentMonth) ||
      data.renewal_members !== undefined ||
      data.new_members !== undefined;

    if (hasMembershipData) {
      setMemberships((prev) => {
        const next = {
          chapter: { ...prev.chapter },
          yuva: { ...prev.yuva },
          mahila: { ...prev.mahila },
          renewal: { ...prev.renewal },
          newMember: { ...prev.newMember },
        };
        if (Array.isArray(data.membership_DataBeforeMonth)) {
          data.membership_DataBeforeMonth.forEach((item) => {
            const belong = (item.indicomp_belongs_to || "").toLowerCase();
            if (belong.includes("mahila")) next.mahila.asOnMarch = String(item.total_count ?? "");
            else if (belong.includes("yuva")) next.yuva.asOnMarch = String(item.total_count ?? "");
            else next.chapter.asOnMarch = String(item.total_count ?? "");
          });
        }
        if (Array.isArray(data.membership_DataCurrentMonth)) {
          data.membership_DataCurrentMonth.forEach((item) => {
            const belong = (item.indicomp_belongs_to || "").toLowerCase();
            if (belong.includes("mahila")) next.mahila.added = String(item.total_count ?? "");
            else if (belong.includes("yuva")) next.yuva.added = String(item.total_count ?? "");
            else next.chapter.added = String(item.total_count ?? "");
          });
        }

        // Apply root-level fields from response into Renewal Members and New Members
        if (data.renewal_members !== undefined && data.renewal_members !== null) {
          next.renewal.added = String(data.renewal_members);
        }
        if (data.renewal_members_till_date !== undefined && data.renewal_members_till_date !== null) {
          next.renewal.tillDate = String(data.renewal_members_till_date);
        }
        if (data.new_members !== undefined && data.new_members !== null) {
          next.newMember.added = String(data.new_members);
        }
        if (data.new_members_till_date !== undefined && data.new_members_till_date !== null) {
          next.newMember.tillDate = String(data.new_members_till_date);
        }

        return next;
      });
    } else {
      const memberData = data.membership || data.memberships;
      if (memberData && typeof memberData === "object" && !Array.isArray(memberData)) {
        setMemberships((prev) => ({
          chapter: {
            asOnMarch: cleanVal(memberData.chapter?.asOnMarch) || prev.chapter.asOnMarch,
            added: cleanVal(memberData.chapter?.added) || prev.chapter.added,
            tillDate: cleanVal(memberData.chapter?.tillDate) || prev.chapter.tillDate,
          },
          yuva: {
            asOnMarch: cleanVal(memberData.yuva?.asOnMarch) || prev.yuva.asOnMarch,
            added: cleanVal(memberData.yuva?.added) || prev.yuva.added,
            tillDate: cleanVal(memberData.yuva?.tillDate) || prev.yuva.tillDate,
          },
          mahila: {
            asOnMarch: cleanVal(memberData.mahila?.asOnMarch) || prev.mahila.asOnMarch,
            added: cleanVal(memberData.mahila?.added) || prev.mahila.added,
            tillDate: cleanVal(memberData.mahila?.tillDate) || prev.mahila.tillDate,
          },
          renewal: {
            asOnMarch: cleanVal(memberData.renewal?.asOnMarch) || prev.renewal.asOnMarch,
            added: cleanVal(data.renewal_members ?? memberData.renewal?.added) || prev.renewal.added,
            tillDate: cleanVal(data.renewal_members_till_date ?? memberData.renewal?.tillDate) || prev.renewal.tillDate,
          },
          newMember: {
            asOnMarch: cleanVal(memberData.newMember?.asOnMarch) || prev.newMember.asOnMarch,
            added: cleanVal(data.new_members ?? memberData.newMember?.added) || prev.newMember.added,
            tillDate: cleanVal(data.new_members_till_date ?? memberData.newMember?.tillDate) || prev.newMember.tillDate,
          },
        }));
      } else if (data.chapter_members_as_on_march !== undefined || data.as_on_march_chapter !== undefined) {
        setMemberships((prev) => ({
          chapter: {
            asOnMarch: cleanVal(data.chapter_members_as_on_march ?? data.as_on_march_chapter) || prev.chapter.asOnMarch,
            added: cleanVal(data.chapter_members_added ?? data.added_chapter) || prev.chapter.added,
            tillDate: prev.chapter.tillDate,
          },
          yuva: {
            asOnMarch: cleanVal(data.yuva_members_as_on_march ?? data.as_on_march_yuva) || prev.yuva.asOnMarch,
            added: cleanVal(data.yuva_members_added ?? data.added_yuva) || prev.yuva.added,
            tillDate: prev.yuva.tillDate,
          },
          mahila: {
            asOnMarch: cleanVal(data.mahila_members_as_on_march ?? data.as_on_march_mahila) || prev.mahila.asOnMarch,
            added: cleanVal(data.mahila_members_added ?? data.added_mahila) || prev.mahila.added,
            tillDate: prev.mahila.tillDate,
          },
          renewal: {
            asOnMarch: prev.renewal.asOnMarch,
            added: cleanVal(data.renewal_members) || prev.renewal.added,
            tillDate: cleanVal(data.renewal_members_till_date) || prev.renewal.tillDate,
          },
          newMember: {
            asOnMarch: prev.newMember.asOnMarch,
            added: cleanVal(data.new_members) || prev.newMember.added,
            tillDate: cleanVal(data.new_members_till_date) || prev.newMember.tillDate,
          },
        }));
      }
    }

    // Section B: Meetings (supports executive_committee_meeting, meetings)
    const meetList = Array.isArray(data.executive_committee_meeting)
      ? data.executive_committee_meeting
      : Array.isArray(data.executive_committee_meetings)
        ? data.executive_committee_meetings
        : Array.isArray(data.meeting)
          ? data.meeting
          : Array.isArray(data.meetings)
            ? data.meetings
            : null;
    if (meetList) {
      setMeetings(
        meetList.map((m, i) => ({
          id: m.id || i + 1,
          isFromDb: true,
          name: m.event_name || m.name || "",
          date: m.event_date || m.meeting_date || m.date || "",
          time: m.event_time || m.time || "",
          type: m.event_type || m.meeting_type || m.type || "Meeting",
          meetingOf:
            m.event_for ||
            m.meeting_of ||
            m.meetingOf ||
            m.event_type ||
            m.meeting_type ||
            m.type ||
            "Executive Committee",
          membersCount:
            m.total_members ||
            m.membersCount ||
            m.expected_members ||
            m.members_expected ||
            "",
          invited: m.members_invited || m.invited || "",
          attended: m.members_attended || m.attended || "",
          agenda:
            m.event_description ||
            m.agenda ||
            m.key_agenda ||
            m.key_agenda_points ||
            "",
          description: m.event_description || m.description || "",
          outcome: m.outcome || "",
        }))
      );
      if (meetList.length === 0 && data.no_meeting_held) {
        setNoMeetingHeld(true);
      } else if (meetList.length > 0) {
        setNoMeetingHeld(false);
      }
    }

    // Section C: OTS (supports ots_details: { receipt_no_of_ots, receipt_total_amount })
    if (data.ots_details && typeof data.ots_details === "object") {
      const countVal = cleanVal(data.ots_details.receipt_no_of_ots ?? data.ots_count_during_month ?? data.ots_count);
      if (countVal !== "") {
        setOtsCountDuringMonth(countVal);
      }
      if (data.ots_details.receipt_total_amount !== undefined) {
        const totAmt = cleanVal(data.ots_details.receipt_total_amount);
        setOtsTotalAmountDuringMonth(totAmt);
        const cnt = Number(countVal || otsCountDuringMonth) || 0;
        const reg = cnt * 30000;
        const extra = Math.max(0, (Number(totAmt) || 0) - reg);
        setOtsExtraAmountDuringMonth(String(extra));
      }
      if (data.ots_extra_amount !== undefined || data.ots_details.extra_amount !== undefined) {
        setOtsExtraAmountDuringMonth(cleanVal(data.ots_extra_amount ?? data.ots_details.extra_amount));
      }
      if (data.ots_details.prp !== undefined || data.ots_details.ots_prp !== undefined) {
        setOtsPRP(cleanVal(data.ots_details.prp ?? data.ots_details.ots_prp));
      }
    } else {
      if (data.ots_prp !== undefined || data.otsPRP !== undefined) {
        setOtsPRP(cleanVal(data.ots_prp ?? data.otsPRP));
      }
      if (data.ots_count_during_month !== undefined || data.ots_during_month !== undefined || data.ots_count !== undefined) {
        setOtsCountDuringMonth(cleanVal(data.ots_count_during_month ?? data.ots_during_month ?? data.ots_count));
      }
      if (data.ots_total_amount !== undefined || data.ots_amount !== undefined) {
        setOtsTotalAmountDuringMonth(cleanVal(data.ots_total_amount ?? data.ots_amount));
      }
      if (data.ots_extra_amount !== undefined) {
        setOtsExtraAmountDuringMonth(cleanVal(data.ots_extra_amount));
      }
    }

    // Check till date OTS if present
    if (data.ots_details_till_date && typeof data.ots_details_till_date === "object") {
      if (data.ots_details_till_date.receipt_no_of_ots !== undefined) {
        setOtsCountTillDateInput(cleanVal(data.ots_details_till_date.receipt_no_of_ots));
      }
      if (data.ots_details_till_date.receipt_total_amount !== undefined) {
        const totAmtTill = cleanVal(data.ots_details_till_date.receipt_total_amount);
        setOtsTotalAmountTillDate(totAmtTill);
        const cntTill = Number(data.ots_details_till_date.receipt_no_of_ots) || 0;
        const regTill = cntTill * 30000;
        const extraTill = Math.max(0, (Number(totAmtTill) || 0) - regTill);
        setOtsExtraAmountTillDate(String(extraTill));
      }
    } else {
      if (data.ots_count_till_date !== undefined) {
        setOtsCountTillDateInput(cleanVal(data.ots_count_till_date));
      }
      if (data.ots_total_amount_till_date !== undefined || data.ots_amount_till_date !== undefined) {
        setOtsTotalAmountTillDate(cleanVal(data.ots_total_amount_till_date ?? data.ots_amount_till_date));
      }
      if (data.ots_extra_amount_till_date !== undefined) {
        setOtsExtraAmountTillDate(cleanVal(data.ots_extra_amount_till_date));
      }
    }

    // Section D: Donations (supports csr_donation_details, non_csr_donation_details, general_donation)
    if (
      data.csr_donation_details ||
      data.csr_donation ||
      data.general_donation ||
      data.general_donation_details ||
      data.non_csr_donation_details ||
      data.non_csr_donation
    ) {
      const parseDonEntry = (obj, tillObj, prevEntry) => {
        const during =
          obj?.receipt_total_amount !== undefined
            ? String(obj.receipt_total_amount)
            : obj?.during !== undefined
              ? String(obj.during)
              : prevEntry?.during ?? "";
        const till =
          tillObj?.receipt_total_amount !== undefined
            ? String(tillObj.receipt_total_amount)
            : obj?.receipt_total_amount_till !== undefined
              ? String(obj.receipt_total_amount_till)
              : tillObj?.till !== undefined
                ? String(tillObj.till)
                : obj?.receipt_total_amount !== undefined
                  ? String(obj.receipt_total_amount)
                  : prevEntry?.till ?? "";
        const donors =
          obj?.receipt_count !== undefined
            ? String(obj.receipt_count)
            : obj?.donor_count !== undefined
              ? String(obj.donor_count)
              : obj?.donors !== undefined
                ? String(obj.donors)
                : obj?.count !== undefined
                  ? String(obj.count)
                  : prevEntry?.donors ?? "";
        return { during, till, donors };
      };

      setDonations((prev) => {
        const gen = parseDonEntry(
          data.general_donation || data.general_donation_details,
          data.general_donation_till_date,
          prev.general
        );
        const csr = parseDonEntry(
          data.csr_donation_details || data.csr_donation,
          data.csr_donation_till_date,
          prev.csr
        );
        const nonCsr = parseDonEntry(
          data.non_csr_donation_details || data.non_csr_donation,
          data.non_csr_donation_till_date,
          prev.nonCsr || prev.other
        );
        return {
          general: gen,
          csr: csr,
          nonCsr: nonCsr,
          other: nonCsr,
        };
      });
    } else {
      const donData = data.donation || data.donations;
      if (
        donData &&
        typeof donData === "object" &&
        !Array.isArray(donData) &&
        (donData.general || donData.csr || donData.nonCsr || donData.other)
      ) {
        const nonCsrObj = donData.nonCsr || donData.other || {};
        setDonations((prev) => ({
          general: {
            donors: cleanVal(donData.general?.donors) || prev.general?.donors || "",
            during: cleanVal(donData.general?.during) || prev.general?.during || "",
            till: cleanVal(donData.general?.till) || prev.general?.till || "",
          },
          csr: {
            donors: cleanVal(donData.csr?.donors) || prev.csr?.donors || "",
            during: cleanVal(donData.csr?.during) || prev.csr?.during || "",
            till: cleanVal(donData.csr?.till) || prev.csr?.till || "",
          },
          nonCsr: {
            donors: cleanVal(nonCsrObj.donors) || prev.nonCsr?.donors || "",
            during: cleanVal(nonCsrObj.during) || prev.nonCsr?.during || "",
            till: cleanVal(nonCsrObj.till) || prev.nonCsr?.till || "",
          },
          other: {
            donors: cleanVal(nonCsrObj.donors) || prev.other?.donors || "",
            during: cleanVal(nonCsrObj.during) || prev.other?.during || "",
            till: cleanVal(nonCsrObj.till) || prev.other?.till || "",
          },
        }));
      } else if (
        data.general_donation_during !== undefined ||
        data.csr_donation_during !== undefined ||
        data.non_csr_donation_during !== undefined ||
        data.other_donation_during !== undefined
      ) {
        const nonCsrDuring = cleanVal(data.non_csr_donation_during ?? data.other_donation_during);
        const nonCsrTill = cleanVal(data.non_csr_donation_till ?? data.other_donation_till);
        const nonCsrDonors = cleanVal(
          data.non_csr_donation_donors ?? data.other_donation_donors ?? data.non_csr_donors
        );
        setDonations({
          general: {
            donors: cleanVal(data.general_donation_donors ?? data.general_donors),
            during: cleanVal(data.general_donation_during),
            till: cleanVal(data.general_donation_till),
          },
          csr: {
            donors: cleanVal(data.csr_donation_donors ?? data.csr_donors),
            during: cleanVal(data.csr_donation_during),
            till: cleanVal(data.csr_donation_till),
          },
          nonCsr: {
            donors: nonCsrDonors,
            during: nonCsrDuring,
            till: nonCsrTill,
          },
          other: {
            donors: nonCsrDonors,
            during: nonCsrDuring,
            till: nonCsrTill,
          },
        });
      }
    }

    // Section G: Bank Balances (supports cash_bank_balance, bank, banks, cpr_bank)
    const bankList = Array.isArray(data.cash_bank_balance)
      ? data.cash_bank_balance
      : Array.isArray(data.bank)
        ? data.bank
        : Array.isArray(data.banks)
          ? data.banks
          : Array.isArray(data.bank_balances)
            ? data.bank_balances
            : Array.isArray(data.cpr_bank)
              ? data.cpr_bank
              : null;
    if (bankList) {
      setBankBalances(
        bankList.map((b, i) => ({
          id: b.id || i + 1,
          isFromDb: true,
          bankName: b.bank_name || b.bankName || "",
          balance: b.bank_balance ?? b.balance ?? "",
        }))
      );
    }

    // Section H: Van Yatra (supports vanyatra, vanyatras, cpr_vanyatra)
    const yatraList = Array.isArray(data.vanyatra)
      ? data.vanyatra
      : Array.isArray(data.vanyatras)
        ? data.vanyatras
        : Array.isArray(data.cpr_vanyatra)
          ? data.cpr_vanyatra
          : null;
    if (yatraList) {
      setVanyatras(
        yatraList.map((y, i) => ({
          id: y.id || i + 1,
          isFromDb: true,
          date: y.vanyatra_date || y.date || "",
          yatrisCount: y.no_of_days || y.yatrisCount || "",
          vidyalayasVisited: y.vanyatra_visited || y.vidyalayasVisited || "",
          conductedBy: y.conducted_by || "",
          pravasDone: y.pravas_done || y.pravasDone || "No",
          remarks: y.remarks || "",
          image1: y.vanyatra_image1 || "",
          image2: y.vanyatra_image2 || "",
        }))
      );
    }

    // Section I: Events (supports event, events, cpr_events)
    const evList = Array.isArray(data.event)
      ? data.event
      : Array.isArray(data.events)
        ? data.events
        : Array.isArray(data.cpr_events)
          ? data.cpr_events
          : null;
    if (evList) {
      if (evList.length > 0) {
        setNoEventHeld(false);
      } else if (data.no_event_held) {
        setNoEventHeld(true);
      }
      setEvents(
        evList.map((ev, i) => ({
          id: ev.id || i + 1,
          isFromDb: true,
          name: ev.event_name || ev.name || "",
          description: ev.event_description || ev.description || "",
          date: ev.event_date || ev.date || "",
          time: ev.event_time || ev.time || "",
          type: ev.event_type || ev.type || "Public Event",
          committee: ev.event_for || ev.committee || "Youth",
          eventFor: ev.event_for || ev.committee || "Youth",
          image: ev.event_image || null,
          subs: Array.isArray(ev.subs) ? ev.subs : [],
          photos:
            ev.photos ||
            ev.photos_count ||
            (Array.isArray(ev.subs) ? ev.subs.length : (ev.event_image ? 1 : 0)),
        }))
      );
    }

    // Section J: Disbursements (Annexure 1 - supports disbursement, disbursements, anchals)
    const disbList = Array.isArray(data.disbursement)
      ? data.disbursement
      : Array.isArray(data.disbursements)
        ? data.disbursements
        : Array.isArray(data.cpr_disbursement)
          ? data.cpr_disbursement
          : Array.isArray(data.anchals)
            ? data.anchals
            : null;
    if (disbList) {
      setAnchals(
        disbList.map((d, i) => ({
          id: d.id || i + 1,
          isFromDb: true,
          name: d.anchal_name || d.achal || d.name || "",
          fundingAnchal: d.funding_anchal || "",
          acharyasCount: d.no_of_acharyas || d.acharyasCount || "",
          acharyasPaid: d.no_of_acharyas_paid || "",
          annualTarget: d.amount || d.annualTarget || "",
          remittanceLastMonth: d.total_remittance_last_month || d.remittanceLastMonth || "",
          remittanceThisMonth: d.total_remittance_this_month || d.remittanceThisMonth || "",
          remittanceDate: d.remittance_date || "",
          upToMonthPaid: d.up_to_month_paid || "",
          reportWhenReceived: d.report_when_received || "",
        }))
      );
    }

    // Image URLs base map
    if (Array.isArray(data.image_url)) {
      setImageUrls(data.image_url);
    }

    // Auto-fill previous CPR Details if returned (e.g. from cpr)

    if (cpr.boxes_placed !== undefined && cpr.boxes_placed !== null) {
      setCollectionBoxes((prev) => ({
        ...prev,
        boxesThisMonth: cleanVal(cpr.boxes_placed) || prev.boxesThisMonth,
      }));
    }
    if (cpr.boxes_placed_till_date !== undefined && cpr.boxes_placed_till_date !== null) {
      setCollectionBoxes((prev) => ({
        ...prev,
        boxesTillDate: cleanVal(cpr.boxes_placed_till_date) || prev.boxesTillDate,
      }));
    }
    if (cpr.boxes_amount !== undefined && cpr.boxes_amount !== null) {
      setCollectionBoxes((prev) => ({
        ...prev,
        amountThisMonth: cleanVal(cpr.boxes_amount) || prev.amountThisMonth,
      }));
    }
    if (cpr.boxes_amount_till_date !== undefined && cpr.boxes_amount_till_date !== null) {
      setCollectionBoxes((prev) => ({
        ...prev,
        amountTillDate: cleanVal(cpr.boxes_amount_till_date) || prev.amountTillDate,
      }));
    }
    if (
      cpr.fixed_deposit !== undefined ||
      cpr.mutual_fund !== undefined ||
      cpr.others !== undefined ||
      cpr.other_specify !== undefined
    ) {
      setInvestments((prev) => ({
        fd: cpr.fixed_deposit !== undefined && cpr.fixed_deposit !== null ? cleanVal(cpr.fixed_deposit) : prev.fd,
        mutualFund: cpr.mutual_fund !== undefined && cpr.mutual_fund !== null ? cleanVal(cpr.mutual_fund) : prev.mutualFund,
        others: cpr.others !== undefined && cpr.others !== null ? cleanVal(cpr.others) : prev.others,
        othersSpecify: cpr.other_specify !== undefined && cpr.other_specify !== null ? cleanVal(cpr.other_specify) : prev.othersSpecify,
      }));
    }
    if (cpr.cash_in_hand !== undefined && cpr.cash_in_hand !== null) {
      setCashInHand(cleanVal(cpr.cash_in_hand));
    }
    if (cpr.csr_status && cleanVal(cpr.csr_status)) {
      setCsrStatus(cleanVal(cpr.csr_status));
    }
    if (cpr.samagri_reached && cleanVal(cpr.samagri_reached)) {
      setSamagriReached(cleanVal(cpr.samagri_reached));
    }
    if (cpr.samagri_reached_note !== undefined && cpr.samagri_reached_note !== null) {
      setSamagriRemarks(cleanVal(cpr.samagri_reached_note));
    }
    if (
      cpr.nonCsr_donor_boards !== undefined ||
      cpr.nonCsr_already_sent !== undefined ||
      cpr.nonCsr_reason !== undefined
    ) {
      setDonorBoard((prev) => ({
        ...prev,
        nonCsr: {
          total: cpr.nonCsr_donor_boards !== undefined && cpr.nonCsr_donor_boards !== null ? cleanVal(cpr.nonCsr_donor_boards) : prev.nonCsr.total,
          sent: cpr.nonCsr_already_sent !== undefined && cpr.nonCsr_already_sent !== null ? cleanVal(cpr.nonCsr_already_sent) : prev.nonCsr.sent,
          remarks: cpr.nonCsr_reason !== undefined && cpr.nonCsr_reason !== null ? cleanVal(cpr.nonCsr_reason) : prev.nonCsr.remarks,
        },
      }));
    }
    if (
      cpr.csr_donor_boards !== undefined ||
      cpr.csr_already_sent !== undefined ||
      cpr.csr_reason !== undefined
    ) {
      setDonorBoard((prev) => ({
        ...prev,
        csr: {
          total: cpr.csr_donor_boards !== undefined && cpr.csr_donor_boards !== null ? cleanVal(cpr.csr_donor_boards) : prev.csr.total,
          sent: cpr.csr_already_sent !== undefined && cpr.csr_already_sent !== null ? cleanVal(cpr.csr_already_sent) : prev.csr.sent,
          remarks: cpr.csr_reason !== undefined && cpr.csr_reason !== null ? cleanVal(cpr.csr_reason) : prev.csr.remarks,
        },
      }));
    }
    if (cpr.school_progress_report_sent && cleanVal(cpr.school_progress_report_sent)) {
      setSchoolProgressSent(cleanVal(cpr.school_progress_report_sent));
    }
    if (
      cpr.school_progress_report_sent_reason !== undefined &&
      cpr.school_progress_report_sent_reason !== null
    ) {
      setProgressRemarks(cleanVal(cpr.school_progress_report_sent_reason));
    }
    if (cpr.monitoring_anchal_name && cleanVal(cpr.monitoring_anchal_name)) {
      setSelectedMonitoringAnchal(cleanVal(cpr.monitoring_anchal_name));
    }
    if (Array.isArray(data.monitoring_anchals) || Array.isArray(data.anchals_list)) {
      setMonitoringAnchalsList(data.monitoring_anchals || data.anchals_list);
    }

    setDbAutoFilled({
      header: Boolean(
        cpr.name_of_cpp ||
        data.cpp_name ||
        cpr.submission_date ||
        cpr.chapter?.chapter_name
      ),
      membership: Boolean(
        (Array.isArray(data.membership_DataBeforeMonth) && data.membership_DataBeforeMonth.length > 0) ||
        (Array.isArray(data.membership_DataCurrentMonth) && data.membership_DataCurrentMonth.length > 0) ||
        data.membership ||
        data.memberships ||
        data.chapter_members_as_on_march !== undefined ||
        data.renewal_members !== undefined ||
        data.new_members !== undefined
      ),
      meetings: Boolean(meetList && meetList.length > 0),
      ots: Boolean(
        (data.ots_details && (data.ots_details.receipt_no_of_ots !== undefined || data.ots_details.receipt_total_amount !== undefined)) ||
        data.ots_count_during_month !== undefined ||
        data.ots_during_month !== undefined
      ),
      otsPrp: Boolean(
        (data.ots_details && (data.ots_details.prp !== undefined || data.ots_details.ots_prp !== undefined)) ||
        data.ots_prp !== undefined ||
        data.otsPRP !== undefined
      ),
      donations: Boolean(
        data.csr_donation_details ||
        data.csr_donation ||
        data.general_donation ||
        data.general_donation_details ||
        data.non_csr_donation_details ||
        data.non_csr_donation ||
        data.donation ||
        data.donations ||
        data.general_donation_during !== undefined ||
        data.csr_donation_during !== undefined ||
        data.non_csr_donation_during !== undefined
      ),
      events: Boolean(evList && evList.length > 0),
      banks: Boolean(bankList && bankList.length > 0),
      vanyatras: Boolean(yatraList && yatraList.length > 0),
      disbursements: Boolean(disbList && disbList.length > 0),
      boxes: Boolean(
        (cpr.boxes_placed !== undefined && cpr.boxes_placed !== null) ||
        (cpr.boxes_placed_till_date !== undefined && cpr.boxes_placed_till_date !== null)
      ),
      investments: Boolean(
        cpr.fixed_deposit != null ||
        cpr.mutual_fund != null ||
        cpr.others != null
      ),
      cashInHand: Boolean(cpr.cash_in_hand !== undefined && cpr.cash_in_hand !== null),
      samagri: Boolean(cpr.samagri_reached && cleanVal(cpr.samagri_reached)),
      donorBoards: Boolean(
        cpr.nonCsr_donor_boards != null ||
        cpr.csr_donor_boards != null
      ),
      schoolProgress: Boolean(
        cpr.school_progress_report_sent && cleanVal(cpr.school_progress_report_sent)
      ),
    });
  }, []);

  // Ref to track last fetched key to prevent duplicate API calls and double toasts
  const lastFetchedKeyRef = useRef("");

  // Fetch Auto-Fill Details: POST /api/getCPRReportDetails
  const fetchCPRReportDetails = useCallback(
    async (fYear, fMonth, force = false) => {
      if (!fYear || !fMonth) return;
      const key = `${fYear}_${fMonth}`;
      if (!force && lastFetchedKeyRef.current === key) {
        return;
      }
      lastFetchedKeyRef.current = key;
      try {
        setLoadingDetails(true);
        const token = Cookies.get("token");
        console.log(`Triggering POST /api/getCPRReportDetails:`, {
          financial_year: fYear,
          financial_month: fMonth,
        });

        const res = await axios.post(
          `${BASE_URL}/api/getCPRReportDetails`,
          {
            financial_year: fYear,
            financial_month: fMonth,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log("POST /api/getCPRReportDetails response:", res.data);
        const detailData =
          res.data?.data ||
          res.data?.cpr_report_details ||
          res.data?.cpr_details ||
          res.data?.details ||
          res.data;

        if (detailData && typeof detailData === "object") {
          applyReportDetails(detailData);
          toast.success(`CPR report details auto-filled for ${fMonth} ${fYear}`, {
            id: "cpr-autofill-toast",
          });
        }
      } catch (err) {
        console.error("Error fetching getCPRReportDetails:", err);
        const msg = err?.response?.data?.message || err?.message;
        if (msg) {
          toast(`Info: ${msg}`, { id: "cpr-autofill-info", icon: "ℹ️" });
        }
      } finally {
        setLoadingDetails(false);
      }
    },
    [applyReportDetails]
  );

  // Fetch Single CPR Report by ID: GET /api/cpr-report/{id}
  const fetchReportById = useCallback(
    async (id) => {
      if (!id) return;
      try {
        setLoadingReport(true);
        setIsEditApiTriggered(true);
        setCurrentReportId(id);
        const token = Cookies.get("token");
        console.log(`Triggering GET /api/cpr-report/${id}...`);
        const res = await axios.get(`${BASE_URL}/api/cpr-report/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(`GET /api/cpr-report/${id} response:`, res.data);
        const report =
          res.data?.data ||
          res.data?.cpr_report ||
          res.data?.report ||
          res.data;

        if (report && typeof report === "object") {
          if (report.financial_year) setFinancialYear(report.financial_year);
          if (report.financial_month) {
            setMonthName(report.financial_month);
            const idx = FINANCIAL_MONTHS.indexOf(report.financial_month);
            if (idx !== -1) setMonthIndex(String(idx + 1));
          }
          if (report.chapter_name) setChapterName(report.chapter_name);
          const cpName =
            report.name_of_cpp ||
            report.cpp_name ||
            report.cpr_details?.name_of_cpp ||
            report.cpr_details?.cpp_name;
          if (cpName) setCppName(cpName);
          if (report.submission_date) setSubmissionDate(report.submission_date);

          // Pre-fill manual fields
          if (report.boxes_placed !== undefined && report.boxes_placed !== null) {
            setCollectionBoxes((prev) => ({
              ...prev,
              boxesThisMonth: cleanVal(report.boxes_placed),
            }));
          }
          if (report.boxes_placed_till_date !== undefined && report.boxes_placed_till_date !== null) {
            setCollectionBoxes((prev) => ({
              ...prev,
              boxesTillDate: cleanVal(report.boxes_placed_till_date),
            }));
          }
          if (report.boxes_amount !== undefined && report.boxes_amount !== null) {
            setCollectionBoxes((prev) => ({
              ...prev,
              amountThisMonth: cleanVal(report.boxes_amount),
            }));
          }
          if (report.boxes_amount_till_date !== undefined && report.boxes_amount_till_date !== null) {
            setCollectionBoxes((prev) => ({
              ...prev,
              amountTillDate: cleanVal(report.boxes_amount_till_date),
            }));
          }

          setInvestments({
            fd: cleanVal(report.fixed_deposit),
            mutualFund: cleanVal(report.mutual_fund),
            others: cleanVal(report.others),
            othersSpecify: cleanVal(report.other_specify),
          });

          if (report.cash_in_hand !== undefined && report.cash_in_hand !== null) {
            setCashInHand(cleanVal(report.cash_in_hand));
          }
          if (report.csr_status && cleanVal(report.csr_status)) {
            setCsrStatus(cleanVal(report.csr_status));
          }
          if (report.samagri_reached && cleanVal(report.samagri_reached)) {
            setSamagriReached(cleanVal(report.samagri_reached));
          }
          if (report.samagri_reached_note !== undefined && report.samagri_reached_note !== null) {
            setSamagriRemarks(cleanVal(report.samagri_reached_note));
          }

          setDonorBoard({
            nonCsr: {
              total: cleanVal(report.nonCsr_donor_boards),
              sent: cleanVal(report.nonCsr_already_sent),
              remarks: cleanVal(report.nonCsr_reason),
            },
            csr: {
              total: cleanVal(report.csr_donor_boards),
              sent: cleanVal(report.csr_already_sent),
              remarks: cleanVal(report.csr_reason),
            },
          });

          if (report.school_progress_report_sent && cleanVal(report.school_progress_report_sent)) {
            setSchoolProgressSent(cleanVal(report.school_progress_report_sent));
          }
          if (
            report.school_progress_report_sent_reason !== undefined &&
            report.school_progress_report_sent_reason !== null
          ) {
            setProgressRemarks(cleanVal(report.school_progress_report_sent_reason));
          }
          if (report.monitoring_anchal_name && cleanVal(report.monitoring_anchal_name)) {
            setSelectedMonitoringAnchal(cleanVal(report.monitoring_anchal_name));
          }
          if (report.signed_cpr && cleanVal(report.signed_cpr)) {
            setExistingSignedCprUrl(cleanVal(report.signed_cpr));
          }
          const rawExcelUrl =
            report.raw_excel_file ||
            report.raw_excel ||
            report.excel_file ||
            report.original_excel_file;
          if (rawExcelUrl && cleanVal(rawExcelUrl)) {
            setExistingRawExcelUrl(cleanVal(rawExcelUrl));
          }

          // Trigger getCPRReportDetails if financial_year & month are present
          const fy = report.financial_year || financialYear;
          const fm = report.financial_month || monthName;
          if (fy && fm) {
            fetchCPRReportDetails(fy, fm);
          }
        }
      } catch (err) {
        console.error(`Error loading GET /api/cpr-report/${id}:`, err);
        toast.error(
          err?.response?.data?.message || err?.message || "Failed to load CPR report"
        );
      } finally {
        setLoadingReport(false);
      }
    },
    [fetchCPRReportDetails, financialYear, monthName]
  );

  useEffect(() => {
    if (reportId) {
      fetchReportById(reportId);
    }
  }, [reportId, fetchReportById]);

  useEffect(() => {
    if (!reportId && financialYear && monthName) {
      fetchCPRReportDetails(financialYear, monthName);
    }
  }, [fetchCPRReportDetails, financialYear, monthName, reportId]);

  // Build Payload FormData for post cpr-report
  const buildPayloadFormData = (status) => {
    const fd = new FormData();
    const appendStr = (key, val) => {
      const str = cleanVal(val);
      if (str === "" || str === "Choose") {
        fd.append(key, "");
        return;
      }
      fd.append(key, str);
    };

    appendStr("chapter_name", chapterName);
    appendStr("financial_year", financialYear || "2026-27");
    appendStr("financial_month", monthName || "April");
    appendStr("name_of_cpp", cppName);
    appendStr(
      "submission_date",
      submissionDate || new Date().toISOString().split("T")[0]
    );
    if (Array.isArray(subChapters)) {
      subChapters.forEach((sc, idx) => {
        appendStr(`sub_chapters[${idx}]`, sc);
      });
      appendStr("sub_chapters_json", JSON.stringify(subChapters));
    }
    appendStr("ots_prp", otsPRP);
    appendStr("ots_count", otsCountDuringMonth);
    appendStr("ots_count_till_date", otsCountTillDate);
    appendStr("ots_regular_amount", otsRegularDuring);
    appendStr("ots_regular_amount_till_date", otsRegularTill);
    appendStr("ots_extra_amount", otsExtraDuring);
    appendStr("ots_extra_amount_till_date", otsExtraTill);
    appendStr("ots_total_amount", otsTotalDuring);
    appendStr("ots_total_amount_till_date", otsTotalTill);
    appendStr("ots_amount", otsTotalDuring);
    appendStr("ots_amount_till_date", otsTotalTill);
    appendStr("boxes_placed", collectionBoxes.boxesThisMonth);
    appendStr("boxes_placed_till_date", collectionBoxes.boxesTillDate);
    appendStr("boxes_amount", collectionBoxes.amountThisMonth);
    appendStr("boxes_amount_till_date", collectionBoxes.amountTillDate);
    appendStr("fixed_deposit", investments.fd);
    appendStr("mutual_fund", investments.mutualFund);
    appendStr("others", investments.others);
    appendStr("other_specify", investments.othersSpecify);
    appendStr("cash_in_hand", cashInHand);
    appendStr("csr_status", status || "Draft");
    appendStr("samagri_reached", samagriReached);
    appendStr("samagri_reached_note", samagriRemarks);
    appendStr("nonCsr_donor_boards", donorBoard.nonCsr.total);
    appendStr("nonCsr_already_sent", donorBoard.nonCsr.sent);
    appendStr("nonCsr_reason", donorBoard.nonCsr.remarks);
    appendStr("csr_donor_boards", donorBoard.csr.total);
    appendStr("csr_already_sent", donorBoard.csr.sent);
    appendStr("csr_reason", donorBoard.csr.remarks);
    appendStr("school_progress_report_sent", schoolProgressSent);
    appendStr("school_progress_report_sent_reason", progressRemarks);
    appendStr("monitoring_anchal_name", selectedMonitoringAnchal);
    appendStr("renewal_members", memberships.renewal?.added);
    appendStr("new_members", memberships.newMember?.added);
    appendStr("renewal_members_till_date", memberships.renewal?.tillDate);
    appendStr("new_members_till_date", memberships.newMember?.tillDate);

    // Section D: Donations (recorded separately for CSR, Non-CSR, and General)
    appendStr("general_donation_donors", donations.general?.donors);
    appendStr("general_donation_during", donations.general?.during);
    appendStr("general_donation_till", donations.general?.till);
    appendStr("csr_donation_donors", donations.csr?.donors);
    appendStr("csr_donation_during", donations.csr?.during);
    appendStr("csr_donation_till", donations.csr?.till);
    appendStr("non_csr_donation_donors", donations.nonCsr?.donors ?? donations.other?.donors);
    appendStr("non_csr_donation_during", donations.nonCsr?.during ?? donations.other?.during);
    appendStr("non_csr_donation_till", donations.nonCsr?.till ?? donations.other?.till);

    if (signedFile instanceof File) {
      fd.append("signed_cpr", signedFile);
    } else if (existingSignedCprUrl) {
      fd.append("signed_cpr", existingSignedCprUrl);
    } else {
      fd.append("signed_cpr", "");
    }

    // Original / Raw Excel Data File (Optional for verification & processing)
    if (rawExcelFile instanceof File) {
      fd.append("raw_excel_file", rawExcelFile);
      fd.append("raw_excel", rawExcelFile);
    } else if (existingRawExcelUrl) {
      fd.append("raw_excel_file", existingRawExcelUrl);
      fd.append("raw_excel", existingRawExcelUrl);
    }

    return fd;
  };

  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const token = Cookies.get("token");

      console.log("Saving CPR Draft (csr_status: Draft)...");

      let response;
      const targetId = currentReportId || reportId;

      const formData = buildPayloadFormData("Draft");
      if (targetId) {
        formData.append("_method", "PUT");
        response = await axios.post(
          `${BASE_URL}/api/cpr-report/${targetId}?_method=PUT`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        response = await axios.post(`${BASE_URL}/api/cpr-report`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      console.log("POST /api/cpr-report (draft) response:", response.data);
      const createdId =
        response.data?.id ||
        response.data?.data?.id ||
        response.data?.cpr_report?.id ||
        response.data?.cpr_report_id;
      if (createdId) {
        setCurrentReportId(createdId);
        setIsDraftSaved(true);
        setIsEditApiTriggered(true);
        window.history.replaceState(null, "", `/cpr-report/${createdId}`);
      }

      setCsrStatus("Draft");
      toast.success(response.data?.message || "Draft saved successfully!");
      const now = new Date();
      const formatted =
        now.toLocaleDateString("en-GB") +
        ", " +
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setSavedAt(formatted);

      // Return to list view so the newly saved draft is immediately visible
      if (onBack) {
        setTimeout(() => {
          onBack();
        }, 1200);
      }
    } catch (err) {
      console.error("Draft save error:", err);
      toast.error(
        err?.response?.data?.message || err?.message || "Failed to save draft"
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!printableRef.current) {
      toast.error("Printable report reference not ready. Please try again.");
      return false;
    }
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Generating CPR PDF...");

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      const container = printableRef.current;
      const pages = container.querySelectorAll(".pdf-page");
      const pdf = new jsPDF("p", "mm", "a4");

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          if (i > 0) pdf.addPage();
          const canvas = await html2canvas(pages[i], {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
          });
          const imgData = canvas.toDataURL("image/png");
          pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "SLOW");
        }
      } else {
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const pdfWidth = 210;
        const pdfHeight = 297;
        const pageHeightInCanvas = (pdfHeight / pdfWidth) * canvas.width;
        let currentY = 0;
        let pageIdx = 0;

        while (currentY < canvas.height) {
          if (pageIdx > 0) pdf.addPage();
          const sliceHeight = Math.min(pageHeightInCanvas, canvas.height - currentY);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, sliceHeight);
          ctx.drawImage(
            canvas,
            0, currentY, canvas.width, sliceHeight,
            0, 0, canvas.width, sliceHeight
          );
          const pageImgData = pageCanvas.toDataURL("image/png");
          const slicePdfHeight = (sliceHeight * pdfWidth) / canvas.width;
          pdf.addImage(pageImgData, "PNG", 0, 0, pdfWidth, slicePdfHeight, undefined, "FAST");
          currentY += pageHeightInCanvas;
          pageIdx++;
        }
      }

      const chapterStr = (chapterName || "Chapter").replace(/\s+/g, "_");
      const monthStr = (monthName || "Month").replace(/\s+/g, "_");
      pdf.save(`CPR_Report_${chapterStr}_${monthStr}.pdf`);

      toast.dismiss(toastId);
      toast.success("CPR Report PDF downloaded successfully!");
      return true;
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.dismiss(toastId);
      toast.error("Failed to generate PDF. Please try again.");
      return false;
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Pre-calculated CRC32 lookup table for fast ZIP patching
  const CRC32_TABLE = React.useMemo(() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    return table;
  }, []);

  const calcZipCrc32 = (u8) => {
    let crc = 0 ^ -1;
    for (let i = 0; i < u8.length; i++) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ u8[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  };

  // Enables Excel "Wrap Text" automatically for ALL cells across the entire workbook
  const enableWorkbookWrapText = (u8Array) => {
    try {
      const u8 = new Uint8Array(u8Array);
      const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);

      const findBytes = (needle, from = 0) => {
        for (let i = from; i <= u8.length - needle.length; i++) {
          let match = true;
          for (let j = 0; j < needle.length; j++) {
            if (u8[i + j] !== needle[j]) {
              match = false;
              break;
            }
          }
          if (match) return i;
        }
        return -1;
      };

      const pkLocal = [0x50, 0x4b, 0x03, 0x04];
      const pkCD = [0x50, 0x4b, 0x01, 0x02];
      const stylesBytes = Array.from("xl/styles.xml").map((c) => c.charCodeAt(0));

      let pos = 0;
      let localPos = -1,
        localDataStart = -1,
        localDataLen = -1;
      while ((pos = findBytes(pkLocal, pos)) !== -1) {
        const fnLen = view.getUint16(pos + 26, true);
        const extraLen = view.getUint16(pos + 28, true);
        let isStyles = fnLen === stylesBytes.length;
        if (isStyles) {
          for (let k = 0; k < fnLen; k++) {
            if (u8[pos + 30 + k] !== stylesBytes[k]) {
              isStyles = false;
              break;
            }
          }
        }
        if (isStyles) {
          localPos = pos;
          localDataLen = view.getUint32(pos + 18, true);
          localDataStart = pos + 30 + fnLen + extraLen;
          break;
        }
        pos += 4;
      }

      if (localPos === -1) return u8;

      const decoder = new TextDecoder("utf-8");
      const encoder = new TextEncoder();
      const origXml = decoder.decode(
        u8.subarray(localDataStart, localDataStart + localDataLen)
      );

      const target =
        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>';
      const replacement =
        '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs>';

      if (!origXml.includes(target)) return u8;

      // Shorten dummy xmlns:vt attribute by 44 chars to keep exact same byte length
      const vtAttr =
        ' xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"';
      const shortenedVt = " ".repeat(vtAttr.length - 44);
      const newXml = origXml
        .replace(target, replacement)
        .replace(vtAttr, shortenedVt);

      if (newXml.length !== origXml.length) return u8;

      const newXmlBytes = encoder.encode(newXml);
      u8.set(newXmlBytes, localDataStart);

      const newCrc = calcZipCrc32(newXmlBytes);
      view.setUint32(localPos + 14, newCrc, true);

      // Update Central Directory entry
      pos = 0;
      while ((pos = findBytes(pkCD, pos)) !== -1) {
        const fnLen = view.getUint16(pos + 28, true);
        let isStyles = fnLen === stylesBytes.length;
        if (isStyles) {
          for (let k = 0; k < fnLen; k++) {
            if (u8[pos + 46 + k] !== stylesBytes[k]) {
              isStyles = false;
              break;
            }
          }
        }
        if (isStyles) {
          view.setUint32(pos + 16, newCrc, true);
          break;
        }
        pos += 4;
      }

      return u8;
    } catch (err) {
      console.warn("Could not patch wrapText in XLSX, falling back to raw", err);
      return u8Array;
    }
  };

  const handleDownloadExcel = () => {
    try {
      setIsGeneratingExcel(true);
      const toastId = toast.loading("Generating CPR Excel (.xlsx)...");

      const rows = [];

      // 1. Meta / Header
      rows.push(["CHAPTER PERFORMANCE REPORT (CPR)", "", "", "", "", ""]);
      rows.push(["Chapter Name:", chapterName || "", "", "Financial\nYear:", financialYear || "", ""]);
      rows.push(["Financial Month:", monthName || "", "", "Submission\nDate:", submissionDate || "", ""]);
      rows.push(["Name of CPP:", cppName || "", "", "Report\nStatus:", csrStatus || "Draft", ""]);
      rows.push([""]);

      // 2. Section A: Membership Data
      rows.push(["A | MEMBERSHIP DATA", "", "", "", "", ""]);
      rows.push([
        "Particulars",
        "Members as\non 31st March",
        "Membership\nAdded During\nMonth",
        "Membership\nTill Date",
        "Cumulative\nMembership",
        "Membership Amount\nReceived (Rs.) @ Rs.\n1,000",
      ]);

      const startRowSecA = rows.length + 1; // 1-based index in Excel
      const mChapter = memberships.chapter || {};
      const mYuva = memberships.yuva || {};
      const mMahila = memberships.mahila || {};
      const mRenewal = memberships.renewal || {};
      const mNew = memberships.newMember || {};

      rows.push([
        "Chapter",
        Number(mChapter.asOnMarch || mChapter.march) || 0,
        Number(mChapter.added) || 0,
        Number(mChapter.tillDate) || 0,
        Number(mChapter.cumulative) || 0,
        Number(mChapter.amount) || 0,
      ]);
      rows.push([
        "FTS Yuva",
        Number(mYuva.asOnMarch || mYuva.march) || 0,
        Number(mYuva.added) || 0,
        Number(mYuva.tillDate) || 0,
        Number(mYuva.cumulative) || 0,
        Number(mYuva.amount) || 0,
      ]);
      rows.push([
        "Mahila Samiti",
        Number(mMahila.asOnMarch || mMahila.march) || 0,
        Number(mMahila.added) || 0,
        Number(mMahila.tillDate) || 0,
        Number(mMahila.cumulative) || 0,
        Number(mMahila.amount) || 0,
      ]);
      rows.push([
        "Renewal Members",
        "",
        Number(mRenewal.added) || 0,
        Number(mRenewal.tillDate) || 0,
        Number(mRenewal.cumulative) || 0,
        Number(mRenewal.amount) || 0,
      ]);
      rows.push([
        "New Members",
        "",
        Number(mNew.added) || 0,
        Number(mNew.tillDate) || 0,
        Number(mNew.cumulative) || 0,
        Number(mNew.amount) || 0,
      ]);

      const endRowSecA = rows.length;
      // Total row with Excel SUM formulas
      rows.push([
        "TOTAL",
        { f: `SUM(B${startRowSecA}:B${startRowSecA + 2})` },
        { f: `SUM(C${startRowSecA}:C${endRowSecA})` },
        { f: `SUM(D${startRowSecA}:D${endRowSecA})` },
        { f: `SUM(E${startRowSecA}:E${endRowSecA})` },
        { f: `SUM(F${startRowSecA}:F${endRowSecA})` },
      ]);
      rows.push([""]);

      // 3. Section B: Executive Committee Meetings
      rows.push(["B | EXECUTIVE COMMITTEE MEETING DETAILS", "", "", "", "", ""]);
      if (noMeetingHeld || meetings.length === 0) {
        rows.push(["No Executive Committee Meeting was held this month.", "", "", "", "", ""]);
      } else {
        rows.push([
          "Meeting\nDate",
          "Meeting\nType",
          "Total Committee\nMembers",
          "Members\nInvited",
          "Members\nAttended",
          "Agenda / Discussion\nSummary",
        ]);
        meetings.forEach((m) => {
          rows.push([
            m.date || "",
            m.type || "Executive Committee Meeting",
            Number(m.membersCount) || 0,
            Number(m.invited) || 0,
            Number(m.attended) || 0,
            m.agenda || "",
          ]);
        });
      }
      rows.push([""]);

      // 4. Section C: OTS Details & Collection
      rows.push(["C | OTS DETAILS & COLLECTION", "", "", "", "", ""]);
      rows.push(["OTS PRP:", otsPRP || "0", "", "", "", ""]);
      rows.push(["Particulars", "During the\nMonth", "Till\nDate", "", "", ""]);
      const otsCountRow = rows.length + 1;
      rows.push(["Total Number of OTS", Number(otsCountDuringMonth) || 0, Number(otsCountTillDate) || 0]);
      const otsRegRow = rows.length + 1;
      rows.push([
        "Regular OTS Collection (Rs.)\n@ Rs. 30,000 per OTS",
        { f: `B${otsCountRow}*30000` },
        { f: `C${otsCountRow}*30000` },
      ]);
      const otsExtraRow = rows.length + 1;
      rows.push([
        "Extra OTS Collection\n(Additional Amount) (Rs.)",
        Number(otsExtraDuring) || 0,
        Number(otsExtraTill) || 0,
      ]);
      rows.push([
        "Total OTS Amount Collected (Rs.)",
        { f: `SUM(B${otsRegRow}:B${otsExtraRow})` },
        { f: `SUM(C${otsRegRow}:C${otsExtraRow})` },
      ]);
      rows.push([""]);

      // 5. Section D: Donation & CSR Details
      rows.push(["D | DONATION & CSR DETAILS", "", "", "", "", ""]);
      rows.push(["Particulars", "Number of\nDonors", "During the\nMonth (Rs.)", "Till Date\n(Rs.)", "", ""]);
      const startDonRow = rows.length + 1;
      const nonCsrObj = donations.nonCsr || donations.other || {};
      rows.push([
        "General Donation",
        Number(donations.general?.donors) || 0,
        Number(donations.general?.during) || 0,
        Number(donations.general?.till) || 0,
      ]);
      rows.push([
        "CSR Donation",
        Number(donations.csr?.donors) || 0,
        Number(donations.csr?.during) || 0,
        Number(donations.csr?.till) || 0,
      ]);
      rows.push([
        "Non-CSR Donation",
        Number(nonCsrObj.donors) || 0,
        Number(nonCsrObj.during) || 0,
        Number(nonCsrObj.till) || 0,
      ]);
      const endDonRow = rows.length;
      rows.push([
        "TOTAL Donation",
        { f: `SUM(B${startDonRow}:B${endDonRow})` },
        { f: `SUM(C${startDonRow}:C${endDonRow})` },
        { f: `SUM(D${startDonRow}:D${endDonRow})` },
      ]);
      rows.push([""]);

      // 6. Section E: Collection Boxes
      rows.push(["E | COLLECTION BOXES", "", "", "", "", ""]);
      rows.push(["Particulars", "This\nMonth", "Till\nDate", "", "", ""]);
      rows.push([
        "Boxes Placed",
        Number(collectionBoxes.boxesThisMonth) || 0,
        Number(collectionBoxes.boxesTillDate) || 0,
      ]);
      rows.push([
        "Amount Collected (Rs.)",
        Number(collectionBoxes.amountThisMonth) || 0,
        Number(collectionBoxes.amountTillDate) || 0,
      ]);
      rows.push([""]);

      // 7. Section F: Investment (As on Date)
      rows.push(["F | INVESTMENT (AS ON DATE)", "", "", "", "", ""]);
      rows.push(["Investment Type", "Amount\n(Rs.)", "", "", "", ""]);
      const startInvRow = rows.length + 1;
      rows.push(["Fixed Deposit", Number(investments.fd) || 0]);
      rows.push(["Mutual Fund", Number(investments.mutualFund) || 0]);
      rows.push(["Others (" + (investments.othersSpecify || "Specify") + ")", Number(investments.others) || 0]);
      const endInvRow = rows.length;
      rows.push(["TOTAL Investment", { f: `SUM(B${startInvRow}:B${endInvRow})` }]);
      rows.push([""]);

      // 8. Section G: Cash & Bank Balance
      rows.push(["G | CASH & BANK BALANCE", "", "", "", "", ""]);
      rows.push(["Account / Bank Name", "Balance\n(Rs.)", "", "", "", ""]);
      const startBankRow = rows.length + 1;
      rows.push(["Cash in Hand", Number(cashInHand) || 0]);
      if (bankBalances.length > 0) {
        bankBalances.forEach((b) => {
          rows.push([b.bankName || "Bank", Number(b.balance) || 0]);
        });
      }
      const endBankRow = rows.length;
      rows.push(["TOTAL Cash & Bank Balance", { f: `SUM(B${startBankRow}:B${endBankRow})` }]);
      rows.push([""]);

      // 9. Section H: Van Yatra
      rows.push(["H | VAN YATRA DURING THE MONTH", "", "", "", "", ""]);
      if (vanyatras.length === 0) {
        rows.push(["No Van Yatra held during the month.", "", "", "", "", ""]);
      } else {
        rows.push(["Date", "Place\nVisited", "Village\nName", "No. of\nPersons", "Name of\nVisitors"]);
        vanyatras.forEach((y) => {
          rows.push([
            y.date || "",
            y.place || "",
            y.village || "",
            Number(y.persons) || 0,
            y.visitors || "",
          ]);
        });
      }
      rows.push([""]);

      // 10. Section I: Events During the Month
      rows.push(["I | EVENTS DURING THE MONTH", "", "", "", "", ""]);
      if (events.length === 0) {
        rows.push(["No Events conducted during the month.", "", "", "", "", ""]);
      } else {
        rows.push(["Event Name", "Event Date", "Event Description", "", "", ""]);
        events.forEach((ev) => {
          rows.push([ev.name || "", ev.date || "", ev.description || "", "", "", ""]);
        });
      }
      rows.push([""]);

      // 11. Section J: Annexure 1 - Disbursement to Anchal
      rows.push(["J | ANNEXURE 1 – DISBURSEMENT TO ANCHAL", "", "", "", "", ""]);
      rows.push([
        "Anchal Name",
        "No. of Acharyas\nPaid",
        "Remittance Till\nLast Month (Rs.)",
        "Remittance This\nMonth (Rs.)",
        "Total Remittance\n(Rs.)",
      ]);
      const startAnchalRow = rows.length + 1;
      if (anchals.length > 0) {
        anchals.forEach((a, idx) => {
          const rIdx = startAnchalRow + idx;
          rows.push([
            a.anchalName || `Anchal ${idx + 1}`,
            Number(a.acharyasPaid) || 0,
            Number(a.remittanceLastMonth) || 0,
            Number(a.remittanceThisMonth) || 0,
            { f: `SUM(C${rIdx}:D${rIdx})` },
          ]);
        });
      }
      const endAnchalRow = rows.length;
      if (anchals.length > 0) {
        rows.push([
          "TOTAL",
          { f: `SUM(B${startAnchalRow}:B${endAnchalRow})` },
          { f: `SUM(C${startAnchalRow}:C${endAnchalRow})` },
          { f: `SUM(D${startAnchalRow}:D${endAnchalRow})` },
          { f: `SUM(E${startAnchalRow}:E${endAnchalRow})` },
        ]);
      }
      rows.push([""]);

      // 12. Section K: Annexure 2 - Monthly Summary / Controls
      rows.push(["K | ANNEXURE 2 – MONTHLY SUMMARY", "", "", "", "", ""]);
      rows.push(["Particulars", "Status /\nCount", "Remarks /\nDetails", "", "", ""]);
      rows.push(["Samagri reached to schools?", samagriReached || "No", samagriRemarks || ""]);
      rows.push([
        "Non-CSR Donor Board reached all schools?",
        `Total: ${donorBoard.nonCsr?.total || 0}, Sent: ${donorBoard.nonCsr?.sent || 0}`,
        donorBoard.nonCsr?.remarks || "",
      ]);
      rows.push([
        "CSR Donor Board reached all schools?",
        `Total: ${donorBoard.csr?.total || 0}, Sent: ${donorBoard.csr?.sent || 0}`,
        donorBoard.csr?.remarks || "",
      ]);
      rows.push(["School Progress Report sent to Donors?", schoolProgressSent || "No", progressRemarks || ""]);
      rows.push(["Monitoring Anchal Name", selectedMonitoringAnchal || "None", ""]);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Exact column widths & proportions matching the required CPR template layout
      ws["!cols"] = [
        { wch: 32 }, // Col A: Particulars & categories
        { wch: 16 }, // Col B: Members as on 31st March / Month counts
        { wch: 16 }, // Col C: Membership Added During Month
        { wch: 16 }, // Col D: Membership Till Date
        { wch: 16 }, // Col E: Cumulative Membership
        { wch: 23 }, // Col F: Membership Amount Received (Rs.) @ Rs. 1,000
        { wch: 20 }, // Col G
        { wch: 20 }, // Col H
        { wch: 20 }, // Col I
        { wch: 20 }, // Col J
      ];

      // Row heights to accommodate wrapped headers (2 lines = 28pt, 3 lines = 45pt)
      ws["!rows"] = rows.map((row) => {
        if (!Array.isArray(row) || row.length === 0) return { hpt: 15 };
        let maxLines = 1;
        row.forEach((cell) => {
          const val =
            typeof cell === "object" && cell && cell.v !== undefined
              ? cell.v
              : cell;
          if (typeof val === "string") {
            const lines = val.split("\n").length;
            if (lines > maxLines) maxLines = lines;
          }
        });
        if (maxLines >= 3) return { hpt: 45 };
        if (maxLines === 2) return { hpt: 28 };
        return { hpt: 20 };
      });

      // Enable Wrap Text, vertical centering, and number alignment on all cells
      for (const cellAddr in ws) {
        if (cellAddr.startsWith("!")) continue;
        const cell = ws[cellAddr];
        if (!cell) continue;

        const isString = typeof cell.v === "string";
        const hasNewline = isString && cell.v.includes("\n");
        const isNumber = typeof cell.v === "number" || (cell.f && !hasNewline);

        cell.s = {
          alignment: {
            wrapText: true,
            vertical: "center",
            horizontal: isNumber ? "right" : hasNewline ? "center" : "left",
          },
        };
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "CPR Report");

      const cleanFileName = `CPR_Report_${chapterName ? chapterName.replace(/[^a-zA-Z0-9]/g, "_") : "Chapter"}_${monthName || "Month"}_${financialYear || "FY"}.xlsx`;

      // Export workbook with Wrap Text automatically enabled on ALL cells in the Excel file
      const rawBytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const finalBytes = enableWorkbookWrapText(rawBytes);

      const blob = new Blob([finalBytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = downloadUrl;
      downloadLink.download = cleanFileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadUrl);

      toast.dismiss(toastId);
      toast.success("CPR Excel (.xlsx) downloaded successfully!");
    } catch (err) {
      console.error("Excel download error:", err);
      toast.error("Failed to generate CPR Excel");
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleResetForm = () => {
    // Header
    setChapterName("");
    setMonthIndex("");
    setMonthName("");
    setCppName("");
    setSubmissionDate("");
    setSubChapters([]);
    setNewSubChapter("");
    setShowSubChapterInput(false);
    setSavedAt("");

    // Section A
    setMemberships({
      chapter: { asOnMarch: "", added: "", tillDate: "" },
      yuva: { asOnMarch: "", added: "", tillDate: "" },
      mahila: { asOnMarch: "", added: "", tillDate: "" },
      renewal: { asOnMarch: "", added: "", tillDate: "" },
      newMember: { asOnMarch: "", added: "", tillDate: "" },
    });

    // Section B
    setNoMeetingHeld(false);
    setMeetings([]);
    setCurrentMeeting({
      date: "",
      type: "Executive Committee Meeting",
      membersCount: "",
      invited: "",
      attended: "",
      agenda: "",
    });

    // Section C
    setOtsPRP("");
    setOtsCountDuringMonth("");
    setOtsCountTillDateInput("");
    setOtsTotalAmountDuringMonth("");
    setOtsTotalAmountTillDate("");
    setOtsExtraAmountDuringMonth("");
    setOtsExtraAmountTillDate("");

    // Section D
    setDonations({
      general: { donors: "", during: "", till: "" },
      csr: { donors: "", during: "", till: "" },
      nonCsr: { donors: "", during: "", till: "" },
      other: { donors: "", during: "", till: "" },
    });

    // Section E
    setCollectionBoxes({
      boxesThisMonth: "",
      boxesTillDate: "",
      amountThisMonth: "",
      amountTillDate: "",
    });

    // Section F
    setInvestments({
      fd: "",
      mutualFund: "",
      others: "",
      othersSpecify: "",
    });

    // Section G
    setCashInHand("");
    setBankBalances([]);

    // Section H
    setVanyatras([]);
    setNewVanyatra({
      date: "",
      yatrisCount: "",
      vidyalayasVisited: "",
      pravasDone: "No",
      remarks: "",
    });

    // Section I
    setNoEventHeld(false);
    setEvents([]);
    setCurrentEvent({
      date: "",
      type: "",
      committee: "Youth",
      photos: 0,
    });

    // Section J
    setAnchals([]);
    setNewAnchal({
      name: "",
      acharyasCount: "",
      annualTarget: "",
      remittanceLastMonth: "",
      remittanceThisMonth: "",
    });

    // Section K
    setSamagriReached("No");
    setSamagriRemarks("");
    setDonorBoard({
      nonCsr: { total: "", sent: "", remarks: "" },
      csr: { total: "", sent: "", remarks: "" },
    });
    setSchoolProgressSent("No");
    setProgressRemarks("");
    setSelectedMonitoringAnchal("Choose");
    setMonitoringAnchalsList([]);

    // Uploaded file
    setSignedFile(null);
    setRawExcelFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (rawExcelInputRef.current) {
      rawExcelInputRef.current.value = "";
    }

    scrollToSection("section-report-details");
  };

  const handleSubmit = async () => {
    if (!financialYear) {
      toast.error("Please select Financial Year");
      scrollToSection("section-report-details");
      return;
    }
    if (!monthName) {
      toast.error("Please select a Financial Month");
      scrollToSection("section-report-details");
      return;
    }
    if (!cppName?.trim()) {
      toast.error("Name of CPP is required");
      scrollToSection("section-report-details");
      return;
    }
    if (!submissionDate) {
      toast.error("Submission Date is required");
      scrollToSection("section-report-details");
      return;
    }
    if (cashInHand === "") {
      toast.error("Cash in Hand is required in Section G");
      scrollToSection("section-g");
      return;
    }

    const hasExistingSignedCpr = Boolean(
      existingSignedCprUrl &&
      typeof existingSignedCprUrl === "string" &&
      existingSignedCprUrl.trim() !== "" &&
      existingSignedCprUrl.trim().toLowerCase() !== "null" &&
      existingSignedCprUrl.trim().toLowerCase() !== "undefined"
    );
    const hasNewSignedFile = Boolean(signedFile instanceof File);

    if (!hasNewSignedFile && !hasExistingSignedCpr) {
      toast.error(
        "Upload the signed CPR is required before submitting. Please download the filled CPR, get it signed, and upload it."
      );
      scrollToSection("section-submit");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = Cookies.get("token");
      console.log("Submitting CPR Report (csr_status: Submitted)...");

      let response;
      const targetId = currentReportId || reportId;

      const formData = buildPayloadFormData("Submitted");
      if (targetId) {
        formData.append("_method", "PUT");
        response = await axios.post(
          `${BASE_URL}/api/cpr-report/${targetId}?_method=PUT`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        response = await axios.post(`${BASE_URL}/api/cpr-report`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      console.log("POST /api/cpr-report (submitted) response:", response.data);
      setCsrStatus("Submitted");
      toast.success(
        response.data?.message ||
        "Chapter Performance Report submitted successfully!"
      );

      // No PDF download while submitting (per user request)

      if (onBack) {
        setTimeout(() => {
          onBack();
        }, 1200);
      }
    } catch (err) {
      console.error("Submit CPR error:", err);
      toast.error(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to submit CPR report"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop().toLowerCase();
      const validExts = ["pdf", "xlsx", "xls", "png", "jpg", "jpeg", "webp"];
      if (!validExts.includes(ext)) {
        toast.error("Please upload a PDF, Excel (.xlsx/.xls), or image file");
        return;
      }
      setSignedFile(file);
      toast.success(`Signed document "${file.name}" selected`);
    }
  };

  const handleRawExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(ext)) {
        toast.error("Please upload an Excel spreadsheet file (.xlsx or .xls)");
        return;
      }
      setRawExcelFile(file);
      toast.success(`Raw Excel file "${file.name}" selected for upload`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] pb-24 font-sans">
      <Toaster position="top-right" />

      {/* Main Container with Sticky Left Quick Nav */}
      <div className="max-w-[1400px] mx-auto px-4 py-6 flex gap-6">
        {/* Left Sticky Sidebar Nav */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="sticky top-6 bg-white rounded-lg shadow-sm border border-slate-200 p-3 text-xs space-y-1">
            {[
              { id: "section-report-details", label: "Report Details", code: "" },
              { id: "section-a", label: "Membership Details", code: "A" },
              { id: "section-b", label: "Executive Committee Meeting Details", code: "B" },
              { id: "section-c", label: "OTS Details & Collection", code: "C" },
              { id: "section-d", label: "Donation & CSR Details", code: "D" },
              { id: "section-e", label: "Collection Boxes", code: "E" },
              { id: "section-f", label: "Investment (As on Date)", code: "F" },
              { id: "section-g", label: "Cash & Bank Balance", code: "G" },
              { id: "section-h", label: "Van Yatra", code: "H" },
              { id: "section-i", label: "Events During the Month", code: "I" },
              { id: "section-j", label: "Annex 1 – Disbursement to Anchal", code: "J" },
              { id: "section-k", label: "Annex 2 – Monthly Summary / Check Points", code: "K" },
              { id: "section-submit", label: "Sign & Submit", code: "✓" },
            ].map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  type="button"
                  className={`w-full text-left px-2.5 py-2 rounded flex items-center gap-2 transition-all ${isActive
                      ? "bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600"
                      : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  {item.code && (
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {item.code}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Form Content */}
        <main className="flex-1 space-y-8 min-w-0">
          {/* Header Title & Legend */}
          <div
            id="section-report-details"
            className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6"
          >
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Chapter Performance Report
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>
                    Financial Year: <strong className="text-slate-800">{financialYear}</strong> | Month: <strong className="text-slate-800">{monthName || "Not Selected"}</strong>
                  </span>
                  {loadingReport && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading Report #{reportId}...
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchCPRReportDetails(financialYear, monthName, true)}
                  disabled={loadingDetails || !monthName}
                  className="text-xs px-3 py-1.5 border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700 font-semibold rounded-md flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  title="Re-fetch and auto-fill report details from getCPRReportDetails API"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingDetails ? "animate-spin" : ""
                      }`}
                  />
                  <span>{loadingDetails ? "Fetching..." : "Refresh Auto-Fill"}</span>
                </button>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="self-start sm:self-auto text-xs px-3.5 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer shadow-sm transition"
                  >
                    ← Back to List
                  </button>
                )}
              </div>
            </div>

            {/* Auto-Fill Loading Notification */}
            {loadingDetails && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>
                  Fetching and auto-filling details from <strong>getCPRReportDetails</strong> for {monthName} ({financialYear})...
                </span>
              </div>
            )}


            {/* Header Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Financial Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Financial Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={financialYear}
                  disabled={isView || isEditMode}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                >
                  {financialYearList.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chapter Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chapter Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="cpr-chapter-options"
                  value={chapterName}
                  disabled={isView || isEditMode}
                  readOnly={isView || isEditMode}
                  onChange={(e) => setChapterName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  placeholder="Select or enter Chapter"
                />
                <datalist id="cpr-chapter-options">
                  {chapterList.map((ch, idx) => (
                    <option key={idx} value={ch} />
                  ))}
                </datalist>
              </div>

              {/* For the Month Of */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Financial Month <span className="text-red-500">*</span>
                </label>
                <select
                  value={monthName}
                  disabled={isView || isEditMode}
                  onChange={(e) => {
                    const m = e.target.value;
                    setMonthName(m);
                    const idx = FINANCIAL_MONTHS.indexOf(m);
                    if (idx !== -1) setMonthIndex(String(idx + 1));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                >
                  <option value="">Select Month</option>
                  {availableMonths.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name of CPP */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name of CPP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="cpr-cpp-options"
                  value={cppName}
                  disabled={isView || isEditMode || isManualFieldDisabled}
                  readOnly={isView || isEditMode || isManualFieldDisabled}
                  onChange={(e) => setCppName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  placeholder="Select or enter CPP name"
                />
                <datalist id="cpr-cpp-options">
                  <option value="testadmin" />
                  <option value="President" />
                  <option value="Secretary" />
                  <option value="Treasurer" />
                  {cppName && <option value={cppName} />}
                </datalist>
              </div>

              {/* Submission Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Submission Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={submissionDate}
                  disabled={isView || isEditMode || isManualFieldDisabled}
                  readOnly={isView || isEditMode || isManualFieldDisabled}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                />
              </div>
            </div>

            {/* Sub Chapters of this Chapter (Parent-Child Mapping) */}
            {/* <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-bold text-slate-800">
                  Sub-Chapters of {chapterName || "this Chapter"}
                </h3>
                <span className="text-[11px] text-slate-400">
                  Mapped to Chapter: <strong>{chapterName || "None"}</strong>
                </span>
              </div>
              {subChapters.length === 0 ? (
                <p className="text-xs text-slate-500 mb-2">No sub-chapters mapped to this chapter.</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-2">
                  {subChapters.map((sc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
                    >
                      {sc}
                      {!isView && (
                        <button
                          type="button"
                          onClick={() =>
                            setSubChapters(subChapters.filter((_, idx) => idx !== i))
                          }
                          className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title="Remove sub-chapter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {!isView && (
                showSubChapterInput ? (
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newSubChapter}
                      onChange={(e) => setNewSubChapter(e.target.value)}
                      placeholder="Enter sub-chapter name"
                      className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubChapter.trim()) {
                          setSubChapters([...subChapters, newSubChapter.trim()]);
                          setNewSubChapter("");
                          setShowSubChapterInput(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubChapterInput(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubChapterInput(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Sub-Chapter
                  </button>
                )
              )}
            </div> */}
          </div>

          {/* ================= SECTION A: MEMBERSHIP DATA ================= */}
          <section
            id="section-a"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#1e40af] text-white px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white text-[#1e40af] font-bold text-xs flex items-center justify-center">
                  A
                </span>
                <h2 className="text-sm font-bold tracking-wide uppercase">Membership Data</h2>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-blue-50 text-slate-800 font-semibold border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 w-1/4">Particulars</th>
                      <th className="p-3 border-r border-slate-200 text-center w-[15%]">
                        Members as on 31st March
                      </th>
                      <th className="p-3 border-r border-slate-200 text-center w-[15%]">
                        Membership Added During the Month <span className="text-red-500">*</span>
                      </th>
                      <th className="p-3 border-r border-slate-200 text-center w-[15%]">
                        Membership Till Date
                      </th>
                      <th className="p-3 border-r border-slate-200 text-center w-[15%]">
                        Cumulative Membership
                      </th>
                      <th className="p-3 text-right w-[16%]">
                        Membership Amount Received (₹) @ ₹1,000 per member
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: "chapter", label: "Chapter" },
                      { key: "yuva", label: "FTS Yuva" },
                      { key: "mahila", label: "Mahila Samiti" },
                      { key: "renewal", label: "Renewal Members" },
                      { key: "newMember", label: "New Members" },
                    ].map(({ key, label }, idx) => {
                      const rowData = memberships?.[key] || {};
                      const rowTillDateNum = Number(
                        rowData.tillDate !== undefined && rowData.tillDate !== ""
                          ? rowData.tillDate
                          : rowData.added
                      ) || 0;
                      const rowCumulative = (Number(rowData.asOnMarch) || 0) + rowTillDateNum;
                      const rowAmount = rowTillDateNum * 1000;

                      return (
                        <tr
                          key={key}
                          className={`border-b border-slate-100 hover:bg-slate-50/60 ${key === "renewal" || key === "newMember" ? "bg-blue-50/20" : ""
                            }`}
                        >
                          <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                            {label}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            {key === "renewal" || key === "newMember" ? (
                              <div className="w-full text-center text-slate-400 font-medium text-xs">

                              </div>
                            ) : (
                              <input
                                type="number"
                                value={rowData.asOnMarch ?? ""}
                                disabled={Boolean(dbAutoFilled.membership) || isView}
                                readOnly={Boolean(dbAutoFilled.membership) || isView}
                                onChange={(e) =>
                                  setMemberships({
                                    ...memberships,
                                    [key]: {
                                      ...rowData,
                                      asOnMarch: e.target.value,
                                    },
                                  })
                                }
                                className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                              />
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <input
                              type="number"
                              value={rowData.added ?? ""}
                              disabled={Boolean(dbAutoFilled.membership) || isView}
                              readOnly={Boolean(dbAutoFilled.membership) || isView}
                              onChange={(e) =>
                                setMemberships({
                                  ...memberships,
                                  [key]: {
                                    ...rowData,
                                    added: e.target.value,
                                  },
                                })
                              }
                              className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <input
                              type="number"
                              value={rowData.tillDate ?? ""}
                              disabled={Boolean(dbAutoFilled.membership) || isView}
                              readOnly={Boolean(dbAutoFilled.membership) || isView}
                              onChange={(e) =>
                                setMemberships({
                                  ...memberships,
                                  [key]: {
                                    ...rowData,
                                    tillDate: e.target.value,
                                  },
                                })
                              }
                              className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                            />
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-blue-300 bg-blue-50/50 text-blue-900 font-semibold text-xs">
                              {rowCumulative || ""}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-blue-300 bg-blue-50/50 text-blue-900 font-semibold text-xs">
                              {rowAmount > 0 ? formatINR(rowAmount) : ""}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* TOTAL */}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <td className="p-3 border-r border-slate-200 text-slate-900">TOTAL</td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-blue-300 bg-blue-50/60 text-blue-950 font-bold text-xs">
                          {sectionATotals.asOnMarch || ""}
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-blue-300 bg-blue-50/60 text-blue-950 font-bold text-xs">
                          {sectionATotals.added || ""}
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-blue-300 bg-blue-50/60 text-blue-950 font-bold text-xs">
                          {sectionATotals.tillDate || ""}
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-blue-300 bg-blue-50/60 text-blue-950 font-bold text-xs">
                          {sectionATotals.cumulative || ""}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-blue-300 bg-blue-50/60 text-blue-950 font-bold text-xs">
                          {sectionATotals.amount || ""}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ================= SECTION B: EXECUTIVE COMMITTEE MEETINGS ================= */}
          <section
            id="section-b"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#15803d] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#15803d] font-bold text-xs flex items-center justify-center">
                B
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">
                Executive Committee Meeting Details
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noMeetingHeld}
                  disabled={(meetings.length > 0 && meetings.some((m) => m.isFromDb)) || isView}
                  onChange={(e) => setNoMeetingHeld(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span>No Executive Committee Meeting was held this month</span>
              </label>

              {!noMeetingHeld && (
                <div className="space-y-4 pt-2">
                  {meetings.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No meeting added yet. Click "+ Add Meeting".
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {meetings.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className={`border rounded-md p-4 space-y-4 ${m.isFromDb ? "border-emerald-200 bg-slate-50/70" : "border-slate-300 bg-white"
                            }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                Meeting {idx + 1}
                              </span>
                            </div>
                            {!m.isFromDb && !isView && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMeeting(idx)}
                                className="text-xs text-slate-500 hover:text-red-600 transition cursor-pointer font-medium"
                              >
                                Remove meeting
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Meeting of <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={m.meetingOf || m.type || "Executive Committee"}
                                disabled={m.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateMeeting(idx, "meetingOf", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              >
                                <option value="Choose">Choose</option>
                                <option value="Executive Committee">Executive Committee</option>
                                <option value="Executive Committee Meeting">
                                  Executive Committee Meeting
                                </option>
                                <option value="Mahila Samiti">Mahila Samiti</option>
                                <option value="Mahila Samiti Meeting">
                                  Mahila Samiti Meeting
                                </option>
                                <option value="Yuva Samiti">Yuva Samiti</option>
                                <option value="Yuva Samiti Meeting">
                                  Yuva Samiti Meeting
                                </option>
                                <option value="General Meeting">General Meeting</option>
                                <option value="Meeting">Meeting</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Executive Committee Meeting Date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={m.date || ""}
                                disabled={m.isFromDb || isView}
                                readOnly={m.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateMeeting(idx, "date", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>

                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Expected Members <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                placeholder="e.g. 20"
                                value={m.membersCount || ""}
                                disabled={m.isFromDb || isView}
                                readOnly={m.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateMeeting(idx, "membersCount", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>

                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Members Attended <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                placeholder="e.g. 15"
                                value={m.attended || ""}
                                disabled={m.isFromDb || isView}
                                readOnly={m.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateMeeting(idx, "attended", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Meeting Name / Title
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Executive Committee"
                                value={m.name || ""}
                                disabled={m.isFromDb || isView}
                                readOnly={m.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateMeeting(idx, "name", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>

                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Meeting Time
                              </label>
                              <input
                                type="time"
                                value={m.time || ""}
                                disabled={m.isFromDb || isView}
                                readOnly={m.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateMeeting(idx, "time", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>
                          </div>

                          <div className="text-xs">
                            <label className="block font-medium text-slate-700 mb-1">
                              Key Agenda Points Discussed
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Key agenda points discussed during the meeting..."
                              value={m.agenda || ""}
                              disabled={m.isFromDb || isView}
                              readOnly={m.isFromDb || isView}
                              onChange={(e) =>
                                handleUpdateMeeting(idx, "agenda", e.target.value)
                              }
                              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 resize-y disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                            />
                          </div>

                          <div className="text-xs">
                            <label className="block font-medium text-slate-700 mb-1">
                              Outcome (If Any)
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Key outcomes or decisions taken..."
                              value={m.outcome || ""}
                              disabled={m.isFromDb || isView}
                              readOnly={m.isFromDb || isView}
                              onChange={(e) =>
                                handleUpdateMeeting(idx, "outcome", e.target.value)
                              }
                              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-600 resize-y disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isView && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/event-create", {
                            state: {
                              event_type: "Meeting",
                              event_for: "Executive Committee",
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Meeting
                      </button>

                      <p className="text-[11px] text-slate-400">
                        Held more than one meeting this month? Click "Add Meeting" to create in Event Creation. Each meeting
                        has its own details.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ================= SECTION C: OTS DETAILS & COLLECTION ================= */}
          <section
            id="section-c"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#c2410c] text-white px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white text-[#c2410c] font-bold text-xs flex items-center justify-center">
                  C
                </span>
                <h2 className="text-sm font-bold tracking-wide uppercase">
                  OTS Details & Collection
                </h2>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* OTS Details */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#c2410c] border-l-2 border-[#c2410c] pl-2">
                  OTS Details
                </h3>
                <label className="block text-xs font-semibold text-slate-700">OTS PRP</label>
                <input
                  type="text"
                  value={otsPRP ?? ""}
                  disabled={Boolean(dbAutoFilled.otsPrp) || isView}
                  readOnly={Boolean(dbAutoFilled.otsPrp) || isView}
                  onChange={(e) => setOtsPRP(e.target.value)}
                  placeholder="Enter OTS PRP"
                  className="max-w-md w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                />
                <p className="text-[11px] text-slate-400">
                  OTS PRP is filled only once. After you save it, it is locked in every later month's
                  CPR. If it needs correcting, please ask the National Office.
                </p>
              </div>

              {/* OTS Collection */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#c2410c] border-l-2 border-[#c2410c] pl-2">
                  OTS Collection
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-orange-50/50 text-slate-800 font-semibold border-b border-slate-200">
                        <th className="p-3 border-r border-slate-200 w-1/2">Particulars</th>
                        <th className="p-3 border-r border-slate-200 text-center w-1/4">
                          During the Month <span className="text-red-500">*</span>
                        </th>
                        <th className="p-3 text-right w-1/4">Till Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Total Number of OTS */}
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                          Total Number of OTS
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="number"
                            placeholder="Count"
                            value={otsCountDuringMonth ?? ""}
                            disabled={Boolean(dbAutoFilled.ots) || isView}
                            readOnly={Boolean(dbAutoFilled.ots) || isView}
                            onChange={(e) => handleOtsCountDuringChange(e.target.value)}
                            className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="Till Date Count"
                            value={otsCountTillDateInput !== "" ? otsCountTillDateInput : (otsCountDuringMonth ?? "")}
                            disabled={Boolean(dbAutoFilled.ots) || isView}
                            readOnly={Boolean(dbAutoFilled.ots) || isView}
                            onChange={(e) => handleOtsCountTillChange(e.target.value)}
                            className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                      </tr>

                      {/* Regular OTS Collection */}
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                          Regular OTS Collection (₹) @ ₹30,000 per OTS
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-orange-300 bg-orange-50/50 text-orange-950 font-bold text-xs">
                            {otsRegularDuring > 0 ? formatINR(otsRegularDuring) : "₹0"}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-orange-300 bg-orange-50/50 text-orange-950 font-bold text-xs">
                            {otsRegularTill > 0 ? formatINR(otsRegularTill) : "₹0"}
                          </div>
                        </td>
                      </tr>

                      {/* Extra OTS Collection */}
                      <tr className="border-b border-slate-100">
                        <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                          Extra OTS Collection (Additional Amount) (₹)
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="number"
                            placeholder="Extra Amount"
                            value={otsExtraAmountDuringMonth ?? ""}
                            disabled={Boolean(dbAutoFilled.ots) || isView}
                            readOnly={Boolean(dbAutoFilled.ots) || isView}
                            onChange={(e) => handleOtsExtraDuringChange(e.target.value)}
                            className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="Extra Till Date"
                            value={otsExtraAmountTillDate !== "" ? otsExtraAmountTillDate : (otsExtraAmountDuringMonth ?? "")}
                            disabled={Boolean(dbAutoFilled.ots) || isView}
                            readOnly={Boolean(dbAutoFilled.ots) || isView}
                            onChange={(e) => handleOtsExtraTillChange(e.target.value)}
                            className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                      </tr>

                      {/* Total OTS Amount Collected */}
                      <tr className="bg-orange-50/40 font-bold border-t-2 border-orange-300">
                        <td className="p-3 border-r border-slate-200 text-slate-900">
                          Total OTS Amount Collected (₹)
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="number"
                            placeholder="Total Amount"
                            value={otsTotalAmountDuringMonth !== "" ? otsTotalAmountDuringMonth : (otsTotalDuring ? String(otsTotalDuring) : "")}
                            disabled={Boolean(dbAutoFilled.ots) || isView}
                            readOnly={Boolean(dbAutoFilled.ots) || isView}
                            onChange={(e) => handleOtsTotalDuringChange(e.target.value)}
                            className="w-full text-right px-2 py-1.5 border border-orange-300 rounded bg-orange-50/70 text-orange-950 text-xs font-bold focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            placeholder="Total Till Date"
                            value={otsTotalAmountTillDate !== "" ? otsTotalAmountTillDate : (otsTotalTill ? String(otsTotalTill) : "")}
                            disabled={Boolean(dbAutoFilled.ots) || isView}
                            readOnly={Boolean(dbAutoFilled.ots) || isView}
                            onChange={(e) => handleOtsTotalTillChange(e.target.value)}
                            className="w-full text-right px-2 py-1.5 border border-orange-300 rounded bg-orange-50/70 text-orange-950 text-xs font-bold focus:ring-1 focus:ring-orange-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-500">
                  Total OTS collection automatically separates into Regular OTS Collection (Number of OTS × ₹30,000)
                  and Extra OTS Collection (Additional Amount).
                </p>
              </div>
            </div>
          </section>

          {/* ================= SECTION D: DONATION & CSR DETAILS ================= */}
          <section
            id="section-d"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#9f1239] text-white px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-white text-[#9f1239] font-bold text-xs flex items-center justify-center">
                  D
                </span>
                <h2 className="text-sm font-bold tracking-wide uppercase">
                  Donation & CSR Details
                </h2>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9f1239] border-l-2 border-[#9f1239] pl-2">
                Donation & CSR Collection
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-rose-50/50 text-slate-800 font-semibold border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 w-2/5">Particulars</th>
                      <th className="p-3 border-r border-slate-200 text-center w-1/5">
                        Number of Donors
                      </th>
                      <th className="p-3 border-r border-slate-200 text-center w-1/5">
                        During the Month (₹) <span className="text-red-500">*</span>
                      </th>
                      <th className="p-3 text-right w-1/5">Till Date (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* General Donation */}
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                        General Donation (₹)
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          placeholder="No. of Donors"
                          value={donations?.general?.donors ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) =>
                            setDonations({
                              ...donations,
                              general: { ...donations.general, donors: e.target.value },
                            })
                          }
                          className="w-full text-center px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={donations?.general?.during ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) =>
                            setDonations({
                              ...donations,
                              general: { ...donations.general, during: e.target.value },
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={donations?.general?.till ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) =>
                            setDonations({
                              ...donations,
                              general: { ...donations.general, till: e.target.value },
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                    </tr>

                    {/* CSR Donation */}
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                        CSR Donation (₹)
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          placeholder="No. of Donors"
                          value={donations?.csr?.donors ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) =>
                            setDonations({
                              ...donations,
                              csr: { ...donations.csr, donors: e.target.value },
                            })
                          }
                          className="w-full text-center px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={donations?.csr?.during ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) =>
                            setDonations({
                              ...donations,
                              csr: { ...donations.csr, during: e.target.value },
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={donations?.csr?.till ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) =>
                            setDonations({
                              ...donations,
                              csr: { ...donations.csr, till: e.target.value },
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                    </tr>

                    {/* Non-CSR Donation */}
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                        Non-CSR Donation (₹)
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          placeholder="No. of Donors"
                          value={donations?.nonCsr?.donors ?? donations?.other?.donors ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDonations({
                              ...donations,
                              nonCsr: { ...(donations.nonCsr || donations.other), donors: val },
                              other: { ...(donations.other || donations.nonCsr), donors: val },
                            });
                          }}
                          className="w-full text-center px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={donations?.nonCsr?.during ?? donations?.other?.during ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDonations({
                              ...donations,
                              nonCsr: { ...(donations.nonCsr || donations.other), during: val },
                              other: { ...(donations.other || donations.nonCsr), during: val },
                            });
                          }}
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          value={donations?.nonCsr?.till ?? donations?.other?.till ?? ""}
                          disabled={Boolean(dbAutoFilled.donations) || isView}
                          readOnly={Boolean(dbAutoFilled.donations) || isView}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDonations({
                              ...donations,
                              nonCsr: { ...(donations.nonCsr || donations.other), till: val },
                              other: { ...(donations.other || donations.nonCsr), till: val },
                            });
                          }}
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                    </tr>

                    {/* TOTAL Donation */}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <td className="p-3 border-r border-slate-200 text-slate-900">
                        TOTAL Donation (₹)
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="w-full text-center px-2 py-1.5 rounded border border-dashed border-rose-300 bg-rose-50/60 text-rose-950 font-bold text-xs">
                          {donationTotals.donors || ""}
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-rose-300 bg-rose-50/60 text-rose-950 font-bold text-xs">
                          {donationTotals.during || ""}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="w-full text-right px-2 py-1.5 rounded border border-dashed border-rose-300 bg-rose-50/60 text-rose-950 font-bold text-xs">
                          {donationTotals.till || ""}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ================= SECTION E: COLLECTION BOXES ================= */}
          <section
            id="section-e"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#7e22ce] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#7e22ce] font-bold text-xs flex items-center justify-center">
                E
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">Seva Patra</h2>
            </div>

            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                  <thead>
                    <tr className="bg-purple-50/50 text-slate-800 font-semibold border-b border-slate-200">
                      <th className="p-3 border-r border-slate-200 w-1/2">Particulars</th>
                      <th className="p-3 border-r border-slate-200 text-center w-1/4">
                        This Month
                      </th>
                      <th className="p-3 text-right w-1/4">Till Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                        Boxes Placed
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          value={collectionBoxes?.boxesThisMonth ?? ""}
                          disabled={isManualFieldDisabled}
                          readOnly={isManualFieldDisabled}
                          onChange={(e) =>
                            setCollectionBoxes({
                              ...collectionBoxes,
                              boxesThisMonth: e.target.value,
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          name="boxes_placed_till_date"
                          value={collectionBoxes?.boxesTillDate ?? ""}
                          disabled={isManualFieldDisabled}
                          readOnly={isManualFieldDisabled}
                          onChange={(e) =>
                            setCollectionBoxes({
                              ...collectionBoxes,
                              boxesTillDate: e.target.value,
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                        Amount Collected (₹)
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="number"
                          value={collectionBoxes?.amountThisMonth ?? ""}
                          disabled={isManualFieldDisabled}
                          readOnly={isManualFieldDisabled}
                          onChange={(e) =>
                            setCollectionBoxes({
                              ...collectionBoxes,
                              amountThisMonth: e.target.value,
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          name="boxes_amount_till_date"
                          value={collectionBoxes?.amountTillDate ?? ""}
                          disabled={isManualFieldDisabled}
                          readOnly={isManualFieldDisabled}
                          onChange={(e) =>
                            setCollectionBoxes({
                              ...collectionBoxes,
                              amountTillDate: e.target.value,
                            })
                          }
                          className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ================= SECTION F: INVESTMENT ================= */}
          <section
            id="section-f"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#0f766e] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#0f766e] font-bold text-xs flex items-center justify-center">
                F
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">
                Investment (As on Date)
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fixed Deposit (FD) ₹
                  </label>
                  <input
                    type="number"
                    value={investments?.fd ?? ""}
                    disabled={isManualFieldDisabled}
                    readOnly={isManualFieldDisabled}
                    onChange={(e) =>
                      setInvestments({ ...investments, fd: e.target.value })
                    }
                    className="w-full text-right px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mutual Fund ₹
                  </label>
                  <input
                    type="number"
                    value={investments?.mutualFund ?? ""}
                    disabled={isManualFieldDisabled}
                    readOnly={isManualFieldDisabled}
                    onChange={(e) =>
                      setInvestments({ ...investments, mutualFund: e.target.value })
                    }
                    className="w-full text-right px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Others ₹
                  </label>
                  <input
                    type="number"
                    value={investments?.others ?? ""}
                    disabled={isManualFieldDisabled}
                    readOnly={isManualFieldDisabled}
                    onChange={(e) =>
                      setInvestments({ ...investments, others: e.target.value })
                    }
                    className="w-full text-right px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Others (Please Specify)
                  </label>
                  <input
                    type="text"
                    value={investments?.othersSpecify ?? ""}
                    disabled={isManualFieldDisabled}
                    readOnly={isManualFieldDisabled}
                    onChange={(e) =>
                      setInvestments({ ...investments, othersSpecify: e.target.value })
                    }
                    placeholder="Details"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  TOTAL Investment
                </label>
                <div className="max-w-xs text-right px-3 py-2 rounded border border-dashed border-teal-300 bg-teal-50/50 text-teal-950 font-bold text-sm">
                  {totalInvestment || ""}
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECTION G: CASH & BANK BALANCE ================= */}
          <section
            id="section-g"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#0284c7] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#0284c7] font-bold text-xs flex items-center justify-center">
                G
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">
                Cash & Bank Balance
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cash in Hand ₹ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashInHand ?? ""}
                  disabled={isManualFieldDisabled}
                  readOnly={isManualFieldDisabled}
                  onChange={(e) => setCashInHand(e.target.value)}
                  className="max-w-xs w-full text-right px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Bank Balance <span className="text-red-500">*</span>
                </label>

                {bankBalances.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No bank balance added yet. Click "+ Add Bank" to add accounts.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                      <thead>
                        <tr className="bg-sky-50/50 text-slate-800 font-semibold border-b border-slate-200">
                          <th className="p-3 border-r border-slate-200 w-1/2">
                            Bank Name <span className="text-red-500">*</span>
                          </th>
                          <th className="p-3 border-r border-slate-200 text-right w-1/3">
                            Balance ₹ <span className="text-red-500">*</span>
                          </th>
                          <th className="p-3 text-center w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankBalances.map((b) => (
                          <tr key={b.id} className="border-b border-slate-100">
                            <td className="p-2 border-r border-slate-200">
                              <select
                                value={b.bankName}
                                disabled={b.isFromDb || isView}
                                onChange={(e) => {
                                  const isOther = e.target.value === "Other";
                                  setBankBalances(
                                    bankBalances.map((item) =>
                                      item.id === b.id
                                        ? { ...item, bankName: e.target.value, isOther }
                                        : item
                                    )
                                  );
                                }}
                                className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none font-medium disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                              >
                                <option value="Bandhan Bank">Bandhan Bank</option>
                                <option value="ICICI Bank">ICICI Bank</option>
                                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                                <option value="Standard Chartered Bank">
                                  Standard Chartered Bank
                                </option>
                                <option value="State Bank of India">State Bank of India</option>
                                <option value="HDFC Bank">HDFC Bank</option>
                                <option value="Punjab National Bank">
                                  Punjab National Bank
                                </option>
                                <option value="Axis Bank">Axis Bank</option>
                                <option value="Other">Other</option>
                              </select>
                              {b.isOther && (
                                <input
                                  type="text"
                                  placeholder="Specify Bank Name"
                                  value={b.customName || ""}
                                  disabled={b.isFromDb || isView}
                                  readOnly={b.isFromDb || isView}
                                  onChange={(e) =>
                                    setBankBalances(
                                      bankBalances.map((item) =>
                                        item.id === b.id
                                          ? { ...item, customName: e.target.value }
                                          : item
                                      )
                                    )
                                  }
                                  className="w-full mt-1.5 px-2 py-1 border border-slate-300 rounded text-xs bg-slate-50 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                                />
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <input
                                type="number"
                                step="0.01"
                                value={b.balance ?? ""}
                                disabled={b.isFromDb || isView}
                                readOnly={b.isFromDb || isView}
                                onChange={(e) =>
                                  setBankBalances(
                                    bankBalances.map((item) =>
                                      item.id === b.id
                                        ? { ...item, balance: e.target.value }
                                        : item
                                    )
                                  )
                                }
                                className="w-full text-right px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-sky-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                              />
                            </td>
                            <td className="p-2 text-center">
                              {!b.isFromDb && !isView ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBankBalances(
                                      bankBalances.filter((item) => item.id !== b.id)
                                    )
                                  }
                                  className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!isView && (
                  <button
                    type="button"
                    onClick={() => navigate("/cpr-bank", { state: { openCreate: true } })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Bank
                  </button>
                )}
              </div>

              {/* Total Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Bank Balance
                  </label>
                  <div className="text-right px-3 py-2 rounded border border-dashed border-sky-300 bg-sky-50/50 text-sky-950 font-bold text-sm">
                    {totalBankBalance || ""}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    TOTAL Cash & Bank Balance
                  </label>
                  <div className="text-right px-3 py-2 rounded border border-dashed border-sky-300 bg-sky-50/50 text-sky-950 font-bold text-sm">
                    {totalCashAndBank || ""}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECTION H: VANYATRA ================= */}
          <section
            id="section-h"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#9a3412] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#9a3412] font-bold text-xs flex items-center justify-center">
                H
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">Vanyatra</h2>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Vanyatra – This Month
                  </label>
                  <div className="px-3 py-2 rounded border border-dashed border-orange-300 bg-orange-50/40 text-orange-950 font-bold text-sm text-center">
                    {vanyatras.length || ""}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Counted from the entries below
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Number of Vanyatra – Till Date
                  </label>
                  <div className="px-3 py-2 rounded border border-dashed border-orange-300 bg-orange-50/40 text-orange-950 font-bold text-sm text-center">
                    {vanyatras.length || ""}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#9a3412] border-l-2 border-[#9a3412] pl-2">
                  Vanyatra Details
                </h3>

                {vanyatras.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No Vanyatra added. Click "+ Add Vanyatra".
                  </p>
                ) : (
                  <div className="space-y-2">
                    {vanyatras.map((v, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded border border-slate-200 bg-slate-50 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">
                            Vanyatra {i + 1}: {v.date ? (moment(v.date).isValid() ? moment(v.date).format("DD-MM-YYYY") : v.date) : "Date not set"}
                          </span>
                          <span className="text-slate-500 ml-2">
                            ({v.yatrisCount || 0} Yatris)
                          </span>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            Visited: {v.vidyalayasVisited || "None"}
                          </div>
                        </div>
                        {!v.isFromDb && !isView ? (
                          <button
                            type="button"
                            onClick={() =>
                              setVanyatras(vanyatras.filter((_, idx) => idx !== i))
                            }
                            className="px-2 py-1 text-xs border rounded bg-white text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {!isView && (
                  <button
                    type="button"
                    onClick={() => navigate("/cpr-vanyatra", { state: { openCreate: true } })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Vanyatra
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ================= SECTION I: EVENTS DURING THE MONTH ================= */}
          <section
            id="section-i"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#4f46e5] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#4f46e5] font-bold text-xs flex items-center justify-center">
                I
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">
                Events During the Month
              </h2>
            </div>

            <div className="p-5 space-y-4">
              <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noEventHeld}
                  disabled={(events.length > 0 && events.some((ev) => ev.isFromDb)) || isView}
                  onChange={(e) => setNoEventHeld(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span>No Event was held this month</span>
              </label>

              {!noEventHeld && (
                <div className="space-y-4 pt-2">
                  {events.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No events added yet. Click "+ Add Event".
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {events.map((ev, index) => (
                        <div
                          key={ev.id || index}
                          className={`border rounded-md p-4 space-y-4 ${ev.isFromDb ? "border-indigo-200 bg-slate-50/70" : "border-slate-300 bg-white"
                            }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                Event {index + 1}
                              </span>

                            </div>
                            {!ev.isFromDb && !isView && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEvent(index)}
                                className="text-xs text-slate-500 hover:text-red-600 transition cursor-pointer font-medium"
                              >
                                Remove event
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Event For <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={ev.eventFor || ev.committee || "Youth"}
                                disabled={ev.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateEvent(index, "eventFor", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              >
                                <option value="Youth">Youth</option>
                                <option value="Mahila">Mahila</option>
                                <option value="Yuva Samiti">Yuva Samiti</option>
                                <option value="Mahila Samiti">Mahila Samiti</option>
                                <option value="Executive Committee">Executive Committee</option>
                                <option value="General">General</option>
                                <option value="Public Event">Public Event</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Event Date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={ev.date || ""}
                                disabled={ev.isFromDb || isView}
                                readOnly={ev.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateEvent(index, "date", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>

                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Event Time
                              </label>
                              <input
                                type="time"
                                value={ev.time || ""}
                                disabled={ev.isFromDb || isView}
                                readOnly={ev.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateEvent(index, "time", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>

                            <div>
                              <label className="block font-medium text-slate-700 mb-1">
                                Event Type <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Public Event"
                                value={ev.type || ""}
                                disabled={ev.isFromDb || isView}
                                readOnly={ev.isFromDb || isView}
                                onChange={(e) =>
                                  handleUpdateEvent(index, "type", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                              />
                            </div>
                          </div>

                          <div className="text-xs">
                            <label className="block font-medium text-slate-700 mb-1">
                              Event Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Annual Meet / Cultural Program"
                              value={ev.name || ""}
                              disabled={ev.isFromDb || isView}
                              readOnly={ev.isFromDb || isView}
                              onChange={(e) =>
                                handleUpdateEvent(index, "name", e.target.value)
                              }
                              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                            />
                          </div>

                          <div className="text-xs">
                            <label className="block font-medium text-slate-700 mb-1">
                              Key Agenda Points Discussed / Description
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Key agenda points or event details..."
                              value={ev.description || ""}
                              disabled={ev.isFromDb || isView}
                              readOnly={ev.isFromDb || isView}
                              onChange={(e) =>
                                handleUpdateEvent(index, "description", e.target.value)
                              }
                              className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none disabled:border-slate-200"
                            />
                          </div>

                          {/* Photos / Attachments */}
                          {(ev.image || (ev.subs && ev.subs.length > 0) || ev.photos > 0) && (
                            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                              <span className="font-semibold text-slate-700">Photographs:</span>
                              <span>
                                {ev.photos || (ev.subs ? ev.subs.length : 1)} photo(s) recorded
                              </span>
                              {ev.image && (
                                <a
                                  href={getImageUrl("Event", ev.image)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                                >
                                  View Image
                                </a>
                              )}
                              {Array.isArray(ev.subs) &&
                                ev.subs.map((s, sIdx) => {
                                  const subImg = s.event_sub_image || s.image || s.url;
                                  if (!subImg) return null;
                                  return (
                                    <a
                                      key={sIdx}
                                      href={getImageUrl("Event", subImg)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-800 underline font-medium"
                                    >
                                      Photo {sIdx + 1}
                                    </a>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isView && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/event-create", {
                            state: {
                              event_type: "Public Event",
                            },
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Event
                      </button>
                      <p className="text-[11px] text-slate-400">
                        Held more than one event this month? Click "Add Event" to create in Event Creation. Each event has its own details.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ================= SECTION J: ANNEXURE 1 ================= */}
          <section
            id="section-j"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#0e7490] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#0e7490] font-bold text-xs flex items-center justify-center">
                J
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">
                Annexure 1 – Disbursement to Anchal
              </h2>
            </div>

            <div className="p-5 space-y-3">
              {anchals.length === 0 ? (
                <p className="text-xs text-slate-500">No Anchal added yet. Click "Add Anchal".</p>
              ) : (
                <div className="space-y-2">
                  {anchals.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded border border-slate-200 bg-slate-50 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {a.name || `Anchal ${i + 1}`}
                        </span>
                        <span className="text-slate-500 ml-2">
                          (Acharyas: {a.acharyasCount || 0}, Remittance:{" "}
                          {formatINR(a.remittanceThisMonth)})
                        </span>
                      </div>
                      {!a.isFromDb && !isView ? (
                        <button
                          type="button"
                          onClick={() => setAnchals(anchals.filter((_, idx) => idx !== i))}
                          className="px-2 py-1 text-xs border rounded bg-white text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {!isView && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate("/cpr-disbursement", { state: { openCreate: true } })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Anchal
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Choose Anchal names from the list. "Total Remittance till Last Date" is filled
                    from last month's CPR.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* ================= SECTION K: ANNEXURE 2 ================= */}
          <section
            id="section-k"
            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="bg-[#334155] text-white px-5 py-3 flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-white text-[#334155] font-bold text-xs flex items-center justify-center">
                K
              </span>
              <h2 className="text-sm font-bold tracking-wide uppercase">
                Annexure 2 – Monthly Summary / Check Points
              </h2>
            </div>

            <div className="p-5 space-y-5">
              {/* Samagri reached */}
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-xs font-semibold text-slate-700 w-60">
                  Samagri reached to all schools <span className="text-red-500">*</span>
                </span>
                <div className="inline-flex rounded-md shadow-xs" role="group">
                  <button
                    type="button"
                    disabled={isManualFieldDisabled}
                    onClick={() => setSamagriReached("Yes")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-l-md border ${samagriReached === "Yes"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      } ${dbAutoFilled.samagri ? "cursor-not-allowed opacity-90 pointer-events-none" : ""}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={isManualFieldDisabled}
                    onClick={() => setSamagriReached("No")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-r-md border-t border-b border-r ${samagriReached === "No"
                        ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      } ${dbAutoFilled.samagri ? "cursor-not-allowed opacity-90 pointer-events-none" : ""}`}
                  >
                    No
                  </button>
                </div>
                <input
                  type="text"
                  value={samagriRemarks ?? ""}
                  disabled={isManualFieldDisabled}
                  readOnly={isManualFieldDisabled}
                  onChange={(e) => setSamagriRemarks(e.target.value)}
                  placeholder="Reason / Remarks"
                  className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                />
              </div>

              {/* Donor Board Details */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-l-2 border-slate-700 pl-2">
                    Donor Board Details
                  </h3>

                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                        <th className="p-2.5 border-r border-slate-200 w-1/4">Particulars</th>
                        <th className="p-2.5 border-r border-slate-200 text-center w-1/6">
                          Total Donor Boards
                        </th>
                        <th className="p-2.5 border-r border-slate-200 text-center w-1/6">
                          Already Sent
                        </th>
                        <th className="p-2.5 border-r border-slate-200 text-center w-1/6">
                          Pending
                        </th>
                        <th className="p-2.5 w-1/4">Reason / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="p-2.5 font-medium text-slate-800 border-r border-slate-200">
                          Non-CSR Donor Board reached to all schools
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={donorBoard?.nonCsr?.total ?? ""}
                            disabled={isManualFieldDisabled}
                            readOnly={isManualFieldDisabled}
                            onChange={(e) =>
                              setDonorBoard({
                                ...donorBoard,
                                nonCsr: { ...donorBoard.nonCsr, total: e.target.value },
                              })
                            }
                            className="w-full text-right px-2 py-1 border border-slate-300 rounded text-xs disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={donorBoard?.nonCsr?.sent ?? ""}
                            disabled={isManualFieldDisabled}
                            readOnly={isManualFieldDisabled}
                            onChange={(e) =>
                              setDonorBoard({
                                ...donorBoard,
                                nonCsr: { ...donorBoard.nonCsr, sent: e.target.value },
                              })
                            }
                            className="w-full text-right px-2 py-1 border border-slate-300 rounded text-xs disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="w-full text-right px-2 py-1 rounded border border-dashed border-slate-300 bg-slate-50 text-slate-700 font-medium text-xs">
                            {donorBoard.nonCsr.total !== "" && donorBoard.nonCsr.sent !== ""
                              ? Math.max(
                                0,
                                (Number(donorBoard.nonCsr.total) || 0) -
                                (Number(donorBoard.nonCsr.sent) || 0)
                              )
                              : ""}
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={donorBoard?.nonCsr?.remarks ?? ""}
                            disabled={isManualFieldDisabled}
                            readOnly={isManualFieldDisabled}
                            onChange={(e) =>
                              setDonorBoard({
                                ...donorBoard,
                                nonCsr: { ...donorBoard.nonCsr, remarks: e.target.value },
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2.5 font-medium text-slate-800 border-r border-slate-200">
                          CSR Donor Board reached to all schools
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={donorBoard?.csr?.total ?? ""}
                            disabled={isManualFieldDisabled}
                            readOnly={isManualFieldDisabled}
                            onChange={(e) =>
                              setDonorBoard({
                                ...donorBoard,
                                csr: { ...donorBoard.csr, total: e.target.value },
                              })
                            }
                            className="w-full text-right px-2 py-1 border border-slate-300 rounded text-xs disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="number"
                            value={donorBoard?.csr?.sent ?? ""}
                            disabled={isManualFieldDisabled}
                            readOnly={isManualFieldDisabled}
                            onChange={(e) =>
                              setDonorBoard({
                                ...donorBoard,
                                csr: { ...donorBoard.csr, sent: e.target.value },
                              })
                            }
                            className="w-full text-right px-2 py-1 border border-slate-300 rounded text-xs disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <div className="w-full text-right px-2 py-1 rounded border border-dashed border-slate-300 bg-slate-50 text-slate-700 font-medium text-xs">
                            {donorBoard.csr.total !== "" && donorBoard.csr.sent !== ""
                              ? Math.max(
                                0,
                                (Number(donorBoard.csr.total) || 0) -
                                (Number(donorBoard.csr.sent) || 0)
                              )
                              : ""}
                          </div>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={donorBoard?.csr?.remarks ?? ""}
                            disabled={isManualFieldDisabled}
                            readOnly={isManualFieldDisabled}
                            onChange={(e) =>
                              setDonorBoard({
                                ...donorBoard,
                                csr: { ...donorBoard.csr, remarks: e.target.value },
                              })
                            }
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* School Progress Report */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 w-60">
                  School Progress Report sent to CSR Donors
                </span>
                <div className="inline-flex rounded-md shadow-xs" role="group">
                  <button
                    type="button"
                    disabled={isManualFieldDisabled}
                    onClick={() => setSchoolProgressSent("Yes")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-l-md border ${schoolProgressSent === "Yes"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      } ${dbAutoFilled.schoolProgress ? "cursor-not-allowed opacity-90 pointer-events-none" : ""}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={isManualFieldDisabled}
                    onClick={() => setSchoolProgressSent("No")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-r-md border-t border-b border-r ${schoolProgressSent === "No"
                        ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      } ${dbAutoFilled.schoolProgress ? "cursor-not-allowed opacity-90 pointer-events-none" : ""}`}
                  >
                    No
                  </button>
                </div>
                <input
                  type="text"
                  value={progressRemarks ?? ""}
                  disabled={isManualFieldDisabled}
                  readOnly={isManualFieldDisabled}
                  onChange={(e) => setProgressRemarks(e.target.value)}
                  placeholder="Reason / Remarks"
                  className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed disabled:pointer-events-none"
                />
              </div>

              {/* Monitoring Anchal Name */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Monitoring Anchal Name
                </label>
                <div className="relative max-w-sm">
                  <select
                    value={selectedMonitoringAnchal}
                    disabled={isManualFieldDisabled}
                    onChange={(e) => setSelectedMonitoringAnchal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 appearance-none font-medium disabled:bg-slate-100 disabled:text-slate-700 disabled:cursor-not-allowed"
                  >
                    <option value="Choose">Choose</option>
                    {anchalOptions.map((a, aIdx) => {
                      const aName = getAnchalLabel(a, aIdx);
                      return (
                        <option key={a?.id || aIdx} value={aName}>
                          {aName}
                        </option>
                      );
                    })}
                    {selectedMonitoringAnchal &&
                      selectedMonitoringAnchal !== "Choose" &&
                      !anchalOptions.some(
                        (a, aIdx) =>
                          getAnchalLabel(a, aIdx) === selectedMonitoringAnchal
                      ) && (
                        <option value={selectedMonitoringAnchal}>
                          {selectedMonitoringAnchal}
                        </option>
                      )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>

                {!isManualFieldDisabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        selectedMonitoringAnchal !== "Choose" &&
                        !monitoringAnchalsList.includes(selectedMonitoringAnchal)
                      ) {
                        setMonitoringAnchalsList([
                          ...monitoringAnchalsList,
                          selectedMonitoringAnchal,
                        ]);
                        setSelectedMonitoringAnchal("Choose");
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Monitoring Anchal
                  </button>
                )}

                {monitoringAnchalsList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {monitoringAnchalsList.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-200 text-xs font-medium text-slate-800"
                      >
                        {item}
                        {!isManualFieldDisabled && (
                          <button
                            type="button"
                            onClick={() =>
                              setMonitoringAnchalsList(
                                monitoringAnchalsList.filter((_, i) => i !== idx)
                              )
                            }
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ================= SIGN & SUBMIT CONTAINER ================= */}
          <section
            id="section-submit"
            className="border-2 border-teal-600 rounded-lg p-6 bg-white shadow-sm space-y-6"
          >
            <div>
              <h2 className="text-lg font-bold text-teal-800">Sign & Submit</h2>
              <p className="text-xs text-slate-600 mt-1">
                The CPR is submitted together with a copy signed by the Chapter President and
                Secretary.
              </p>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="p-4 rounded-lg border-2 border-teal-600/30 bg-teal-50/20 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Download the filled CPR
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Download the completed CPR report in both formats: PDF (for physical review and signatures) or Excel (with embedded formulas and automated totals).
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={handleDownloadPDF}
                        className="px-4 py-2 rounded bg-[#0f3d4c] hover:bg-[#092934] text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isGeneratingPdf ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>Download PDF (.pdf)</span>
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingExcel}
                        onClick={handleDownloadExcel}
                        className="px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        {isGeneratingExcel ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        <span>Download Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Get it signed</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Print the downloaded report and get it signed by the President and Secretary.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-wrap items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <div className="flex-1 space-y-4">
                  {/* Signed CPR Upload */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Upload the signed CPR</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supports signed CPR in PDF, Excel (.xlsx/.xls), or clear image formats.
                    </p>
                    {!isManualFieldDisabled ? (
                      <>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".pdf,.xlsx,.xls,image/png,image/jpeg,image/webp"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload signed CPR
                          </button>
                          <span className="text-[11px] text-slate-400">
                            PDF, Excel (.xlsx/.xls), JPG, PNG, up to 10 MB
                          </span>
                        </div>
                        {/* {existingSignedCprUrl && !signedFile && (
                          <div className="mt-2.5 p-2 rounded border border-teal-200 bg-teal-50/70 flex items-center justify-between text-xs max-w-md">
                            <span className="text-teal-900 font-medium">
                              Current Signed CPR Document on record
                            </span>
                            <a
                              href={existingSignedCprUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-700 underline font-semibold hover:text-teal-900 ml-2"
                            >
                              View File
                            </a>
                          </div>
                        )} */}
                        {signedFile && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              {signedFile.name} ({(signedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mt-2">
                        {existingSignedCprUrl ? (
                          <div className="p-2.5 rounded border border-teal-200 bg-teal-50/70 flex items-center justify-between text-xs max-w-md">
                            <span className="text-teal-900 font-medium">
                              Signed CPR Document on record
                            </span>
                            <a
                              href={existingSignedCprUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-700 underline font-semibold hover:text-teal-900 ml-2"
                            >
                              View File
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            No signed CPR document was uploaded.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Separate Raw Excel Data File Upload for Verification */}
                  <div className="pt-3 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900">
                      Upload Original / Raw Excel Data File (Optional)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload the raw/original Excel spreadsheet file separately for further verification, audit, and data processing.
                    </p>
                    {!isManualFieldDisabled ? (
                      <>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <input
                            type="file"
                            ref={rawExcelInputRef}
                            onChange={handleRawExcelUpload}
                            className="hidden"
                            accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                          />
                          <button
                            type="button"
                            onClick={() => rawExcelInputRef.current?.click()}
                            className="px-4 py-2 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Upload Raw Excel File
                          </button>
                          <span className="text-[11px] text-slate-400">
                            Excel (.xlsx, .xls), up to 10 MB
                          </span>
                        </div>
                        {existingRawExcelUrl && !rawExcelFile && (
                          <div className="mt-2.5 p-2 rounded border border-emerald-200 bg-emerald-50/70 flex items-center justify-between text-xs max-w-md">
                            <span className="text-emerald-900 font-medium">
                              Raw Excel file on record
                            </span>
                            <a
                              href={existingRawExcelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 underline font-semibold hover:text-emerald-900 ml-2"
                            >
                              Download File
                            </a>
                          </div>
                        )}
                        {rawExcelFile && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              {rawExcelFile.name} ({(rawExcelFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mt-2">
                        {existingRawExcelUrl ? (
                          <div className="p-2.5 rounded border border-emerald-200 bg-emerald-50/70 flex items-center justify-between text-xs max-w-md">
                            <span className="text-emerald-900 font-medium">
                              Raw Excel Data File on record
                            </span>
                            <a
                              href={existingRawExcelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 underline font-semibold hover:text-emerald-900 ml-2"
                            >
                              Download File
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">
                            No raw Excel file was uploaded.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="p-4 rounded-lg border border-slate-200 bg-white flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Submit the CPR</h3>
                  {isView ? (
                    <div className="mt-2 space-y-2">
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Report Submitted</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        This CPR report has already been submitted and cannot be edited or deleted.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload the signed CPR copy before submitting.
                      </p>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleSubmit}
                        className="mt-3 px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting CPR...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Submit CPR</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
        {/* Hidden print container for high-fidelity PDF capture */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "794px",
            zIndex: -9999,
            pointerEvents: "none",
            visibility: isGeneratingPdf ? "visible" : "hidden",
            opacity: isGeneratingPdf ? 1 : 0,
            backgroundColor: "#ffffff",
          }}
        >
          <CPRPrintReport
            ref={printableRef}
            chapterName={chapterName}
            monthIndex={monthIndex}
            monthName={monthName}
            financialYear={financialYear}
            reportId={currentReportId}
            csrStatus={csrStatus}
            cppName={cppName}
            submissionDate={submissionDate}
            subChapters={subChapters}
            memberships={memberships}
            sectionATotals={sectionATotals}
            noMeetingHeld={noMeetingHeld}
            meetings={meetings}
            otsPRP={otsPRP}
            otsCountDuringMonth={otsCountDuringMonth}
            otsCountTillDate={otsCountTillDate}
            otsRegularDuring={otsRegularDuring}
            otsRegularTill={otsRegularTill}
            otsExtraDuring={otsExtraDuring}
            otsExtraTill={otsExtraTill}
            otsTotalDuring={otsTotalDuring}
            otsTotalTill={otsTotalTill}
            otsAmountDuringMonth={otsAmountDuringMonth}
            otsAmountTillDate={otsAmountTillDate}
            donations={donations}
            donationTotals={donationTotals}
            collectionBoxes={collectionBoxes}
            investments={investments}
            totalInvestment={totalInvestment}
            cashInHand={cashInHand}
            bankBalances={bankBalances}
            totalBankBalance={totalBankBalance}
            totalCashAndBank={totalCashAndBank}
            vanyatras={vanyatras}
            vanyatrasCountThisMonth={vanyatras.length}
            vanyatrasCountTillDate={vanyatras.length}
            events={events}
            anchals={anchals}
            samagriReached={samagriReached}
            samagriRemarks={samagriRemarks}
            donorBoard={donorBoard}
            schoolProgressSent={schoolProgressSent}
            progressRemarks={progressRemarks}
            selectedMonitoringAnchal={selectedMonitoringAnchal}
            monitoringAnchalsList={monitoringAnchalsList}
            signedFile={signedFile}
            formatINR={formatINR}
          />
        </div>
      </div>

      {/* ================= FIXED BOTTOM ACTION BAR ================= */}
      <div
        style={{ left: bottomBarLeft }}
        className="fixed bottom-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 px-6 z-30 shadow-lg transition-[left] duration-200 ease-linear"
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>All changes saved.</span>
          </div>

          <div className="flex items-center gap-3">
            {isView ? (
              <>
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  Back to List
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 rounded-md border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={isGeneratingExcel}
                  className="px-4 py-2 rounded-md border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>
              </>
            ) : (
              <>
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                  >
                    Back to List
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="px-4 py-2 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingDraft ? "Saving..." : "Save Draft"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 rounded-md border border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={isGeneratingExcel}
                  className="px-4 py-2 rounded-md border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition shadow-xs inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmitting ? "Submitting..." : "Submit CPR"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD MEETING ================= */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Add Executive Committee Meeting
              </h3>
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meeting Date</label>
                <input
                  type="date"
                  value={currentMeeting.date}
                  max={todayDate}
                  onChange={(e) =>
                    setCurrentMeeting({ ...currentMeeting, date: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meeting Type</label>
                <input
                  type="text"
                  value={currentMeeting.type}
                  onChange={(e) =>
                    setCurrentMeeting({ ...currentMeeting, type: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total EC</label>
                  <input
                    type="number"
                    value={currentMeeting.membersCount}
                    onChange={(e) =>
                      setCurrentMeeting({
                        ...currentMeeting,
                        membersCount: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Invited</label>
                  <input
                    type="number"
                    value={currentMeeting.invited}
                    onChange={(e) =>
                      setCurrentMeeting({ ...currentMeeting, invited: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Attended</label>
                  <input
                    type="number"
                    value={currentMeeting.attended}
                    onChange={(e) =>
                      setCurrentMeeting({ ...currentMeeting, attended: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agenda / Points
                </label>
                <textarea
                  value={currentMeeting.agenda}
                  onChange={(e) =>
                    setCurrentMeeting({ ...currentMeeting, agenda: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                  placeholder="Key discussion points..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setMeetings([...meetings, currentMeeting]);
                  setShowMeetingModal(false);
                }}
                className="px-3 py-1.5 bg-green-700 text-white rounded text-xs font-semibold hover:bg-green-800"
              >
                Save Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD VANYATRA ================= */}
      {showVanyatraModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Vanyatra</h3>
              <button
                type="button"
                onClick={() => setShowVanyatraModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vanyatra Date</label>
                <input
                  type="date"
                  value={newVanyatra.date}
                  max={todayDate}
                  onChange={(e) =>
                    setNewVanyatra({ ...newVanyatra, date: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Number of Yatris
                </label>
                <input
                  type="number"
                  value={newVanyatra.yatrisCount}
                  onChange={(e) =>
                    setNewVanyatra({ ...newVanyatra, yatrisCount: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-right"
                  placeholder="Count"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vidyalayas Visited
                </label>
                <input
                  type="text"
                  value={newVanyatra.vidyalayasVisited}
                  onChange={(e) =>
                    setNewVanyatra({
                      ...newVanyatra,
                      vidyalayasVisited: e.target.value,
                    })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                  placeholder="Names of Vidyalayas"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Remarks / Pravas
                </label>
                <textarea
                  value={newVanyatra.remarks}
                  onChange={(e) =>
                    setNewVanyatra({ ...newVanyatra, remarks: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                  placeholder="Observations during Vanyatra"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowVanyatraModal(false)}
                className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setVanyatras([...vanyatras, newVanyatra]);
                  setNewVanyatra({
                    date: "",
                    yatrisCount: "",
                    vidyalayasVisited: "",
                    pravasDone: "No",
                    remarks: "",
                  });
                  setShowVanyatraModal(false);
                }}
                className="px-3 py-1.5 bg-[#9a3412] text-white rounded text-xs font-semibold hover:bg-[#7c2d12]"
              >
                Save Vanyatra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD EVENT ================= */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Event Details</h3>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Date</label>
                <input
                  type="date"
                  value={currentEvent.date}
                  max={todayDate}
                  onChange={(e) =>
                    setCurrentEvent({ ...currentEvent, date: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Event Type / Name
                </label>
                <input
                  type="text"
                  value={currentEvent.type}
                  onChange={(e) =>
                    setCurrentEvent({ ...currentEvent, type: e.target.value })
                  }
                  placeholder="e.g. ANNUAL MEET"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Committee</label>
                <select
                  value={currentEvent.committee}
                  onChange={(e) =>
                    setCurrentEvent({ ...currentEvent, committee: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 text-xs"
                >
                  <option value="Yuva Samiti">Yuva Samiti</option>
                  <option value="Mahila Samiti">Mahila Samiti</option>
                  <option value="Executive Committee">Executive Committee</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setEvents([
                    ...events,
                    {
                      ...currentEvent,
                      id: currentEvent.id || Date.now(),
                      detailsMissing: false,
                    },
                  ]);
                  setShowEventModal(false);
                }}
                className="px-3 py-1.5 bg-[#4f46e5] text-white rounded text-xs font-semibold hover:bg-[#4338ca]"
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD ANCHAL ================= */}
      {showAnchalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Anchal Disbursement</h3>
              <button
                type="button"
                onClick={() => setShowAnchalModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Anchal Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={newAnchal.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = anchalOptions.find(
                        (a, idx) =>
                          getAnchalLabel(a, idx) === val ||
                          String(a?.id) === val ||
                          a?.achal === val ||
                          a?.anchal_name === val ||
                          a?.anchal === val
                      );
                      const matchedName = matched ? getAnchalLabel(matched) : val;
                      setNewAnchal({
                        ...newAnchal,
                        name: matchedName,
                        acharyasCount:
                          matched?.no_of_acharyas ||
                          matched?.acharyas ||
                          matched?.acharyasCount ||
                          newAnchal.acharyasCount,
                        annualTarget:
                          matched?.amount ||
                          matched?.annualTarget ||
                          matched?.target ||
                          newAnchal.annualTarget,
                      });
                    }}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0e7490] appearance-none pr-8 font-medium"
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
                    {newAnchal.name &&
                      !anchalOptions.some(
                        (a, aIdx) =>
                          getAnchalLabel(a, aIdx) === newAnchal.name
                      ) && (
                        <option value={newAnchal.name}>
                          {newAnchal.name}
                        </option>
                      )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Acharyas Paid
                  </label>
                  <input
                    type="number"
                    value={newAnchal.acharyasCount}
                    onChange={(e) =>
                      setNewAnchal({ ...newAnchal, acharyasCount: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Annual Target ₹
                  </label>
                  <input
                    type="number"
                    value={newAnchal.annualTarget}
                    onChange={(e) =>
                      setNewAnchal({ ...newAnchal, annualTarget: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-right"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Remittance Last Month ₹
                  </label>
                  <input
                    type="number"
                    value={newAnchal.remittanceLastMonth}
                    onChange={(e) =>
                      setNewAnchal({
                        ...newAnchal,
                        remittanceLastMonth: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Remittance This Month ₹
                  </label>
                  <input
                    type="number"
                    value={newAnchal.remittanceThisMonth}
                    onChange={(e) =>
                      setNewAnchal({
                        ...newAnchal,
                        remittanceThisMonth: e.target.value,
                      })
                    }
                    className="w-full border border-slate-300 rounded px-3 py-2 text-xs text-right"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAnchalModal(false)}
                className="px-3 py-1.5 border rounded text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnchals([...anchals, newAnchal]);
                  setNewAnchal({
                    name: "",
                    acharyasCount: "",
                    annualTarget: "",
                    remittanceLastMonth: "",
                    remittanceThisMonth: "",
                  });
                  setShowAnchalModal(false);
                }}
                className="px-3 py-1.5 bg-[#0e7490] text-white rounded text-xs font-semibold hover:bg-[#155e75]"
              >
                Save Anchal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CPRForm;
