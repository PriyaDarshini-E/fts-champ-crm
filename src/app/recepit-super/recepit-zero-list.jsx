import { navigateToNonZero, RECEIPT_ZERO_LIST } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Loader,
  Search,
} from "lucide-react";
import moment from "moment";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TableShimmer } from "../school/loadingtable/TableShimmer";
import ReceiptSuperView from "./recepit-sup-view";
import PaginationShimmer from "@/components/common/pagination-schimmer";

const RecepitZeroList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedPage, setDebouncedPage] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState();
  const [rowSelection, setRowSelection] = useState({});
  const [pageInput, setPageInput] = useState("");
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
    data: receiptData,
    isError,
    isFetching,
    prefetchPage,
    refetch,
  } = useGetMutation("recepit-zero-list", `${RECEIPT_ZERO_LIST}`, {
    ...(debouncedSearchTerm ? {} : { page: pagination.pageIndex + 1 }),
    ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
  });
  useEffect(() => {
    if (debouncedSearchTerm) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = receiptData?.data?.last_page || 1;

    if (currentPage < totalPages) {
      prefetchPage({ page: currentPage + 1 });
    }
    if (currentPage > 1) {
      prefetchPage({ page: currentPage - 1 });
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    receiptData?.data?.last_page,
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
      accessorKey: "indicomp_fts_id",
      id: "FTS ID",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs font-medium"
        >
          FTS ID
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const ftsId =
          row.original?.indicomp_fts_id || row.getValue("indicomp_fts_id");
        return ftsId ? (
          <div className="text-[13px] font-medium">{ftsId}</div>
        ) : (
          <div className="text-gray-400 text-xs">—</div>
        );
      },
      size: 150,
    },
    {
      accessorKey: "receipt_no",
      id: "Receipt No",
      header: "Receipt No",
      cell: ({ row }) => {
        const receiptNo =
          row.original?.receipt_no || row.getValue("receipt_no");
        return receiptNo ? (
          <div className="text-xs">{receiptNo}</div>
        ) : (
          <div className="text-gray-400 text-xs">—</div>
        );
      },
      size: 150,
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
      size: 120,
    },
    {
      accessorKey: "receipt_exemption_type",
      id: "Exemption Type",
      header: "Exemption Type",
      cell: ({ row }) => {
        const type = row.original?.receipt_exemption_type;
        return type ? (
          <div className="text-xs">{type}</div>
        ) : (
          <div className="text-gray-400 text-xs">—</div>
        );
      },
      size: 120,
    },
    {
      accessorKey: "chapter_name",
      id: "Chapter Name",
      header: "Chapter Name",
      cell: ({ row }) => {
        const chapterName = row.original?.chapter?.chapter_name;
        return chapterName ? (
          <div className="text-xs">{chapterName}</div>
        ) : (
          <div className="text-gray-400 text-xs">—</div>
        );
      },
      size: 120,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigateToNonZero(navigate, row?.original?.id);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleOpenViewDialog(row?.original?.id)}
                  disabled={isDownloading}
                >
                  {isDownloading && selectedReceiptId == row?.original?.id ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 " />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
      size: 80,
    },
  ];

  const table = useReactTable({
    data: receiptData?.data?.data || [],
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
    pageCount: receiptData?.data?.last_page || -1,
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
      "recepit-zero-list",
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

  const handleOpenViewDialog = (id) => {
    setSelectedReceiptId(id);
    setShowViewModal(true);
    setIsDownloading(true);
  };
  if (isError) {
    return (
      <div className="w-full p-4  ">
        <div className="flex items-center justify-center h-64 ">
          <div className="text-center ">
            <div className="text-destructive font-medium mb-2">
              Error Fetching Recepit Zero List Data
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
            placeholder="Search recepit..."
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
        receiptData?.data?.data?.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-sm text-muted-foreground">
              Showing {receiptData?.data?.from || 0} to{" "}
              {receiptData?.data?.to || 0} of {receiptData?.data?.total || 0}{" "}
              recepits
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
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent
          hideOverlay
          className="max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] h-[85vh] p-0 absolute opacity-0 pointer-events-none -z-50 overflow-hidden bg-white rounded-xl [&>button]:hidden"
          aria-describedby={undefined}
        >
          <div className="flex-1 overflow-y-auto max-h-[80vh]">
            {selectedReceiptId && (
              <ReceiptSuperView
                id={selectedReceiptId}
                isDialog={true}
                onClose={() => {
                  setShowViewModal(false);
                  setIsDownloading(false);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecepitZeroList;
