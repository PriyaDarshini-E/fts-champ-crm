import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  SCHOOL_ALLOT_YEAR_BY_YEAR,
  SCHOOL_DATA_BY_ID,
  SCHOOL_LIST,
  SCHOOL_TO_ALOT_LIST,
} from "../../../api";
import { useLocation } from "react-router-dom";

import { TableShimmer } from "../loadingtable/TableShimmer";
import PaginationShimmer from "@/components/common/pagination-schimmer";
const DonorDetails = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id, year, fyear } = useParams();
  const donorId = decryptId(id);
  const donorYear = decryptId(year);
  const donorFYear = decryptId(fyear);
  const keyDown = useNumericInput();
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [debouncedPage, setDebouncedPage] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [pageInput, setPageInput] = useState("");
  const location = useLocation();
  const totalOTS = location.state?.totalOTS ?? 0;
  const { trigger: submitDetails, loading: submitloading } = useApiMutation();
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: schoolUserData, refetch: refetchchooluser } = useGetMutation(
    "schooluserdata",
    `${SCHOOL_DATA_BY_ID}/${donorId}`,
  );

  const {
    data: schoolallotyear,
    refetch: refetchchoolallotyeaar,
    isError,
  } = useGetMutation(
    "schoolallotyear",
    `${SCHOOL_ALLOT_YEAR_BY_YEAR}/${donorYear}`,
  );

  const userdata = schoolUserData?.data || [];
  const dateschool = schoolallotyear?.data || [];
  const {
    data: schoolData,
    isFetching,
    prefetchPage,
  } = useGetMutation(
    `donorschoollist${donorId}`,
    `${SCHOOL_LIST}?year=${donorYear}`,
    {
      page: pagination.pageIndex + 1,
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    },
  );
  useEffect(() => {
    refetchchooluser();
    refetchchoolallotyeaar();
  }, [donorId, donorYear]);
  useEffect(() => {
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
      id: "select",
      header: () => {
        const nonAllottedSchools =
          schoolData?.data?.school?.data?.filter(
            (s) => s.status_label !== "Allotted",
          ) || [];

        const allSelected =
          nonAllottedSchools.length > 0 &&
          nonAllottedSchools.every((s) =>
            selectedSchoolIds.includes(s.school_code),
          );

        return (
          <div>
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedSchoolIds((prev) => {
                    const newIds = nonAllottedSchools.map((s) => s.school_code);
                    return Array.from(new Set([...prev, ...newIds]));
                  });
                } else {
                  setSelectedSchoolIds((prev) => {
                    const idsToRemove = new Set(
                      nonAllottedSchools.map((s) => s.school_code),
                    );
                    return prev.filter((id) => !idsToRemove.has(id));
                  });
                }
              }}
              className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-primary border border-gray-300 rounded"
              aria-label="Select all schools"
            />
          </div>
        );
      },
      cell: ({ row }) => {
        const id = row.original.school_code;
        return (
          <Checkbox
            checked={selectedSchoolIds.includes(id)}
            disabled={row.original.status_label === "Allotted"}
            onCheckedChange={(checked) => {
              setSelectedSchoolIds((prev) =>
                checked ? [...prev, id] : prev.filter((s) => s !== id),
              );
            }}
            aria-label={`Select school ${id}`}
          />
        );
      },
    },

    { id: "state", header: "State", accessorFn: (row) => row.school_state },
    { id: "achal", header: "Achal", accessorFn: (row) => row.achal },
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
      id: "schoolCode",
      header: "School Code",
      accessorFn: (row) => row.school_code,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status_label;
        const isAllotted = status === "Allotted";
        return (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              isAllotted
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {isAllotted ? "Allotted" : "Not Allotted"}
          </span>
        );
      },
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

  const onSubmit = async () => {
    if (!selectedSchoolIds.length)
      return toast.error("Select at least one school");

    const payload = {
      indicomp_fts_id: userdata.indicomp_fts_id,
      schoolalot_financial_year: donorYear,
      schoolalot_to_date: dateschool.school_allot_to,
      schoolalot_from_date: dateschool.school_allot_from,
      schoolalot_school_id: selectedSchoolIds.join(","),
      rept_fin_year: donorFYear,
    };

    try {
      const res = await submitDetails({
        url: SCHOOL_TO_ALOT_LIST,
        method: "post",
        data: payload,
      });
      if (res.code == 201) {
        toast.success(res.message);
        // navigate("/school/alloted");
        navigate("/school/alloted", { state: { refetch: true } });
      } else {
        toast.error(res.message || "Unexpected error");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to submit");
    }
  };

  const handlePageChange = (newPageIndex) => {
    const targetPage = newPageIndex + 1;
    const cachedData = queryClient.getQueryData([
      "donorschoollist",
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
    <div className="p-4 bg-white space-y-2">
      {/* School Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <Label htmlFor="school-year">School Allot Year*</Label>
          <Input id="school-year" value={donorYear} disabled />
        </div>
        <div className="flex flex-col">
          <Label htmlFor="from-date">From Date*</Label>
          <Input
            id="from-date"
            value={dateschool.school_allot_from ?? ""}
            disabled
            type="date"
          />
        </div>
        <div className="flex flex-col">
          <Label htmlFor="to-date">To Date*</Label>
          <Input
            id="to-date"
            value={dateschool.school_allot_to ?? ""}
            disabled
            type="date"
          />
        </div>
      </div>

      {/* Search */}
      <div className="flex  items-center justify-between py-1 gap-1">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search school allotment..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchTerm("");
                }
              }}
              className="pl-8 h-9 text-sm bg-gray-50 border-gray-200"
            />
          </div>

          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
            <span className="text-sm font-medium text-gray-700">School to Allot</span>

            <span className="px-3 py-1 rounded-full bg-green-600 text-white font-bold">
              {totalOTS}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1">
            <span className="text-sm font-medium text-gray-700">
              Selected Schools
            </span>

            <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-bold">
              {selectedSchoolIds.length}
            </span>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
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
          <Button onClick={onSubmit} disabled={submitloading}>
            {submitloading ? "Submitting..." : "Submit"}
          </Button>
        </div>
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
                    className="h-10 px-3 bg-[var(--team-color)] text-[var(--label-color)] text-sm font-medium"
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
                <TableRow key={row.id} className="h-2">
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
                  colSpan={table.getHeaderGroups()[0].headers.length}
                  className="h-24 text-center text-sm"
                >
                  No schools found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {isFetching ? (
        <PaginationShimmer />
      ) : (
        schoolData?.data?.school?.data?.length > 0 && (
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
                  value={pageInput ?? ""}
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

export default DonorDetails;
