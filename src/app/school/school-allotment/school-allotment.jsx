import { navigateToDonorDetailsView, SCHOOL_TO_ALOT_LIST } from "@/api";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetMutation } from "@/hooks/use-get-mutation";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TableShimmer } from "../loadingtable/TableShimmer";
import PaginationShimmer from "@/components/common/pagination-schimmer";
import Cookies from "js-cookie";

const SchoolToAllot = () => {
  const navigate = useNavigate();
  const userType = Cookies.get("user_type_id");
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  const [debouncedPage, setDebouncedPage] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [selectedYear, setSelectedYear] = useState(null);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Store current page in cookies when navigating away
  const storeCurrentPage = () => {
    Cookies.set(
      "schoolToAllotReturnPage",
      (pagination.pageIndex + 1).toString(),
      {
        expires: 1, // expires in 1 day
      },
    );
  };

  // Navigation handlers that store current page
  const handleAllotment = (donorId, schoolAllotYear, receiptYear, totalOTS) => {
    storeCurrentPage();
    navigateToDonorDetailsView(
      navigate,
      donorId,
      schoolAllotYear,
      receiptYear,
      
      {
        state: {
          totalOTS,
        },
      },
    );
  };

  // Restore page from cookies when component mounts
  useEffect(() => {
    const savedPage = Cookies.get("schoolToAllotReturnPage");
    if (savedPage) {
      // Remove the cookie first to prevent infinite loops
      Cookies.remove("schoolToAllotReturnPage");

      // Set the pagination after a small delay to ensure proper rendering
      setTimeout(() => {
        const pageIndex = parseInt(savedPage) - 1;
        if (pageIndex >= 0) {
          setPagination((prev) => ({ ...prev, pageIndex }));

          // Also update the page input field
          setPageInput(savedPage);

          // Invalidate queries to refetch data for the correct page
          queryClient.invalidateQueries({
            queryKey: ["schooltoallot"],
            exact: false,
          });
        }
      }, 100);
    }
  }, [queryClient]);
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [selectedYear]);

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
    data: schooltoallotData,
    isError,
    isFetching,
    prefetchPage,
    refetch,
  } = useGetMutation("schooltoallot", SCHOOL_TO_ALOT_LIST, {
    page: pagination.pageIndex + 1,
    ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    ...(selectedYear ? { financial_year: selectedYear } : {}), // add year filter
  });
  const yearCounts = schooltoallotData?.year_counts || {};
  const years = Object.keys(yearCounts).sort();

  useEffect(() => {
    const currentPage = pagination.pageIndex + 1;
    const totalPages = schooltoallotData?.data?.last_page || 1;

    if (currentPage < totalPages) {
      prefetchPage({ page: currentPage + 1 });
    }
    if (currentPage > 1) {
      prefetchPage({ page: currentPage - 1 });
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    schooltoallotData?.data?.last_page,
    prefetchPage,
  ]);

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  const columns = [
    // Serial Number
    {
      id: "serialNo",
      header: "S. No.",
      cell: ({ row }) => {
        const globalIndex =
          pagination.pageIndex * pagination.pageSize + row.index + 1;
        return (
          <div className="text-xs font-medium text-center">{globalIndex}</div>
        );
      },
      size: 60,
    },

    // Full Name + Type
    {
      accessorKey: "donor.indicomp_full_name",
      header: "Full Name",
      id: "Full Name",
      cell: ({ row }) => {
        const name = row?.original?.donor?.indicomp_full_name;
        const type = row?.original?.donor?.indicomp_type;

        return (
          <div className="space-y-1">
            {name && (
              <span className="text-sm font-medium text-gray-900">{name}</span>
            )}
            {type && (
              <span className="inline-block bg-primary text-white text-[10px] font-light ml-2 px-1 py-0.5 rounded-full">
                {type}
              </span>
            )}
          </div>
        );
      },
      size: 180,
    },

    // Phone / Email
    {
      accessorKey: "donor.indicomp_mobile_phone",
      header: "Phone / Email",
      id: "Phone / Email",
      cell: ({ row }) => {
        const phone = row?.original?.donor?.indicomp_mobile_phone;
        const email = row?.original?.donor?.indicomp_email;

        return (
          <div className="space-y-1">
            {phone && (
              <div className="text-sm font-medium text-gray-900">{phone}</div>
            )}
            {email && (
              <div className="text-xs text-gray-600 break-all">{email}</div>
            )}
          </div>
        );
      },
      size: 200,
    },

    // Allotment Year
    {
      accessorKey: "receipt_financial_year",
      header: "Financial Year",
      id: "receiptFinancialYear", // ✅ unique, matches the data
      cell: ({ row }) => {
        const year = row.original.receipt_financial_year;
        return year ? <div className="text-xs">{year}</div> : null;
      },
      size: 120,
    },
    {
      accessorKey: "schoolalot_year",
      header: "Allotment Year",
      id: "Allotment Year",
      cell: ({ row }) => {
        const year = row.original.schoolalot_year;
        return year ? <div className="text-xs">{year}</div> : null;
      },
      size: 120,
    },

    // OTS Count
    {
      accessorKey: "receipt_no_of_ots",
      header: "OTS",
      id: "OTS",
      cell: ({ row }) => {
        const ots = row.original.receipt_no_of_ots;
        const amount = row.original.receipt_total_amount;
        return (
          <div>
            {ots ? <div className="text-xs">{ots} Schools</div> : null}
            {amount ? (
              <span className="text-xs text-gray-600 break-all">₹{amount}</span>
            ) : (
              "-"
            )}
          </div>
        );
      },
      size: 100,
    },
    ...(userType !== "4"
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
              const item = row.original;
              const company = item?.donor;
              if (!company) return null;

              const status = company.indicomp_status;
              const donorId = company.id;
              // const schollots = original.receipt_no_of_ots;
              const totalOTS = item.receipt_no_of_ots;

              const schoolAllotYear = item.schoolalot_year;
              const receiptYear = item.receipt_financial_year;
              return (
                <div className="flex items-center gap-2">
                  {status == "Active" && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              console.log(item.receipt_no_of_ots);

                              handleAllotment(
                                donorId,
                                schoolAllotYear,
                                receiptYear,
                                totalOTS,
                              );
                            }}
                          >
                            <ClipboardList
                              className="h-5 w-5 text-blue-500"
                              title="Allotment"
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Allotment</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            },
            size: 80,
          },
        ]
      : []),
  ];

  const table = useReactTable({
    data: schooltoallotData?.data?.data || [],
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
    pageCount: schooltoallotData?.data?.last_page || -1,
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
      "schooltoallot",
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

  if (isError) {
    return (
      <div className="w-full p-4  ">
        <div className="flex items-center justify-center h-64 ">
          <div className="text-center ">
            <div className="text-destructive font-medium mb-2">
              Error Fetching School To Allot Data
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
            placeholder="Search to allot..."
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
        <div className="flex justify-between">
          {years.length > 0 && (
            <div className="">
              <Tabs
                value={selectedYear || ""}
                onValueChange={(value) => setSelectedYear(value || null)}
              >
                <TabsList className="flex flex-wrap gap-1 bg-transparent">
                  <TabsTrigger
                    value=""
                    className="data-[state=active]:bg-primary data-[state=active]:text-white px-3 py-1 text-sm border rounded-md"
                  >
                    All
                  </TabsTrigger>

                  {years.map((year) => (
                    <TabsTrigger
                      key={year}
                      value={year}
                      className="data-[state=active]:bg-primary data-[state=active]:text-white px-3 py-1 text-sm border rounded-md"
                    >
                      {year} ({yearCounts[year]})
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}

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
              <TableShimmer columns={columns} />
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
                  No school to data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {isFetching ? (
        <PaginationShimmer />
      ) : (
        schooltoallotData?.data?.data?.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-sm text-muted-foreground">
              Showing {schooltoallotData?.data?.from || 0} to{" "}
              {schooltoallotData?.data?.to || 0} of{" "}
              {schooltoallotData?.data?.total || 0} schools
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
        )
      )}
    </div>
  );
};

export default SchoolToAllot;
