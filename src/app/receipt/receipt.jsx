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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import axios from "axios";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Loader2,
  ReceiptText,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";
import BASE_URL from "@/config/base-url";
import Cookies from "js-cookie";
import useNumericInput from "@/hooks/use-numeric-input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import moment from "moment";
import { Link, useNavigate } from "react-router-dom";

const Receipt = () => {
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  const userType = Cookies.get("user_type_id");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [pageInput, setPageInput] = useState("");

  // Store current page in cookies when navigating away
  const storeCurrentPage = () => {
    Cookies.set("receiptReturnPage", (pagination.pageIndex + 1).toString(), {
      expires: 1,
    });
  };

  // Navigation handlers that store current page
  const handleViewReceipt = (receiptRefNo) => {
    storeCurrentPage();
    navigate(`/receipt-view?ref=${encodeURIComponent(receiptRefNo)}`);
  };

  const handleEditReceipt = (receiptId) => {
    storeCurrentPage();
    navigate(`/receipt-edit/${receiptId}`);
  };

  // Restore page from cookies when component mounts
  useEffect(() => {
    const savedPage = Cookies.get("receiptReturnPage");
    if (savedPage) {
      // Remove the cookie first to prevent infinite loops
      Cookies.remove("receiptReturnPage");

      // Set the pagination after a small delay to ensure proper rendering
      setTimeout(() => {
        const pageIndex = parseInt(savedPage) - 1;
        if (pageIndex >= 0) {
          setPagination((prev) => ({ ...prev, pageIndex }));

          // Also update the page input field
          setPageInput(savedPage);

          // Invalidate queries to refetch data for the correct page
          queryClient.invalidateQueries({
            queryKey: ["receipts"],
            exact: false,
          });
        }
      }, 100);
    }
  }, [queryClient]);

  // Updated search effect - only reset pagination for genuine search changes
  useEffect(() => {
    const timerId = setTimeout(() => {
      // Check if this is a genuine new search (not just initialization)
      const isNewSearch =
        searchTerm !== previousSearchTerm && previousSearchTerm !== "";

      if (isNewSearch) {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      }

      setDebouncedSearchTerm(searchTerm);
      setPreviousSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm, previousSearchTerm]);

  const {
    data: receiptsData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["receipts", debouncedSearchTerm, pagination.pageIndex + 1],
    queryFn: async () => {
      const token = Cookies.get("token");
      const params = new URLSearchParams();

      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      } else {
        params.append("page", (pagination.pageIndex + 1).toString());
      }

      const response = await axios.get(`${BASE_URL}/api/receipt?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      return response.data.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (debouncedSearchTerm) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = receiptsData?.last_page || 1;

    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ["receipts", debouncedSearchTerm, nextPage],
        queryFn: async () => {
          const token = Cookies.get("token");
          const params = new URLSearchParams({
            page: nextPage.toString(),
          });

          if (debouncedSearchTerm) {
            params.append("search", debouncedSearchTerm);
          }

          const response = await axios.get(
            `${BASE_URL}/api/receipt?${params}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
          return response.data.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    }

    if (currentPage > 1) {
      const prevPage = currentPage - 1;

      if (
        !queryClient.getQueryData(["receipts", debouncedSearchTerm, prevPage])
      ) {
        queryClient.prefetchQuery({
          queryKey: ["receipts", debouncedSearchTerm, prevPage],
          queryFn: async () => {
            const token = Cookies.get("token");
            const params = new URLSearchParams({
              page: prevPage.toString(),
            });

            if (debouncedSearchTerm) {
              params.append("search", debouncedSearchTerm);
            }

            const response = await axios.get(
              `${BASE_URL}/api/receipt?${params}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );
            return response.data.data;
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    queryClient,
    receiptsData?.last_page,
  ]);

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({
    "Fts Id": false,
  });
  const [rowSelection, setRowSelection] = useState({});

  const columns = [
    {
      id: "S. No.",
      header: "S. No.",
      cell: ({ row }) => {
        const globalIndex =
          pagination.pageIndex * pagination.pageSize + row.index + 1;
        return <div className="text-xs font-medium">{globalIndex}</div>;
      },
      size: 60,
    },
    {
      accessorKey: "indicomp_full_name",
      id: "Full Name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Full Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">
          {row.getValue("Full Name")}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "receipt_no",
      id: "Receipt No",
      header: "Receipt No",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("Receipt No")}</div>
      ),
      size: 50,
    },

    {
      accessorKey: "indicomp_fts_id",
      id: "Fts Id",
      header: "Fts Id",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("Fts Id")}</div>
      ),
      size: 120,
    },
    {
      accessorKey: "receipt_date",
      id: "Date",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-xs">
          {moment(row.getValue("Date")).format("DD-MMM-YYYY")}
        </div>
      ),
      size: 80,
    },

    {
      id: "Receipt Info",
      header: "Receipt Info",
      cell: ({ row }) => {
        const exemptionType = row.original.receipt_exemption_type;
        let donationType = row.original.receipt_donation_type;

        const donationMap = {
          "One Teacher School": {
            code: "EV",
            color: "bg-green-100 text-green-800",
          },
          Membership: { code: "M", color: "bg-blue-100 text-blue-800" },
          General: { code: "G", color: "bg-yellow-100 text-yellow-800" },
        };

        const donationBadge = donationMap[donationType] || {
          code: donationType,
          color: "bg-gray-100 text-gray-800",
        };
        donationType = donationBadge.code;

        const tallyStatus = row.original.tally_status;
        const withoutPan = row.original.with_out_panno;

        return (
          <div className="text-xs space-y-1">
            {/* First Row: Exemption Type - Donation */}
            <div className="flex flex-row items-center justify-between">
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${donationBadge.color}`}
              >
                {donationType || "-"}
              </span>
              <span className="font-medium text-gray-700">
                {exemptionType || "-"}
              </span>
            </div>
            {/* Second Row: tally - without pan */}
            <div className="flex flex-row items-center justify-between text-gray-600 ">
              {tallyStatus === "True" ? (
                <img
                  src="/tally.svg"
                  alt="Tally"
                  className="w-6 h-5.5 inline-block"
                />
              ) : tallyStatus === "False" ? (
                "-"
              ) : (
                tallyStatus || "-"
              )}
              {withoutPan === "Yes" ? (
                <p className="px-2 py-0.2 rounded text-[10px] font-semibold bg-gray-200 text-gray-400 cursor-not-allowed">
                  P
                </p>
              ) : withoutPan == null ? (
                <p className="px-2 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                  P
                </p>
              ) : (
                "-"
              )}
            </div>
          </div>
        );
      },
      size: 70,
    },
    {
      accessorKey: "receipt_total_amount",
      id: "Total",
      header: "Total",
      cell: ({ row }) => <div className="text-xs">{row.getValue("Total")}</div>,
      size: 20,
    },

    ...(userType === "4" || userType === "5"
      ? [
          {
            accessorKey: "chapter_name",
            id: "Chapter",
            header: "Chapter",
            cell: ({ row }) => (
              <div className="text-xs">{row.getValue("Chapter")}</div>
            ),
            size: 120,
          },
        ]
      : []),
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const receiptId = row.original.id;
        const receiptRefNo = row.original.receipt_ref_no;
        const receiptFinancialYear = row.original.receipt_financial_year;
        const currentYear = Cookies.get("currentYear");
        return (
          <div className="flex flex-row">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewReceipt(receiptRefNo)}
                  >
                    <Eye />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Receipt Dashboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {(userType === "2" || userType === "5") &&
              currentYear === receiptFinancialYear && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditReceipt(receiptId)}
                      >
                        <Edit />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Receipt Edit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
          </div>
        );
      },
      size: 20,
    },
  ];

  const table = useReactTable({
    data: receiptsData?.data || [],
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
    pageCount: receiptsData?.last_page || -1,
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

  const handlePageChange = (newPageIndex) => {
    const targetPage = newPageIndex + 1;
    const cachedData = queryClient.getQueryData([
      "receipts",
      debouncedSearchTerm,
      targetPage,
    ]);

    if (cachedData) {
      setPagination((prev) => ({ ...prev, pageIndex: newPageIndex }));
    } else {
      table.setPageIndex(newPageIndex);
    }
  };

  const handlePageInput = (e) => {
    const value = e.target.value;
    setPageInput(value);

    if (value && !isNaN(value)) {
      const pageNum = parseInt(value);
      if (pageNum >= 1 && pageNum <= table.getPageCount()) {
        handlePageChange(pageNum - 1);
      }
    }
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
      </Button>,
    );

    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className="px-2">
          ...
        </span>,
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
          </Button>,
        );
      }
    }

    if (currentPage < totalPages - 2) {
      buttons.push(
        <span key="ellipsis2" className="px-2">
          ...
        </span>,
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
        </Button>,
      );
    }

    return buttons;
  };

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

  if (isError) {
    return (
      <div className="w-full p-4  ">
        <div className="flex items-center justify-center h-64 ">
          <div className="text-center ">
            <div className="text-destructive font-medium mb-2">
              Error Fetching receipts List Data
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
            placeholder="Search receipt..."
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
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-none border min-h-[31rem] flex flex-col">
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
                  No receipts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/*  Pagination */}
      <div className="flex items-center justify-between py-1">
        <div className="text-sm text-muted-foreground">
          Showing {receiptsData?.from || 0} to {receiptsData?.to || 0} of{" "}
          {receiptsData?.total || 0} receipt
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.pageIndex - 1)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 px-2"
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
            className="h-8 px-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
