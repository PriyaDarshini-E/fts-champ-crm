import { DUPLICATE_DELETE, DUPLICATE_LIST, navigateToDuplicateEdit } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useNumericInput from "@/hooks/use-numeric-input";
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
import Cookies from "js-cookie";
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Edit, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DuplicateDonor = () => {
  const [deleteId, setDeleteId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const userType = Cookies.get("user_type_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [pageInput, setPageInput] = useState("");

  // Store current page in cookies when navigating away
  const storeCurrentPage = () => {
    Cookies.set("duplicateReturnP", (pagination.pageIndex + 1).toString(), { 
      expires: 1 // expires in 1 day
    });
  };

  // Navigation handlers that store current page
  const handleEditDuplicate = (id) => {
    storeCurrentPage();
    navigateToDuplicateEdit(navigate, id);
  };

  // Restore page from cookies when component mounts
  useEffect(() => {
    const savedPage = Cookies.get("duplicateReturnP");
    if (savedPage) {
      // Remove the cookie first to prevent infinite loops
      Cookies.remove("duplicateReturnP");
      
      // Set the pagination after a small delay to ensure proper rendering
      setTimeout(() => {
        const pageIndex = parseInt(savedPage) - 1;
        if (pageIndex >= 0) {
          setPagination(prev => ({ ...prev, pageIndex }));
          
          // Also update the page input field
          setPageInput(savedPage);

          // Invalidate queries to refetch data for the correct page
          queryClient.invalidateQueries({
            queryKey: ["duplicateList"],
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
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }
      
      setDebouncedSearchTerm(searchTerm);
      setPreviousSearchTerm(searchTerm);
    }, 500);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm, previousSearchTerm]);

  const {
    data: duplicateData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["duplicateList", debouncedSearchTerm, pagination.pageIndex + 1],
    queryFn: async () => {
      const token = Cookies.get("token");
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      } else {
        params.append("page", (pagination.pageIndex + 1).toString());
      }

      const response = await axios.get(
        `${DUPLICATE_LIST}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data?.data || response.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });

  // Prefetch next and previous pages - MOVED AFTER duplicateData is defined
  useEffect(() => {
    if (debouncedSearchTerm) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = duplicateData?.last_page || 1;
    
    // Prefetch next page
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ["duplicateList", debouncedSearchTerm, nextPage],
        queryFn: async () => {
          const token = Cookies.get("token");
          const params = new URLSearchParams({
            page: nextPage.toString(),
          });
          
          if (debouncedSearchTerm) {
            params.append("search", debouncedSearchTerm);
          }

          const response = await axios.get(
            `${DUPLICATE_LIST}?${params}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          return response.data?.data || response.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    }

    // Prefetch previous page
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
    
      if (!queryClient.getQueryData(["duplicateList", debouncedSearchTerm, prevPage])) {
        queryClient.prefetchQuery({
          queryKey: ["duplicateList", debouncedSearchTerm, prevPage],
          queryFn: async () => {
            const token = Cookies.get("token");
            const params = new URLSearchParams({
              page: prevPage.toString(),
            });
            
            if (debouncedSearchTerm) {
              params.append("search", debouncedSearchTerm);
            }

            const response = await axios.get(
              `${DUPLICATE_LIST}?${params}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            return response.data?.data || response.data;
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    }
  }, [pagination.pageIndex, debouncedSearchTerm, queryClient, duplicateData?.last_page]);

  const handleOpenDeleteDialog = (id) => {
    setDeleteId(id);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteId(null);
  };

  const handleDuplicateDelete = async () => {
    if (!deleteId) return;
    
    try {
      const response = await axios({
        url: DUPLICATE_DELETE + deleteId,
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
      });

      if (response.data.code === 201) {
        toast.success(response.data.message);
        refetch();
      }  else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error( error.response.data.message|| "Error while deleting donor duplicate");
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({
    indicomp_spouse_name: false,
    indicomp_com_contact_name: false,
  });
  const [rowSelection, setRowSelection] = useState({});

  const columns = [
    {
      id: "S. No.",
      header: "S. No.",
      cell: ({ row }) => {
        const globalIndex = (pagination.pageIndex * pagination.pageSize) + row.index + 1;
        return <div className="text-xs font-medium">{globalIndex}</div>;
      },
      size: 60,
    },
    {
      accessorKey: "indicomp_fts_id",
      id: "Fts Id",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Fts Id
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-xs font-medium">{row.getValue("Fts Id")}</div>,
      size: 80,
    },
    {
      accessorKey: "indicomp_full_name",
      id: "Name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Name
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-xs font-medium">{row.getValue("Name")}</div>,
      size: 120,
    },
    {
      accessorKey: "indicomp_type",
      id: "Type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Type
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-xs font-medium">{row.getValue("Type")}</div>,
      size: 80,
    },
    {
      accessorKey: "spouse_contact",
      id: "Spouse/Contact",
      header: "Spouse/Contact",
      cell: ({ row }) => {
        const indicompType = row.original.indicomp_type;
        const spouseRow = row.original?.indicomp_spouse_name;
        const contactRow = row.original?.indicomp_com_contact_name;
        return (
          <div className="text-xs font-medium">
            {indicompType === "Individual" ? spouseRow : contactRow}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: "indicomp_mobile_phone",
      id: "Mobile",
      header: "Mobile",
      cell: ({ row }) => <div className="text-xs font-medium">{row.getValue("Mobile")}</div>,
      size: 100,
    },
    {
      accessorKey: "indicomp_email",
      id: "Email",
      header: "Email",
      cell: ({ row }) => <div className="text-xs font-medium">{row.getValue("Email")}</div>,
      size: 150,
    },
    {
      accessorKey: "total_receipt_count",
      id: "Receipt Count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Receipt Count
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-xs font-medium">{row.getValue("Receipt Count")}</div>,
      size: 80,
    },
  ];

  // Add actions column for admin users
  if (userType === "1") {
    columns.push({
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const id = row.original.id;
        const receiptCount = row.original.total_receipt_count;

        return (
          <div className="flex flex-row gap-1">
            {receiptCount > 0 ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditDuplicate(id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDeleteDialog(id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    });
  }

  const table = useReactTable({
    data: duplicateData?.data || [],
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
    pageCount: duplicateData?.last_page || -1,
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
    const cachedData = queryClient.getQueryData(["duplicateList", debouncedSearchTerm, targetPage]);
    
    if (cachedData) {
      setPagination(prev => ({ ...prev, pageIndex: newPageIndex }));
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
    
    if (totalPages === 0) return buttons;
    
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
      buttons.push(<span key="ellipsis1" className="px-2">...</span>);
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
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
      buttons.push(<span key="ellipsis2" className="px-2">...</span>);
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
      <div className="w-full p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive font-medium mb-2">
              Error Fetching Duplicate Data
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
      <div className="p-2 mb-4 rounded-lg bg-[#D0F6F2]">
        <p className="text-sm">
          Duplicate Criteria: If Mobile Number is Same or Donor Name is Same.
          <br />
          (Note: All the below data is not 100% duplicate. It is all
          recommended data that may be duplicated. Please make the changes
          very carefully. We advise you to make a note before removing.)
        </p>
      </div>

      <div className="flex items-center justify-between py-1">
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search duplicates..."
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
        <div className="flex flex-col md:flex-row md:ml-auto gap-2 w-full md:w-auto">
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
      </div>

      {/* Table */}
      <div className="rounded-none border min-h-[31rem] grid grid-cols-1">
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
                          header.getContext()
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
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="h-12">
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm">
                  No duplicate records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-1">
        <div className="text-sm text-muted-foreground">
          Showing {duplicateData?.from || 0} to {duplicateData?.to || 0} of{" "}
          {duplicateData?.total || 0} duplicates
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDeleteDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDuplicateDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DuplicateDonor;