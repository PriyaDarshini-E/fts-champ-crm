import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Save,
  X,
  Loader2,
  Info,
  Upload,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import BASE_URL from "@/config/base-url";

const EventEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    event_name: "",
    event_description: "",
    event_date: "",
    event_time: "",
    event_type: "",
    event_for: "",
    event_image: null,
    event_status: "Active",
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [eventForOptions, setEventForOptions] = useState([]);
  const [existingImage, setExistingImage] = useState(null);

  const eventTypeOptions = [
    {
      value: "Meeting",
      label: "Meeting",
      eventForOptions: [
        { value: "Executive Committee", label: "Executive Committee" },
        { value: "Youth Committee", label: "Youth Committee" },
        { value: "Management Committee", label: "Management Committee" },
      ],
    },
    {
      value: "Public Event",
      label: "Public Event",
      eventForOptions: [
        { value: "Women", label: "Women" },
        { value: "Youth", label: "Youth" },
        { value: "All", label: "All" },
      ],
    },
  ];

  const {
    data: eventData,
    isLoading: eventLoading,
    error,
  } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/api/event/${id}`, {
        headers: { Authorization: `Bearer ${Cookies.get("token")}` },
      });
      return response.data.data || response.data?.event || response.data || null;
    },
    enabled: !!id,
  });

  const updateEventForOptions = (eventType) => {
    const selectedEventType = eventTypeOptions.find(
      (type) => type.value.toLowerCase().replace(/_/g, " ").trim() === (eventType || "").toString().toLowerCase().replace(/_/g, " ").trim(),
    );
    if (selectedEventType) {
      setEventForOptions(selectedEventType.eventForOptions);
    } else {
      setEventForOptions([]);
    }
  };

  useEffect(() => {
    if (eventData) {
      const eventType = eventData.event_type || "";
      const rawEventFor = eventData.event_for || eventData.event_category || eventData.category || "";

      const selectedEventType = eventTypeOptions.find(
        (type) => type.value.toLowerCase().replace(/_/g, " ").trim() === eventType.toString().toLowerCase().replace(/_/g, " ").trim()
      );

      let options = selectedEventType
        ? [...selectedEventType.eventForOptions]
        : [];

      let matchedCategory = rawEventFor;
      if (rawEventFor) {
        const found = options.find(
          (opt) => opt.value.toLowerCase().replace(/_/g, " ").trim() === rawEventFor.toString().toLowerCase().replace(/_/g, " ").trim()
        );
        if (found) {
          matchedCategory = found.value;
        } else {
          options.push({ value: rawEventFor, label: rawEventFor });
          matchedCategory = rawEventFor;
        }
      }

      setEventForOptions(options);

      const formattedData = {
        event_name: eventData.event_name || "",
        event_description: eventData.event_description || "",
        event_date: eventData.event_date
          ? eventData.event_date.split("T")[0]
          : "",
        event_time: eventData.event_time || "",
        event_type: selectedEventType ? selectedEventType.value : eventType,
        event_for: matchedCategory,
        event_image: null,
        event_status:
          eventData.event_status === "Active" || eventData.event_status === "active" ? "Active" : "Inactive",
      };

      setFormData(formattedData);

      if (eventData.event_image) {
        setExistingImage(`${BASE_URL}/storage/${eventData.event_image}`);
      }
    }
  }, [eventData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.event_name.trim()) {
      newErrors.event_name = "Event name is required";
    } else if (formData.event_name.length < 3) {
      newErrors.event_name = "Event name must be at least 3 characters";
    }

    if (!formData.event_description.trim()) {
      newErrors.event_description = "Event description is required";
    } else if (formData.event_description.length < 10) {
      newErrors.event_description =
        "Event description must be at least 10 characters";
    }

    if (!formData.event_date) {
      newErrors.event_date = "Event date is required";
    } else {
      const selectedDate = new Date(formData.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.event_date = "Event date cannot be in the past";
      }
    }

    if (!formData.event_time) {
      newErrors.event_time = "Event time is required";
    }

    if (!formData.event_type) {
      newErrors.event_type = "Event type is required";
    }

    if (!formData.event_for) {
      newErrors.event_for = "Event category is required";
    }

    if (formData.event_image && formData.event_image instanceof File) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      const maxSize = 5 * 1024 * 1024;

      if (!validTypes.includes(formData.event_image.type)) {
        newErrors.event_image = "Please select a valid image (JPEG, PNG, GIF)";
      } else if (formData.event_image.size > maxSize) {
        newErrors.event_image = "Image size must be less than 5MB";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const formDataToSend = new FormData();

      Object.keys(data).forEach((key) => {
        if (key === "event_image" && data[key] instanceof File) {
          formDataToSend.append("event_image", data[key]);
        } else if (key === "event_image" && data[key] === null) {
          formDataToSend.append("event_image", "");
        } else if (data[key] !== null && data[key] !== undefined) {
          formDataToSend.append(key, data[key]);
        }
      });

      formDataToSend.append("_method", "PUT");

      return axios.post(`${BASE_URL}/api/event/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });
    },
    onSuccess: (response) => {
      if (response.data.code === 200 || response.status === 200) {
        toast.success("Event updated successfully!");
        queryClient.invalidateQueries(["eventList"]);
        queryClient.invalidateQueries(["event", id]);
        navigate("/event-list");
      } else if (response.data.code === 400) {
        toast.error(response.data.message || "Validation error");
      } else {
        toast.error("Unexpected error occurred");
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update event");
    },
  });

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleEventTypeChange = (value) => {
    handleInputChange("event_type", value);
    handleInputChange("event_for", "");
    updateEventForOptions(value);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
      const maxSize = 5 * 1024 * 1024;

      if (!validTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          event_image: "Please select a valid image (JPEG, PNG, GIF)",
        }));
        return;
      }

      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          event_image: "Image size must be less than 5MB",
        }));
        return;
      }

      setFormData((prev) => ({ ...prev, event_image: file }));
      setExistingImage(null);
      setErrors((prev) => ({ ...prev, event_image: "" }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, event_image: null }));
    setImagePreview(null);
    setExistingImage(null);
    setErrors((prev) => ({ ...prev, event_image: "" }));

    const fileInput = document.getElementById("event_image");
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    const submitData = {
      event_name: formData.event_name,
      event_description: formData.event_description,
      event_date: formData.event_date,
      event_time: formData.event_time,
      event_type: formData.event_type,
      event_for: formData.event_for,
      event_status: formData.event_status,
      event_image: formData.event_image,
    };

    updateMutation.mutate(submitData);
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading event data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">
            Error loading event
          </h2>
          <p className="text-sm text-gray-600 mt-2">{error.message}</p>
          <Button
            onClick={() => navigate("/event-list")}
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-2">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Edit className="text-muted-foreground w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-md font-semibold text-gray-900">
                    Edit Event
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Update event information and details
                  </p>
                </div>
                <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                  ID: {id}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
            <Button
              onClick={() => navigate("/event-list")}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </Button>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} noValidate className="space-y-2">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm p-1 rounded-md px-1 font-medium bg-[var(--team-color)] text-white mb-4">
              <Info className="w-4 h-4" />
              Event Details
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="">
                <Label htmlFor="event_name" className="text-xs font-medium">
                  Event Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event_name"
                  value={formData.event_name}
                  onChange={(e) =>
                    handleInputChange("event_name", e.target.value)
                  }
                  placeholder="Enter event name"
                  className={errors.event_name ? "border-red-500" : ""}
                  required
                />
                {errors.event_name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.event_name}
                  </p>
                )}
              </div>

              <div className="">
                <Label htmlFor="event_date" className="text-xs font-medium">
                  Event Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) =>
                    handleInputChange("event_date", e.target.value)
                  }
                  min={getTodayDate()}
                  className={errors.event_date ? "border-red-500" : ""}
                  required
                />
                {errors.event_date && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.event_date}
                  </p>
                )}
              </div>

              <div className="">
                <Label htmlFor="event_time" className="text-xs font-medium">
                  Event Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) =>
                    handleInputChange("event_time", e.target.value)
                  }
                  className={errors.event_time ? "border-red-500" : ""}
                  required
                />
                {errors.event_time && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.event_time}
                  </p>
                )}
              </div>

              <div className="">
                <Label htmlFor="event_type" className="text-xs font-medium">
                  Event Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.event_type}
                  onValueChange={handleEventTypeChange}
                  required
                >
                  <SelectTrigger
                    className={errors.event_type ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.event_type && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.event_type}
                  </p>
                )}
              </div>

              <div className="">
                <Label htmlFor="event_for" className="text-xs font-medium">
                  Event Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.event_for}
                  onValueChange={(value) =>
                    handleInputChange("event_for", value)
                
                  }
                  disabled={!formData.event_type}
                  required
                >
                  <SelectTrigger
                    className={errors.event_for ? "border-red-500" : ""}
                  >
                    <SelectValue
                      placeholder={
                        formData.event_type
                          ? "Select category"
                          : "Select event type first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eventForOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.event_for && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.event_for}
                  </p>
                )}
              </div>

              <div className="">
                <Label htmlFor="event_status" className="text-xs font-medium">
                  Event Status
                </Label>
                <Select
                  value={formData.event_status}
                  onValueChange={(value) =>
                    handleInputChange("event_status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue>
                      {formData.event_status === "Active"
                        ? "Active"
                        : "Inactive"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Label htmlFor="event_image" className="text-xs font-medium">
                  Event Image
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="event_image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                  </div>
                  {errors.event_image && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.event_image}
                    </p>
                  )}

                  {existingImage && !imagePreview && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative">
                        <img
                          src={existingImage}
                          alt="Current Event"
                          className="h-32 w-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                          onClick={removeImage}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-blue-600">
                        Current image (click X to remove)
                      </span>
                    </div>
                  )}

                  {imagePreview && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="New Event Preview"
                          className="h-32 w-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0"
                          onClick={removeImage}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <span className="text-xs text-green-600">
                        New image selected
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-3">
                <Label
                  htmlFor="event_description"
                  className="text-xs font-medium"
                >
                  Event Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="event_description"
                  value={formData.event_description}
                  onChange={(e) =>
                    handleInputChange("event_description", e.target.value)
                  }
                  placeholder="Enter event description"
                  className={`min-h-[120px] ${errors.event_description ? "border-red-500" : ""}`}
                  required
                />
                {errors.event_description && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.event_description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/event-list")}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {updateMutation.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Update Event
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EventEdit;
