import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import Cookies from "js-cookie";
import { ArrowLeft, FileText, Mail, Shield } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  DONOR_LIST_CREATE_RECEIPT,
  fetchDonorDataInCreateReceiptById,
} from "@/api";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useFetchDataSource,
  useFetchMembershipYear,
  useFetchReceiptControl,
  useFetchSchoolAllotmentYear,
} from "@/hooks/use-api";
import useCreateFollowup from "@/hooks/use-create-followup";
import ReceiptOldDraft from "./receipt-old-draft";
import BASE_URL from "@/config/base-url";

const exemptionOptions = [
  { value: "80G", label: "133" },
  { value: "Non 80G", label: "Non 133" },
  { value: "FCRA", label: "FCRA" },
];

const paymentModeOptions = [
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "Transfer", label: "Transfer" },
  { value: "Others", label: "Others" },
];

const donationTypeOptions = [
  { value: "One Teacher School", label: "OTS" },
  { value: "General", label: "General" },
  { value: "Membership", label: "Membership" },
];

const donationType80GOptions = [
  { value: "One Teacher School", label: "OTS" },
  { value: "General", label: "General" },
];

const csrOptions = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const ReceiptOldCreate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = Cookies.get("token");

  const createFollowupMutation = useCreateFollowup();
  const today = moment();
  const todayDate = today.format("YYYY-MM-DD");
  const todayback = today.format("YYYY-MM-DD");
  const currentYear = Cookies.get("currentYear");
  const chapterId = Cookies.get("chapter_id");
  const [errors, setErrors] = useState({});
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [showPanDialog, setShowPanDialog] = useState(false);

  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [draftData, setDraftData] = useState(null);

  const [donor, setDonor] = useState({
    receipt_date: "",
    receipt_old_no: "",
    receipt_exemption_type: "",
    receipt_financial_year: "",
    schoolalot_year: "",
    receipt_total_amount: "",
    receipt_realization_date: "",
    receipt_donation_type: "",
    receipt_tran_pay_mode: "",
    receipt_tran_pay_details: "",
    receipt_remarks: "",
    receipt_reason: "",
    receipt_email_count: "",
    receipt_created_at: "",
    receipt_created_by: "",
    receipt_update_at: "",
    receipt_update_by: "",
    m_ship_vailidity: "",
    receipt_no_of_ots: "",
    donor_promoter: "",
    donor_source: "",
    with_out_panno: "",
    receipt_csr: "No",
  });
  const { data: activeConditionsData, isLoading: isLoadingActiveConditions } =
    useQuery({
      queryKey: ["active-conditions"],
      queryFn: async () => {
        const response = await axios.get(`${BASE_URL}/api/getActiveCondition`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
      },
    });

  const activeConditions = activeConditionsData?.data || [];

  const matchingConditions = activeConditions.filter((condition) => {
    if (condition.status === "Active" && condition.chapter_ids) {
      const chapterIds = condition.chapter_ids
        .split(",")
        .map((id) => id.trim());
      return chapterIds.includes(chapterId?.toString());
    }
    return false;
  });

  const { data: donorData, isLoading } = useQuery({
    queryKey: ["donor-data", id],
    queryFn: async () => {
      const data = await fetchDonorDataInCreateReceiptById(id);
      localStorage.setItem("donType", data?.individualCompany?.indicomp_type);
      return data;
    },
    retry: 2,
  });

  const userdata = donorData?.data || {};

  const { data: datasourceHook, isLoading: isLoadingDatasource } =
    useFetchDataSource();
  const { data: membershipYearHook, isLoading: isLoadingMembershipYear } =
    useFetchMembershipYear();
  const { data: schoolAllotYearHook, isLoading: isLoadingSchoolAllotYear } =
    useFetchSchoolAllotmentYear();
  const { data: receiptControlHook, isLoading: isLoadingReceiptControl } =
    useFetchReceiptControl();
  const isLoadingHook =
    isLoadingDatasource ||
    isLoadingMembershipYear ||
    isLoadingSchoolAllotYear ||
    isLoadingReceiptControl;

  const dataSources = datasourceHook?.data || [];
  const membershipYears = membershipYearHook?.data || [];
  const schoolAllotYears = schoolAllotYearHook?.data || [];
  const receiptControl = receiptControlHook?.data || [];

  const handleButtonGroupChange = (stateName, value) => {
    if (stateName === "receipt_exemption_type" && value === "80G") {
      const pan = userdata.indicomp_pan_no;
      if (!pan || pan === "" || pan === null) {
        setShowPanDialog(true);
        return;
      }
    }

    setDonor((prevDonor) => {
      const updatedDonor = {
        ...prevDonor,
        [stateName]: value,
      };

      if (stateName === "receipt_donation_type") {
        if (value === "Membership") {
          updatedDonor.receipt_total_amount = "1000";
        } else {
          updatedDonor.receipt_total_amount = "";
        }
      }

      if (
        stateName === "receipt_exemption_type" ||
        stateName === "receipt_total_amount"
      ) {
        if (
          (stateName === "receipt_exemption_type" &&
            value === "80G" &&
            prevDonor.receipt_total_amount > 2000) ||
          (stateName === "receipt_total_amount" &&
            prevDonor.receipt_exemption_type === "80G" &&
            value > 2000)
        ) {
          if (prevDonor.receipt_tran_pay_mode === "Cash") {
            updatedDonor.receipt_tran_pay_mode = "";
          }
        }
      }

      return updatedDonor;
    });
  };

  const handlePanDialogConfirm = () => {
    setDonor((prevDonor) => ({
      ...prevDonor,
      receipt_exemption_type: "80G",
      with_out_panno: "Yes",
    }));
    setShowPanDialog(false);
  };

  const handlePanDialogCancel = () => {
    setShowPanDialog(false);
  };

  const validateOnlyDigits = (inputtxt) => /^\d*$/.test(inputtxt);

  const onInputChange = (e) => {
    const { name, value } = e.target;

    if (
      name === "receipt_total_amount" &&
      donor.receipt_donation_type === "Membership"
    ) {
      return;
    }

    const digitFields = ["receipt_total_amount", "receipt_no_of_ots"];

    if (digitFields.includes(name)) {
      if (validateOnlyDigits(value)) {
        setDonor((prevDonor) => {
          const updatedDonor = {
            ...prevDonor,
            [name]: value,
          };

          if (
            name === "receipt_total_amount" &&
            prevDonor.receipt_exemption_type === "80G" &&
            value > 2000
          ) {
            if (prevDonor.receipt_tran_pay_mode === "Cash") {
              updatedDonor.receipt_tran_pay_mode = "";
            }
          }

          return updatedDonor;
        });
      }
    } else {
      setDonor((prevDonor) => ({
        ...prevDonor,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (receiptControl.date_open === "Yes" && !donor.receipt_date?.trim()) {
      newErrors.receipt_date = "Receipt Date is required";
      isValid = false;
    }

    if (!donor.receipt_exemption_type) {
      newErrors.receipt_exemption_type = "Please Select a category";
      isValid = false;
    }

    if (!donor.receipt_donation_type) {
      newErrors.receipt_donation_type = "Purpose is required";
      isValid = false;
    }

    if (!donor.receipt_total_amount) {
      newErrors.receipt_total_amount = "Total amount is required";
      isValid = false;
    }

    if (!donor.receipt_tran_pay_mode) {
      newErrors.receipt_tran_pay_mode = "Transaction type is required";
      isValid = false;
    }

    if (
      donor.receipt_donation_type === "Membership" &&
      !donor.m_ship_vailidity
    ) {
      newErrors.m_ship_vailidity = "Membership End Date is required";
      isValid = false;
    }

    if (donor.receipt_donation_type === "One Teacher School") {
      if (!donor.receipt_no_of_ots) {
        newErrors.receipt_no_of_ots = "No of school is required";
        isValid = false;
      }
      if (!donor.schoolalot_year) {
        newErrors.schoolalot_year = "School Allotment Year is required";
        isValid = false;
      }
    }

    if (donor.receipt_csr === undefined || donor.receipt_csr === null) {
      newErrors.receipt_csr = "CSR is required";
      isValid = false;
    }

    setErrors(newErrors);
    return { isValid, errors: newErrors };
  };

  const createReceiptMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await axios.post(DONOR_LIST_CREATE_RECEIPT, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.code == 201) {
        toast.success(data.message);
        const followUpFormData = new FormData();
        followUpFormData.append("chapter_id", userdata.chapter_id);
        followUpFormData.append("indicomp_fts_id", userdata.indicomp_fts_id);
        followUpFormData.append("followup_heading", "Receipt Created");
        followUpFormData.append(
          "followup_description",
          "Receipt was successfully created in the system",
        );
        followUpFormData.append("followup_status", "Completed");

        createFollowupMutation.mutate(followUpFormData);
        // navigate(`/receipt-view/${data.id}`);
        navigate(`/receipt-view?ref=${encodeURIComponent(data.id)}`);
        setIsButtonDisabled(false);
      } else if (data.code == 422) {
        toast.error(data.message);
        setIsButtonDisabled(false);
      } else {
        toast.error(data.message || "Unexpected Error");
        setIsButtonDisabled(false);
      }
    },
    onError: (error) => {
      console.error("Error creating receipt:", error);
      toast.error(error.response.data.message, "Error creating receipt");
      setIsButtonDisabled(false);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { isValid, errors } = validateForm();
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      setIsButtonDisabled(false);
      return;
    }
    if (!currentYear) {
      toast.error("Current year is not defined");
      return;
    }

    setDraftData({
      ...donor,
      receipt_date: getReceiptDate(),
    });
    setShowDraftDialog(true);
  };
  const getReceiptDate = () => {
    if (
      receiptControl.date_open === "No" &&
      receiptControl.date_open_one === "No"
    ) {
      return donorData?.conditionOld?.condition_date || todayDate;
    } else if (receiptControl.date_open === "Yes") {
      return donor.receipt_date;
    } else if (receiptControl.date_open_one === "Yes") {
      return receiptControl.date_open_one_date;
    }
    return donorData?.conditionOld?.condition_date || todayDate;
  };

  const handleFinalSubmit = async (formData) => {
    setIsButtonDisabled(true);
    const finalFormData = new FormData();
    finalFormData.append("indicomp_fts_id", userdata.indicomp_fts_id);

    finalFormData.append(
      "receipt_date",
      donorData?.conditionOld?.condition_date || todayDate,
    );
    finalFormData.append(
      "receipt_financial_year",
      donorData?.conditionOld?.old_year || "",
    );

    Object.keys(formData).forEach((key) => {
      if (
        key !== "receipt_date" &&
        key !== "donor_promoter" &&
        key !== "receipt_financial_year"
      ) {
        if (formData[key] !== undefined && formData[key] !== null) {
          finalFormData.append(key, formData[key]);
        }
      }
    });

    finalFormData.append("donor_promoter", userdata.indicomp_promoter);

    createReceiptMutation.mutate(finalFormData);

    setShowDraftDialog(false);
  };
  const pan = userdata.indicomp_pan_no == "" ? "NA" : userdata.indicomp_pan_no;

  if (isLoading && isLoadingHook) {
    return (
      <div className="w-full space-y-4 p-4">
        <Card className="p-4">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 p-4">
      {matchingConditions.length > 0 ? (
        <div className="text-center mb-4">
          <Card className="p-4 border-l-4 border-l-red-500 bg-red-50 border border-red-200">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-700">
                  Important Notice
                </h3>
              </div>

              <div className="w-full border-t border-red-200 pt-3">
                <p className="text-sm font-medium mb-2">
                  Please Fix this issue to resume your Work
                </p>

                <div className="space-y-2">
                  {matchingConditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="flex items-start gap-2 p-2 bg-white rounded border border-red-100"
                    >
                      <div className="font-medium whitespace-nowrap">•</div>
                      <div
                        className="text-sm editor-content"
                        dangerouslySetInnerHTML={{
                          __html: condition.description,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-red-500 mt-3 italic">
                  Please review these conditions before creating the receipt
                </p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <>
          <Card className="p-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="text-muted-foreground w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h1 className="text-lg font-semibold text-gray-900">
                        Create Receipt
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        Create new receipt for{" "}
                        <span className="text-muted-foreground font-semibold">
                          {userdata.indicomp_full_name}
                        </span>{" "}
                        ( {userdata.indicomp_fts_id})
                      </p>
                    </div>
                  </div>

                  {/* Donor Info Compact */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-3 pt-3 border-t border-gray-200">
                    {userdata.indicomp_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600 truncate">
                          {userdata.indicomp_email}
                        </span>
                      </div>
                    )}
                    {pan && (
                      <div className="flex items-center gap-2">
                        <Shield
                          className={`w-4 h-4  flex-shrink-0  ${
                            pan ? "text-muted-foreground" : "text-red-600"
                          }`}
                        />
                        <span className="text-sm text-gray-600">
                          PAN: {pan}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate("/donor/donors")}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 flex-shrink-0 mt-2 sm:mt-0"
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </Button>
            </div>

            {/* Amount Warning */}
            {donor.receipt_total_amount > 2000 &&
              donor.receipt_exemption_type == "80G" &&
              pan == "NA" && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm font-medium">
                    Maximum amount allowed without PAN card is 2000
                  </p>
                </div>
              )}
          </Card>

          <Card>
            <div className="p-2 rounded-md ">
              <div className="flex flex-row items-center gap-2 text-xs text-gray-600">
                {receiptControl.date_open === "No" &&
                receiptControl.date_open_one === "No" ? (
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    Date:{" "}
                    {moment(donorData?.conditionOld?.condition_date).format(
                      "DD-MM-YYYY",
                    )}{" "}
                  </span>
                ) : (
                  ""
                )}
                {receiptControl.date_open_one === "Yes" ? (
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    Date:{" "}
                    {moment(receiptControl.date_open_one_date).format(
                      "DD-MM-YYYY",
                    )}
                  </span>
                ) : (
                  ""
                )}
                <span className="bg-gray-100 px-2 py-1 rounded">
                  Year: {donorData?.conditionOld?.old_year}
                </span>
              </div>
            </div>
            <CardContent className="p-2 pt-0">
              {/* onSubmit={handleSubmit} */}
              <form className="space-y-2">
                {/* CSR Checkbox - Compact */}
                <div className="flex items-center justify-end space-x-2 mb-3 ">
                  <Checkbox
                    id="receipt_csr"
                    checked={donor.receipt_csr === "Yes"}
                    onCheckedChange={(checked) =>
                      setDonor((prev) => ({
                        ...prev,
                        receipt_csr: checked ? "Yes" : "No",
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="receipt_csr" className="text-sm font-medium">
                    This is a CSR donation
                  </Label>
                </div>

                {/* Compact Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Receipt Date */}
                  {receiptControl.date_open === "Yes" && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="receipt_date"
                        className="text-xs font-medium"
                      >
                        Receipt Date *
                      </Label>
                      <Input
                        id="receipt_date"
                        name="receipt_date"
                        type="date"
                        value={donor.receipt_date}
                        onChange={onInputChange}
                        min={moment(receiptControl.date_open_from).format(
                          "YYYY-MM-DD",
                        )}
                        max={moment(receiptControl.date_open_to).format(
                          "YYYY-MM-DD",
                        )}
                        className="h-8 text-sm"
                      />
                      {errors.receipt_date && (
                        <p className="text-red-500 text-xs">
                          {errors.receipt_date}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Exemption Type - Compact */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Category *</Label>
                    <div className="flex flex-wrap gap-1">
                      {exemptionOptions.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={
                            donor.receipt_exemption_type === option.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            handleButtonGroupChange(
                              "receipt_exemption_type",
                              option.value,
                            )
                          }
                          className="text-xs h-7 px-2"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    {errors.receipt_exemption_type && (
                      <p className="text-red-500 text-xs">
                        {errors.receipt_exemption_type}
                      </p>
                    )}
                  </div>

                  {/* Donation Type - Compact */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Purpose *</Label>
                    <div className="flex flex-wrap gap-1">
                      {(donor.receipt_exemption_type === "80G"
                        ? donationType80GOptions
                        : donationTypeOptions
                      ).map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={
                            donor.receipt_donation_type === option.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            handleButtonGroupChange(
                              "receipt_donation_type",
                              option.value,
                            )
                          }
                          className="text-xs h-7 px-2"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    {errors.receipt_donation_type && (
                      <p className="text-red-500 text-xs">
                        {errors.receipt_donation_type}
                      </p>
                    )}
                  </div>

                  {/* Total Amount */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="receipt_total_amount"
                      className="text-xs font-medium"
                    >
                      Total Amount *
                    </Label>
                    <Input
                      id="receipt_total_amount"
                      name="receipt_total_amount"
                      type="text"
                      value={donor.receipt_total_amount}
                      onChange={onInputChange}
                      disabled={donor.receipt_donation_type === "Membership"}
                      placeholder="Enter amount"
                      maxLength={8}
                      className="h-8 text-sm"
                    />
                    {errors.receipt_total_amount && (
                      <p className="text-red-500 text-xs">
                        {errors.receipt_total_amount}
                      </p>
                    )}
                  </div>

                  {/* Payment Mode - Compact */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Transaction Type *
                    </Label>
                    <div className="flex flex-wrap gap-1">
                      {paymentModeOptions
                        .filter(
                          (option) =>
                            !(
                              donor.receipt_exemption_type === "80G" &&
                              donor.receipt_total_amount > 2000 &&
                              option.value === "Cash"
                            ),
                        )
                        .map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={
                              donor.receipt_tran_pay_mode === option.value
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() =>
                              handleButtonGroupChange(
                                "receipt_tran_pay_mode",
                                option.value,
                              )
                            }
                            className="text-xs h-7 px-2"
                          >
                            {option.label}
                          </Button>
                        ))}
                    </div>
                    {errors.receipt_tran_pay_mode && (
                      <p className="text-red-500 text-xs">
                        {errors.receipt_tran_pay_mode}
                      </p>
                    )}
                  </div>

                  {/* Realization Date */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="receipt_realization_date"
                      className="text-xs font-medium"
                    >
                      Realization Date
                    </Label>
                    <Input
                      id="receipt_realization_date"
                      name="receipt_realization_date"
                      type="date"
                      value={donor.receipt_realization_date}
                      onChange={onInputChange}
                      max={todayDate}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Conditional Fields - Compact */}
                  {donor.receipt_donation_type === "Membership" && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="m_ship_vailidity"
                        className="text-xs font-medium"
                      >
                        Membership End Date *
                      </Label>
                      <Select
                        value={donor.m_ship_vailidity}
                        onValueChange={(value) =>
                          setDonor((prev) => ({
                            ...prev,
                            m_ship_vailidity: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select end date" />
                        </SelectTrigger>
                        <SelectContent>
                          {membershipYears.map((year) => (
                            <SelectItem
                              key={year.membership_year}
                              value={year.membership_year}
                            >
                              {year.membership_year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.m_ship_vailidity && (
                        <p className="text-red-500 text-xs">
                          {errors.m_ship_vailidity}
                        </p>
                      )}
                    </div>
                  )}

                  {donor.receipt_donation_type === "One Teacher School" && (
                    <>
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="receipt_no_of_ots"
                          className="text-xs font-medium"
                        >
                          Number of Schools *
                        </Label>
                        <Input
                          id="receipt_no_of_ots"
                          name="receipt_no_of_ots"
                          type="text"
                          value={donor.receipt_no_of_ots}
                          onChange={onInputChange}
                          placeholder="Enter number"
                          maxLength={3}
                          className="h-8 text-sm"
                        />
                        {errors.receipt_no_of_ots && (
                          <p className="text-red-500 text-xs">
                            {errors.receipt_no_of_ots}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <Label
                          htmlFor="schoolalot_year"
                          className="text-xs font-medium"
                        >
                          School Allotment Year *
                        </Label>
                        <Select
                          value={donor.schoolalot_year}
                          onValueChange={(value) =>
                            setDonor((prev) => ({
                              ...prev,
                              schoolalot_year: value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {schoolAllotYears.map((year) => (
                              <SelectItem
                                key={year.school_allot_year}
                                value={year.school_allot_year}
                              >
                                {year.school_allot_year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.schoolalot_year && (
                          <p className="text-red-500 text-xs">
                            {errors.schoolalot_year}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {donor.receipt_donation_type === "General" && (
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="donor_source"
                        className="text-xs font-medium"
                      >
                        Source
                      </Label>
                      <Select
                        value={donor.donor_source}
                        onValueChange={(value) =>
                          setDonor((prev) => ({ ...prev, donor_source: value }))
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          {dataSources.map((source) => (
                            <SelectItem
                              key={source.id}
                              value={source.data_source_type}
                            >
                              {source.data_source_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Text Areas - Compact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-2">
                  {/* Payment Details */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="receipt_tran_pay_details"
                      className="text-xs font-medium"
                    >
                      Transaction Details
                    </Label>
                    <Textarea
                      id="receipt_tran_pay_details"
                      name="receipt_tran_pay_details"
                      value={donor.receipt_tran_pay_details}
                      onChange={onInputChange}
                      placeholder="Cheque No / Bank Name / UTR / Any Other Details"
                      className="resize-none h-14 text-sm"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="receipt_remarks"
                      className="text-xs font-medium"
                    >
                      Remarks
                    </Label>
                    <Textarea
                      id="receipt_remarks"
                      name="receipt_remarks"
                      value={donor.receipt_remarks}
                      onChange={onInputChange}
                      placeholder="Additional remarks..."
                      className="resize-none h-14 text-sm"
                    />
                  </div>
                </div>

                {/* Submit Buttons - Compact */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      isButtonDisabled || createReceiptMutation.isPending
                    }
                    className="flex items-center gap-2 h-9"
                    size="sm"
                  >
                    {createReceiptMutation.isPending ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-3 h-3" />
                        Create Receipt
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/donor/donors")}
                    size="sm"
                    className="h-9"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Dialog open={showPanDialog} onOpenChange={setShowPanDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <Shield className="w-5 h-5" />
                  No PAN Card Available
                </DialogTitle>
                <DialogDescription>
                  The donor's PAN is missing. To issue an 80G receipt, a valid
                  PAN is required. Please choose an option below.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const donorId = userdata?.id;
                    navigate(`/donor-edit/${donorId}`);
                  }}
                  className="flex-1"
                >
                  Update PAN
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePanDialogCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePanDialogConfirm}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Continue without PAN
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {showDraftDialog && (
            <ReceiptOldDraft
              formData={draftData}
              donorData={userdata}
              onSave={() => handleFinalSubmit(draftData)}
              onCancel={() => setShowDraftDialog(false)}
              receiptControl={receiptControl}
              currentYear={currentYear}
              open={showDraftDialog}
              onOpenChange={setShowDraftDialog}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ReceiptOldCreate;
