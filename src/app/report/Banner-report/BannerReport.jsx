import { BANNER_REPORT_LIST, DOWNLOAD_BANNER_REPORT } from "@/api";
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

const BannerReport = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  // const [range, setRange] = useState({ from_id: "", to_id: "" });
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const [rowSelection, setRowSelection] = useState({});
  const { trigger } = useApiMutation();
  const [isDownloadingWithoutHeader, setIsDownloadingWithoutHeader] =
    useState(false);
  const [isDownloadingWithHeader, setIsDownloadingWithHeader] = useState(false);

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
    data: bannerData,
    isError,
    isFetching,
    refetch,
  } = useGetMutation("bannerReport", BANNER_REPORT_LIST, {});
  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      const res = await trigger({
        url: DOWNLOAD_BANNER_REPORT,
        method: "post",
        data: { search: debouncedSearchTerm },
        responseType: "blob",
      });

      if (!res) {
        toast.warning("No response from server.");
        return;
      }

      // Create blob (Excel file)
      const blob = new Blob([res], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `banner_report_${moment().format("YYYY-MM-DD")}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 100);

      toast.success("Excel report downloaded successfully!");
    } catch (err) {
      console.error("Error downloading Excel:", err);
      toast.error(err.message || "Failed to download Excel.");
    } finally {
      setIsDownloadingExcel(false);
    }
  };
  useEffect(() => {
    if (location.state?.refetch) {
      refetch();
    }
  }, [location.state, refetch]);

  // Columns definition
  const columns = [
    {
      id: "serialNo",
      header: "S. No.",
      cell: ({ row }) => (
        <div className="text-xs font-medium text-center">{row.index + 1}</div>
      ),
      size: 60,
    },

    {
      accessorKey: "indicomp_full_name",
      header: "Donor Name",
      cell: ({ row }) => {
        const name = row.original.indicomp_full_name;
        return name ? <div className="text-xs font-medium">{name}</div> : null;
      },
      size: 10,
    },

    {
      accessorKey: "school_code",
      header: "School Code  ",
      cell: ({ row }) => {
        const schoolCode = row.original.school_code;
        return schoolCode ? <div className="text-xs">{schoolCode}</div> : null;
      },
      size: 200,
    },
    {
      accessorKey: "village",
      header: "Village",
      cell: ({ row }) => {
        const village = row.original.village;
        return village ? <div className="text-xs">{village}</div> : null;
      },
      size: 200,
    },

    {
      accessorKey: "Sanch",
      header: "Cluster",
      cell: ({ row }) => {
        const cluster = row.original.cluster;
        return cluster ? <div className="text-xs">{cluster}</div> : null;
      },
    },
    {
      accessorKey: "achal",
      header: "Achal",
      cell: ({ row }) => {
        const allotted = row.original.achal;
        return allotted ? <div className="text-xs">{allotted}</div> : null;
      },
    },
    {
      accessorKey: "school_state",
      header: "State",
      cell: ({ row }) => {
        const schoolState = row.original.school_state;
        return schoolState ? (
          <div className="text-xs">{schoolState}</div>
        ) : null;
      },
    },

    {
      accessorKey: "period",
      header: "Period",
      cell: ({ row }) => {
        const period = row.original.period;
        return period ? <div className="text-xs">{period}</div> : null;
      },
    },
    {
      accessorKey: "donor_banner_name",
      header: "Banner Name",
      cell: ({ row }) => {
        const bannerName = row.original.donor_banner_name;
        return <div className="text-xs">{bannerName || "-"}</div>;
      },
    },
  ];

  // Table instance
  const table = useReactTable({
    data: bannerData || [],
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
              Error Fetching Banner Report Data
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
            placeholder="Search Banner Report..."
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
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            disabled={isDownloadingExcel}
            className="flex items-center gap-2"
            onClick={handleDownloadExcel}
          >
            {isDownloadingExcel ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isDownloadingExcel ? "Downloading..." : "Download Excel"}
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
                  No Banner Report found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BannerReport;
