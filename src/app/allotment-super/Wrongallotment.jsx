import { WRONG_ALLOTMENT } from "@/api";
import PaginationShimmer from "@/components/common/pagination-schimmer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader,
  Mail,
  Search,
} from "lucide-react";
import moment from "moment";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import React from "react";
import { Input } from "@/components/ui/input";

const Wrongallotment = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const keyDown = useNumericInput();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedPage, setDebouncedPage] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const { trigger, loading } = useApiMutation();
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
  const handlePageInput = (e) => {
    setPageInput(e.target.value);
  };
  const handleSubmitMail = async () => {
    try {
      const response = await trigger({
        url: "/api/send-wrong-school-alloted-email",
        method: "GET",
      });
      toast.success(response?.message || "Emails sent successfully!");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send emails.";
      toast.error(message);
    } finally {
      setDialogOpen(false); 
    }
  };
  const {
    data: wrongAllotedList,
    isError,
    isFetching,
    prefetchPage,
    refetch,
  } = useGetMutation("wrongAllotedList", WRONG_ALLOTMENT, {
    page: pagination.pageIndex + 1,
    ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
  });
  useEffect(() => {
    if (location.state?.refetch) {
      refetch();
    }
  }, [location.state, refetch]);

  useEffect(() => {
    if (!wrongAllotedList?.data?.last_page) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = wrongAllotedList?.data?.last_page;
    if (currentPage < totalPages) {
      prefetchPage({ page: currentPage + 1 });
    }
    if (currentPage > 1) {
      prefetchPage({ page: currentPage - 1 });
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    wrongAllotedList?.data?.last_page,
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
      accessorKey: "indicomp_fts_id",
      header: "FTS ID",
      id: "FTS ID",
      cell: ({ row }) => {
        const id = row.original.indicomp_fts_id;
        return id ? <div className="text-xs font-medium">{id}</div> : null;
      },
      size: 60,
    },

    {
      accessorKey: "rept_fin_year",
      header: "Reciept year",
      id: "Reciept year",
      cell: ({ row }) => {
        const year = row.original.rept_fin_year;
        return year ? <div className="text-xs">{year}</div> : null;
      },
      size: 200,
    },
    {
      accessorKey: "schoolalot_financial_year",
      header: "Schoolalot financial year",
      id: "Schoolalot financial year",
      cell: ({ row }) => {
        const year = row.original.schoolalot_financial_year;
        return year ? <div className="text-xs">{year}</div> : null;
      },
      size: 200,
    },
    {
      accessorKey: "schoolalot_from_date",
      header: "Schoolalot from date",
      id: "Schoolalot financial year",
      cell: ({ row }) => {
        const date = row.original.schoolalot_from_date;
        return date ? (
          <div className="text-xs">{moment(date).format("DD-MM-YYYY")}</div>
        ) : null;
      },
      size: 200,
    },
    {
      accessorKey: "schoolalot_to_date",
      header: "Schoolalot to date",
      id: "Schoolalot financial year",
      cell: ({ row }) => {
        const date = row.original.schoolalot_to_date;
        return date ? (
          <div className="text-xs">{moment(date).format("DD-MM-YYYY")}</div>
        ) : null;
      },

      size: 200,
    },
    {
      accessorKey: "note",
      header: "Note",
      id: "Note",
      cell: ({ row }) => {
        const note = row.original.note;
        return note ? <div className="text-xs">{note}</div> : null;
      },

      size: 200,
    },
  ];

  const table = useReactTable({
    data: wrongAllotedList?.data?.data || [],
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
    pageCount: wrongAllotedList?.data?.last_page || -1,
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
      "wrongAllotedList",
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
              Error Fetching Allotment Data
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
            placeholder="Search Wrong Allotment..."
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

        <div className=" flex justify-between gap-10 mb-0 items-center">
          <div className="mb-0">
            {wrongAllotedList?.data?.data?.length > 0 && (
              <div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-blue-600 text-blue-600 hover:bg-blue-500"
                      size="sm"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Mail
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Confirm Email</DialogTitle>
                      <DialogDescription>
                        Do you want to send the email?
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                        disabled={loading}
                      >
                        No
                      </Button>
                      <Button onClick={handleSubmitMail} disabled={loading}>
                        {loading && (
                          <Loader className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Yes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
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
                          header.getContext(),
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
      {isFetching ? (
        <PaginationShimmer />
      ) : (
        wrongAllotedList?.data?.data?.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-sm text-muted-foreground">
              Showing {wrongAllotedList?.data?.from || 0} to{" "}
              {wrongAllotedList?.data?.to || 0} of{" "}
              {wrongAllotedList?.data?.total || 0} schools
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

export default Wrongallotment;
