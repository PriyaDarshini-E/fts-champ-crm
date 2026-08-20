import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Moment from "moment";
import { Download, Eye, ArrowUpDown, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as XLSX from "xlsx";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import Cookies from "js-cookie";
import BASE_URL from "@/config/base-url";
import { MemoizedSelect } from "@/components/common/memoized-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFetchChapterActive,
  useFetchDataSource,
  useFetchPromoter,
} from "@/hooks/use-api";
import { DOWNLOAD_ALL_RECEIPT } from "@/api";

const AllReceiptDownload = () => {
  const token = Cookies.get("token");

  const [formData, setFormData] = useState({
    receipt_from_date: Moment().startOf("month").format("YYYY-MM-DD"),
    receipt_to_date: Moment().format("YYYY-MM-DD"),
    receipt_donation_type: "",
    receipt_exemption_type: "",
    receipt_amount_range: "0-100000000",
    receipt_ots_range_from: "0",
    receipt_ots_range_to: "5000",
    indicomp_donor_type: "",
    indicomp_promoter: "",
    chapter_id: "",
    receipt_csr: "",
    indicomp_source: "",
  });
  const [jsonData, setJsonData] = useState(null);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const donationTypes = [
    { value: "One Teacher School", label: "EV" },
    { value: "General", label: "General" },
    { value: "Membership", label: "Membership" },
  ];

  const exemptionTypes = [
    { value: "80G", label: "80G" },
    { value: "Non 80G", label: "Non 80G" },
    { value: "FCRA", label: "FCRA" },
    { value: "CSR", label: "CSR" },
  ];

  const donorTypes = [
    { value: "Member", label: "Member" },
    { value: "Donor", label: "Donor" },
    { value: "Member+Donor", label: "Member+Donor" },
    { value: "None", label: "None" },
  ];

  const amountRanges = [
    { value: "0-100000000", label: "All" },
    { value: "1-10000", label: "1-10000" },
    { value: "10001-20000", label: "10000-20000" },
    { value: "20001-30000", label: "20001-30000" },
    { value: "30001-50000", label: "30001-50000" },
    { value: "50001-100000", label: "50001-100000" },
    { value: "100001-100000000", label: "100001-Above" },
  ];

  const {
    data: chapterActiveHook,
    isLoading: chaptersLoading,
    isError: chaptersError,
  } = useFetchChapterActive();
  const {
    data: datasourceHook,
    isLoading: datasourceLoading,
    isError: datasourceError,
  } = useFetchDataSource();
  const {
    data: promoterHook,
    isLoading: promoterLoading,
    isError: promoterError,
  } = useFetchPromoter();
  const isLoading = chaptersLoading || datasourceLoading || promoterLoading;
  const isError = chaptersError || datasourceError || promoterError;

  const chapters = chapterActiveHook?.data || [];
  const datasource = datasourceHook?.data || [];
  const promoter = promoterHook?.data || [];

  const downloadMutation = useMutation({
    mutationFn: async (downloadData) => {
      const response = await axios.post(
        `${BASE_URL}/api/download-receipt-all`,
        downloadData,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        },
      );
      return response.data;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "all_receipt_list.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("All receipts downloaded successfully!");
      setFormData({
        receipt_from_date: Moment().startOf("month").format("YYYY-MM-DD"),
        receipt_to_date: Moment().format("YYYY-MM-DD"),
        receipt_donation_type: "",
        receipt_exemption_type: "",
        receipt_amount_range: "0-100000000",
        receipt_ots_range_from: "0",
        receipt_ots_range_to: "5000",
        indicomp_donor_type: "",
        indicomp_promoter: "",
        chapter_id: "",
        receipt_csr: "",
        indicomp_source: "",
      });
    },
    onError: (error) => {
      toast.error("Failed to download all receipts");
      console.error("Download error:", error);
    },
  });

  const viewMutation = useMutation({
    mutationFn: async (downloadData) => {
      const response = await axios.post(DOWNLOAD_ALL_RECEIPT, downloadData, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      return response.data;
    },
    onSuccess: async (blob) => {
      try {
        const innerBlob = blob instanceof Blob ? blob : new Blob([blob]);
        const text = await innerBlob.text();

        if (/[\x00-\x08\x0E-\x1F]/.test(text)) {
          if (typeof XLSX === "undefined") {
            toast.error("Excel parser not loaded. Please reload the page.");
            return;
          }

          const arrayBuffer = await innerBlob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet);

          setJsonData(json);
          toast.success(`Loaded ${json.length} receipts from Excel file.`);
        } else {
          parseCSVAndSetData(text);
          toast.success("Loaded receipts from Excel file.");
        }
      } catch (error) {
        console.error("Failed to read Excel blob:", error);
        toast.error("Unable to preview receipt file.");
      }
    },
    onError: () => {
      toast.error("Failed to fetch receipt data");
    },
  });

  function parseCSVAndSetData(text) {
    const rows = text.split("\n").filter(Boolean);
    if (!rows.length) {
      toast.error("No receipt data found");
      return;
    }

    const headers = rows[0]
      .split(",")
      .map((h) => h.replace(/^"|"$/g, "").trim());
    const data = rows.slice(1).map((row) => {
      const values = row.split(",");
      const obj = {};
      headers.forEach((header, idx) => {
        const cleanValue = values[idx]
          ? values[idx].replace(/^"|"$/g, "").trim()
          : "";
        obj[header] = cleanValue;
      });
      return obj;
    });

    setJsonData(data);
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (
      (name === "receipt_ots_range_from" || name === "receipt_ots_range_to") &&
      value !== ""
    ) {
      if (!/^[0-9\b]+$/.test(value)) {
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitDownload = (e) => {
    e.preventDefault();
    if (!formData.receipt_from_date || !formData.receipt_to_date) {
      toast.error("Please select both from and to dates");
      return;
    }
    downloadMutation.mutate(formData);
  };

  const handleSubmitView = (e) => {
    e.preventDefault();
    if (!formData.receipt_from_date || !formData.receipt_to_date) {
      toast.error("Please select both from and to dates");
      return;
    }
    viewMutation.mutate(formData);
  };

  const columns = [
    {
      id: "S. No.",
      header: "S. No.",
      cell: ({ row }) => {
        const globalIndex = row.index + 1;
        return <div className="text-xs font-medium">{globalIndex}</div>;
      },
      size: 60,
    },
    {
      accessorKey: "Donor Name",
      id: "Donor Name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Donor Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-xs font-medium">{row.getValue("Donor Name")}</div>
      ),
      size: 150,
    },
    {
      accessorKey: "Contact Name",
      id: "Contact Name",
      header: "Contact Name",
      cell: ({ row }) => (
        <div className="text-xs font-medium">
          {row.getValue("Contact Name")}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "Mobile",
      id: "Mobile",
      header: "Mobile",
      cell: ({ row }) => (
        <div className="text-xs font-medium">{row.getValue("Mobile")}</div>
      ),
      size: 120,
    },
    {
      accessorKey: "Email",
      id: "Email",
      header: "Email",
      cell: ({ row }) => (
        <div className="text-xs font-medium">{row.getValue("Email")}</div>
      ),
      size: 180,
    },

    {
      accessorKey: "Promoter",
      id: "Promoter",
      header: "Promoter",
      cell: ({ row }) => (
        <div className="text-xs font-medium">{row.getValue("Promoter")}</div>
      ),
      size: 120,
    },
    {
      accessorKey: "Donor Type",
      id: "Donor Type",
      header: "Donor Type",
      cell: ({ row }) => (
        <div className="text-xs font-medium">{row.getValue("Donor Type")}</div>
      ),
      size: 120,
    },
  ];

  const table = useReactTable({
    data: jsonData || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const TableShimmer = () => {
    return Array.from({ length: 10 }).map((_, index) => (
      <TableRow key={index} className="animate-pulse h-11">
        {table.getVisibleFlatColumns().map((column) => (
          <TableCell key={column.id} className="py-1">
            <div className="h-8 bg-gray-200 rounded w-full"></div>
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-full mx-auto border rounded-md shadow-sm">
        <div className="p-4 border-b bg-muted/50">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-32 mt-4" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-red-500">
        Failed to load dropdown data. Please check console logs.
      </div>
    );
  }

  return (
    <div className="w-full max-w-full mx-auto border rounded-md shadow-sm">
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Download className="w-5 h-5" />
          Download All Receipts
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">
          Leave fields blank to get all records
        </div>
      </div>

      <div className="p-4">
        <form className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="receipt_from_date" className="text-sm">
                From Date *
              </Label>
              <Input
                id="receipt_from_date"
                name="receipt_from_date"
                type="date"
                value={formData.receipt_from_date}
                onChange={handleInputChange}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_to_date" className="text-sm">
                To Date *
              </Label>
              <Input
                id="receipt_to_date"
                name="receipt_to_date"
                type="date"
                value={formData.receipt_to_date}
                onChange={handleInputChange}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_donation_type" className="text-sm">
                Purpose
              </Label>
              <Select
                value={formData.receipt_donation_type}
                onValueChange={(value) =>
                  handleSelectChange("receipt_donation_type", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Purpose" />
                </SelectTrigger>
                <SelectContent>
                  {donationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_exemption_type" className="text-sm">
                Category
              </Label>
              <Select
                value={formData.receipt_exemption_type}
                onValueChange={(value) =>
                  handleSelectChange("receipt_exemption_type", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {exemptionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="indicomp_donor_type" className="text-sm">
                Donor Type
              </Label>
              <Select
                value={formData.indicomp_donor_type}
                onValueChange={(value) =>
                  handleSelectChange("indicomp_donor_type", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Donor Type" />
                </SelectTrigger>
                <SelectContent>
                  {donorTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="indicomp_promoter" className="text-sm">
                Promoter
              </Label>

              <MemoizedSelect
                value={formData.indicomp_promoter}
                onChange={(value) =>
                  handleSelectChange("indicomp_promoter", value)
                }
                options={
                  promoter?.map((item) => ({
                    value: item.indicomp_fts_id,
                    label: item.indicomp_full_name,
                  })) || []
                }
                placeholder="Select Promoter"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_ots_range_from" className="text-sm">
                OTS Range From
              </Label>
              <Input
                id="receipt_ots_range_from"
                name="receipt_ots_range_from"
                type="text"
                value={formData.receipt_ots_range_from}
                onChange={handleInputChange}
                placeholder="Enter OTS Range From"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_ots_range_to" className="text-sm">
                OTS Range To
              </Label>
              <Input
                id="receipt_ots_range_to"
                name="receipt_ots_range_to"
                type="text"
                value={formData.receipt_ots_range_to}
                onChange={handleInputChange}
                placeholder="Enter OTS Range To"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_amount_range" className="text-sm">
                Amount Range
              </Label>
              <Select
                value={formData.receipt_amount_range}
                onValueChange={(value) =>
                  handleSelectChange("receipt_amount_range", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Amount Range" />
                </SelectTrigger>
                <SelectContent>
                  {amountRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="indicomp_source" className="text-sm">
                Source
              </Label>
              <Select
                value={formData.indicomp_source}
                onValueChange={(value) =>
                  handleSelectChange("indicomp_source", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Source" />
                </SelectTrigger>
                <SelectContent>
                  {datasource.map((item) => (
                    <SelectItem
                      key={item.data_source_type}
                      value={item.data_source_type}
                    >
                      {item.data_source_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chapter_id" className="text-sm">
                Chapter
              </Label>
              <Select
                value={formData.chapter_id}
                onValueChange={(value) =>
                  handleSelectChange("chapter_id", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select Chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((item) => (
                    <SelectItem
                      key={item.chapter_code}
                      value={String(item.chapter_code)}
                    >
                      {item.chapter_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt_csr" className="text-sm">
                CSR Donation
              </Label>
              <Select
                value={formData.receipt_csr}
                onValueChange={(value) =>
                  handleSelectChange("receipt_csr", value)
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select CSR Donation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSubmitDownload}
              disabled={downloadMutation.isPending}
              className="flex items-center gap-2 h-9"
            >
              <Download className="w-4 h-4" />
              {downloadMutation.isPending ? "Downloading..." : "Download"}
            </Button>

            <Button
              type="button"
              onClick={handleSubmitView}
              disabled={viewMutation.isPending}
              className="flex items-center gap-2 h-9"
            >
              <Eye className="w-4 h-4" />
              {viewMutation.isPending ? "Loading..." : "View"}
            </Button>
          </div>
        </form>

        {/* Table display */}
        {jsonData && (
          <div className="mt-6">
            <div className="flex items-center justify-between py-1 mb-3">
              <div className="relative w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search all receipts..."
                  value={table.getState().globalFilter || ""}
                  onChange={(event) =>
                    table.setGlobalFilter(event.target.value)
                  }
                  className="pl-8 h-9 text-sm bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    Columns <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="text-xs capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Table */}
            <div className="rounded-none border min-h-[20rem] flex flex-col">
              <Table className="flex-1">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="h-10 px-3 bg-[var(--team-color)] text-[var(--label-color)] text-sm font-medium"
                          style={{ width: header.column.columnDef.size }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {viewMutation.isPending ? (
                    <TableShimmer />
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className="h-2 hover:bg-gray-50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-3 py-1">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="h-12">
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-sm"
                      >
                        No receipts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Total Receipts: {table.getFilteredRowModel().rows.length}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllReceiptDownload;
