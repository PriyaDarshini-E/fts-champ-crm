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
import BASE_URL from "@/config/base-url";
import useNumericInput from "@/hooks/use-numeric-input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageCircle,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import mailSentGif from "../../assets/mail-sent-fast.gif";
import moment from "moment";
import { useApiMutation } from "@/hooks/use-mutation";
import { MEMBERSHIP_RENEWAL_WHATSAPP_LIST } from "@/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MembershipActive = () => {
  const token = Cookies.get("token");
  const userType = Cookies.get("user_type_id");
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();

  const [mailSending, setMailSending] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [previousSearchTerm, setPreviousSearchTerm] = useState("");
  const { trigger: sendWhatsapp, loading: whatsappLoading } = useApiMutation();

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [pageInput, setPageInput] = useState("");

  // Debounced search effect
  useEffect(() => {
    const timerId = setTimeout(() => {
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

  // Updated query with pagination and search
  const {
    data: membershipData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["member-active", debouncedSearchTerm, pagination.pageIndex + 1],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      } else {
        params.append("page", (pagination.pageIndex + 1).toString());
      }

      const response = await axios.get(
        `${BASE_URL}/api/member-data?type=1&${params}`,
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
    retry: 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Prefetch next and previous pages
  useEffect(() => {
    if (debouncedSearchTerm) return;
    const currentPage = pagination.pageIndex + 1;
    const totalPages = membershipData?.data?.last_page || 1;

    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      queryClient.prefetchQuery({
        queryKey: ["member-active", debouncedSearchTerm, nextPage],
        queryFn: async () => {
          const params = new URLSearchParams({
            page: nextPage.toString(),
          });

          if (debouncedSearchTerm) {
            params.append("search", debouncedSearchTerm);
          }

          const response = await axios.get(
            `${BASE_URL}/api/member-data?type=1&${params}`,
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

      if (
        !queryClient.getQueryData([
          "member-active",
          debouncedSearchTerm,
          prevPage,
        ])
      ) {
        queryClient.prefetchQuery({
          queryKey: ["member-active", debouncedSearchTerm, prevPage],
          queryFn: async () => {
            const params = new URLSearchParams({
              page: prevPage.toString(),
            });

            if (debouncedSearchTerm) {
              params.append("search", debouncedSearchTerm);
            }

            const response = await axios.get(
              `${BASE_URL}/api/member-data?type=1&${params}`,
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
    queryClient,
    membershipData?.data?.last_page,
    token,
  ]);

  const sendEmailMutation = useMutation({
    mutationFn: async (memberId) => {
      const response = await axios.get(
        `${BASE_URL}/api/send-membership-renewal-email/${memberId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return response.data;
    },
    onSuccess: (data, memberId) => {
      toast.success(data.message || "Email sent successfully");
      setMailSending((prev) => ({ ...prev, [memberId]: false }));
    },
    onError: (error, memberId) => {
      const message = error.response?.data?.message || "Failed to send email";
      toast.error(message);
      setMailSending((prev) => ({ ...prev, [memberId]: false }));
    },
  });

  const handleSendEmail = (memberId, email) => {
    if (!email || email.toLowerCase() === "null") {
      toast.error("No email address available for this member");
      return;
    }

    setMailSending((prev) => ({ ...prev, [memberId]: true }));
    sendEmailMutation.mutate(memberId);
  };
  const handleWhatsapp = async (id) => {
    if (!id) {
      toast.error("Member ID is missing. Please try again.");
      return;
    }

    try {
      setWhatsappSending((prev) => ({ ...prev, [id]: true }));

      const res = await sendWhatsapp({
        url: `${MEMBERSHIP_RENEWAL_WHATSAPP_LIST}/${id}`,
        method: "get",
      });

      if (res?.code === 201 || res?.code === 200) {
        toast.success(res?.message || "WhatsApp message sent successfully");
        setOpen(false);
      } else {
        toast.error(res?.message || "Failed to send WhatsApp message");
      }
    } catch (err) {
      console.error("WhatsApp send error:", err);
      toast.error(
        err?.message || "Something went wrong while sending WhatsApp",
      );
    } finally {
      setWhatsappSending((prev) => ({ ...prev, [id]: false }));
    }
  };

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [whatsappSending, setWhatsappSending] = useState({});
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
          {row.getValue("Full Name") || "-"}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "indicomp_email",
      id: "Email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Email
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">
          {row.getValue("Email") || "-"}
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: "indicomp_mobile_phone",
      id: "Mobile Phone",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Mobile Phone
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">
          {row.getValue("Mobile Phone") || "-"}
        </div>
      ),
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
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">
          {row.getValue("Type") || "-"}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "indicomp_donor_type",
      id: "Donor Type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Donor Type
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">
          {row.getValue("Donor Type") || "-"}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "chapter_name",
      id: "Chapter",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Chapter
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">
          {row.getValue("Chapter") || "-"}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "last_payment_date",
      id: "Last Pay Date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Last Pay Date
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("Last Pay Date");
        const formattedDate = date ? moment(date).format("DD MMM YYYY") : "-";
        return <div className="text-[13px] font-medium">{formattedDate}</div>;
      },
      size: 120,
    },
    {
      accessorKey: "payment_count",
      id: "Pay Count",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 h-8 text-xs"
        >
          Pay Count
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[13px] font-medium">
          {row.getValue("Pay Count") || "0"}
        </div>
      ),
      size: 80,
    },
    ...(userType !== "4"
      ? [
          {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
              const memberId = row.original.id;
              const email = row.original.indicomp_email;
              const mobile = row.original.indicomp_mobile_phone;
              const isValidMobile = mobile && mobile !== "null";
              const isValidEmail = email && email.toLowerCase() !== "null";

              return (
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendEmail(memberId, email)}
                          disabled={!isValidEmail || mailSending[memberId]}
                          className="h-7 w-7 p-0 flex items-center justify-center"
                        >
                          {mailSending[memberId] ? (
                            <img
                              src={mailSentGif}
                              alt="Sending..."
                              className="h-5 w-5 object-contain"
                            />
                          ) : (
                            <Mail
                              className={`w-3 h-3 ${
                                isValidEmail ? "text-blue-500" : "text-gray-300"
                              }`}
                            />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send Email</TooltipContent>
                    </Tooltip>

                    {/* WhatsApp Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWhatsapp(memberId)}
                          disabled={!isValidMobile || whatsappSending[memberId]}
                          className="h-7 w-7 p-0 flex items-center justify-center"
                        >
                          {whatsappSending[memberId] ? (
                            <img
                              src={mailSentGif}
                              alt="Sending..."
                              className="h-5 w-5 object-contain"
                            />
                          ) : (
                            <MessageCircle className="w-3 h-3 text-green-500" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send WhatsApp</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            },
            size: 80,
          },
        ]
      : []),
  ];

  const table = useReactTable({
    data: membershipData?.data?.data || [],
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
    pageCount: membershipData?.data?.last_page || -1,
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
      "member-active",
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
      <div className="w-full p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-destructive font-medium mb-2">
              Error Fetching Membership Data
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
            placeholder="Search members..."
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
                  No members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-1">
        <div className="text-sm text-muted-foreground">
          Showing {membershipData?.data?.from || 0} to{" "}
          {membershipData?.data?.to || 0} of {membershipData?.data?.total || 0}{" "}
          members
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

export default MembershipActive;
