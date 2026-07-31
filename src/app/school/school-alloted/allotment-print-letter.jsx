import React from "react";
import Logo3 from "../../../assets/receipt/ekal.png";
import Logo1 from "../../../assets/receipt/fts.png";
import Logo2 from "../../../assets/receipt/top.png";
import moment from "moment";

// ----- Salutation helper (matches PHP logic) -----
const getSalutation = (donor) => {
  if (!donor) return "Respected Sir,";
  const isIndividual = donor.indicomp_type === "Individual";
  if (isIndividual) {
    const title = donor.title || "";
    if (title === "Shri") return "Respected Sir,";
    if (title === "Smt.") return "Respected Madam,";
    return "Respected Sir,"; // fallback for other titles
  }
  return "Respected Sir/Madam,";
};

const TABLE_HEADERS = [
  "STATE",
  "ANCHAL CLUSTER",
  "CLUSTER",
  "SUB CLUSTER",
  "VILLAGE",
  "TEACHER",
  "BOYS",
  "GIRLS",
  "TOTAL",
];

const SchoolTableRows = ({ rows }) =>
  rows.map((dataSumm) => (
    <tr key={dataSumm.id}>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.school_state}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.achal}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.cluster}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.sub_cluster}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.village}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.teacher}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.boys}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.girls}
      </td>
      <td className="border border-black px-2 py-1 text-xs text-center">
        {dataSumm.total}
      </td>
    </tr>
  ));

const DonorHeader = ({ SchoolAlotReceipt, OTSReceipts }) => (
  <div className="text-sm mb-2 font-normal flex justify-between border-b pb-1 font-sans">
    <div>
      Donor ID:{" "}
      <span>
        {SchoolAlotReceipt?.donor?.indicomp_fts_id ||
          SchoolAlotReceipt?.indicomp_fts_id}
      </span>
    </div>
    <div>
      Donor Name: <span>{SchoolAlotReceipt?.donor?.indicomp_full_name}</span>
    </div>
    <div>
      No of Schools:{" "}
      <span>
        {OTSReceipts.map((otsreceipt, key) => (
          <span key={key}> {otsreceipt.receipt_no_of_ots}</span>
        ))}
      </span>
    </div>
  </div>
);

const SchoolTable = ({ rows }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full border-collapse border border-black">
      <thead>
        <tr className="bg-gray-200">
          {TABLE_HEADERS.map((header, index) => (
            <th
              key={`${header}-${index}`}
              className="border border-black px-1 py-1 text-center text-xs"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-center">
        <SchoolTableRows rows={rows} />
      </tbody>
    </table>
  </div>
);

const AllotmentPrintLetter = ({
  SchoolAlotView,
  OTSReceipts,
  SchoolAlotReceipt,
  authSign,
  imageUrl,
  chapters,
  showSignature,
  componentRef,
}) => {
  const today = moment().format("DD/MM/YYYY");
  const schools = Array.isArray(SchoolAlotView) ? SchoolAlotView : [];

  const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const totalOTSCount = Array.isArray(OTSReceipts)
    ? OTSReceipts.reduce(
        (sum, r) => sum + (parseInt(r.receipt_no_of_ots, 10) || 0),
        0,
      )
    : 0;

  // Show table on page 1 only if schools <= 2
  const showOnPage1 = totalOTSCount <= 2;
  const schoolsForPage1 = showOnPage1 ? schools : [];
  const remainingSchools = showOnPage1 ? [] : schools;
  const schoolChunks =
    remainingSchools.length > 0 ? chunkArray(remainingSchools, 15) : [];

  const authSignDesignation = Array.isArray(chapters)
    ? chapters?.[0]?.auth_sign
    : chapters?.auth_sign;

  const marginClass = showOnPage1 ? "my-2" : "my-4";
  const mbClass = showOnPage1 ? "mb-2" : "mb-5";

  return (
    <div>
      <style>{`
        .pdf-page {
          width: 210mm;
          height: 297mm;
          padding: 11mm 15mm;
          box-sizing: border-box;
          background-color: white;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
        }
        @media print {
          .print-container {
            width: 210mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          .pdf-page {
            box-shadow: none !important;
            margin-bottom: 0 !important;
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      <div ref={componentRef} className="print-container">
        {/* PAGE 1: Letter */}
        <div className="pdf-page bg-white shadow-lg mb-8">
          {/* Header logos */}
          {showSignature === "Yes" ? (
            <div className="flex justify-between items-center mb-4">
              <div className="invoice-logo">
                <img src={Logo1} alt="session-logo" width="80" height="80" />
              </div>
              <div className="invoice-logo text-right">
                <img src={Logo3} alt="session-logo" width="80" height="80" />
              </div>
            </div>
          ) : (
            <div className="h-20"></div>
          )}

          {/* Letter Body */}
          <div className="flex-grow">
            <label className={`flex ${marginClass} text-base`}>
              Date: {today}
            </label>
            <label className={`flex ${marginClass} text-base`}>To,</label>

            {Object.keys(SchoolAlotReceipt).length !== 0 && (
              <div className="text-base">
                {SchoolAlotReceipt?.donor?.indicomp_type === "Individual" ? (
                  <p>
                    {SchoolAlotReceipt?.donor?.title}{" "}
                    {SchoolAlotReceipt?.donor?.indicomp_full_name}
                  </p>
                ) : (
                  <p>{`M/s ${SchoolAlotReceipt?.donor?.indicomp_full_name}`}</p>
                )}
                {/* Office address if present */}
                {SchoolAlotReceipt?.donor?.indicomp_off_branch_address && (
                  <div className="text-base">
                    <p>
                      {SchoolAlotReceipt?.donor?.indicomp_off_branch_address}
                    </p>
                    <p>{SchoolAlotReceipt?.donor?.indicomp_off_branch_area}</p>
                    <p>
                      {SchoolAlotReceipt?.donor?.indicomp_off_branch_ladmark}
                    </p>
                    <p>
                      {SchoolAlotReceipt?.donor?.indicomp_off_branch_city} -{" "}
                      {SchoolAlotReceipt?.donor?.indicomp_off_branch_pin_code},
                      {SchoolAlotReceipt?.donor?.indicomp_off_branch_state}
                    </p>
                  </div>
                )}
                {/* Registered address if present */}
                {SchoolAlotReceipt?.donor?.indicomp_res_reg_address && (
                  <div className="text-base">
                    <p>{SchoolAlotReceipt?.donor?.indicomp_res_reg_address}</p>
                    <p>{SchoolAlotReceipt?.donor?.indicomp_res_reg_area}</p>
                    <p>{SchoolAlotReceipt?.donor?.indicomp_res_reg_ladmark}</p>
                    <p>
                      {SchoolAlotReceipt?.donor?.indicomp_res_reg_city} -{" "}
                      {SchoolAlotReceipt?.donor?.indicomp_res_reg_pin_code},
                      {SchoolAlotReceipt?.donor?.indicomp_res_reg_state}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* --- SALUTATION (same as preview) --- */}
            <label className={`flex ${marginClass} text-base`}>
              {getSalutation(SchoolAlotReceipt?.donor)}
            </label>

            <div className="text-base">
              <div className={`${mbClass} text-justify`}>
                <label>
                  <span className="font-bold">
                    Giving is not just about making donation, it's about making
                    a difference
                  </span>
                  , we are able to bring about this difference only because of
                  the support of our kind donors. Your support to FTS gives
                  wings to the dreams of the little children studying in Ekal
                  Vidyalaya. We express our sincere thanks and gratitude to you
                  for adopting{" "}
                  <span className="font-bold">"One Teacher School" (OTS)</span>{" "}
                  and thus helping us in providing light of education to the
                  weaker sections of the society.
                </label>
              </div>
              <div className={`${marginClass} text-justify`}>
                <label>
                  Please find enclosed herewith details of the Ekal Vidyalaya
                  running with your assistance. You may also view the details
                  through below links. <br />
                  website:{" "}
                  <span className="font-bold">
                    www.ftsindia.com/donor-login.
                  </span>
                  <br />
                  Please enter your{" "}
                  <span className="font-bold">
                    DONOR ID : {SchoolAlotReceipt?.donor?.indicomp_fts_id || ""}
                  </span>{" "}
                  <span className="font-bold">
                    and Password {SchoolAlotReceipt?.donor?.cpassword || ""}
                  </span>
                </label>
              </div>
              <label className="flex mt-2">
                Please find enclosed herewith the list of your adopted schools,
                provided below
              </label>
              <label className={`flex ${marginClass}`}>
                We hope to get your continued patronage for serving the society.
              </label>
            </div>

            {/* Signature block */}
            <div className="relative text-base">
              <label className="flex my-2">Thanking you once again!!</label>
              <label className="flex my-2">With Regards,</label>
              <div className="relative text-base h-24">
                {authSign != null &&
                  showSignature === "Yes" &&
                  authSign?.indicomp_image_sign && (
                    <img
                      src={`${imageUrl}${authSign?.indicomp_image_sign}`}
                      alt="Authorized Signature"
                      className="h-24 absolute -top-20 -left-2 z-10"
                    />
                  )}
                <label className="flex flex-col mt-14 z-0">
                  {authSign?.indicomp_full_name}
                  <br />
                  {authSignDesignation}
                </label>
              </div>
            </div>

            {/* Table on Page 1 — only when schools <= 2 */}
            {showOnPage1 && schoolsForPage1.length > 0 && (
              <div className="-mt-8">
                <DonorHeader
                  SchoolAlotReceipt={SchoolAlotReceipt}
                  OTSReceipts={OTSReceipts}
                />
                <div className="mt-2">
                  <SchoolTable rows={schoolsForPage1} />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {showSignature === "Yes" ? (
            <div>
              <div className="invoice-logo">
                <div className="flex justify-center">
                  <img
                    src={Logo2}
                    alt="session-logo"
                    width="300"
                    height="300"
                    className="mb-2"
                  />
                </div>
              </div>
              <div className="text-center text-sm">
                <label>
                  <small>
                    {chapters.chapter_name}
                    {" : - "} {chapters.chapter_address},{" "}
                    {chapters.chapter_city}, {chapters.chapter_state} {"  "}
                    {chapters.chapter_pin}
                    <br />
                    {"Ph.no - "} {chapters.chapter_phone}, {"Email : - "}{" "}
                    {chapters.chapter_email}
                  </small>
                </label>
              </div>
            </div>
          ) : (
            <div className="h-32"></div>
          )}
        </div>

        {/* PAGES 2+: School list pages (only when schools > 2) */}
        {schoolChunks.map((chunk, chunkIndex) => (
          <div
            key={chunkIndex}
            className="pdf-page bg-white shadow-lg mb-8 page-break"
          >
            <div className="flex-grow">
              <DonorHeader
                SchoolAlotReceipt={SchoolAlotReceipt}
                OTSReceipts={OTSReceipts}
              />
              <div className="mt-2">
                <SchoolTable rows={chunk} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllotmentPrintLetter;
