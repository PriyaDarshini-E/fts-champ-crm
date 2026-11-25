import { REAPEAT_DONOR_EDIT_LIST, REAPEAT_DONOR_EDIT_UPDATE_NEXT } from "@/api";
import PaginationShimmer from "@/components/common/pagination-schimmer";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGetMutation } from "@/hooks/use-get-mutation";
import { useApiMutation } from "@/hooks/use-mutation";
import useNumericInput from "@/hooks/use-numeric-input";
import { decryptId } from "@/utils/encyrption/encyrption";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Cookies from "js-cookie";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader,
  Search,
  Send
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { TableShimmer } from "../loadingtable/TableShimmer";

const AllotedList = () => {
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedPage, setDebouncedPage] = useState("");
  const { id } = useParams();
  const [pageInput, setPageInput] = useState("");
  const { trigger: submitDetails } = useApiMutation();
  const currentYear = Cookies.get("currentYear");
  const donorId = decryptId(id);
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
    data: schoolData,
    isError,
    isLoading: loading,
    isFetching,
    prefetchPage,
  } = useGetMutation(
    `school/${donorId}`,
    `${REAPEAT_DONOR_EDIT_LIST}?id=${donorId}`,
    {
      ...(debouncedSearchTerm ? {} : { page: pagination.pageIndex + 1 }),
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    }
  );

  useEffect(() => {
    if (debouncedSearchTerm) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = schoolData?.data?.last_page || 1;

    if (currentPage < totalPages) {
      prefetchPage({ page: currentPage + 1 });
    }
    if (currentPage > 1) {
      prefetchPage({ page: currentPage - 1 });
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    schoolData?.data?.last_page,
    prefetchPage,
  ]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState();
  const [rowSelection, setRowSelection] = useState({});

  const updateNext = async (e, allotId) => {
    if (!currentYear) {
      toast.error("Current year is required for updating.");
      return;
    }
    const payload = {
      schoolalot_financial_year: currentYear,
    };

    try {
      const res = await submitDetails({
        url: `${REAPEAT_DONOR_EDIT_UPDATE_NEXT}/${allotId}`,
        method: "put",
        data: payload,
      });
      if (res.code == 201) {
        toast.success(res.msg);
        navigate("/school/repeated");
      } else {
        toast.error(res.msg || "Unexpected error");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit");
    }
  };
  const columns = [
    {
      id: "serialNo",
      header: "S. No.",
      cell: ({ row }) => {
        const globalIndex = row.index + 1;
        return (
          <div className="text-xs font-medium text-center">{globalIndex}</div>
        );
      },
      size: 60,
    },
    {
      accessorKey: "indicomp_full_name",
      id: "donorName",
      header: "Donor Name",
      cell: ({ row }) => {
        const name = row.original.indicomp_full_name;
        return name ? <div className="text-xs font-medium">{name}</div> : null;
      },
      size: 150,
    },
    {
      accessorKey: "schoolalot_year",
      id: "year",
      header: "School Allot Year",
      cell: ({ row }) => (
        <div className="text-xs">{row.original.schoolalot_year}</div>
      ),
      size: 120,
    },
    {
      accessorKey: "schoolalot_from_date",
      id: "fromDate",
      header: "From Date",
      cell: ({ row }) => (
        <div className="text-xs">{row.original.schoolalot_from_date}</div>
      ),
      size: 120,
    },
    {
      accessorKey: "schoolalot_to_date",
      id: "toDate",
      header: "To Date",
      cell: ({ row }) => (
        <div className="text-xs">{row.original.schoolalot_to_date}</div>
      ),
      size: 120,
    },
    {
      accessorKey: "receipt_no_of_ots",
      id: "otsReceived",
      header: "OTS Received",
      cell: ({ row }) => (
        <div className="text-xs">{row.original.receipt_no_of_ots}</div>
      ),
      size: 120,
    },
    {
      accessorKey: "no_of_schools_allotted",
      id: "schoolsAllotted",
      header: "Schools Allotted",
      cell: ({ row }) => (
        <div className="text-xs">{row.original.no_of_schools_allotted}</div>
      ),
      size: 120,
    },
    {
      id: "pending",
      header: "Pending",
      cell: ({ row }) => {
        const pending =
          row.original.receipt_no_of_ots - row.original.no_of_schools_allotted;
        return <div className="text-xs">{pending}</div>;
      },
      size: 100,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => updateNext(e, id)}
                  >
                    {loading ? (
                      <Loader className="h-5 w-5 animate-spin text-blue-500" />
                    ) : (
                      <Send className="h-5 w-5 text-blue-500" />
                    )}{" "}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Update Next</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
      size: 100,
    },
  ];

  const table = useReactTable({
    data: schoolData?.data?.data || [],
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
    pageCount: schoolData?.data?.last_page || -1,
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
      `school/${donorId}`,
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
              Error Fetching School List Data
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
            placeholder="Search Repeated Donor..."
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
      <div className="rounded-none border flex flex-col">
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
                  No school found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {isFetching ? (
        <PaginationShimmer />
      ) : (
        schoolData?.data?.data?.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-sm text-muted-foreground">
              Showing {schoolData?.data?.from || 0} to{" "}
              {schoolData?.data?.to || 0} of {schoolData?.data?.total || 0}{" "}
              schools
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

export default AllotedList;
