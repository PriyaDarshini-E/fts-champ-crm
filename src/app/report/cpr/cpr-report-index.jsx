import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import CPRReportList from "./cpr-report-list";
import CPRForm from "./cpr-form";

const CPRReportIndex = () => {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateRoute =
    location.pathname.endsWith("/create") ||
    searchParams.get("create") === "true";
  const queryId = searchParams.get("id");
  const effectiveId =
    paramId && paramId !== "create" ? paramId : queryId || null;
  const isViewParam = searchParams.get("view") === "true";
  const isEditParam =
    searchParams.get("edit") === "true" || (!isViewParam && Boolean(effectiveId));
  const monthParam = searchParams.get("month") || "";
  const yearParam = searchParams.get("year") || "";

  const isFormActive = Boolean(effectiveId || isCreateRoute);

  const [view, setView] = useState(() => (isFormActive ? "form" : "list"));
  const [reportConfig, setReportConfig] = useState(() => ({
    month: monthParam,
    year: yearParam,
    reportId: effectiveId,
    isEdit: isEditParam,
    isView: isViewParam,
  }));

  // Keep state in sync if URL changes (e.g. browser back/forward or direct refresh)
  useEffect(() => {
    if (effectiveId) {
      setView("form");
      setReportConfig({
        month: monthParam,
        year: yearParam,
        reportId: effectiveId,
        isEdit: isEditParam,
        isView: isViewParam,
      });
    } else if (isCreateRoute) {
      setView("form");
      setReportConfig({
        month: monthParam,
        year: yearParam,
        reportId: null,
        isEdit: false,
        isView: false,
      });
    } else {
      setView("list");
      setReportConfig({
        month: "",
        year: "",
        reportId: null,
        isEdit: false,
        isView: false,
      });
    }
  }, [effectiveId, isCreateRoute, isEditParam, isViewParam, monthParam, yearParam]);

  const handleStartOrCreate = (config) => {
    setReportConfig(config);
    setView("form");
    if (config.reportId) {
      if (config.isView) {
        navigate(`/cpr-report/${config.reportId}?view=true`);
      } else {
        navigate(`/cpr-report/${config.reportId}`);
      }
    } else {
      const q = new URLSearchParams();
      if (config.month) q.set("month", config.month);
      if (config.year) q.set("year", config.year);
      const queryStr = q.toString() ? `?${q.toString()}` : "";
      navigate(`/cpr-report/create${queryStr}`);
    }
  };

  const handleBackToList = () => {
    setView("list");
    setReportConfig({
      month: "",
      year: "",
      reportId: null,
      isEdit: false,
      isView: false,
    });
    navigate("/cpr-report");
  };

  if (view === "form") {
    return (
      <CPRForm
        initialMonth={reportConfig.month}
        initialYear={reportConfig.year}
        reportId={reportConfig.reportId}
        isView={reportConfig.isView}
        isEdit={reportConfig.isEdit}
        onBack={handleBackToList}
      />
    );
  }

  return <CPRReportList onStartOrCreate={handleStartOrCreate} />;
};

export default CPRReportIndex;
