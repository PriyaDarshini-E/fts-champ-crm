import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import BASE_URL from "@/config/base-url";
import Cookies from "js-cookie";

import DocSetting from "@/components/settings/doc-setting";
import ProfileSetting from "@/components/settings/profile-setting";

const Settings = () => {

  const queryClient = useQueryClient();
  const token = Cookies.get("token");
  const fileInputRef = useRef(null);

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/api/fetch-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    staleTime: 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000, 
    refetchOnMount: false, 
    refetchOnWindowFocus: false, 
    refetchOnReconnect: false, 
  });

  const user = profileData?.data;
  const imageUrls = profileData?.image_url;

  const [editProfile, setEditProfile] = useState({
    first_name: "",
    phone: "",
    email: "",
    image: null,
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      setEditProfile({
        first_name: user.first_name || "",
        phone: user.phone || "",
        email: user.email || "",
        image: null, 
      });
    }
  }, [user]);

 
  const getUserImageUrl = () => {
    const datenow = new Date().getTime(); 
    if (!user?.image ) {
      const noImageUrl = imageUrls?.find((img) => img.image_for === "No Image")?.image_url || "";
      return noImageUrl;
    }
    const userImageUrl = `${imageUrls?.find((img) => img.image_for === "User")?.image_url}${user.image}`;
    return `${userImageUrl}?t=${datenow}`;
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditProfile((prev) => ({ ...prev, image: file }));
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await axios.post(`${BASE_URL}/api/update-profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Profile updated successfully!");
      queryClient.invalidateQueries(["profile"]);
    },
    onError: (error) => {
      toast.error(error.response.data.message || "Failed to update profile");
      console.error("Update profile error:", error);
    },
  });

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("first_name", editProfile.first_name);
    formData.append("phone", editProfile.phone);
    formData.append("email", editProfile.email);
    if (editProfile.image) {
      formData.append("image", editProfile.image);
    }
    updateProfileMutation.mutate(formData);
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData) => {
      const response = await axios.post(
        `${BASE_URL}/api/panel-change-password`,
        {
          old_password: passwordData.oldPassword,
          password: passwordData.newPassword,
          confirm_password: passwordData.confirmPassword,
          username: user?.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.code === 201) {
        toast.success(data.message || "Password updated successfully!");
        setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.message  || "Unexpected error occurred");
      }
    },
    onError: (error) => {
      toast.error(error.response.data.message || "Please enter valid old password");
    },
  });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (passwordData.oldPassword === passwordData.newPassword) {
      toast.error("Same Old Password is not allowed");
      return;
    }
    changePasswordMutation.mutate(passwordData);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-8">Loading...</div>;
  }

  return (
    <div className="p-2 max-w-6xl mx-auto ">
    

      <Tabs defaultValue="profile" className="w-full mt-2">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="doc">HelpDesk</TabsTrigger>
       
        </TabsList>

        <TabsContent value="profile" className="space-y-2">
      <ProfileSetting
    user={user}
    editProfile={editProfile}
    setEditProfile={setEditProfile}
    handleProfileUpdate={handleProfileUpdate}
    passwordData={passwordData}
    setPasswordData={setPasswordData}
    handlePasswordChange={handlePasswordChange}
    updateProfileMutation={updateProfileMutation}
    changePasswordMutation={changePasswordMutation}
    fileInputRef={fileInputRef}
    handleImageChange={handleImageChange}
    getUserImageUrl={getUserImageUrl}
    
  />
        </TabsContent>

        <TabsContent value="doc">
         <DocSetting/>
        </TabsContent>

      
      </Tabs>

      
    </div>
  );
};

export default Settings;
