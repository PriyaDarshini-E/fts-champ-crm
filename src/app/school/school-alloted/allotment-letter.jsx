import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetMutation } from "@/hooks/use-get-mutation";
import { useApiMutation } from "@/hooks/use-mutation";
import { decryptId } from "@/utils/encyrption/encyrption";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Assets
import Logo1 from "../../../assets/receipt/fts_log.png";
import Logo2 from "../../../assets/receipt/top.png";
import Logo3 from "../../../assets/receipt/ekal.png";
import {
  Download,
  Loader,
  Loader2,
  Mail,
  MailPlus,
  PenTool,
  Printer,
} from "lucide-react";
import moment from "moment";
import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import {
  SCHOOL_ALLOT_LETTER,
  SEND_LETTER_EMAIL,
  UPDATE_EMAIL,
} from "../../../api";
import mailSentGif from "../../../assets/mail-sent.gif";
import AllotmentPrintLetter from "./allotment-print-letter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SchoolAllotLetter = () => {
  const componentRef = useRef();
  const { id } = useParams();
  const donorId = decryptId(id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSignature, setShowSignature] = useState("Yes");

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [donoremail, setDonorEmail] = useState("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const today = moment().format("DD/MM/YYYY");
  const { trigger: Mailtrigger, loading: mailloading } = useApiMutation();
  const { trigger: UpdateMail, loading: updatemail } = useApiMutation();

  const {
    data: schoolLetter,
    isLoading,
    isError,
    refetch,
  } = useGetMutation(
    `schoolletter-${donorId}`,
    `${SCHOOL_ALLOT_LETTER}/${donorId}`,
  );

  const handlePrintPdf = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: "Allotment_Letter",
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 0;
      }
      @media print {
        body {
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-container {
          padding: 0 !important;
          margin: 0 !important;
          width: 210mm !important;
        }
        .pdf-page {
          box-shadow: none !important;
          margin-bottom: 0 !important;
          page-break-after: always;
          break-after: page;
        }
        .print-hide {
          display: none;
        }
      }
    `,
    onBeforeGetContent: () => setIsProcessing(true),
    onAfterPrint: () => setIsProcessing(false),
    onPrintError: () => setIsProcessing(false),
  });

  const handleSavePDF = async () => {
    setIsProcessingPdf(true);

    try {
      const input = componentRef.current;
      const pages = input.querySelectorAll(".pdf-page");
      const pdf = new jsPDF("p", "mm", "a4");

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (i > 0) {
          pdf.addPage();
        }

        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        pdf.addImage(imgData, "PNG", 0, 0, 210, 297, "", "FAST");
      }

      const title = SchoolAlotReceipt?.donor?.title || "";
      const fullName = SchoolAlotReceipt?.donor?.indicomp_full_name || "";
      // Combine title and name, remove extra spaces, replace spaces with underscores
      const namePart = [title, fullName]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, "_");
      const fileName = namePart ? `${namePart}.pdf` : "Allotment_Letter.pdf";
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // ----- SALUTATION HELPER (matches PHP logic) -----
  const getSalutation = (donor) => {
    if (!donor) return "Respected Sir,";
    const isIndividual = donor.indicomp_type === "Individual";
    if (isIndividual) {
      const title = donor.title || "";
      if (title === "Shri") return "Respected Sir,";
      if (title === "Smt.") return "Respected Madam,";
      // fallback for other titles (e.g., Dr., Mr., etc.)
      return "Respected Sir,";
    }
    // Corporate or other types
    return "Respected Sir/Madam,";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="w-full p-4  ">
        <div className="flex items-center justify-center h-64 ">
          <div className="text-center ">
            <div className="text-destructive font-medium mb-2">
              Error Fetching School Letter Data
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const signBaseUrl = schoolLetter?.data?.image_url?.image_url;
  const signFile = schoolLetter?.data?.auth_sign?.indicomp_image_sign;
  const SchoolAlotReceipt = schoolLetter?.data?.individualCompany || {};
  const SchoolAlotView = schoolLetter?.data?.SchoolAlotView || [];
  const OTSReceipts = schoolLetter?.data?.OTSReceipts || [];
  const chapters = schoolLetter?.data?.chapter || [];

  const handleClickOpen = (id) => {
    setSelectedId(id);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setDonorEmail("");
    setSelectedId(null);
  };

  const onSubmitMail = async (e) => {
    e.preventDefault();
    if (!selectedId)
      return toast.error("Id is Missing, Please try again later");

    try {
      const res = await UpdateMail({
        url: `${UPDATE_EMAIL}/${selectedId}`,
        method: "patch",
        data: { indicomp_email: donoremail },
      });

      if (res?.code == 201) {
        toast.success(res.message);
        handleClose();
        refetch();
      } else {
        toast.error(res.message || "Unexpected error");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update");
    }
  };

  const onSubmit = async ({ id }) => {
    if (!id) return toast.error("Id is Missing, Please try again later");

    try {
      const res = await Mailtrigger({
        url: `${SEND_LETTER_EMAIL}/${donorId}`,
      });

      if (res?.code == 201) {
        toast.success(res.message);
        refetch();
      } else {
        toast.error(res.message || "Unexpected error");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update");
    }
  };

  return (
    <div className="invoice-wrapper overflow-x-auto grid md:grid-cols-1 1fr">
      {/* Floating action bar */}
      <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50">
        <Card className="p-3 shadow-2xl border border-white/30 backdrop-blur-lg bg-white/80 rounded-2xl hover:bg-white/90 transition-all duration-300">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="border-2 hover:shadow-md"
                    onClick={handlePrintPdf}
                  >
                    {isProcessing ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <Printer className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print Receipt</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {SchoolAlotReceipt?.donor?.indicomp_email ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-11 w-11 relative rounded-md transition-all duration-300 hover:scale-110 border border-[var(--color-border)] hover:shadow-md"
                      onClick={() => onSubmit({ id: donorId })}
                    >
                      {SchoolAlotReceipt && (
                        <span className="absolute -top-2 -right-2 rounded-full bg-blue-500 text-white text-[12px] w-6 h-6 flex items-center justify-center border-2 border-white font-medium">
                          {SchoolAlotReceipt?.schoolalot_email_count || 0}
                        </span>
                      )}
                      {mailloading ? (
                        <img
                          src={mailSentGif}
                          alt="Sending..."
                          className="h-5 w-5"
                        />
                      ) : (
                        <Mail className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send Mail</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleClickOpen(SchoolAlotReceipt?.donor?.indicomp_fts_id)
                    }
                    className="rounded-md transition-all duration-300 hover:scale-110 border border-[var(--color-border)] hover:shadow-md"
                  >
                    <MailPlus className="h-5 w-5 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Mail</TooltipContent>
              </Tooltip>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="relative flex items-center justify-center h-11 w-11 rounded-md border border-[var(--color-border)] hover:scale-110 transition-all duration-300 hover:shadow-md"
                    onClick={() =>
                      setShowSignature((prev) =>
                        prev === "Yes" ? "No" : "Yes",
                      )
                    }
                  >
                    <PenTool className="h-5 w-5" />
                    <span
                      className={`absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center border-2 border-white ${
                        showSignature === "Yes"
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {showSignature}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Signature</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={handleSavePDF}
                    className="border-2 hover:shadow-md"
                  >
                    {isProcessingPdf ? (
                      <Loader className="h-5 w-5 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Card>
      </div>

      <div className="flex flex-col items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
          {/* Left panel – table */}
          <div className="bg-white text-[12px] lg:col-span-3 shadow-md rounded-md p-6 border transition-all hover:shadow-lg leading-relaxed">
            <div className="border-b flex justify-between pb-2 mb-3">
              <p className="font-medium">
                Donor ID: <span>{SchoolAlotReceipt?.indicomp_fts_id}</span>
              </p>
              <p>
                Donor Name:{" "}
                <span className="font-medium">
                  {SchoolAlotReceipt?.donor?.indicomp_full_name}
                </span>
              </p>
              <p>
                No. of Schools:{" "}
                <span className="font-medium">
                  {OTSReceipts.map((o, i) => (
                    <span key={i}>{o.receipt_no_of_ots} </span>
                  ))}
                </span>
              </p>
            </div>

            <div className="my-5 overflow-x-auto mb-14">
              <table className="min-w-full border-collapse border border-gray-500">
                <thead>
                  <tr className="bg-gray-200">
                    {[
                      "STATE",
                      "ANCHAL CLUSTER",
                      "CLUSTER",
                      "SUB CLUSTER",
                      "VILLAGE",
                      "TEACHER",
                      "BOYS",
                      "GIRLS",
                      "TOTAL",
                    ].map((header, index) => (
                      <th
                        key={`${header}-${index}`}
                        className="border border-gray-500 px-1 py-1 text-center text-[10px]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(SchoolAlotView) &&
                    SchoolAlotView.map((dataSumm) => (
                      <tr key={dataSumm.id}>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.school_state}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.achal}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.cluster}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.sub_cluster}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.village}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.teacher}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.boys}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.girls}
                        </td>
                        <td className="border border-gray-500 px-2 py-2 text-xs">
                          {dataSumm.total}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel – letter preview */}
          <div className="bg-white text-sm lg:col-span-2 text-[#464D69] font-serif shadow-md rounded-md p-6 border transition-all hover:shadow-lg leading-relaxed">
            <div className="flex justify-between items-center mb-4">
              {showSignature === "Yes" ? (
                <>
                  <div className="invoice-logo">
                    <img src={Logo1} alt="session-logo" className="w-40" />
                  </div>
                  <div className="invoice-logo text-right">
                    <img src={Logo3} alt="session-logo" width="80" />
                  </div>
                </>
              ) : (
                <div className="h-20"></div>
              )}
            </div>
            <p className="font-medium">Date: {today}</p>
            <p>To,</p>
            {Object.keys(SchoolAlotReceipt).length !== 0 && (
              <div className="mt-1">
                <p>
                  {SchoolAlotReceipt?.donor?.indicomp_type === "Individual"
                    ? `${SchoolAlotReceipt?.donor?.title || ""} ${SchoolAlotReceipt?.donor?.indicomp_full_name || ""}`
                    : `M/s ${SchoolAlotReceipt?.donor?.indicomp_full_name || ""}`}
                </p>
                <p>{SchoolAlotReceipt?.donor?.indicomp_res_reg_address}</p>
                <p>{SchoolAlotReceipt?.donor?.indicomp_res_reg_city}</p>
                <p>
                  {SchoolAlotReceipt?.donor?.indicomp_res_reg_state} -{" "}
                  {SchoolAlotReceipt?.donor?.indicomp_res_reg_pin_code}
                </p>
              </div>
            )}
            {/* --- SALUTATION (UPDATED) --- */}
            <p className="mt-1">{getSalutation(SchoolAlotReceipt?.donor)}</p>
            <p className="mt-2 text-justify">
              <span className="font-bold">
                Giving is not just about making donation, it’s about making a
                difference,
              </span>
              we are able to bring about this difference only because of the
              support of our kind donors. Your support to FTS gives wings to the
              dreams of the little children studying in Ekal Vidyalaya. We
              express our sincere thanks and gratitude to you for adopting{" "}
              <span className="font-bold">One Teacher School</span> (OTS) and
              thus helping us in providing light of education to the weaker
              sections of the society.
            </p>
            <p className="mt-1 text-justify">
              Please find enclosed herewith details of the Ekal Vidyalaya
              running with your assistance. You may also view the details
              through below links. <br />
              website:
              <span className="font-bold">www.ftsindia.com/donor-login.</span>
              <br />
              Please enter your
              <span className="font-bold">
                {" "}
                DONOR ID :{SchoolAlotReceipt?.donor?.indicomp_fts_id || ""}
              </span>{" "}
              <span className="font-bold">
                and Password {SchoolAlotReceipt?.donor?.cpassword || ""}
              </span>
            </p>
            <br />{" "}
            <p>
              Please find enclosed herewith the list of your adopted schools,
              provided below
            </p>
            <p className="mt-2">
              We hope to get your continued patronage for serving the society.
            </p>
            <div className="">
              <p className="flex my-4">Thanking you once again!!</p>
              <div className="relative w-fit h-28">
                <p className="flex my-4">With Regards,</p>
                <div className="absolute bottom-0 left-0 z-10 leading-tight font-serif text-sm">
                  {schoolLetter?.data?.auth_sign?.indicomp_full_name}
                  <br />
                  {schoolLetter?.data?.chapter?.[0]?.auth_sign}
                </div>

                {showSignature === "Yes" ? (
                  <>
                    {schoolLetter?.data?.chapter.auth_sign_required === "Yes" &&
                      schoolLetter?.data?.auth_sign?.indicomp_image_sign && (
                        <img
                          src={`${schoolLetter?.data?.image_url?.image_url}${schoolLetter?.data?.auth_sign?.indicomp_image_sign}`}
                          alt="Authorized Signature"
                          className="h-24 absolute top-2 -left-1 z-10"
                        />
                      )}
                  </>
                ) : (
                  <div className="h-14" />
                )}
              </div>
            </div>
            {showSignature === "Yes" ? (
              <div className="">
                <img
                  src={Logo2}
                  alt="Top banner"
                  className="mx-auto mb-0 w-80"
                />
                <div className="text-center p-1">
                  <div className="text-center text-sm">
                    <label>
                      <small>
                        {chapters.chapter_name}
                        {" : - "} {chapters.chapter_address},{" "}
                        {chapters.chapter_city}, {chapters.chapter_state}{" "}
                        {chapters.chapter_pin}
                        <br />
                        {"Ph.no - "} {chapters.chapter_phone},{" Email : - "}{" "}
                        {chapters.chapter_email}
                      </small>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-32"></div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden print component */}
      <div
        className="flex flex-col items-center"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -10,
        }}
      >
        <AllotmentPrintLetter
          SchoolAlotView={SchoolAlotView}
          OTSReceipts={OTSReceipts}
          SchoolAlotReceipt={SchoolAlotReceipt}
          authSign={schoolLetter?.data?.auth_sign}
          imageUrl={schoolLetter?.data?.image_url?.image_url}
          chapters={chapters}
          showSignature={showSignature}
          componentRef={componentRef}
        />
      </div>

      {/* Email Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Donor Email</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitMail} autoComplete="off">
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="donoremail">Email *</Label>
                <Input
                  type="email"
                  id="donoremail"
                  name="donoremail"
                  value={donoremail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  required
                  placeholder="Enter donor email"
                />
              </div>
              <div className="flex justify-center">
                <Button type="submit" disabled={updatemail}>
                  {updatemail ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </CardContent>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolAllotLetter;
