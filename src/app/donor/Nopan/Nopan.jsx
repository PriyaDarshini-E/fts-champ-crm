import { useFetchDonorWithoutPannoList } from "@/hooks/use-api";
import React, { useEffect } from "react";
import BASE_URL from "@/config/base-url";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { navigateToCreateReceipt, navigateToCreateOldReceipt } from "@/api";

import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  ReceiptText,
  Search,
  SquarePlus,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import useNumericInput from "@/hooks/use-numeric-input";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Cookies from "js-cookie";
const Nopan = () => {
  //   const { data, isLoading, error, refetch } = useFetchDonorWithoutPannoList();
  const userType = Cookies.get("user_type_id");
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  const [panNumber, setPanNumber] = useState("");

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [openPanModal, setOpenPanModal] = useState(false);

  const [selectedDonorId, setSelectedDonorId] = useState(null);
  const [pageInput, setPageInput] = useState("");

  const storeCurrentPage = () => {
    Cookies.set("donorReturnPage", (pagination.pageIndex + 1).toString(), {
      expires: 1,
    });
  };
  //update pan number
  const handleUpdatePan = async () => {
    try {
      const token = Cookies.get("token");

      await axios.put(
        `${BASE_URL}/api/update-donor-panno/${selectedDonorId}`,
        {
          indicomp_pan_no: panNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setOpenPanModal(false);
      refetch();

      toast.success("PAN updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update PAN");
    }
  };

  // Navigation handlers that store current page
  const handleEditDonor = (id, donorType) => {
    storeCurrentPage();
    if (donorType === "Individual") {
      navigate(`/donor/donor-edit-indivisual/${id}`);
    } else {
      navigate(`/donor/donor-edit-company/${id}`);
    }
  };

  const handleViewDonor = (id) => {
    storeCurrentPage();
    navigate(`/donor/donor-view/${id}`);
  };

  const handleCreateReceipt = (id) => {
    storeCurrentPage();
    navigateToCreateReceipt(navigate, id);
  };

  const handleCreateoLDReceipt = (id) => {
    storeCurrentPage();
    navigateToCreateOldReceipt(navigate, id);
  };

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

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["Nopan", debouncedSearchTerm, pagination.pageIndex + 1],
    queryFn: async () => {
      const token = Cookies.get("token");
      const params = new URLSearchParams();

      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      } else {
        params.append("page", (pagination.pageIndex + 1).toString());
      }

      const response = await axios.get(
        `${BASE_URL}/api/donor-with-out-panno-list?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });
  ///prefetch next page
  useEffect(() => {
    if (debouncedSearchTerm) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = data?.data?.last_page || 1;

    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;

      queryClient.prefetchQuery({
        queryKey: ["Nopan", debouncedSearchTerm, nextPage],
        queryFn: async () => {
          const token = Cookies.get("token");

          const params = new URLSearchParams({
            page: nextPage.toString(),
          });

          if (debouncedSearchTerm) {
            params.append("search", debouncedSearchTerm);
          }

          const response = await axios.get(
            `${BASE_URL}/api/donor-with-out-panno-list?${params}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          return response.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    }
    if (currentPage > 1) {
      const prevPage = currentPage - 1;

      if (!queryClient.getQueryData(["Nopan", debouncedSearchTerm, prevPage])) {
        queryClient.prefetchQuery({
          queryKey: ["Nopan", debouncedSearchTerm, prevPage],
          queryFn: async () => {
            const token = Cookies.get("token");
            const params = new URLSearchParams({
              page: prevPage.toString(),
            });

            if (debouncedSearchTerm) {
              params.append("search", debouncedSearchTerm);
            }

            const response = await axios.get(
              `${BASE_URL}/api/donor-with-out-panno-list?${params}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              },
            );
            return response.data;
          },
          staleTime: 5 * 60 * 1000,
        });
      }
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    data?.data?.last_page,
    queryClient,
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
      accessorKey: "indicomp_fts_id",
      id: "Fts Id",
      header: "Fts Id",
      cell: ({ row }) => (
        <div className="text-xs">{row.getValue("Fts Id")}</div>
      ),
      size: 120,
    },
    {
      id: "Contact Info",
      header: "Contact Info",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-xs">
            <span className="font-medium">Phone:</span>{" "}
            {row.original.indicomp_mobile_phone}
          </div>
          <div className="text-xs text-blue-600 ">
            {row.original.indicomp_email}
          </div>
        </div>
      ),
      size: 150,
    },
    {
      id: "Personal Details",
      header: "Personal Details",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-xs">
            <span className="font-medium"></span> {row.original.indicomp_type}
          </div>
          <div className="text-xs">
            {row.original.indicomp_type === "Individual" ? (
              <span>
                {" "}
                <span className="text-xs text-gray-500">Spouse :</span>{" "}
                <span className="font-medium">
                  {row.original.indicomp_spouse_name || "-"}
                </span>
              </span>
            ) : (
              <span>
                <span className="text-xs text-gray-500"> Contact :</span>{" "}
                <span className="font-medium">
                  {row.original.indicomp_com_contact_name || "-"}
                </span>
              </span>
            )}
          </div>
        </div>
      ),
      size: 140,
    },
    // {
    //   id: "actions",
    //   header: "Action",
    //   cell: ({ row }) => {
    //     const id = row.original.id;

    //     return (
    //       <div className="flex flex-row">
    //         {userType !== "4" && (
    //           <>
    //             {userType !== "2" && (
    //               <TooltipProvider>
    //                 <Tooltip>
    //                   <TooltipTrigger asChild>
    //                     <Button
    //                       variant="ghost"
    //                       size="icon"
    //                       onClick={() => {
    //                         setSelectedDonorId(id);
    //                         setPanNumber("");
    //                         setOpenPanModal(true);
    //                       }}
    //                     >
    //                       <ReceiptText />
    //                     </Button>
    //                   </TooltipTrigger>
    //                   <TooltipContent>
    //                     <p>Update pan</p>
    //                   </TooltipContent>
    //                 </Tooltip>
    //               </TooltipProvider>
    //             )}
    //           </>
    //         )}
    //       </div>
    //     );
    //   },
    // },
    ...(userType === "4" || userType === "2"
      ? []
      : [
          {
            id: "actions",
            header: "Action",
            cell: ({ row }) => {
              const id = row.original.id;

              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedDonorId(id);
                          setPanNumber("");
                          setOpenPanModal(true);
                        }}
                      >
                        <Edit />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Update pan</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            },
          },
        ]),
  ];
  const table = useReactTable({
    data: data?.data?.data || [],
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
    pageCount: data?.data?.last_page || -1,
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
      "Nopan",
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
              Error Fetching Nopan List Data
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
            placeholder="Search donors..."
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
      <div className="rounded-none border min-h-[31rem] grid grid-cols-1">
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
                  No donors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-1">
        <div className="text-sm text-muted-foreground">
          Showing {data?.data?.from || 0} to {data?.data?.to || 0} of{" "}
          {data?.data?.total || 0} donors
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
      <Dialog open={openPanModal} onOpenChange={setOpenPanModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update PAN Number</DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Enter PAN Number"
            value={panNumber}
            onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
            maxLength={10}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPanModal(false)}>
              Cancel
            </Button>

            <Button onClick={handleUpdatePan}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nopan;
