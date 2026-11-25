import React, { forwardRef } from "react";

// Helper for Indian Currency Formatting with "Rs." prefix matching the required CPR format
const formatRs = (val, defaultValue = "") => {
  if (val === undefined || val === null || val === "" || isNaN(val)) {
    return defaultValue;
  }
  const num = Number(val);
  return "Rs. " + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};


// Helper for Indian Date formatting DD/MM/YYYY matching the attached CPR format
const formatDateDDMMYYYY = (dateVal) => {
  if (!dateVal) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }
  try {
    if (typeof dateVal === "string") {
      const parts = dateVal.trim().split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
        }
        if (parts[2].length === 4) {
          // DD/MM/YYYY or DD-MM-YYYY
          return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
        }
      }
    }
    const dObj = new Date(dateVal);
    if (!isNaN(dObj.getTime())) {
      const d = String(dObj.getDate()).padStart(2, "0");
      const m = String(dObj.getMonth() + 1).padStart(2, "0");
      const y = dObj.getFullYear();
      return `${d}/${m}/${y}`;
    }
    return String(dateVal);
  } catch {
    return String(dateVal);
  }
};

// Helper for Generated timestamp YYYY-MM-DD HH:mm:ss
const getGeneratedTimestamp = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
};

const CPRPrintReport = forwardRef(
  (
    {
      chapterName = "Kolkata (CH29)",
      monthIndex = "08",
      monthName = "August",
      financialYear = "2026-27",
      cppName = "Suresh Kumar Dhanuka",
      submissionDate = "",
      subChapters = [],
      memberships = { chapter: {}, yuva: {}, mahila: {} },
      sectionATotals = {},
      noMeetingHeld = false,
      meetings = [],
      otsPRP = "0",
      otsCountDuringMonth = "0",
      otsCountTillDate = "0",
      otsRegularDuring = 0,
      otsRegularTill = 0,
      otsExtraDuring = 0,
      otsExtraTill = 0,
      otsTotalDuring = 0,
      otsTotalTill = 0,
      otsAmountDuringMonth = 0,
      otsAmountTillDate = 0,
      donations = { general: {}, csr: {}, other: {}, nonCsr: {} },
      donationTotals = {},
      csrSchoolsCount = "0",
      collectionBoxes = {},
      investments = {},
      totalInvestment = "",
      cashInHand = "",
      bankBalances = [],
      totalBankBalance = "",
      totalCashAndBank = "",
      vanyatras = [],
      vanyatrasCountThisMonth = 0,
      vanyatrasCountTillDate = 0,
      events = [],
      anchals = [],
      samagriReached = "Yes",
      samagriRemarks = "",
      donorBoard = { nonCsr: {}, csr: {} },
      schoolProgressSent = "No",
      progressRemarks = "",
      selectedMonitoringAnchal = "",
      monitoringAnchalsList = [],
      reportId = "",
      csrStatus = "For signature by the President and Secretary",
    },
    ref
  ) => {
    // Current year calculation
    const matchFY = (financialYear || "2026-27").match(/^(\d{4})/);
    const startYear = matchFY ? matchFY[1] : "2026";
    const reportMonthYear = `${monthName || "August"} ${startYear}`;
    const displaySubDate = formatDateDDMMYYYY(submissionDate);
    const generatedTimestamp = getGeneratedTimestamp();

    // Section A Membership Calculations
    const getRowStats = (row = {}) => {
      const asOnMarch = Number(row.asOnMarch) || 0;
      const added = Number(row.added) || 0;
      const tillDate = Number(row.tillDate !== undefined && row.tillDate !== "" ? row.tillDate : row.added) || 0;
      const cumulative = asOnMarch + tillDate;
      const amount = tillDate * 1000;
      return { asOnMarch, added, tillDate, cumulative, amount };
    };

    const chapterStats = getRowStats(memberships.chapter);
    const yuvaStats = getRowStats(memberships.yuva);
    const mahilaStats = getRowStats(memberships.mahila);
    const renewalStats = getRowStats(memberships.renewal);
    const newMemberStats = getRowStats(memberships.newMember);

    const totalStats = {
      asOnMarch: chapterStats.asOnMarch + yuvaStats.asOnMarch + mahilaStats.asOnMarch,
      added: chapterStats.added + yuvaStats.added + mahilaStats.added + renewalStats.added + newMemberStats.added,
      tillDate: chapterStats.tillDate + yuvaStats.tillDate + mahilaStats.tillDate + renewalStats.tillDate + newMemberStats.tillDate,
      cumulative: chapterStats.cumulative + yuvaStats.cumulative + mahilaStats.cumulative + renewalStats.cumulative + newMemberStats.cumulative,
      amount: chapterStats.amount + yuvaStats.amount + mahilaStats.amount + renewalStats.amount + newMemberStats.amount,
    };

    // OTS calculations
    const otsDuringCountNum = Number(otsCountDuringMonth) || 0;
    const otsTillCountNum = Number(otsCountTillDate || otsCountDuringMonth) || 0;
    const otsRegularDuringAmt = Number(otsRegularDuring) || otsDuringCountNum * 30000;
    const otsRegularTillAmt = Number(otsRegularTill) || otsTillCountNum * 30000;
    const otsExtraDuringAmt = Number(otsExtraDuring) || 0;
    const otsExtraTillAmt = Number(otsExtraTill) || otsExtraDuringAmt;
    const otsTotalDuringAmt =
      Number(otsTotalDuring) || Number(otsAmountDuringMonth) || (otsRegularDuringAmt + otsExtraDuringAmt);
    const otsTotalTillAmt =
      Number(otsTotalTill) || Number(otsAmountTillDate) || (otsRegularTillAmt + otsExtraTillAmt);

    // Section D Donation Totals
    const nonCsrObj = donations.nonCsr || donations.other || {};
    const nonCsrTill = nonCsrObj?.till ?? "";
    const csrTill = donations.csr?.till ?? "";
    const totalDonationTill =
      (Number(nonCsrTill) || 0) + (Number(csrTill) || 0) || "";
    const nonCsrDuring = nonCsrObj?.during ?? "";
    const csrDuring = donations.csr?.during ?? "";
    const totalDonationDuring =
      (Number(nonCsrDuring) || 0) + (Number(csrDuring) || 0) || "";
    const nonCsrDonors = nonCsrObj?.donors ?? "";
    const csrDonors = donations.csr?.donors ?? "";
    const totalDonationDonors =
      (Number(nonCsrDonors) || 0) + (Number(csrDonors) || 0) || "";

    // Section J Totals
    const totalAcharyasPaid = anchals.reduce(
      (acc, a) => acc + (Number(a.acharyasPaid) || 0),
      0
    );
    const totalRemittanceTillLast = anchals.reduce(
      (acc, a) => acc + (Number(a.remittanceLastMonth) || 0),
      0
    );
    const totalRemittanceThisMonth = anchals.reduce(
      (acc, a) => acc + (Number(a.remittanceThisMonth) || 0),
      0
    );
    const totalPrpAcharyas = anchals.reduce(
      (acc, a) => acc + (Number(a.acharyasCount) || 0),
      0
    );
    const totalPrpAmount = anchals.reduce(
      (acc, a) => acc + (Number(a.annualTarget) || 0),
      0
    );

    // Monitoring Anchal text
    const monitoringAnchalDisplay =
      selectedMonitoringAnchal && selectedMonitoringAnchal !== "Choose"
        ? selectedMonitoringAnchal
        : monitoringAnchalsList.length > 0
        ? monitoringAnchalsList.join(", ")
        : "Ambasha";

    // Auto-formatted Report ID
    const formattedReportId =
      reportId ||
      `CH29_${financialYear || "2026-27"}_${String(monthIndex || "08").padStart(
        2,
        "0"
      )}_CHAPTER`;

    return (
      <div ref={ref} className="cpr-printable-root bg-white text-slate-900">
        <style>{`
          .pdf-page {
            width: 794px;
            min-height: 1123px;
            max-height: 1123px;
            height: 1123px;
            padding: 16px 28px;
            box-sizing: border-box;
            background-color: #ffffff;
            color: #0f172a;
            font-family: Arial, Helvetica, sans-serif;
            position: relative;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
          }
          .cpr-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-family: Arial, Helvetica, sans-serif;
            margin-top: 2px;
            margin-bottom: 3px;
          }
          .cpr-table th {
            background-color: #ffffff;
            color: #0f172a;
            font-weight: 700;
            font-size: 10px;
            line-height: 1.35;
            border: 1px solid #334155;
            padding: 6.5px 6px;
            vertical-align: middle;
            text-align: center;
            box-sizing: border-box;
          }
          .cpr-table td {
            border: 1px solid #334155;
            padding: 6px 6px;
            font-size: 10px;
            line-height: 1.35;
            color: #0f172a;
            vertical-align: middle;
            box-sizing: border-box;
          }
          .cpr-table-j th {
            font-size: 8.5px;
            line-height: 1.25;
            padding: 5px 3px;
            vertical-align: middle;
            text-align: center;
          }
          .cpr-table-j td {
            font-size: 8.5px;
            line-height: 1.25;
            padding: 5px 3px;
            vertical-align: middle;
          }
          .cpr-heading {
            font-size: 10.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
            margin-bottom: 2px;
            padding-bottom: 1px;
            line-height: 1.2;
            display: block;
          }
          .cpr-subheading {
            font-size: 9.5px;
            font-weight: 700;
            color: #c2410c;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.2;
            margin-top: 3px;
            margin-bottom: 1.5px;
            padding-bottom: 1px;
            display: block;
          }
          .table-header-box {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #334155;
            font-family: Arial, Helvetica, sans-serif;
            margin-bottom: 4px;
          }
          .table-header-box td {
            border: 1px solid #334155;
            padding: 5.5px 8px;
            vertical-align: middle;
            box-sizing: border-box;
          }
        `}</style>

        {/* ========================================================= */}
        {/* ======================== PAGE 1 ========================= */}
        {/* ========================================================= */}
        <div className="pdf-page">
          {/* Top Header Box Table */}
          <table className="table-header-box">
            <tbody>
              <tr>
                <td
                  colSpan={2}
                  style={{
                    width: "48%",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#0f172a",
                  }}
                >
                  Friends of Tribals Society
                </td>
                <td
                  colSpan={2}
                  style={{
                    width: "52%",
                    fontSize: "13.5px",
                    fontWeight: "bold",
                    textAlign: "center",
                    color: "#1e3a8a",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  CHAPTER PERFORMANCE REPORT (CPR)
                </td>
              </tr>
              <tr>
                <td style={{ width: "17%", fontSize: "9.5px", fontWeight: "bold", color: "#0f172a" }}>
                  Chapter Name
                </td>
                <td style={{ width: "31%", fontSize: "9.5px", color: "#0f172a", textAlign: "center" }}>
                  {chapterName || "Kolkata (CH29)"}
                </td>
                <td style={{ width: "21%", fontSize: "9.5px", fontWeight: "bold", color: "#0f172a" }}>
                  For the Month of
                </td>
                <td style={{ width: "31%", fontSize: "9.5px", color: "#0f172a", textAlign: "center" }}>
                  {reportMonthYear} (FY {financialYear || "2026-27"})
                </td>
              </tr>
              <tr>
                <td style={{ width: "17%", fontSize: "9.5px", fontWeight: "bold", color: "#0f172a" }}>
                  Name of CPP
                </td>
                <td style={{ width: "31%", fontSize: "9.5px", color: "#0f172a", textAlign: "center" }}>
                  {cppName || "Suresh Kumar Dhanuka"}
                </td>
                <td style={{ width: "21%", fontSize: "9.5px", fontWeight: "bold", color: "#0f172a" }}>
                  Submission Date
                </td>
                <td style={{ width: "31%", fontSize: "9.5px", color: "#0f172a", textAlign: "center" }}>
                  {displaySubDate}
                </td>
              </tr>
            </tbody>
          </table>

          {/* A | MEMBERSHIP DETAILS */}
          <div style={{ marginBottom: "6px" }}>
            <div className="cpr-heading">A | MEMBERSHIP DETAILS</div>
            <table className="cpr-table">
              <thead>
                <tr>
                  <th style={{ width: "22%", textAlign: "center" }}>
                    Particulars
                  </th>
                  <th style={{ width: "15%", textAlign: "center" }}>
                    Members as on 31<br />March {startYear}
                  </th>
                  <th style={{ width: "16%", textAlign: "center" }}>
                    Membership Added<br />During the Month
                  </th>
                  <th style={{ width: "15%", textAlign: "center" }}>
                    Membership Till Date
                  </th>
                  <th style={{ width: "16%", textAlign: "center" }}>
                    Cumulative Membership
                  </th>
                  <th style={{ width: "16%", textAlign: "center" }}>
                    Membership Amount Received<br />(Rs.) @ Rs. 1,000 per member
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Chapter</td>
                  <td style={{ textAlign: "center" }}>{chapterStats.asOnMarch}</td>
                  <td style={{ textAlign: "center" }}>{chapterStats.added}</td>
                  <td style={{ textAlign: "center" }}>{chapterStats.tillDate}</td>
                  <td style={{ textAlign: "center" }}>{chapterStats.cumulative}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(chapterStats.amount, "Rs. 0")}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>FTS Yuva</td>
                  <td style={{ textAlign: "center" }}>{yuvaStats.asOnMarch}</td>
                  <td style={{ textAlign: "center" }}>{yuvaStats.added}</td>
                  <td style={{ textAlign: "center" }}>{yuvaStats.tillDate}</td>
                  <td style={{ textAlign: "center" }}>{yuvaStats.cumulative}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(yuvaStats.amount, "Rs. 0")}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Mahila Samiti</td>
                  <td style={{ textAlign: "center" }}>{mahilaStats.asOnMarch}</td>
                  <td style={{ textAlign: "center" }}>{mahilaStats.added}</td>
                  <td style={{ textAlign: "center" }}>{mahilaStats.tillDate}</td>
                  <td style={{ textAlign: "center" }}>{mahilaStats.cumulative}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(mahilaStats.amount, "Rs. 0")}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Renewal Members</td>
                  <td style={{ textAlign: "center" }}>—</td>
                  <td style={{ textAlign: "center" }}>{renewalStats.added}</td>
                  <td style={{ textAlign: "center" }}>{renewalStats.tillDate}</td>
                  <td style={{ textAlign: "center" }}>{renewalStats.cumulative}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(renewalStats.amount, "Rs. 0")}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>New Members</td>
                  <td style={{ textAlign: "center" }}>—</td>
                  <td style={{ textAlign: "center" }}>{newMemberStats.added}</td>
                  <td style={{ textAlign: "center" }}>{newMemberStats.tillDate}</td>
                  <td style={{ textAlign: "center" }}>{newMemberStats.cumulative}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(newMemberStats.amount, "Rs. 0")}</td>
                </tr>
                <tr style={{ fontWeight: "bold" }}>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>TOTAL</td>
                  <td style={{ textAlign: "center" }}>{totalStats.asOnMarch}</td>
                  <td style={{ textAlign: "center" }}>{totalStats.added}</td>
                  <td style={{ textAlign: "center" }}>{totalStats.tillDate}</td>
                  <td style={{ textAlign: "center" }}>{totalStats.cumulative}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(totalStats.amount, "Rs. 0")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* B | EXECUTIVE COMMITTEE MEETING DETAILS */}
          <div style={{ marginBottom: "6px" }}>
            <div className="cpr-heading">B | EXECUTIVE COMMITTEE MEETING DETAILS</div>
            {noMeetingHeld || meetings.length === 0 ? (
              <div style={{ fontSize: "9.5px", color: "#0f172a", padding: "2px 0" }}>
                No Executive Committee meeting was held this month. Reason: none
              </div>
            ) : (
              <table className="cpr-table">
                <thead>
                  <tr>
                    <th style={{ width: "15%", textAlign: "center" }}>Date</th>
                    <th style={{ width: "25%", textAlign: "center" }}>Meeting Type</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Members</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Invited</th>
                    <th style={{ width: "10%", textAlign: "center" }}>Attended</th>
                    <th style={{ textAlign: "center" }}>Agenda</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "left" }}>{m.date || "—"}</td>
                      <td style={{ textAlign: "left" }}>{m.type || "Executive Committee Meeting"}</td>
                      <td style={{ textAlign: "center" }}>{m.membersCount || "—"}</td>
                      <td style={{ textAlign: "center" }}>{m.invited || "—"}</td>
                      <td style={{ textAlign: "center" }}>{m.attended || "—"}</td>
                      <td style={{ textAlign: "left" }}>{m.agenda || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* C | OTS DETAILS & COLLECTION */}
          <div style={{ marginBottom: "5px" }}>
            <div className="cpr-heading">C | OTS DETAILS & COLLECTION</div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "none", margin: "2px 0 2px 0" }}>
              <tbody>
                <tr>
                  <td style={{ border: "none", padding: "0", verticalAlign: "middle" }}>
                    <span className="cpr-subheading" style={{ margin: "0" }}>OTS DETAILS</span>
                  </td>
                  <td style={{ border: "none", padding: "0", textAlign: "right", verticalAlign: "middle" }}>
                    <table style={{ display: "inline-table", borderCollapse: "collapse", border: "1px solid #334155", width: "120px", textAlign: "center" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#ffffff" }}>
                          <th style={{ border: "1px solid #334155", padding: "4.5px 6px", fontSize: "9.5px", fontWeight: "bold", textAlign: "center" }}>
                            OTS PRP
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: "1px solid #334155", padding: "4.5px 6px", fontSize: "9.5px", textAlign: "center" }}>
                            {otsPRP || "0"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="cpr-subheading" style={{ marginTop: "4px", marginBottom: "2px" }}>OTS COLLECTION</div>
            <table className="cpr-table">
              <thead>
                <tr>
                  <th style={{ width: "46%", textAlign: "center" }}>
                    Particulars
                  </th>
                  <th style={{ width: "27%", textAlign: "center" }}>
                    During the Month
                  </th>
                  <th style={{ width: "27%", textAlign: "center" }}>
                    Till Date (up to {monthName || "August"} {startYear})
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left" }}>Total Number of OTS</td>
                  <td style={{ textAlign: "center" }}>{otsDuringCountNum}</td>
                  <td style={{ textAlign: "center" }}>{otsTillCountNum}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left" }}>Regular OTS Collection (Rs.) @ Rs. 30,000 per OTS</td>
                  <td style={{ textAlign: "center" }}>{formatRs(otsRegularDuringAmt, "Rs. 0")}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(otsRegularTillAmt, "Rs. 0")}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left" }}>Extra OTS Collection (Additional Amount) (Rs.)</td>
                  <td style={{ textAlign: "center" }}>{formatRs(otsExtraDuringAmt, "Rs. 0")}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(otsExtraTillAmt, "Rs. 0")}</td>
                </tr>
                <tr style={{ fontWeight: "bold" }}>
                  <td style={{ textAlign: "left" }}>Total OTS Amount Collected (Rs.)</td>
                  <td style={{ textAlign: "center" }}>{formatRs(otsTotalDuringAmt, "Rs. 0")}</td>
                  <td style={{ textAlign: "center" }}>{formatRs(otsTotalTillAmt, "Rs. 0")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* D | DONATION & CSR DETAILS */}
          <div style={{ marginBottom: "6px" }}>
            <div className="cpr-heading">D | DONATION & CSR DETAILS</div>
            <table className="cpr-table">
              <thead>
                <tr>
                  <th style={{ width: "20%", textAlign: "center" }}>Particulars</th>
                  <th style={{ width: "20%", textAlign: "center" }}>Number of Donors</th>
                  <th style={{ width: "30%", textAlign: "center" }}>Fund Received – This Month (Rs.)</th>
                  <th style={{ width: "30%", textAlign: "center" }}>Fund Received – Till Date (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left" }}>Non-CSR</td>
                  <td style={{ textAlign: "center" }}>{nonCsrDonors || ""}</td>
                  <td style={{ textAlign: "center" }}>
                    {nonCsrDuring ? formatRs(nonCsrDuring) : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {nonCsrTill ? formatRs(nonCsrTill) : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left" }}>CSR</td>
                  <td style={{ textAlign: "center" }}>{csrDonors || ""}</td>
                  <td style={{ textAlign: "center" }}>
                    {csrDuring ? formatRs(csrDuring) : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {csrTill ? formatRs(csrTill) : ""}
                  </td>
                </tr>
                <tr style={{ fontWeight: "bold" }}>
                  <td style={{ textAlign: "left" }}>Total</td>
                  <td style={{ textAlign: "center" }}>{totalDonationDonors || ""}</td>
                  <td style={{ textAlign: "center" }}>
                    {totalDonationDuring ? formatRs(totalDonationDuring) : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {totalDonationTill ? formatRs(totalDonationTill) : ""}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Number of CSR Schools box directly underneath */}
            <div style={{ textAlign: "right", marginTop: "3px", marginBottom: "3px" }}>
              <table style={{ display: "inline-table", borderCollapse: "collapse", border: "1px solid #334155", width: "140px", textAlign: "center" }}>
                <thead>
                  <tr style={{ backgroundColor: "#ffffff" }}>
                    <th style={{ border: "1px solid #334155", padding: "4.5px 6px", fontSize: "9.5px", fontWeight: "bold", textAlign: "center" }}>
                      Number of CSR Schools
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #334155", padding: "4.5px 6px", fontSize: "9.5px", fontWeight: "600", textAlign: "center" }}>
                      {csrSchoolsCount || "0"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OTHER DONATION DETAIL */}
            <div className="cpr-subheading" style={{ marginTop: "4px", marginBottom: "2px" }}>OTHER DONATION DETAIL</div>
            <table className="cpr-table">
              <thead>
                <tr>
                  <th style={{ width: "46%", textAlign: "center" }}>Particulars</th>
                  <th style={{ width: "27%", textAlign: "center" }}>This Month (Rs.)</th>
                  <th style={{ width: "27%", textAlign: "center" }}>Till Date (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>General Donation</td>
                  <td style={{ textAlign: "center" }}>
                    {donations.general?.during ? formatRs(donations.general.during) : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {donations.general?.till ? formatRs(donations.general.till) : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Each One Teach One (EOTO)</td>
                  <td style={{ textAlign: "center" }}>
                    {donations.eoto?.during ? formatRs(donations.eoto.during) : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {donations.eoto?.till ? formatRs(donations.eoto.till) : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* E | COLLECTION BOXES */}
          <div style={{ marginBottom: "6px" }}>
            <div className="cpr-heading">E | COLLECTION BOXES</div>
            <table className="cpr-table">
              <thead>
                <tr>
                  <th style={{ width: "46%", textAlign: "center" }}>Particulars</th>
                  <th style={{ width: "27%", textAlign: "center" }}>This Month</th>
                  <th style={{ width: "27%", textAlign: "center" }}>Till Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Boxes Placed</td>
                  <td style={{ textAlign: "center" }}>{collectionBoxes.boxesThisMonth || ""}</td>
                  <td style={{ textAlign: "center" }}>{collectionBoxes.boxesTillDate || ""}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Amount Collected (Rs.)</td>
                  <td style={{ textAlign: "center" }}>
                    {collectionBoxes.amountThisMonth ? formatRs(collectionBoxes.amountThisMonth) : ""}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {collectionBoxes.amountTillDate ? formatRs(collectionBoxes.amountTillDate) : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* F | INVESTMENT (AS ON DATE) */}
          <div style={{ marginBottom: "6px" }}>
            <div className="cpr-heading">F | INVESTMENT (AS ON DATE)</div>
            <table className="cpr-table">
              <thead>
                <tr>
                  <th style={{ width: "50%", textAlign: "center" }}>Particulars</th>
                  <th style={{ width: "50%", textAlign: "center" }}>Amount Invested (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Fixed Deposit (FD)</td>
                  <td style={{ textAlign: "center" }}>
                    {investments.fd ? formatRs(investments.fd) : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Mutual Fund</td>
                  <td style={{ textAlign: "center" }}>
                    {investments.mutualFund ? formatRs(investments.mutualFund) : ""}
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Others (Please Specify)</td>
                  <td style={{ textAlign: "center" }}>
                    {investments.others ? formatRs(investments.others) : ""}
                  </td>
                </tr>
                <tr style={{ fontWeight: "bold" }}>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>TOTAL</td>
                  <td style={{ textAlign: "center" }}>
                    {totalInvestment ? formatRs(totalInvestment) : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ======================== PAGE 2 ========================= */}
        {/* ========================================================= */}
        <div className="pdf-page">
          {/* G | CASH & BANK BALANCE */}
          <div style={{ marginBottom: "8px" }}>
            <div className="cpr-heading">G | CASH & BANK BALANCE</div>
            <div style={{ fontSize: "9.5px", color: "#475569", marginBottom: "3px", fontWeight: "500" }}>
              As on {monthName || "August"} {startYear}
            </div>
            <table className="cpr-table">
              <thead>
                <tr>
                  <th style={{ width: "65%", textAlign: "center" }}>Particulars</th>
                  <th style={{ width: "35%", textAlign: "center" }}>Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Cash in Hand</td>
                  <td style={{ textAlign: "center" }}>{cashInHand ? formatRs(cashInHand) : "Rs. 0"}</td>
                </tr>
                {bankBalances.length === 0 ? (
                  <>
                    <tr>
                      <td style={{ textAlign: "left", paddingLeft: "8px" }}>Bank: Bandhan Bank</td>
                      <td style={{ textAlign: "center" }}>Rs. 0</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left", paddingLeft: "8px" }}>Bank: ICICI Bank</td>
                      <td style={{ textAlign: "center" }}>Rs. 0</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left", paddingLeft: "8px" }}>Bank: Kotak Mahindra Bank</td>
                      <td style={{ textAlign: "center" }}>Rs. 0</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left", paddingLeft: "8px" }}>Bank: Standard Chartered Bank</td>
                      <td style={{ textAlign: "center" }}>Rs. 0</td>
                    </tr>
                  </>
                ) : (
                  bankBalances.map((b, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "left", paddingLeft: "8px" }}>Bank: {b.bankName || `Account #${idx + 1}`}</td>
                      <td style={{ textAlign: "center" }}>{formatRs(b.balance, "Rs. 0")}</td>
                    </tr>
                  ))
                )}
                <tr style={{ fontWeight: "bold" }}>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>Total Bank Balance</td>
                  <td style={{ textAlign: "center" }}>{formatRs(totalBankBalance, "Rs. 0")}</td>
                </tr>
                <tr style={{ fontWeight: "bold" }}>
                  <td style={{ textAlign: "left", paddingLeft: "8px" }}>TOTAL CASH &amp; BANK BALANCE</td>
                  <td style={{ textAlign: "center" }}>{formatRs(totalCashAndBank, "Rs. 0")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* H | VAN YATRA */}
          <div style={{ marginBottom: "8px" }}>
            <div className="cpr-heading">H | VAN YATRA</div>
            <table className="cpr-table" style={{ marginBottom: "3px" }}>
              <thead>
                <tr>
                  <th style={{ width: "50%", textAlign: "center" }}>
                    Number of Vanyatra – This Month
                  </th>
                  <th style={{ width: "50%", textAlign: "center" }}>
                    Number of Vanyatra – Till Date (up to {monthName || "August"} {startYear})
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: "center" }}>{vanyatrasCountThisMonth}</td>
                  <td style={{ textAlign: "center" }}>{vanyatrasCountTillDate}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: "9.5px", color: "#0f172a", padding: "2px 0" }}>
              {vanyatras.length === 0
                ? "No Vanyatra this month."
                : `${vanyatras.length} Vanyatra recorded.`}
            </div>
          </div>

          {/* I | EVENTS DURING THE MONTH */}
          <div style={{ marginBottom: "8px" }}>
            <div className="cpr-heading">I | EVENTS DURING THE MONTH</div>
            {events.length === 0 ? (
              <div style={{ fontSize: "9.5px", color: "#0f172a", padding: "2px 0" }}>
                No events reported.
              </div>
            ) : (
              <div style={{ fontSize: "9px", color: "#0f172a", marginTop: "3px" }}>
                {events.map((ev, eIdx) => (
                  <div
                    key={eIdx}
                    style={{
                      padding: "2px 0",
                      borderBottom: eIdx < events.length - 1 ? "1px dashed #cbd5e1" : "none",
                    }}
                  >
                    <strong>Event {eIdx + 1}:</strong>{" "}
                    {ev.name ? `${ev.name} — ` : ""}
                    {ev.date || "Date not set"}
                    {ev.time ? ` at ${ev.time}` : ""} |{" "}
                    {ev.eventFor || ev.committee || "Youth"} |{" "}
                    {ev.type || "Public Event"}
                    {ev.description ? (
                      <div style={{ color: "#475569", fontSize: "8px", marginLeft: "8px" }}>
                        {ev.description}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* J | ANNEXURE 1 – DISBURSEMENT TO ANCHAL */}
          <div style={{ marginBottom: "14px" }}>
            <div className="cpr-heading" style={{ marginBottom: "8px" }}>J | ANNEXURE 1 – DISBURSEMENT TO ANCHAL</div>
            <table className="cpr-table cpr-table-j" style={{ marginTop: "6px" }}>
              <thead>
                <tr>
                  <th style={{ width: "13%", textAlign: "center" }}>Funding<br />Anchal<br />Name</th>
                  <th style={{ width: "7.5%", textAlign: "center" }}>No. of<br />Acharyas<br />Paid this<br />Month</th>
                  <th style={{ width: "6.5%", textAlign: "center" }}>Up to<br />Which<br />Month<br />Paid</th>
                  <th style={{ width: "7.5%", textAlign: "center" }}>Report<br />When<br />Received</th>
                  <th style={{ width: "8%", textAlign: "center" }}>Remittance<br />Date</th>
                  <th style={{ width: "12%", textAlign: "center" }}>Total<br />Remittance<br />till Last<br />Date</th>
                  <th style={{ width: "10.5%", textAlign: "center" }}>Remittance<br />This Month</th>
                  <th style={{ width: "13%", textAlign: "center" }}>PRP: Anchal<br />Name</th>
                  <th style={{ width: "7%", textAlign: "center" }}>PRP: No.<br />of<br />Acharyas</th>
                  <th style={{ width: "15%", textAlign: "center" }}>PRP:<br />Amount<br />(Rs.)</th>
                </tr>
              </thead>
              <tbody>
                {anchals.map((a, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: "left", fontWeight: "600", textTransform: "uppercase" }}>
                      {a.fundingAnchal || a.name || `Anchal ${idx + 1}`}
                    </td>
                    <td style={{ textAlign: "center" }}>{a.acharyasPaid || ""}</td>
                    <td style={{ textAlign: "center" }}>{a.upToMonthPaid || ""}</td>
                    <td style={{ textAlign: "center", fontSize: "8px" }}>{a.reportWhenReceived || ""}</td>
                    <td style={{ textAlign: "center", fontSize: "8px" }}>{a.remittanceDate || ""}</td>
                    <td style={{ textAlign: "center" }}>
                      {a.remittanceLastMonth ? formatRs(a.remittanceLastMonth) : ""}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {a.remittanceThisMonth ? formatRs(a.remittanceThisMonth) : ""}
                    </td>
                    <td style={{ textAlign: "left", fontWeight: "500", textTransform: "uppercase" }}>
                      {a.name || a.fundingAnchal || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>{a.acharyasCount ? Number(a.acharyasCount).toLocaleString("en-IN") : ""}</td>
                    <td style={{ textAlign: "center" }}>
                      {a.annualTarget ? formatRs(a.annualTarget) : ""}
                    </td>
                  </tr>
                ))}
                {/* TOTAL ROW */}
                <tr style={{ fontWeight: "bold" }}>
                  <td style={{ textAlign: "left" }}>TOTAL</td>
                  <td style={{ textAlign: "center" }}>{totalAcharyasPaid || 0}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td style={{ textAlign: "center" }}>
                    {formatRs(totalRemittanceTillLast, "Rs. 0")}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {formatRs(totalRemittanceThisMonth, "Rs. 0")}
                  </td>
                  <td></td>
                  <td style={{ textAlign: "center" }}>{totalPrpAcharyas ? totalPrpAcharyas.toLocaleString("en-IN") : "0"}</td>
                  <td style={{ textAlign: "center" }}>
                    {formatRs(totalPrpAmount, "Rs. 0")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* K | ANNEXURE 2 – MONTHLY SUMMARY / CHECK POINTS */}
          <div style={{ marginTop: "12px" }}>
            <div className="cpr-heading" style={{ marginBottom: "6px" }}>K | ANNEXURE 2 – MONTHLY SUMMARY / CHECK POINTS</div>
            <table className="cpr-table" style={{ marginTop: "4px" }}>
              <thead>
                <tr>
                  <th style={{ width: "45%", textAlign: "center" }}>Particulars</th>
                  <th style={{ width: "15%", textAlign: "center" }}>Yes / No</th>
                  <th style={{ width: "40%", textAlign: "center" }}>Reason / Remarks (if No)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ width: "45%", textAlign: "left", fontWeight: "500", paddingLeft: "8px" }}>
                    Samagri reached to all schools
                  </td>
                  <td style={{ width: "15%", textAlign: "center", fontWeight: "600" }}>
                    {samagriReached || "Yes"}
                  </td>
                  <td style={{ width: "40%", textAlign: "left", paddingLeft: "8px" }}>{samagriRemarks || ""}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Donor Board Details */}
          <div style={{ marginBottom: "12px", marginTop: "10px" }}>
            <div style={{ fontSize: "10.5px", fontWeight: "bold", color: "#0f172a", marginBottom: "4px" }}>
              Donor Board Details
            </div>
              <table className="cpr-table">
                <thead>
                  <tr>
                    <th style={{ width: "40%", textAlign: "center" }}>Particulars</th>
                    <th style={{ width: "15%", textAlign: "center" }}>Total Donor Boards</th>
                    <th style={{ width: "15%", textAlign: "center" }}>Already Sent</th>
                    <th style={{ width: "12%", textAlign: "center" }}>Pending</th>
                    <th style={{ width: "18%", textAlign: "center" }}>Reason / Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: "left" }}>Non-CSR Donor Board reached to all schools</td>
                    <td style={{ textAlign: "center" }}>{donorBoard.nonCsr?.total || ""}</td>
                    <td style={{ textAlign: "center" }}>{donorBoard.nonCsr?.sent || ""}</td>
                    <td style={{ textAlign: "center" }}>
                      {donorBoard.nonCsr?.total && donorBoard.nonCsr?.sent
                        ? Number(donorBoard.nonCsr.total) - Number(donorBoard.nonCsr.sent)
                        : ""}
                    </td>
                    <td style={{ textAlign: "left" }}>{donorBoard.nonCsr?.remarks || ""}</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "left" }}>CSR Donor Board reached to all schools</td>
                    <td style={{ textAlign: "center" }}>{donorBoard.csr?.total || ""}</td>
                    <td style={{ textAlign: "center" }}>{donorBoard.csr?.sent || ""}</td>
                    <td style={{ textAlign: "center" }}>
                      {donorBoard.csr?.total && donorBoard.csr?.sent
                        ? Number(donorBoard.csr.total) - Number(donorBoard.csr.sent)
                        : ""}
                    </td>
                    <td style={{ textAlign: "left" }}>{donorBoard.csr?.remarks || ""}</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: "left" }}>School Progress Report sent to CSR Donors</td>
                    <td style={{ textAlign: "center" }}></td>
                    <td style={{ textAlign: "center" }}>
                      {schoolProgressSent === "Yes" ? "Yes" : schoolProgressSent || ""}
                    </td>
                    <td style={{ textAlign: "center" }}></td>
                    <td style={{ textAlign: "left" }}>{progressRemarks || ""}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Sub Chapters and Monitoring Anchal text */}
            <div style={{ fontSize: "9.5px", lineHeight: "1.5", margin: "14px 0", color: "#0f172a" }}>
              <div style={{ marginBottom: "6px" }}>
                <p style={{ fontWeight: "bold", margin: "0 0 2px 0" }}>Details of Sub Chapter</p>
                <p style={{ margin: "0 0 6px 0" }}>{subChapters.length > 0 ? subChapters.join(", ") : "None."}</p>
              </div>
              <div>
                <span style={{ fontWeight: "bold" }}>Monitoring Anchal Name: </span>
                <span>{monitoringAnchalDisplay}</span>
              </div>
            </div>

            {/* Certification statement */}
            <div style={{ fontSize: "9.5px", color: "#0f172a", margin: "20px 0 10px 0" }}>
              We certify that the information given in this report is correct.
            </div>

            {/* Horizontal Line and Signatures Block */}
            <div style={{ marginTop: "12px", marginBottom: "16px" }}>
              <div style={{ borderTop: "1.5px solid #0f172a", margin: "0 0 10px 0" }} />
              <table style={{ width: "100%", borderCollapse: "collapse", border: "none" }}>
                <tbody>
                  <tr>
                    {/* Column 1: CPP */}
                    <td style={{ width: "33.33%", border: "none", padding: "0", verticalAlign: "top", fontSize: "9.5px", color: "#0f172a" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>Name of CPP</div>
                      <div style={{ marginBottom: "2px", color: "#1e293b" }}>{cppName || "Suresh Kumar Dhanuka"}</div>
                      <div style={{ color: "#334155" }}>Signature &amp; Date</div>
                    </td>

                    {/* Column 2: Secretary */}
                    <td style={{ width: "33.33%", border: "none", padding: "0", verticalAlign: "top", fontSize: "9.5px", color: "#0f172a" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>Secretary</div>
                      <div style={{ marginBottom: "2px", color: "#1e293b" }}>Name:</div>
                      <div style={{ color: "#334155" }}>Signature &amp; Date</div>
                    </td>

                    {/* Column 3: President */}
                    <td style={{ width: "33.33%", border: "none", padding: "0", verticalAlign: "top", fontSize: "9.5px", color: "#0f172a" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "2px" }}>President</div>
                      <div style={{ marginBottom: "2px", color: "#1e293b" }}>Name:</div>
                      <div style={{ color: "#334155" }}>Signature &amp; Date</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          {/* Bottom Footer Line on Page 2 */}
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "8px", fontSize: "9px", color: "#64748b" }}>
            Report ID: {formattedReportId} | Status: {csrStatus || "For signature by the President and Secretary"} | Generated: {generatedTimestamp}
          </div>
        </div>
      </div>
    );
  }
);

CPRPrintReport.displayName = "CPRPrintReport";

export default CPRPrintReport;
