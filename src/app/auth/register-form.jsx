import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Info,
  Phone,
  Building,
  Heart,
  CheckCircle,
  GraduationCap,
  Home,
  Loader2,
} from "lucide-react";
import BASE_URL from "@/config/base-url";
import logoLogin from "@/assets/receipt/fts_log.png";

// Option Lists
const honorificList = ["Shri", "Smt.", "Kum", "Dr.", "Prof.", "Mr.", "Mrs.", "Ms."];
const genderList = ["Male", "Female", "Other"];
const belongsToList = [
  "Executive Committee",
  "Mahila Samiti",
  "Ekal Yuva",
  "Functional Committee",
];
const donorTypeList = ["Individual", "Life Member", "Patron", "Corporate"];
const sourceList = ["Direct", "Referral", "Event", "Online", "Other"];
const corrPrefList = ["Residence", "Office", "Digital"];
const bloodGroupList = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const maritalStatusList = ["Married", "Single", "Divorced", "Widowed"];
const membershipCategoryList = ["Annual Member", "Life Member", "Patron", "Executive Member"];
const educationList = ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "Doctorate / PhD", "Other"];

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Chandigarh"
];

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    // Chapter Selection
    chapterId: "",
    chapterCode: "",

    // Personal Details
    title: "",
    fullName: "",
    fatherName: "",
    motherName: "",
    gender: "",
    spouseName: "",
    dob: "",
    marriageDate: "",
    panCard: "",
    photo: null,
    remarks: "",
    isPromoter: "No",
    promoter: "",
    belongTo: "",
    source: "",
    donorType: "",
    type: "Individual",

    // Communication Details
    contactNumber: "",
    whatsappNumber: "",
    emailId: "",
    website: "",
    multipleMail: "",

    // Residence Address
    resHouseStreet: "",
    resArea: "",
    resLandmark: "",
    resCity: "",
    resState: "",
    resPincode: "",

    // Office Address
    offHouseStreet: "",
    offArea: "",
    offLandmark: "",
    offCity: "",
    offState: "",
    offPincode: "",
    corrPreference: "Residence",

    // Additional & Membership Details
    membershipCategory: "",
    highestEducation: "",
    occupation: "",
    bloodGroup: "",
    maritalStatus: "",

    // Spouse & Family Details
    spouseContactNumber: "",
    spouseWhatsappNumber: "",
    spouseDob: "",
    spousePanCard: "",
    childrenName: "",
    childrenDob: "",
    childrenBloodGroup: "",
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic API State
  const [chapters, setChapters] = useState([]);
  const [isChaptersLoading, setIsChaptersLoading] = useState(false);
  const [promoters, setPromoters] = useState([]);
  const [isPromotersLoading, setIsPromotersLoading] = useState(false);

  // Fetch Chapters on Component Mount
  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    setIsChaptersLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/getChapterForm`);
      const data = response.data?.data || response.data?.chapters || response.data || [];
      if (Array.isArray(data)) {
        setChapters(data);
      } else {
        setChapters([]);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
      toast.error("Failed to load chapters list");
    } finally {
      setIsChaptersLoading(false);
    }
  };

  // Fetch Promoters when Chapter selection changes
  const handleChapterChange = async (chapterValue) => {
    const selectedChapter = chapters.find(
      (c) => String(c.chapter_code || c.id || c.chapter_id) === String(chapterValue)
    );

    const chapterCode = String(selectedChapter?.chapter_code || chapterValue);
    const chapterId = String(selectedChapter?.id || selectedChapter?.chapter_id || chapterCode);

    setFormData((prev) => ({
      ...prev,
      chapterId: chapterId,
      chapterCode: chapterCode,
      promoter: "",
    }));

    if (chapterCode) {
      fetchPromoters(chapterCode);
    } else {
      setPromoters([]);
    }
  };

  const fetchPromoters = async (code) => {
    setIsPromotersLoading(true);
    try {
      const response = await axios.get(
        `${BASE_URL}/api/getAllActiveNewPromoter/${code}`
      );
      const data = response.data?.data;
      if (Array.isArray(data)) {
        setPromoters(data);
      } else {
        setPromoters([]);
      }
    } catch (error) {
      console.error("Error fetching promoters:", error);
      setPromoters([]);
    } finally {
      setIsPromotersLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, photo: file }));
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        chapter_id: formData.chapterId || formData.chapterCode,
        chapter_code: formData.chapterCode,
        indicomp_full_name: formData.fullName,
        title: formData.title,
        indicomp_is_promoter: formData.isPromoter,
        indicomp_type: formData.type,
        indicomp_pan_no: formData.panCard,
        indicomp_father_name: formData.fatherName,
        indicomp_mother_name: formData.motherName,
        indicomp_gender: formData.gender,
        indicomp_spouse_name: formData.spouseName,
        indicomp_dob_annualday: formData.dob,
        indicomp_doa: formData.marriageDate,
        indicomp_remarks: formData.remarks,
        indicomp_promoter: formData.promoter,
        indicomp_belongs_to: formData.belongTo,
        indicomp_source: formData.source,
        indicomp_donor_type: formData.donorType,
        indicomp_mobile_phone: formData.contactNumber,
        indicomp_mobile_whatsapp: formData.whatsappNumber,
        indicomp_email: formData.emailId,
        indicomp_website: formData.website,
        indicomp_multiple_email: formData.multipleMail,
        indicomp_res_reg_address: formData.resHouseStreet,
        indicomp_res_reg_area: formData.resArea,
        indicomp_res_reg_ladmark: formData.resLandmark,
        indicomp_res_reg_city: formData.resCity,
        indicomp_res_reg_state: formData.resState,
        indicomp_res_reg_pin_code: formData.resPincode,
        indicomp_off_branch_address: formData.offHouseStreet,
        indicomp_off_branch_area: formData.offArea,
        indicomp_off_branch_ladmark: formData.offLandmark,
        indicomp_off_branch_city: formData.offCity,
        indicomp_off_branch_state: formData.offState,
        indicomp_off_branch_pin_code: formData.offPincode,
        indicomp_corr_preffer: formData.corrPreference,

        // Additional family & educational details
        membership_category: formData.membershipCategory,
        highest_education: formData.highestEducation,
        occupation: formData.occupation,
        blood_group: formData.bloodGroup,
        marital_status: formData.maritalStatus,
        spouse_contact_number: formData.spouseContactNumber,
        spouse_whatsapp_number: formData.spouseWhatsappNumber,
        spouse_dob: formData.spouseDob,
        spouse_pan_card: formData.spousePanCard,
        children_name: formData.childrenName,
        children_dob: formData.childrenDob,
        children_blood_group: formData.childrenBloodGroup,
      };

      const token = Cookies.get("token");
      const requestHeaders = {
        "Content-Type": "application/json",
      };
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${BASE_URL}/api/panel-donor-form`,
        payload,
        {
          headers: requestHeaders,
        }
      );

      if (
        response.status === 200 ||
        response.status === 201 ||
        response.data?.code === 201
      ) {
        toast.success(
          response.data?.message || "Donor Created Successfully."
        );
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(response.data?.message || "Failed to submit registration");
      }
    } catch (error) {
      console.error("Form submission error:", error);

      if (error.response?.status === 422) {
        const validationErrors = error.response.data?.errors;
        if (validationErrors && typeof validationErrors === "object") {
          const firstKey = Object.keys(validationErrors)[0];
          const firstErrList = validationErrors[firstKey];
          const msg = Array.isArray(firstErrList) ? firstErrList[0] : firstErrList;
          toast.error(`Validation Error (${firstKey}): ${msg}`);
          return;
        }
      }

      const serverMessage =
        error.response?.data?.message ||
        (typeof error.response?.data === "string" ? error.response.data : null);

      if (serverMessage) {
        toast.error(serverMessage);
      } else if (error.response?.status === 500) {
        toast.error(
          "Server Error (500): The backend panel-donor-form endpoint crashed. Please notify backend team."
        );
      } else {
        toast.error("An error occurred while submitting the form");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4 md:p-6 text-slate-800">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4">
        {/* Header Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <img src={logoLogin} alt="FTS Logo" className="h-10 sm:h-12 w-auto object-contain" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Registration Form</h1>
              <p className="text-xs text-slate-500">Submit applicant profile details</p>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="border border-slate-200 shadow-sm bg-white rounded-lg">
          <CardContent className="p-3 sm:p-5 md:p-6">
            {isSubmitted ? (
              <div className="text-center py-12 sm:py-16 space-y-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Registration Submitted Successfully!</h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  Thank you for filling out the registration form. Your details have been registered in our system.
                </p>
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setPhotoPreview(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white mt-4 w-full sm:w-auto"
                >
                  Fill Another Form
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

                {/* 1. PERSONAL DETAILS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm p-2 rounded-md font-semibold bg-blue-600 text-white">
                    <Info className="w-4 h-4" />
                    Personal Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Chapter Dropdown */}
                    <div>
                      <Label htmlFor="chapter" className="text-xs font-medium text-slate-700">
                        Chapter
                      </Label>
                      <Select
                        value={formData.chapterCode}
                        onValueChange={handleChapterChange}
                      >
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder={isChaptersLoading ? "Loading chapters..." : "Select Chapter"} />
                        </SelectTrigger>
                        <SelectContent>
                          {chapters.map((ch) => {
                            const val = String(ch.chapter_code || ch.id || ch.chapter_id);
                            const label = ch.chapter_name || ch.chapter || ch.name || val;
                            return (
                              <SelectItem key={val} value={val} className="text-xs">
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title */}
                    <div>
                      <Label htmlFor="title" className="text-xs font-medium text-slate-700">
                        Title
                      </Label>
                      <Select value={formData.title} onValueChange={(val) => handleSelectChange("title", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Title" />
                        </SelectTrigger>
                        <SelectContent>
                          {honorificList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Applicant Name / Full Name */}
                    <div>
                      <Label htmlFor="fullName" className="text-xs font-medium text-slate-700">
                        Applicant Name
                      </Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Enter applicant full name"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Father Name */}
                    <div>
                      <Label htmlFor="fatherName" className="text-xs font-medium text-slate-700">
                        Father Name
                      </Label>
                      <Input
                        id="fatherName"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleChange}
                        placeholder="Enter father's name"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Mother Name */}
                    <div>
                      <Label htmlFor="motherName" className="text-xs font-medium text-slate-700">
                        Mother Name
                      </Label>
                      <Input
                        id="motherName"
                        name="motherName"
                        value={formData.motherName}
                        onChange={handleChange}
                        placeholder="Enter mother's name"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <Label htmlFor="gender" className="text-xs font-medium text-slate-700">
                        Gender
                      </Label>
                      <Select value={formData.gender} onValueChange={(val) => handleSelectChange("gender", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {genderList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Spouse Name */}
                    <div>
                      <Label htmlFor="spouseName" className="text-xs font-medium text-slate-700">
                        Spouse Name
                      </Label>
                      <Input
                        id="spouseName"
                        name="spouseName"
                        value={formData.spouseName}
                        onChange={handleChange}
                        placeholder="Enter spouse name"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <Label htmlFor="dob" className="text-xs font-medium text-slate-700">
                        Date of Birth
                      </Label>
                      <Input
                        id="dob"
                        name="dob"
                        type="date"
                        value={formData.dob}
                        onChange={handleChange}
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Marriage Date / Date of Anniversary */}
                    <div>
                      <Label htmlFor="marriageDate" className="text-xs font-medium text-slate-700">
                        Marriage Date
                      </Label>
                      <Input
                        id="marriageDate"
                        name="marriageDate"
                        type="date"
                        value={formData.marriageDate}
                        onChange={handleChange}
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* PAN Card */}
                    <div>
                      <Label htmlFor="panCard" className="text-xs font-medium text-slate-700">
                        PAN Card
                      </Label>
                      <Input
                        id="panCard"
                        name="panCard"
                        value={formData.panCard}
                        onChange={handleChange}
                        placeholder="Enter PAN number"
                        maxLength={10}
                        className="h-9 text-xs mt-1 border-slate-300 uppercase w-full"
                      />
                    </div>

                    {/* Passport Size Photograph */}
                    <div>
                      <Label htmlFor="photo" className="text-xs font-medium text-slate-700">
                        Passport Size Photograph
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id="photo"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="h-9 text-xs border-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700 w-full"
                        />
                        {photoPreview && (
                          <img src={photoPreview} alt="Preview" className="h-9 w-9 rounded object-cover border border-slate-300 shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div>
                      <Label htmlFor="remarks" className="text-xs font-medium text-slate-700">
                        Remarks
                      </Label>
                      <Input
                        id="remarks"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        placeholder="Enter remarks"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Is Promoter? */}
                    <div>
                      <Label htmlFor="isPromoter" className="text-xs font-medium text-slate-700">
                        Is Promoter?
                      </Label>
                      <Select value={formData.isPromoter} onValueChange={(val) => handleSelectChange("isPromoter", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Yes" className="text-xs">Yes</SelectItem>
                          <SelectItem value="No" className="text-xs">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Promoter (Dynamic from Chapter) */}
                    <div>
                      <Label htmlFor="promoter" className="text-xs font-medium text-slate-700">
                        Promoter
                      </Label>
                      {promoters.length > 0 ? (
                        <Select
                          value={formData.promoter}
                          onValueChange={(val) => handleSelectChange("promoter", val)}
                        >
                          <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                            <SelectValue placeholder={isPromotersLoading ? "Loading promoters..." : "Select Promoter"} />
                          </SelectTrigger>
                          <SelectContent>
                            {promoters.map((p, index) => {
                              const name = p.indicomp_full_name || p.promoter_name || p.name || (typeof p === "string" ? p : "");
                              const titlePrefix = p.title ? `${p.title} ` : "";
                              const val = String(name || p.id || index);
                              const label = name ? `${titlePrefix}${name}` : val;
                              return (
                                <SelectItem key={`${val}-${index}`} value={val} className="text-xs">
                                  {label}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="promoter"
                          name="promoter"
                          value={formData.promoter}
                          onChange={handleChange}
                          placeholder={
                            isPromotersLoading
                              ? "Loading promoters..."
                              : formData.chapterCode
                                ? "No active promoters for this chapter (enter name)"
                                : "Select chapter first"
                          }
                          className="h-9 text-xs mt-1 border-slate-300 w-full"
                        />
                      )}
                    </div>

                    {/* Belong To */}
                    <div>
                      <Label htmlFor="belongTo" className="text-xs font-medium text-slate-700">
                        Belong To
                      </Label>
                      <Select value={formData.belongTo} onValueChange={(val) => handleSelectChange("belongTo", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Belong To" />
                        </SelectTrigger>
                        <SelectContent>
                          {belongsToList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Source */}
                    <div>
                      <Label htmlFor="source" className="text-xs font-medium text-slate-700">
                        Source
                      </Label>
                      <Select value={formData.source} onValueChange={(val) => handleSelectChange("source", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Source" />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Donor Type */}
                    <div>
                      <Label htmlFor="donorType" className="text-xs font-medium text-slate-700">
                        Donor Type
                      </Label>
                      <Select value={formData.donorType} onValueChange={(val) => handleSelectChange("donorType", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Donor Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {donorTypeList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Type */}
                    <div>
                      <Label htmlFor="type" className="text-xs font-medium text-slate-700">
                        Type
                      </Label>
                      <Input
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        readOnly
                        className="h-9 text-xs mt-1 border-slate-300 bg-slate-50 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. COMMUNICATION DETAILS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm p-2 rounded-md font-semibold bg-blue-600 text-white">
                    <Phone className="w-4 h-4" />
                    Communication Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Contact Number */}
                    <div>
                      <Label htmlFor="contactNumber" className="text-xs font-medium text-slate-700">
                        Contact Number
                      </Label>
                      <Input
                        id="contactNumber"
                        name="contactNumber"
                        type="tel"
                        value={formData.contactNumber}
                        onChange={handleChange}
                        placeholder="Enter mobile number"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Whatsapp Number */}
                    <div>
                      <Label htmlFor="whatsappNumber" className="text-xs font-medium text-slate-700">
                        Whatsapp Number
                      </Label>
                      <Input
                        id="whatsappNumber"
                        name="whatsappNumber"
                        type="tel"
                        value={formData.whatsappNumber}
                        onChange={handleChange}
                        placeholder="Enter WhatsApp number"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Email Id */}
                    <div>
                      <Label htmlFor="emailId" className="text-xs font-medium text-slate-700">
                        Email Id
                      </Label>
                      <Input
                        id="emailId"
                        name="emailId"
                        type="email"
                        value={formData.emailId}
                        onChange={handleChange}
                        placeholder="Enter email address"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Website */}
                    <div>
                      <Label htmlFor="website" className="text-xs font-medium text-slate-700">
                        Website
                      </Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        value={formData.website}
                        onChange={handleChange}
                        placeholder="Enter website URL"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Multiple mail */}
                    <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-4">
                      <Label htmlFor="multipleMail" className="text-xs font-medium text-slate-700">
                        Multiple mail <span className="text-slate-400 font-normal">(comma separated, e.g. abc@gmail.com, xyz@gmail.com)</span>
                      </Label>
                      <Input
                        id="multipleMail"
                        name="multipleMail"
                        value={formData.multipleMail}
                        onChange={handleChange}
                        placeholder="e.g. abc@gmail.com, xyz@gmail.com"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. RESIDENCE ADDRESS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm p-2 rounded-md font-semibold bg-blue-600 text-white">
                    <Home className="w-4 h-4" />
                    Residence Address
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* House & Street Number */}
                    <div>
                      <Label htmlFor="resHouseStreet" className="text-xs font-medium text-slate-700">
                        House & Street Number
                      </Label>
                      <Input
                        id="resHouseStreet"
                        name="resHouseStreet"
                        value={formData.resHouseStreet}
                        onChange={handleChange}
                        placeholder="Enter house / street number"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Area */}
                    <div>
                      <Label htmlFor="resArea" className="text-xs font-medium text-slate-700">
                        Area
                      </Label>
                      <Input
                        id="resArea"
                        name="resArea"
                        value={formData.resArea}
                        onChange={handleChange}
                        placeholder="Enter area"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Landmark */}
                    <div>
                      <Label htmlFor="resLandmark" className="text-xs font-medium text-slate-700">
                        Landmark
                      </Label>
                      <Input
                        id="resLandmark"
                        name="resLandmark"
                        value={formData.resLandmark}
                        onChange={handleChange}
                        placeholder="Enter landmark"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <Label htmlFor="resCity" className="text-xs font-medium text-slate-700">
                        City
                      </Label>
                      <Input
                        id="resCity"
                        name="resCity"
                        value={formData.resCity}
                        onChange={handleChange}
                        placeholder="Enter city"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <Label htmlFor="resState" className="text-xs font-medium text-slate-700">
                        State
                      </Label>
                      <Select value={formData.resState} onValueChange={(val) => handleSelectChange("resState", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {indianStates.map((state) => (
                            <SelectItem key={state} value={state} className="text-xs">
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pincode */}
                    <div>
                      <Label htmlFor="resPincode" className="text-xs font-medium text-slate-700">
                        Pincode
                      </Label>
                      <Input
                        id="resPincode"
                        name="resPincode"
                        value={formData.resPincode}
                        onChange={handleChange}
                        placeholder="Enter pincode"
                        maxLength={6}
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. OFFICE ADDRESS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm p-2 rounded-md font-semibold bg-blue-600 text-white">
                    <Building className="w-4 h-4" />
                    Office Address
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Office & Street Number */}
                    <div>
                      <Label htmlFor="offHouseStreet" className="text-xs font-medium text-slate-700">
                        Office & Street Number
                      </Label>
                      <Input
                        id="offHouseStreet"
                        name="offHouseStreet"
                        value={formData.offHouseStreet}
                        onChange={handleChange}
                        placeholder="Enter office address"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Area */}
                    <div>
                      <Label htmlFor="offArea" className="text-xs font-medium text-slate-700">
                        Area
                      </Label>
                      <Input
                        id="offArea"
                        name="offArea"
                        value={formData.offArea}
                        onChange={handleChange}
                        placeholder="Enter area"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Landmark */}
                    <div>
                      <Label htmlFor="offLandmark" className="text-xs font-medium text-slate-700">
                        Landmark
                      </Label>
                      <Input
                        id="offLandmark"
                        name="offLandmark"
                        value={formData.offLandmark}
                        onChange={handleChange}
                        placeholder="Enter landmark"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* City */}
                    <div>
                      <Label htmlFor="offCity" className="text-xs font-medium text-slate-700">
                        City
                      </Label>
                      <Input
                        id="offCity"
                        name="offCity"
                        value={formData.offCity}
                        onChange={handleChange}
                        placeholder="Enter city"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <Label htmlFor="offState" className="text-xs font-medium text-slate-700">
                        State
                      </Label>
                      <Select value={formData.offState} onValueChange={(val) => handleSelectChange("offState", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent>
                          {indianStates.map((state) => (
                            <SelectItem key={state} value={state} className="text-xs">
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Pincode */}
                    <div>
                      <Label htmlFor="offPincode" className="text-xs font-medium text-slate-700">
                        Pincode
                      </Label>
                      <Input
                        id="offPincode"
                        name="offPincode"
                        value={formData.offPincode}
                        onChange={handleChange}
                        placeholder="Enter pincode"
                        maxLength={6}
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Correspondence Preference */}
                    <div>
                      <Label htmlFor="corrPreference" className="text-xs font-medium text-slate-700">
                        Correspondence Preference
                      </Label>
                      <Select value={formData.corrPreference} onValueChange={(val) => handleSelectChange("corrPreference", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Preference" />
                        </SelectTrigger>
                        <SelectContent>
                          {corrPrefList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 5. MEMBERSHIP & EDUCATIONAL DETAILS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm p-2 rounded-md font-semibold bg-blue-600 text-white">
                    <GraduationCap className="w-4 h-4" />
                    Educational & Membership Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Membership Category */}
                    <div>
                      <Label htmlFor="membershipCategory" className="text-xs font-medium text-slate-700">
                        Membership Category
                      </Label>
                      <Select value={formData.membershipCategory} onValueChange={(val) => handleSelectChange("membershipCategory", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {membershipCategoryList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Highest Educational Qualification */}
                    <div>
                      <Label htmlFor="highestEducation" className="text-xs font-medium text-slate-700">
                        Highest Educational Qualification
                      </Label>
                      <Select value={formData.highestEducation} onValueChange={(val) => handleSelectChange("highestEducation", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          {educationList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Occupation */}
                    <div>
                      <Label htmlFor="occupation" className="text-xs font-medium text-slate-700">
                        Occupation
                      </Label>
                      <Input
                        id="occupation"
                        name="occupation"
                        value={formData.occupation}
                        onChange={handleChange}
                        placeholder="Enter occupation"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Blood Group */}
                    <div>
                      <Label htmlFor="bloodGroup" className="text-xs font-medium text-slate-700">
                        Blood Group
                      </Label>
                      <Select value={formData.bloodGroup} onValueChange={(val) => handleSelectChange("bloodGroup", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Blood Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloodGroupList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Marital Status */}
                    <div>
                      <Label htmlFor="maritalStatus" className="text-xs font-medium text-slate-700">
                        Marital Status
                      </Label>
                      <Select value={formData.maritalStatus} onValueChange={(val) => handleSelectChange("maritalStatus", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {maritalStatusList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 6. SPOUSE & FAMILY DETAILS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm p-2 rounded-md font-semibold bg-blue-600 text-white">
                    <Heart className="w-4 h-4" />
                    Spouse & Family Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Spouse Contact Number */}
                    <div>
                      <Label htmlFor="spouseContactNumber" className="text-xs font-medium text-slate-700">
                        Spouse Contact Number
                      </Label>
                      <Input
                        id="spouseContactNumber"
                        name="spouseContactNumber"
                        type="tel"
                        value={formData.spouseContactNumber}
                        onChange={handleChange}
                        placeholder="Enter spouse mobile number"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Spouse Whatsapp Number */}
                    <div>
                      <Label htmlFor="spouseWhatsappNumber" className="text-xs font-medium text-slate-700">
                        Spouse Whatsapp Number
                      </Label>
                      <Input
                        id="spouseWhatsappNumber"
                        name="spouseWhatsappNumber"
                        type="tel"
                        value={formData.spouseWhatsappNumber}
                        onChange={handleChange}
                        placeholder="Enter spouse WhatsApp"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Spouse Date of Birth */}
                    <div>
                      <Label htmlFor="spouseDob" className="text-xs font-medium text-slate-700">
                        Spouse Date of Birth
                      </Label>
                      <Input
                        id="spouseDob"
                        name="spouseDob"
                        type="date"
                        value={formData.spouseDob}
                        onChange={handleChange}
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Spouse PAN Card */}
                    <div>
                      <Label htmlFor="spousePanCard" className="text-xs font-medium text-slate-700">
                        Spouse PAN Card
                      </Label>
                      <Input
                        id="spousePanCard"
                        name="spousePanCard"
                        value={formData.spousePanCard}
                        onChange={handleChange}
                        placeholder="Enter spouse PAN"
                        maxLength={10}
                        className="h-9 text-xs mt-1 border-slate-300 uppercase w-full"
                      />
                    </div>

                    {/* Children Name */}
                    <div>
                      <Label htmlFor="childrenName" className="text-xs font-medium text-slate-700">
                        Children Name
                      </Label>
                      <Input
                        id="childrenName"
                        name="childrenName"
                        value={formData.childrenName}
                        onChange={handleChange}
                        placeholder="Enter children name"
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Children Date Of Birth */}
                    <div>
                      <Label htmlFor="childrenDob" className="text-xs font-medium text-slate-700">
                        Children Date Of Birth
                      </Label>
                      <Input
                        id="childrenDob"
                        name="childrenDob"
                        type="date"
                        value={formData.childrenDob}
                        onChange={handleChange}
                        className="h-9 text-xs mt-1 border-slate-300 w-full"
                      />
                    </div>

                    {/* Children Blood Group */}
                    <div>
                      <Label htmlFor="childrenBloodGroup" className="text-xs font-medium text-slate-700">
                        Children Blood Group
                      </Label>
                      <Select value={formData.childrenBloodGroup} onValueChange={(val) => handleSelectChange("childrenBloodGroup", val)}>
                        <SelectTrigger className="h-9 text-xs mt-1 border-slate-300 w-full">
                          <SelectValue placeholder="Select Blood Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {bloodGroupList.map((item) => (
                            <SelectItem key={item} value={item} className="text-xs">
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-10 text-sm font-semibold rounded-md shadow-sm transition-all w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? "Submitting..." : "Submit Registration"}
                  </Button>
                </div>

              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
