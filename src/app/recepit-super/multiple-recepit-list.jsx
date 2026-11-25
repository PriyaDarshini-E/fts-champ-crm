import {
  DOWNLOAD_MULTI_RECEIPT,
  RECEIPT_SUPER_MULTI_RECEIPT_LIST,
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
import useNumericInput from "@/hooks/use-numeric-input";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader,
  Search,
} from "lucide-react";
import moment from "moment";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TableShimmer } from "../school/loadingtable/TableShimmer";
import PaginationShimmer from "@/components/common/pagination-schimmer";

const MultipleRecepitList = () => {
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const { trigger, loading } = useApiMutation();
  const [range, setRange] = useState({ from_id: "", to_id: "" });
  const [pageInput, setPageInput] = useState("");
  const [sorting, setSorting] = useState([]);
  const [debouncedPage, setDebouncedPage] = useState("");
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState();
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);
  const {
    data: receiptMultipleData,

    isError,
    isFetching,
    prefetchPage,
    refetch,
  } = useGetMutation(
    "multiple-recepit-list",
    `${RECEIPT_SUPER_MULTI_RECEIPT_LIST}`,
    {
      ...(debouncedSearchTerm ? {} : { page: pagination.pageIndex + 1 }),
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    }
  );
  const receiptData = receiptMultipleData?.data;
  useEffect(() => {
    if (debouncedSearchTerm) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = receiptData?.last_page || 1;

    if (currentPage < totalPages) {
      prefetchPage({ page: currentPage + 1 });
    }
    if (currentPage > 1) {
      prefetchPage({ page: currentPage - 1 });
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    receiptData?.last_page,
    prefetchPage,
  ]);

  const columns = [
    {
      id: "serialNo",
      header: "S. No.",
      cell: ({ row, table }) => {
        const pagination = table.options.state.pagination;
        const globalIndex =
          pagination.pageIndex * pagination.pageSize + row.index + 1;
        return (
          <div className="text-xs font-medium text-center">{globalIndex}</div>
        );
      },
      size: 60,
    },

    {
      accessorKey: "id",
      id: "ID",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs font-medium"
        >
          ID
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">{row.getValue("ID")}</div>
      ),
    },
    {
      accessorKey: "indicomp_fts_id",
      id: "FTS ID",
      header: "FTS ID",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("FTS ID")}</div>
      ),
    },
    {
      accessorKey: "receipt_no",
      id: "Recepit No",
      header: "Recepit No",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("Recepit No")}</div>
      ),
    },

    {
      accessorKey: "indicomp_full_name",
      id: "Donor Name",
      header: "Donor Name",
      cell: ({ row }) => {
        const fullName = row.original?.indicomp_full_name;
        return fullName ? (
          <div className="text-xs">{fullName}</div>
        ) : (
          <div className="text-gray-400 text-xs">—</div>
        );
      },
    },
    {
      accessorKey: "receipt_date",
      id: "Receipt Date",
      header: "Receipt Date",
      cell: ({ row }) => {
        const date = row.original?.receipt_date;
        return date ? (
          <div className="text-xs">{moment(date).format("DD-MM-YYYY")}</div>
        ) : (
          <div className="text-gray-400 text-xs">—</div>
        );
      },
    },

    {
      accessorKey: "receipt_exemption_type",
      id: "Exemption Type",
      header: "Exemption Type",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("Exemption Type")}</div>
      ),
    },
    {
      accessorKey: "receipt_donation_type",
      id: "Donation Type",
      header: "Donation Type",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("Donation Type")}</div>
      ),
    },
    {
      accessorKey: "chapter_name",
      id: "Chapter Name",
      header: "Chapter Name",
      cell: ({ row }) => {
        const chapterName = row.original?.chapter_name;
        return chapterName ? (
          <div className="text-xs">{chapterName}</div>
        ) : (
          <div className="text-gray-400 text-xs">—</div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: receiptData?.data || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    pageCount: receiptData?.last_page || -1,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });
  const handleChange = (e) => {
    const { name, value } = e.target;
    setRange((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const handlePageChange = (newPageIndex) => {
    const targetPage = newPageIndex + 1;
    const cachedData = queryClient.getQueryData([
      "multiple-recepit-list",
      debouncedSearchTerm,
      targetPage,
    ]);

    if (cachedData) {
      setPagination((prev) => ({ ...prev, pageIndex: newPageIndex }));
    } else {
      table.setPageIndex(newPageIndex);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPage(pageInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [pageInput]);

  useEffect(() => {
    if (debouncedPage && !isNaN(debouncedPage)) {
      const pageNum = parseInt(debouncedPage);
      if (pageNum >= 1 && pageNum <= table.getPageCount()) {
        handlePageChange(pageNum - 1);
      }
    }
  }, [debouncedPage]);

  const handlePageInput = (e) => {
    setPageInput(e.target.value);
  };

  const generatePageButtons = () => {
    const currentPage = pagination.pageIndex + 1;
    const totalPages = table.getPageCount();
    const buttons = [];

    buttons.push(
      <Button
        key={1}
        variant={currentPage === 1 ? "default" : "outline"}
        size="sm"
        onClick={() => handlePageChange(0)}
        className="h-8 w-8 p-0 text-xs"
      >
        1
      </Button>
    );

    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className="px-2">
          ...
        </span>
      );
    }

    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (i !== 1 && i !== totalPages) {
        buttons.push(
          <Button
            key={i}
            variant={currentPage === i ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(i - 1)}
            className="h-8 w-8 p-0 text-xs"
          >
            {i}
          </Button>
        );
      }
    }

    if (currentPage < totalPages - 2) {
      buttons.push(
        <span key="ellipsis2" className="px-2">
          ...
        </span>
      );
    }

    if (totalPages > 1) {
      buttons.push(
        <Button
          key={totalPages}
          variant={currentPage === totalPages ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(totalPages - 1)}
          className="h-8 w-8 p-0 text-xs"
        >
          {totalPages}
        </Button>
      );
    }

    return buttons;
  };

  if (isError) {
    return (
      <div className="w-full p-4  ">
        <div className="flex items-center justify-center h-64 ">
          <div className="text-center ">
            <div className="text-destructive font-medium mb-2">
              Error Fetching Multiple Recepit List Data
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
  const handleDownload = async () => {
    const { from_id, to_id } = range;

    if (!from_id && !to_id) {
      toast.warning("Please enter both From and To ID.");
      return;
    } else if (!from_id) {
      toast.warning("From ID is required.");
      return;
    } else if (!to_id) {
      toast.warning("To ID is required.");
      return;
    }

    const payload = { from_id, to_id };

    try {
      const res = await trigger({
        url: DOWNLOAD_MULTI_RECEIPT,
        method: "post",
        data: payload,
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
      link.setAttribute("download", `receipts_${from_id}_to_${to_id}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);

      toast.success("Receipts downloaded successfully!");
      setRange({ from_id: "", to_id: "" });
    } catch (err) {
      console.error("Error downloading receipt:", err);
      toast.error(
        err.message || "Something went wrong while downloading the receipt."
      );
    }
  };

  return (
    <div className="max-w-full p-2">
      <div className="flex items-center justify-between py-1">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search multiple Recepit..."
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
          <Input
            name="from_id"
            placeholder="From Id..."
            value={range.from_id}
            onChange={handleChange}
            className="h-9 w-24 text-sm bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          />

          <Input
            name="to_id"
            placeholder="To Id..."
            value={range.to_id}
            onChange={handleChange}
            className="h-9 w-24 text-sm bg-gray-50 border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          />

          <Button
            variant="default"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
            onClick={handleDownload}
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {loading ? "Downloading..." : "Download Zip"}
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
                    className="h-10 px-3 bg-[var(--team-color)] text-[var(--label-color)]  text-sm font-medium"
                    style={{ width: header.column.columnDef.size }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isFetching && !table.getRowModel().rows.length ? (
              <TableShimmer columns={table.getVisibleFlatColumns()} />
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
                        cell.getContext()
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
                  No recepit found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {isFetching ? (
        <PaginationShimmer />
      ) : (
        receiptData?.data?.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-sm text-muted-foreground">
              Showing {receiptData?.from || 0} to {receiptData?.to || 0} of{" "}
              {receiptData?.total || 0} receipts
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.pageIndex - 1)}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-1">
                {generatePageButtons()}
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <span>Go to</span>
                <Input
                  type="tel"
                  min="1"
                  max={table.getPageCount()}
                  value={pageInput}
                  onChange={handlePageInput}
                  onBlur={() => setPageInput("")}
                  onKeyDown={keyDown}
                  className="w-16 h-8 text-sm"
                  placeholder="Page"
                />
                <span>of {table.getPageCount()}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.pageIndex + 1)}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default MultipleRecepitList;
