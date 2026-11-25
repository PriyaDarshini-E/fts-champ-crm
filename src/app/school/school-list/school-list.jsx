import { navigateToSchoolFullListView, SCHOOL_LIST } from "@/api";
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
import Cookies from "js-cookie";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TableShimmer } from "../loadingtable/TableShimmer";
import PaginationShimmer from "@/components/common/pagination-schimmer";

const SchoolList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  const [debouncedPage, setDebouncedPage] = useState("");
  const [pageInput, setPageInput] = useState("");
  const currentYear = Cookies.get("currentYear");
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState();
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const storeCurrentPage = () => {
    Cookies.set("schoolListReturnPage", (pagination.pageIndex + 1).toString(), { 
      expires: 1 
    });
  };
  const handleViewSchool = (id) => {
    storeCurrentPage();
    navigateToSchoolFullListView(navigate, id);
  };
  useEffect(() => {
    const savedPage = Cookies.get("schoolListReturnPage");
    if (savedPage) {
      // Remove the cookie first to prevent infinite loops
      Cookies.remove("schoolListReturnPage");
      
      // Set the pagination after a small delay to ensure proper rendering
      setTimeout(() => {
        const pageIndex = parseInt(savedPage) - 1;
        if (pageIndex >= 0) {
          setPagination(prev => ({ ...prev, pageIndex }));
          
          // Also update the page input field
          setPageInput(savedPage);

          // Invalidate queries to refetch data for the correct page
          queryClient.invalidateQueries({
            queryKey: ["schoollist"],
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
      const isNewSearch = searchTerm !== previousSearchTerm && previousSearchTerm !== "";
      
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
    data: schoolData,
    isError,
    isFetching,
    prefetchPage,
    refetch,
  } = useGetMutation("schoollist", `${SCHOOL_LIST}?year=${currentYear}`, {
    ...(debouncedSearchTerm ? {} : { page: pagination.pageIndex + 1 }),
    ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
  });

  useEffect(() => {
    if (debouncedSearchTerm) return;
    if (!schoolData?.data?.school?.last_page) return;

    const currentPage = pagination.pageIndex + 1;
    const totalPages = schoolData?.data?.school?.last_page;
    if (currentPage < totalPages) {
      prefetchPage({ page: currentPage + 1 });
    }
    if (currentPage > 1) {
      prefetchPage({ page: currentPage - 1 });
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    schoolData?.data?.school?.last_page,
    prefetchPage,
  ]);

  const columns = [
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

    {
      accessorKey: "achal",
      id: "achal",
      header: "Ackal",
      cell: ({ row }) => {
        const achal = row.original.achal;
        return achal ? <div className="text-xs">{achal}</div> : null;
      },
      size: 120,
    },
    {
      accessorKey: "cluster",
      id: "cluster",
      header: "Cluster",
      cell: ({ row }) => {
        const { cluster, sub_cluster } = row.original;
        if (!cluster && !sub_cluster) return null;
        return (
          <div className="space-y-1">
            {cluster && <div className="text-xs">{cluster}</div>}
            {sub_cluster && (
              <div className="text-xs text-blue-600">
                <span className="font-medium">Sub Cluster:</span> {sub_cluster}
              </div>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "village",
      id: "village",
      header: "Village",
      cell: ({ row }) => {
        const { village, district } = row.original;
        if (!village && !district) return null;
        return (
          <div className="space-y-1">
            {village && <div className="text-xs">{village}</div>}
            {district && (
              <div className="text-xs text-gray-500">
                <span className="font-medium">District:</span> {district}
              </div>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "school_state",
      id: "state",
      header: "State",
      cell: ({ row }) => {
        const state = row.original.school_state;
        return state ? <div className="text-xs">{state}</div> : null;
      },
      size: 120,
    },
    {
      accessorKey: "school_code",
      id: "schoolCode",
      header: "School Code",
      cell: ({ row }) => {
        const { school_code, status_label } = row.original;
        if (!school_code && !status_label) return null;
        return (
          <div className="space-y-1">
            {school_code && <div className="text-xs">{school_code}</div>}
            {status_label && (
              <div className="text-xs text-blue-600">
                <span className="font-medium">Status:</span> {status_label}
              </div>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const { school_code } = row.original;
        if (!school_code) return null;

        return (
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewSchool(row?.original?.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
      size: 80,
    },
  ];

  const table = useReactTable({
    data: schoolData?.data?.school?.data || [],
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
    pageCount: schoolData?.data?.school?.last_page || -1,
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
      "schoollist",
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
      {schoolData?.data?.schoolcount?.length > 0 && (
        <div className="text-base font-semibold">
          {schoolData?.data?.schoolcount[0].chapter_name}{" "}
          <span className="text-sm font-medium text-primary">
            ({schoolData?.data?.schoolcount[0].school_count} schools)
          </span>
        </div>
      )}
      <div className="flex items-center justify-between py-1">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search school..."
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
                  No school data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {isFetching ? (
        <PaginationShimmer />
      ) : (
        schoolData?.data?.school?.data.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-sm text-muted-foreground">
              Showing {schoolData?.data?.school?.from || 0} to{" "}
              {schoolData?.data?.school?.to || 0} of{" "}
              {schoolData?.data?.school?.total || 0} schools
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

export default SchoolList;