import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReceiptDownload from "@/components/all-download/receipt/receipt-download";
import DonorDownload from "@/components/all-download/donor/donor-download";
import TeamDownload from "@/components/all-download/team/team-download";
import OtsDownload from "@/components/all-download/ots/ots-download";
import SchoolDownload from "@/components/all-download/school/school-download";

import AllReceiptDownload from "@/components/all-download/all-receipt/all-receipt";

const AllDownload = () => {
  return (
    <div className="p-4 max-w-full mx-auto">
      <Tabs defaultValue="all-receipt" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-2 sticky top-16 z-10 shadow-sm">
          <TabsTrigger value="all-receipt">All Receipt</TabsTrigger>
          <TabsTrigger value="receipt">Receipt</TabsTrigger>
          <TabsTrigger value="donor">Donor</TabsTrigger>
          <TabsTrigger value="school">School</TabsTrigger>
          <TabsTrigger value="ots">EV</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="all-receipt" className="space-y-2">
          <AllReceiptDownload />
        </TabsContent>

        <TabsContent value="receipt" className="space-y-2">
          <ReceiptDownload />
        </TabsContent>

        <TabsContent value="donor" className="space-y-2">
          <DonorDownload />
        </TabsContent>

        <TabsContent value="school" className="space-y-2">
          <SchoolDownload />
        </TabsContent>

        <TabsContent value="ots" className="space-y-2">
          <OtsDownload />
        </TabsContent>

        <TabsContent value="team" className="space-y-2">
          <TeamDownload />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AllDownload;
