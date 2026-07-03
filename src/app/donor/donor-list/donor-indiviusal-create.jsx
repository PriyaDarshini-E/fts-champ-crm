import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import InputMask from "react-input-mask";
import {
  ArrowLeft,
  User,
  Info,
  Upload,
  Calendar,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BASE_URL from "@/config/base-url";
import { DONOR_INDIVISUAL_CREATE_SUMBIT } from "@/api";

// Import your utility data
import donor_type from "@/utils/donor-type";
import belongs_to from "@/utils/belongs-to";
import honorific from "@/utils/honorific";
import { MemoizedSelect } from "@/components/common/memoized-select";
import {
  useFetchDataSource,
  useFetchPromoter,
  useFetchState,
} from "@/hooks/use-api";

// Constants
const gender = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

const corrpreffer = [
  { value: "Residence", label: "Residence" },
  { value: "Office", label: "Office" },
  { value: "Digital", label: "Digital" },
];

const DonorIndiviusalCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = Cookies.get("token");

  const [isDuplicate, setIsDuplicate] = useState(false);
  const [errors, setErrors] = useState({});
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  const [donor, setDonor] = useState({
    indicomp_full_name: "",
    title: "",
    indicomp_father_name: "",
    indicomp_mother_name: "",
    indicomp_gender: "",
    indicomp_spouse_name: "",
    indicomp_dob_annualday: "",
    indicomp_doa: "",
    indicomp_pan_no: "",
    indicomp_image_logo: "",
    indicomp_remarks: "",
    indicomp_promoter: "",
    indicomp_newpromoter: "",
    indicomp_belongs_to: "",
    indicomp_source: "",
    indicomp_donor_type: "",
    indicomp_type: "Individual",
    indicomp_is_promoter: "No",
    indicomp_mobile_phone: "",
    indicomp_mobile_whatsapp: "",
    indicomp_email: "",
    indicomp_website: "",
    indicomp_res_reg_address: "",
    indicomp_res_reg_area: "",
    indicomp_res_reg_ladmark: "",
    indicomp_res_reg_city: "",
    indicomp_res_reg_state: "",
    indicomp_multiple_email: "",
    indicomp_res_reg_pin_code: "",
    indicomp_off_branch_address: "",
    indicomp_off_branch_area: "",
    indicomp_off_branch_ladmark: "",
    indicomp_off_branch_city: "",
    indicomp_off_branch_state: "",
    indicomp_off_branch_pin_code: "",
    indicomp_corr_preffer: "Residence",
  });
  const { data: statesHooks, isLoading: isLoadingStates } = useFetchState();
  const { data: datasourceHook, isLoading: isLoadingDataSource } =
    useFetchDataSource();
  const { data: promoterHook, isLoading: isLoadingPromoter } =
    useFetchPromoter();
  const isLoading = isLoadingStates || isLoadingDataSource || isLoadingPromoter;

  const states = statesHooks?.data || [];
  const datasource = datasourceHook?.data || [];
  const promoter = promoterHook?.data || [];
  const validateOnlyDigits = (inputtxt) => {
    const phoneno = /^\d+$/;
    return inputtxt.match(phoneno) || inputtxt.length === 0;
  };

  const onInputChange = (e) => {
    const { name, value } = e.target;

    const digitFields = [
      "indicomp_mobile_phone",
      "indicomp_mobile_whatsapp",
      "indicomp_res_reg_pin_code",
      "indicomp_off_branch_pin_code",
    ];

    if (digitFields.includes(name)) {
      if (validateOnlyDigits(value)) {
        setDonor((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      setDonor((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const onChangePanNumber = (e) => {
    const panValue = e.target.value;
    // const panValue = e.target.value.toUpperCase().replace(/\s/g, '');
    setDonor({ ...donor, indicomp_pan_no: panValue });
  };
  const checkDuplicateDonor = async () => {
    if (
      donor.indicomp_full_name &&
      donor.indicomp_mobile_phone?.length === 10
    ) {
      try {
        const response = await axios.post(
          `${BASE_URL}/api/check-donor-duplicate`,
          {
            indicomp_full_name: donor.indicomp_full_name,
            indicomp_mobile_phone: donor.indicomp_mobile_phone,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (response.data.code === 422) {
          toast.error(response.data.message);
          return false;
        }
        return true;
      } catch (error) {
        console.error(
          error.response.data.message || "Error checking duplicate donor",
        );
        return true;
      }
    }
    return true;
  };

  useEffect(() => {
    if (
      donor.indicomp_full_name &&
      donor.indicomp_mobile_phone?.length === 10
    ) {
      const timer = setTimeout(async () => {
        const isNotDuplicate = await checkDuplicateDonor();
        setIsDuplicate(!isNotDuplicate);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setIsDuplicate(false);
    }
  }, [donor.indicomp_full_name, donor.indicomp_mobile_phone]);

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!donor.indicomp_full_name?.trim()) {
      newErrors.indicomp_full_name = "Full Name is required";
      isValid = false;
    }

    if (!donor.title) {
      newErrors.title = "Title is required";
      isValid = false;
    }

    if (!donor.indicomp_gender) {
      newErrors.indicomp_gender = "Gender is required";
      isValid = false;
    }

    if (
      !donor.indicomp_mobile_phone ||
      !/^\d{10}$/.test(donor.indicomp_mobile_phone)
    ) {
      newErrors.indicomp_mobile_phone =
        "Valid 10-digit Mobile Number is required";
      isValid = false;
    }

    if (!donor.indicomp_res_reg_city?.trim()) {
      newErrors.indicomp_res_reg_city = "City is required";
      isValid = false;
    }

    if (!donor.indicomp_res_reg_state) {
      newErrors.indicomp_res_reg_state = "State is required";
      isValid = false;
    }

    if (
      !donor.indicomp_res_reg_pin_code ||
      !/^\d{6}$/.test(donor.indicomp_res_reg_pin_code)
    ) {
      newErrors.indicomp_res_reg_pin_code = "Valid 6-digit Pincode is required";
      isValid = false;
    }

    if (!donor.indicomp_corr_preffer) {
      newErrors.indicomp_corr_preffer = "Correspondence Preference is required";
      isValid = false;
    }

    setErrors(newErrors);
    return { isValid, errors: newErrors };
  };

  const createDonorMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await axios.post(
        DONOR_INDIVISUAL_CREATE_SUMBIT,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.code === 201) {
        queryClient.invalidateQueries(["donors"]);
        toast.success(data.message || "Donor created successfully");

        // Reset form
        setDonor({
          indicomp_full_name: "",
          title: "",
          indicomp_father_name: "",
          indicomp_mother_name: "",
          indicomp_gender: "",
          indicomp_spouse_name: "",
          indicomp_dob_annualday: "",
          indicomp_doa: "",
          indicomp_pan_no: "",
          indicomp_image_logo: "",
          indicomp_remarks: "",
          indicomp_promoter: "",
          indicomp_newpromoter: "",
          indicomp_belongs_to: "",
          indicomp_source: "",
          indicomp_donor_type: "",
          indicomp_type: "Individual",
          indicomp_mobile_phone: "",
          indicomp_mobile_whatsapp: "",
          indicomp_multiple_email: "",
          indicomp_email: "",
          indicomp_website: "",
          indicomp_res_reg_address: "",
          indicomp_res_reg_area: "",
          indicomp_res_reg_ladmark: "",
          indicomp_res_reg_city: "",
          indicomp_res_reg_state: "",
          indicomp_res_reg_pin_code: "",
          indicomp_off_branch_address: "",
          indicomp_off_branch_area: "",
          indicomp_off_branch_ladmark: "",
          indicomp_off_branch_city: "",
          indicomp_off_branch_state: "",
          indicomp_off_branch_pin_code: "",
          indicomp_corr_preffer: "Residence",
          indicomp_is_promoter: "No",
        });

        navigate("/donor/donors");
      } else {
        toast.error(data.message || "Unexpected Error");
      }
    },
    onError: (error) => {
      console.error(
        "Donor Indiviusal Creation Error:",
        error.response.data.message,
      );
      toast.error(
        error.response.data.message || "Donor Indiviusal Creation Error",
      );
    },
    onSettled: () => {
      setIsButtonDisabled(false);
    },
  });

  const handlePromoterNotList = () => {
    setDonor((prev) => ({
      ...prev,
      indicomp_remarks:
        prev.indicomp_remarks +
        (prev.indicomp_remarks ? " " : "") +
        "Promoter not in list",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { isValid, errors } = validateForm();

    if (!isValid) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    try {
      const isNotDuplicate = await checkDuplicateDonor();
      if (!isNotDuplicate) {
        return;
      }

      const formData = new FormData();
      formData.append("indicomp_full_name", donor.indicomp_full_name);
      formData.append("title", donor.title);
      formData.append("indicomp_is_promoter", donor.indicomp_is_promoter);
      formData.append("indicomp_type", donor.indicomp_type);
      formData.append("indicomp_pan_no", donor.indicomp_pan_no);
      formData.append("indicomp_father_name", donor.indicomp_father_name);
      formData.append("indicomp_mother_name", donor.indicomp_mother_name);
      formData.append("indicomp_gender", donor.indicomp_gender);
      formData.append("indicomp_spouse_name", donor.indicomp_spouse_name);
      formData.append("indicomp_dob_annualday", donor.indicomp_dob_annualday);
      formData.append("indicomp_doa", donor.indicomp_doa);
      formData.append("indicomp_multiple_email", donor.indicomp_multiple_email);
      formData.append("indicomp_image_logo", donor.indicomp_image_logo);
      formData.append("indicomp_remarks", donor.indicomp_remarks);
      formData.append("indicomp_promoter", donor.indicomp_promoter);
      formData.append("indicomp_newpromoter", donor.indicomp_newpromoter);
      formData.append("indicomp_source", donor.indicomp_source);
      formData.append("indicomp_mobile_phone", donor.indicomp_mobile_phone);
      formData.append(
        "indicomp_mobile_whatsapp",
        donor.indicomp_mobile_whatsapp,
      );
      formData.append("indicomp_email", donor.indicomp_email);
      formData.append("indicomp_website", donor.indicomp_website);
      formData.append(
        "indicomp_res_reg_address",
        donor.indicomp_res_reg_address,
      );
      formData.append("indicomp_res_reg_area", donor.indicomp_res_reg_area);
      formData.append(
        "indicomp_res_reg_ladmark",
        donor.indicomp_res_reg_ladmark,
      );
      formData.append("indicomp_res_reg_city", donor.indicomp_res_reg_city);
      formData.append("indicomp_res_reg_state", donor.indicomp_res_reg_state);
      formData.append(
        "indicomp_res_reg_pin_code",
        donor.indicomp_res_reg_pin_code,
      );
      formData.append(
        "indicomp_off_branch_address",
        donor.indicomp_off_branch_address,
      );
      formData.append(
        "indicomp_off_branch_area",
        donor.indicomp_off_branch_area,
      );
      formData.append(
        "indicomp_off_branch_ladmark",
        donor.indicomp_off_branch_ladmark,
      );
      formData.append(
        "indicomp_off_branch_city",
        donor.indicomp_off_branch_city,
      );
      formData.append(
        "indicomp_off_branch_state",
        donor.indicomp_off_branch_state,
      );
      formData.append(
        "indicomp_off_branch_pin_code",
        donor.indicomp_off_branch_pin_code,
      );
      formData.append("indicomp_corr_preffer", donor.indicomp_corr_preffer);
      formData.append("indicomp_belongs_to", donor.indicomp_belongs_to);
      formData.append("indicomp_donor_type", donor.indicomp_donor_type);

      setIsButtonDisabled(true);
      createDonorMutation.mutate(formData);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("An error occurred during submission");
      setIsButtonDisabled(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full  space-y-1 p-4">
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
    <div className="w-full space-y-1  p-4">
      {/* Header Card */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User className="text-muted-foreground w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-md font-semibold text-gray-900">
                    Add Individual Donor
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Create a new individual donor record
                  </p>
                </div>
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
      </Card>

      {/* Main Form */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Personal Details Section */}
            <div className=" space-y-1">
              <div className="flex items-center gap-2 text-sm p-1 rounded-md px-1  font-medium bg-[var(--team-color)] text-white">
                <Info className="w-4 h-4" />
                Personal Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Title */}
                <div className=" ">
                  <Label htmlFor="title" className="text-xs  font-medium">
                    Title *
                  </Label>
                  <Select
                    value={donor.title}
                    onValueChange={(value) =>
                      setDonor((prev) => ({ ...prev, title: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Title" />
                    </SelectTrigger>
                    <SelectContent>
                      {honorific.map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors?.title && (
                    <p className="text-red-500 text-xs">{errors.title}</p>
                  )}
                </div>

                {/* Full Name */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_full_name"
                    className="text-xs  font-medium"
                  >
                    Full Name *
                  </Label>
                  <Input
                    id="indicomp_full_name"
                    name="indicomp_full_name"
                    value={donor.indicomp_full_name}
                    onChange={onInputChange}
                    className={isDuplicate ? "border-red-500" : ""}
                    placeholder="Enter full name"
                  />
                  {errors?.indicomp_full_name && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_full_name}
                    </p>
                  )}
                  {isDuplicate && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      Duplicate donor: Name already exists
                    </div>
                  )}
                </div>

                {/* Father Name */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_father_name"
                    className="text-xs  font-medium"
                  >
                    Father Name
                  </Label>
                  <Input
                    id="indicomp_father_name"
                    name="indicomp_father_name"
                    value={donor.indicomp_father_name}
                    onChange={onInputChange}
                    placeholder="Enter father's name"
                  />
                </div>

                {/* Mother Name */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_mother_name"
                    className="text-xs  font-medium"
                  >
                    Mother Name
                  </Label>
                  <Input
                    id="indicomp_mother_name"
                    name="indicomp_mother_name"
                    value={donor.indicomp_mother_name}
                    onChange={onInputChange}
                    placeholder="Enter mother's name"
                  />
                </div>

                {/* Gender */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_gender"
                    className="text-xs  font-medium"
                  >
                    Gender *
                  </Label>
                  <Select
                    value={donor.indicomp_gender}
                    onValueChange={(value) =>
                      setDonor((prev) => ({ ...prev, indicomp_gender: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {gender.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors?.indicomp_gender && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_gender}
                    </p>
                  )}
                </div>

                {/* Spouse Name */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_spouse_name"
                    className="text-xs  font-medium"
                  >
                    Spouse Name
                  </Label>
                  <Input
                    id="indicomp_spouse_name"
                    name="indicomp_spouse_name"
                    value={donor.indicomp_spouse_name}
                    onChange={onInputChange}
                    placeholder="Enter spouse name"
                  />
                </div>

                {/* Date of Birth */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_dob_annualday"
                    className="text-xs  font-medium"
                  >
                    Date of Birth
                  </Label>
                  <Input
                    id="indicomp_dob_annualday"
                    name="indicomp_dob_annualday"
                    type="date"
                    value={donor.indicomp_dob_annualday}
                    onChange={onInputChange}
                  />
                </div>

                {/* Date of Anniversary */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_doa"
                    className="text-xs  font-medium"
                  >
                    Date of Anniversary
                  </Label>
                  <Input
                    id="indicomp_doa"
                    name="indicomp_doa"
                    type="date"
                    value={donor.indicomp_doa}
                    onChange={onInputChange}
                  />
                </div>

                {/* PAN Number */}
                <div className=" ">
                  <InputMask
                    mask="aaaaa9999a"
                    value={donor.indicomp_pan_no}
                    onChange={(e) => onChangePanNumber(e)}
                    formatChars={{
                      9: "[0-9]",
                      a: "[A-Z]",
                    }}
                  >
                    {() => (
                      <div>
                        <Label
                          htmlFor="indicomp_pan_no"
                          className="text-xs  font-medium"
                        >
                          PAN Number
                        </Label>
                        <Input
                          type="text"
                          label="PAN Number"
                          name="panNumber"
                          placeholder="Enter PAN number"
                        />
                      </div>
                    )}
                  </InputMask>
                </div>

                {/* Upload Image */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_image_logo"
                    className="text-xs  font-medium"
                  >
                    Upload Image
                  </Label>
                  <Input
                    id="indicomp_image_logo"
                    name="indicomp_image_logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_image_logo: e.target.files[0],
                      }))
                    }
                  />
                </div>

                {/* Remarks */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_remarks"
                    className="text-xs  font-medium"
                  >
                    Remarks
                  </Label>
                  <Input
                    id="indicomp_remarks"
                    name="indicomp_remarks"
                    value={donor.indicomp_remarks}
                    onChange={onInputChange}
                    placeholder="Enter remarks"
                  />
                </div>

                <div className=" ">
                  <Label
                    htmlFor="indicomp_is_promoter"
                    className="text-xs font-medium"
                  >
                    Is Promoter?
                  </Label>
                  <Select
                    value={donor.indicomp_is_promoter}
                    onValueChange={(value) =>
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_is_promoter: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Promoter */}

                <div className="  flex flex-col justify-between">
                  <Label
                    htmlFor="indicomp_promoter"
                    className="text-xs  flex flex-row items-center justify-between  font-medium"
                  >
                    <span>Promoter</span>{" "}
                    <span
                      className="hover:cursor-pointer hover:text-red-900 text-red-500"
                      onClick={handlePromoterNotList}
                    >
                      Not in List!
                    </span>
                  </Label>

                  <MemoizedSelect
                    value={donor.indicomp_promoter}
                    // onChange={(value) => setDonor(prev => ({ ...prev, indicomp_promoter: value }))}
                    onChange={(value) => {
                      const selectedPromoter = promoter.find(
                        (p) => p.indicomp_promoter === value,
                      );
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_promoter:
                          selectedPromoter?.indicomp_fts_id || "",
                      }));
                    }}
                    options={promoter?.map((option) => ({
                      value: option.indicomp_promoter,
                      label: option.indicomp_full_name,
                      // label: option.indicomp_promoter,
                    }))}
                    placeholder="Select Promoter"
                  />
                  {errors?.indicomp_promoter && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_promoter}
                    </p>
                  )}
                </div>

                <div className=" ">
                  <Label
                    htmlFor="indicomp_belongs_to"
                    className="text-xs  font-medium"
                  >
                    Belong To
                  </Label>
                  <Select
                    value={donor.indicomp_belongs_to}
                    onValueChange={(value) =>
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_belongs_to: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Belong To" />
                    </SelectTrigger>
                    <SelectContent>
                      {belongs_to.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_source"
                    className="text-xs  font-medium"
                  >
                    Source
                  </Label>
                  <Select
                    value={donor.indicomp_source}
                    onValueChange={(value) =>
                      setDonor((prev) => ({ ...prev, indicomp_source: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasource.map((option) => (
                        <SelectItem
                          key={option.id}
                          value={option.data_source_type}
                        >
                          {option.data_source_type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Donor Type */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_donor_type"
                    className="text-xs  font-medium"
                  >
                    Donor Type
                  </Label>
                  <Select
                    value={donor.indicomp_donor_type}
                    onValueChange={(value) =>
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_donor_type: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Donor Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {donor_type.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type (Disabled) */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_type"
                    className="text-xs  font-medium"
                  >
                    Type
                  </Label>
                  <Input
                    id="indicomp_type"
                    name="indicomp_type"
                    value={donor.indicomp_type}
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Communication Details Section */}
            <div className=" space-y-1">
              <div className="flex items-center gap-2 text-sm p-1 rounded-md px-1  font-medium bg-[var(--team-color)] text-white">
                <Phone className="w-4 h-4" />
                Communication Details
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Mobile Phone */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_mobile_phone"
                    className="text-xs  font-medium"
                  >
                    Mobile Phone *
                  </Label>
                  <Input
                    id="indicomp_mobile_phone"
                    name="indicomp_mobile_phone"
                    type="tel"
                    value={donor.indicomp_mobile_phone}
                    onChange={onInputChange}
                    maxLength={10}
                    placeholder="Enter mobile number"
                    className={isDuplicate ? "border-red-500" : ""}
                  />
                  {errors?.indicomp_mobile_phone && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_mobile_phone}
                    </p>
                  )}
                  {isDuplicate && (
                    <div className="flex items-center gap-1 text-red-500 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      Duplicate donor: Mobile already exists
                    </div>
                  )}
                </div>

                {/* WhatsApp */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_mobile_whatsapp"
                    className="text-xs  font-medium"
                  >
                    WhatsApp
                  </Label>
                  <Input
                    id="indicomp_mobile_whatsapp"
                    name="indicomp_mobile_whatsapp"
                    type="tel"
                    value={donor.indicomp_mobile_whatsapp}
                    onChange={onInputChange}
                    maxLength={10}
                    placeholder="Enter WhatsApp number"
                  />
                </div>

                {/* Email */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_email"
                    className="text-xs  font-medium"
                  >
                    Email
                  </Label>
                  <Input
                    id="indicomp_email"
                    name="indicomp_email"
                    type="email"
                    value={donor.indicomp_email}
                    onChange={onInputChange}
                    placeholder="Enter email address"
                  />
                </div>

                {/* Website */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_website"
                    className="text-xs  font-medium"
                  >
                    Website
                  </Label>
                  <Input
                    id="indicomp_website"
                    name="indicomp_website"
                    value={donor.indicomp_website}
                    onChange={onInputChange}
                    placeholder="Enter website URL"
                  />
                </div>
              </div>
              <div className=" ">
                <Label htmlFor="" className="text-xs  font-medium">
                  Multiple mail (eg:abc@gmail.com xyz@gmail.com)
                </Label>
                <Textarea
                  id="indicomp_multiple_email"
                  name="indicomp_multiple_email"
                  type="text"
                  value={donor.indicomp_multiple_email}
                  onChange={onInputChange}
                  placeholder="eg:abc@gmail.com xyz@gmail.com"
                />
              </div>
            </div>

            {/* Residence Address Section */}
            <div className=" space-y-1">
              <div className="flex items-center gap-2 text-sm p-1 rounded-md px-1  font-medium bg-[var(--team-color)] text-white">
                <MapPin className="w-4 h-4" />
                Residence Address
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Address */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_res_reg_address"
                    className="text-xs  font-medium"
                  >
                    House & Street Number
                  </Label>
                  <Input
                    id="indicomp_res_reg_address"
                    name="indicomp_res_reg_address"
                    value={donor.indicomp_res_reg_address}
                    onChange={onInputChange}
                    placeholder="Enter address"
                  />
                </div>

                {/* Area */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_res_reg_area"
                    className="text-xs  font-medium"
                  >
                    Area
                  </Label>
                  <Input
                    id="indicomp_res_reg_area"
                    name="indicomp_res_reg_area"
                    value={donor.indicomp_res_reg_area}
                    onChange={onInputChange}
                    placeholder="Enter area"
                  />
                </div>

                {/* Landmark */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_res_reg_ladmark"
                    className="text-xs  font-medium"
                  >
                    Landmark
                  </Label>
                  <Input
                    id="indicomp_res_reg_ladmark"
                    name="indicomp_res_reg_ladmark"
                    value={donor.indicomp_res_reg_ladmark}
                    onChange={onInputChange}
                    placeholder="Enter landmark"
                  />
                </div>

                {/* City */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_res_reg_city"
                    className="text-xs  font-medium"
                  >
                    City *
                  </Label>
                  <Input
                    id="indicomp_res_reg_city"
                    name="indicomp_res_reg_city"
                    value={donor.indicomp_res_reg_city}
                    onChange={onInputChange}
                    placeholder="Enter city"
                  />
                  {errors?.indicomp_res_reg_city && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_res_reg_city}
                    </p>
                  )}
                </div>

                {/* State */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_res_reg_state"
                    className="text-xs  font-medium"
                  >
                    State *
                  </Label>
                  <Select
                    value={donor.indicomp_res_reg_state}
                    onValueChange={(value) =>
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_res_reg_state: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.state_name}>
                          {state.state_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors?.indicomp_res_reg_state && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_res_reg_state}
                    </p>
                  )}
                </div>

                {/* Pincode */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_res_reg_pin_code"
                    className="text-xs  font-medium"
                  >
                    Pincode *
                  </Label>
                  <Input
                    id="indicomp_res_reg_pin_code"
                    name="indicomp_res_reg_pin_code"
                    value={donor.indicomp_res_reg_pin_code}
                    onChange={onInputChange}
                    maxLength={6}
                    placeholder="Enter pincode"
                  />
                  {errors?.indicomp_res_reg_pin_code && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_res_reg_pin_code}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Office Address Section */}
            <div className="space-y-1 ">
              <div className="flex items-center gap-2 text-sm p-1 rounded-md px-1  font-medium bg-[var(--team-color)] text-white">
                <Building className="w-4 h-4" />
                Office Address
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Office Address */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_off_branch_address"
                    className="text-xs  font-medium"
                  >
                    Office & Street Number
                  </Label>
                  <Input
                    id="indicomp_off_branch_address"
                    name="indicomp_off_branch_address"
                    value={donor.indicomp_off_branch_address}
                    onChange={onInputChange}
                    placeholder="Enter office address"
                  />
                </div>

                {/* Office Area */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_off_branch_area"
                    className="text-xs  font-medium"
                  >
                    Area
                  </Label>
                  <Input
                    id="indicomp_off_branch_area"
                    name="indicomp_off_branch_area"
                    value={donor.indicomp_off_branch_area}
                    onChange={onInputChange}
                    placeholder="Enter area"
                  />
                </div>

                {/* Office Landmark */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_off_branch_ladmark"
                    className="text-xs  font-medium"
                  >
                    Landmark
                  </Label>
                  <Input
                    id="indicomp_off_branch_ladmark"
                    name="indicomp_off_branch_ladmark"
                    value={donor.indicomp_off_branch_ladmark}
                    onChange={onInputChange}
                    placeholder="Enter landmark"
                  />
                </div>

                {/* Office City */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_off_branch_city"
                    className="text-xs  font-medium"
                  >
                    City
                  </Label>
                  <Input
                    id="indicomp_off_branch_city"
                    name="indicomp_off_branch_city"
                    value={donor.indicomp_off_branch_city}
                    onChange={onInputChange}
                    placeholder="Enter city"
                  />
                </div>

                {/* Office State */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_off_branch_state"
                    className="text-xs  font-medium"
                  >
                    State
                  </Label>
                  <Select
                    value={donor.indicomp_off_branch_state}
                    onValueChange={(value) =>
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_off_branch_state: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.state_name}>
                          {state.state_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Office Pincode */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_off_branch_pin_code"
                    className="text-xs  font-medium"
                  >
                    Pincode
                  </Label>
                  <Input
                    id="indicomp_off_branch_pin_code"
                    name="indicomp_off_branch_pin_code"
                    value={donor.indicomp_off_branch_pin_code}
                    onChange={onInputChange}
                    maxLength={6}
                    placeholder="Enter pincode"
                  />
                </div>

                {/* Correspondence Preference */}
                <div className=" ">
                  <Label
                    htmlFor="indicomp_corr_preffer"
                    className="text-xs  font-medium"
                  >
                    Correspondence Preference *
                  </Label>
                  <Select
                    value={donor.indicomp_corr_preffer}
                    onValueChange={(value) =>
                      setDonor((prev) => ({
                        ...prev,
                        indicomp_corr_preffer: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Preference" />
                    </SelectTrigger>
                    <SelectContent>
                      {corrpreffer.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors?.indicomp_corr_preffer && (
                    <p className="text-red-500 text-xs">
                      {errors.indicomp_corr_preffer}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-6 border-t">
              <Button
                type="submit"
                disabled={isButtonDisabled || createDonorMutation.isPending}
                className="flex items-center gap-2"
              >
                {createDonorMutation.isPending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    Create Donor
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/donor/donors")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonorIndiviusalCreate;
