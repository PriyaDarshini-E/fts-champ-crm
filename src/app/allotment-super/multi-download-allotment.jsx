import {
  SCHOOL_ALLOT_LIST,
  SCHOOL_ALLOT_MULTI_LIST,
  SCHOOL_ALLOTMENT_MULTI,
  SCHOOL_ALLOTMENT_MULTI_WITHOUT_HEADER,
  SCHOOL_ALLOTMENT_OLD_MULTI_WITH_HEADER,
  SCHOOL_ALLOTMENT_OLD_MULTI_WITHOUT_HEADER,
} from "@/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetMutation } from "@/hooks/use-get-mutation";
import { useApiMutation } from "@/hooks/use-mutation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Download, Loader, Search } from "lucide-react";
import moment from "moment";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const MultiDownloadAllotment = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const [rowSelection, setRowSelection] = useState({});
  const { trigger } = useApiMutation();
  const [isDownloadingWithoutHeader, setIsDownloadingWithoutHeader] =
    useState(false);
  const [isDownloadingWithHeader, setIsDownloadingWithHeader] = useState(false);
  ///old
  //for old-download-school-alloted-multi//SCHOOL_ALLOTMENT_OLD_MULTI_WITH_HEADER
  const [isDownloadingOldWithHeader, setIsDownloadingOldWithHeader] =
    useState(false);

  const [isDownloadingOldWithoutHeader, setIsDownloadingOldWithoutHeader] =
    useState(false);

  // Debounce search
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);
  useEffect(() => {
    setGlobalFilter(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Fetch data – no page param, only search
  const {
    data: schoolData,
    isError,
    isFetching,
    refetch,
  } = useGetMutation("schoolallotmentmultilist", SCHOOL_ALLOT_MULTI_LIST, {});

  useEffect(() => {
    if (location.state?.refetch) {
      refetch();
    }
  }, [location.state, refetch]);

  // Columns definition
  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="w-4 h-4 accent-indigo-600"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 accent-indigo-600"
        />
      ),
      size: 40,
      enableSorting: false,
      enableHiding: false,
    },

    {
      id: "serialNo",
      header: "S. No.",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-center">{row.index + 1}</div>
      ),
      size: 60,
    },

    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => {
        const id = row.original.id;
        return id ? <div className="text-xs font-medium">{id}</div> : null;
      },
      size: 10,
    },
    {
      accessorKey: "indicomp_full_name",
      header: "Donor Name",
      cell: ({ row }) => {
        const name = row.original.indicomp_full_name;
        return name ? <div className="text-xs font-medium">{name}</div> : null;
      },
    },
    {
      accessorKey: "rept_fin_year",
      header: "Receipt Year",
      cell: ({ row }) => {
        const year = row.original.rept_fin_year;
        return year ? <div className="text-xs">{year}</div> : null;
      },
      size: 200,
    },
    {
      accessorKey: "schoolalot_financial_year",
      header: "School Allot Year",
      cell: ({ row }) => {
        const year = row.original.schoolalot_financial_year;
        return year ? <div className="text-xs">{year}</div> : null;
      },
      size: 200,
    },
    {
      id: "Date",
      header: "Date",
      cell: ({ row }) => {
        const fromDate = row.original.schoolalot_from_date;
        const toDate = row.original.schoolalot_to_date;
        return (
          <div className="space-y-1 text-xs">
            {fromDate && (
              <div>From Date : {moment(fromDate).format("DD MMM YYYY")}</div>
            )}
            {toDate && (
              <div>To Date : {moment(toDate).format("DD MMM YYYY")}</div>
            )}
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: "receipt_no_of_ots",
      header: "OTS Received",
      cell: ({ row }) => {
        const ots = row.original.receipt_no_of_ots;
        return ots ? <div className="text-xs">{ots}</div> : null;
      },
    },
    {
      accessorKey: "no_of_schools_allotted",
      header: "Schools Allotted",
      cell: ({ row }) => {
        const allotted = row.original.no_of_schools_allotted;
        return allotted ? <div className="text-xs">{allotted}</div> : null;
      },
    },
    {
      accessorKey: "pending",
      header: "Pending",
      cell: ({ row }) => {
        const ots = Number(row.original.receipt_no_of_ots) || 0;
        const allotted = Number(row.original.no_of_schools_allotted) || 0;
        const pending = ots - allotted;
        return <div className="text-xs">{pending}</div>;
      },
    },
  ];

  // Table instance
  const table = useReactTable({
    data: schoolData?.data || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  // Download handlers (unchanged)

  const count = schoolData?.data?.length || 0;
  useEffect(() => {
    if (schoolData?.data?.length) {
      const data = schoolData.data;
      setFromId(data[data.length - 1]?.id || "");
      setToId(data[0]?.id || "");
    }
  }, [schoolData]);
  const [fromId, setFromId] = useState(
    schoolData?.data?.[schoolData.data.length - 1]?.id || "",
  );
  const [toId, setToId] = useState(schoolData?.data?.[0]?.id || "");

  const handleDownloadWithoutHeader = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one row to download.");
      return;
    }

    const ids = selectedRows.map((row) => row.original.id).filter(Boolean);
    if (ids.length === 0) {
      toast.warning("Selected rows have no ID.");
      return;
    }
    const idsString = ids.join(",");

    setIsDownloadingWithoutHeader(true);
    try {
      const res = await trigger({
        url: SCHOOL_ALLOTMENT_MULTI_WITHOUT_HEADER,
        method: "post",
        data: { from_id: idsString },
        responseType: "blob",
      });

      if (!res) {
        toast.warning("No response from server.");
        return;
      }

      const blob = new Blob([res], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `receipts_${idsString}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 100);

      toast.success("Allotment downloaded successfully!");
      setRowSelection({});
    } catch (err) {
      console.error("Error downloading receipt:", err);
      toast.error(
        err.message || "Something went wrong while downloading the receipt.",
      );
    } finally {
      setIsDownloadingWithoutHeader(false);
    }
  };
  const handleDownloadwithHeader = async () => {
    // const { from_id, to_id } = range;

    const selectedRows = table.getSelectedRowModel().rows;

    if (selectedRows.length === 0) {
      toast.warning("Please select at least one row to download.");
      return;
    }
    const ids = selectedRows.map((row) => row.original.id).filter(Boolean);
    if (ids.length === 0) {
      toast.warning("Selected rows do not have valid IDs.");
      return;
    }
    const idString = ids.join(",");
    setIsDownloadingWithHeader(true);

    try {
      const res = await trigger({
        url: SCHOOL_ALLOTMENT_MULTI,
        method: "post",
        data: { from_id: idString },
        responseType: "blob",
      });

      if (!res) {
        toast.warning("No response from server.");
        setIsDownloadingWithHeader(false);
        return;
      }
      const blob = new Blob([res], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `receipts_${idString}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success("Allotment downloaded successfully!");
      // setRange({ from_id: "", to_id: "" });
      setRowSelection({}); // clear selection
    } catch (err) {
      console.error("Error downloading receipt:", err);
      toast.error(
        err.message || "Something went wrong while downloading the receipt.",
      );
    } finally {
      setIsDownloadingWithHeader(false);
    }
  };
  ///old
  const handleoldDownload = async () => {
    if (!fromId || !toId) {
      toast.warning("Please enter both 'From ID' and 'To ID'.");
      return;
    }
    setIsDownloadingOldWithHeader(true);
    try {
      const res = await trigger({
        url: SCHOOL_ALLOTMENT_OLD_MULTI_WITH_HEADER,
        method: "post",
        data: { old_from_id: fromId, old_to_id: toId },
        responseType: "blob",
      });

      if (!res) {
        toast.warning("No response from server.");
        setIsDownloadingOldWithHeader(false);
        return;
      }
      const blob = new Blob([res], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `oldreceipts_${fromId}_${toId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success("Allotment downloaded successfully!");
      // setRange({ from_id: "", to_id: "" });

      setRowSelection({}); // clear selection
    } catch (err) {
      console.error("Error downloading receipt:", err);
      toast.error(
        err.message || "Something went wrong while downloading the receipt.",
      );
    } finally {
      setIsDownloadingOldWithHeader(false);
    }
  };
  const handleoldDownloadWithHeader = async () => {
    if (!fromId || !toId) {
      toast.warning("Please enter both 'From ID' and 'To ID'.");
      return;
    }
    setIsDownloadingOldWithoutHeader(true);

    try {
      const res = await trigger({
        url: SCHOOL_ALLOTMENT_OLD_MULTI_WITHOUT_HEADER,
        method: "post",
        data: { old_from_id: fromId, old_to_id: toId },
        responseType: "blob",
      });
      if (!res) {
        toast.warning("No response from server.");
        setIsDownloadingOldWithoutHeader(false);
        return;
      }
      const blob = new Blob([res], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `receipts_${fromId}_${toId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success("Allotment downloaded successfully!");
      // setRange({ from_id: "", to_id: "" });

      setRowSelection({}); // clear selection
    } catch (err) {
      console.error("Error downloading receipt:", err);
      toast.error(
        err.message || "Something went wrong while downloading the receipt.",
      );
    } finally {
      setIsDownloadingOldWithoutHeader(false);
    }
  };

  // Shimmer component (adjusted to show 5 shimmer rows)
  const TableShimmer = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={index} className="animate-pulse h-11">
        {table.getVisibleFlatColumns().map((column) => (
          <TableCell key={column.id} className="py-1">
            <div className="h-8 bg-gray-200 rounded w-full"></div>
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  if (isError) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive font-medium mb-2">
              Error Fetching School Allotment Data
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full p-2">
      <div className="flex items-center justify-between py-1">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search MultiAllotment..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchTerm("");
              }
            }}
            className="pl-8 h-9 text-sm bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          />
        </div>
        <div className="flex items-center gap-2 -ml-10">
          <Input
            type="text"
            className="w-24"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            placeholder="From ID"
          />
          <Input
            type="text"
            className="w-24"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="To ID"
          />
        </div>
        <div className="flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
          <span className="text-xs text-indigo-600 font-medium">Count:</span>
          <span className="text-sm font-bold text-indigo-800">{count}</span>
        </div>
        <div className="flex items-center gap-2 mr-2 ml-2">
          <Button
            variant="default"
            size="sm"
            disabled={isDownloadingOldWithHeader}
            className="flex items-center gap-2"
            onClick={handleoldDownload}
          >
            {isDownloadingOldWithHeader ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloadingOldWithHeader ? "Downloading..." : "Old WH"}
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={isDownloadingOldWithoutHeader}
            className="flex items-center gap-2"
            onClick={handleoldDownloadWithHeader}
          >
            {isDownloadingOldWithoutHeader ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloadingOldWithoutHeader ? "Downloading..." : "Old WOH"}{" "}
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={
              isDownloadingWithHeader ||
              !table.getSelectedRowModel().rows.length
            }
            className="flex items-center gap-2"
            onClick={handleDownloadwithHeader}
          >
            {isDownloadingWithHeader ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloadingWithHeader ? "Downloading..." : "Download WH"}
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={
              isDownloadingWithoutHeader ||
              !table.getSelectedRowModel().rows.length
            }
            className="flex items-center gap-2"
            onClick={handleDownloadWithoutHeader}
          >
            {isDownloadingWithoutHeader ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloadingWithoutHeader ? "Downloading..." : "Download WOH"}
          </Button>

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
      </div>

      {/* Table */}
      <div className="rounded-none border min-h-[25rem] flex flex-col">
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
            {isFetching && !table.getRowModel().rows.length ? (
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
                  No school found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default MultiDownloadAllotment;
