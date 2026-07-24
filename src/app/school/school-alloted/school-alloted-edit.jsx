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
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  FETCH_SCHOOL_ALLOT_LIST,
  FETCH_SCHOOL_ALLOT_LIST_BY_ID,
  UPDATE_DETAILS_SUMBIT,
} from "../../../api";
import { TableShimmer } from "../loadingtable/TableShimmer";
import PaginationShimmer from "@/components/common/pagination-schimmer";

const SchoolAllotEdit = () => {
  const navigate = useNavigate();
  const { id, year } = useParams();
  const location = useLocation();
  const donorId = decryptId(id);
  const donorYear = decryptId(year);
  const {
    data: schoolalot,
    refetch: refetchSchoolAllot,
    isLoading: loadingSchoolAllot,
  } = useGetMutation(
    `schooluserdata${donorId}`,
    `${FETCH_SCHOOL_ALLOT_LIST}/${donorId}`,
  );
  const totalOTS = location.state?.totalOTS ?? schoolalot?.data?.receipt_no_of_ots ?? 0;
  console.log("totalOTS from location state:", location.state);
  const queryClient = useQueryClient();
  const keyDown = useNumericInput();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [pageInput, setPageInput] = useState("");
  const [debouncedPage, setDebouncedPage] = useState("");
  const { trigger: Updatetrigger, loading: updateloading } = useApiMutation();
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: schoolListRes,
    refetch: refetchSchoolList,
    isLoading: loadingSchoolList,
    isFetching,
    prefetchPage,
  } = useGetMutation(
    `schoolListById${donorId}`,
    `${FETCH_SCHOOL_ALLOT_LIST_BY_ID}?year=${donorYear}&id=${donorId}`,
    {
      page: pagination.pageIndex + 1,
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    },
  );

  const schoolData = schoolListRes?.data || [];
  console.log(schoolData);
  useEffect(() => {
    if (!donorId || !donorYear) return;

    if (schoolalot?.data) {
      const savedIds = (schoolalot?.data?.schoolalot_school_id || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      setSelectedSchoolIds(savedIds);
    }
  }, [donorId, donorYear, schoolalot]);

  useEffect(() => {
    if (donorId && donorYear) {
      refetchSchoolAllot();
      refetchSchoolList();
    }
  }, [donorId, donorYear]);
  useEffect(() => {
    if (!schoolData?.last_page) return;

    const currentPage = pagination.pageIndex + 1;
    const totalPages = schoolData?.last_page;
    if (currentPage < totalPages) {
      prefetchPage({ page: currentPage + 1 });
    }
    if (currentPage > 1) {
      prefetchPage({ page: currentPage - 1 });
    }
  }, [
    pagination.pageIndex,
    debouncedSearchTerm,
    schoolData?.last_page,
    prefetchPage,
  ]);

  const handlePageChange = (newPageIndex) => {
    const targetPage = newPageIndex + 1;
    const cachedData = queryClient.getQueryData([
      "schoolListById",
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

  const columns = [
    {
      id: "select",
      header: () => {
        const selectableSchools =
          schoolData?.data?.filter((s) => s.status_label !== "Allotted") || [];

        const allSelected =
          selectableSchools.length > 0 &&
          selectableSchools.every((s) =>
            selectedSchoolIds.includes(s.school_code),
          );

        return (
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              const pageSchoolCodes = selectableSchools.map(
                (s) => s.school_code,
              );

              if (checked) {
                setSelectedSchoolIds((prev) => [
                  ...new Set([...prev, ...pageSchoolCodes]),
                ]);
              } else {
                setSelectedSchoolIds((prev) =>
                  prev.filter((id) => !pageSchoolCodes.includes(id)),
                );
              }
            }}
            className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-primary border border-gray-300 rounded"
            aria-label="Select all schools"
          />
        );
      },

      cell: ({ row }) => {
        const code = row.original.school_code;
        const disabled = row.original.status_label === "Allotted";
        return (
          <Checkbox
            checked={selectedSchoolIds.includes(code)}
            disabled={disabled}
            onCheckedChange={(checked) => {
              setSelectedSchoolIds((prev) =>
                checked ? [...prev, code] : prev.filter((id) => id !== code),
              );
            }}
            aria-label={`Select school ${code}`}
          />
        );
      },
    },
    { id: "state", header: "State", accessorFn: (row) => row.school_state },
    { id: "district", header: "District", accessorFn: (row) => row.district },
    { id: "achal", header: "Achal", accessorFn: (row) => row.achal },
    { id: "cluster", header: "Cluster", accessorFn: (row) => row.cluster },
    {
      id: "subCluster",
      header: "Sub Cluster",
      accessorFn: (row) => row.sub_cluster,
    },
    { id: "village", header: "Village", accessorFn: (row) => row.village },
    {
      id: "schoolCode",
      header: "School Code",
      accessorFn: (row) => row.school_code,
    },
  ];

  const table = useReactTable({
    data: schoolData?.data || [],
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
    pageCount: schoolData?.last_page || -1,
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
      donor_related_id: donorId,
      schoolalot_financial_year:
        schoolalot?.data?.schoolalot_financial_year ?? "",
      schoolalot_from_date: schoolalot?.data?.schoolalot_from_date ?? "",
      schoolalot_to_date: schoolalot?.data?.schoolalot_to_date ?? "",
      schoolalot_school_id: selectedSchoolIds.join(","),
      rept_fin_year: schoolalot?.data?.rept_fin_year ?? "",
    };
    try {
      const res = await Updatetrigger({
        url: `${UPDATE_DETAILS_SUMBIT}/${donorId}`,
        method: "put",
        data: payload,
      });

      if (res?.code == 201) {
        toast.success(res.message);
        navigate("/school/alloted");
        queryClient.invalidateQueries("school-allotment");
      } else {
        toast.error(res.message || "Unexpected error");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update");
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
  return (
    <div className="p-4 space-y-4">
      {/* Form Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label required>School Allot Year</Label>
          <Input
            value={schoolalot?.data?.schoolalot_financial_year || ""}
            disabled
          />
        </div>
        <div>
          <Label required>From Date</Label>
          <Input
            value={schoolalot?.data?.schoolalot_from_date || ""}
            disabled
            type="date"
          />
        </div>
        <div>
          <Label required>To Date</Label>
          <Input
            value={schoolalot?.data?.schoolalot_to_date || ""}
            disabled
            type="date"
          />
        </div>
      </div>

      <div className="flex items-center justify-between py-1 flex-wrap gap-2">
        {/* Left Side */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search allotment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9"
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
          <Button onClick={onSubmit} disabled={updateloading}>
            {updateloading ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
      <div className="rounded-none border min-h-[25rem]  flex flex-col">
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
            {loadingSchoolList || loadingSchoolAllot ? (
              <TableShimmer columns={table.getVisibleFlatColumns()} />
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-4"
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
        schoolData?.data?.length > 0 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-sm text-muted-foreground">
              Showing {schoolData?.from || 0} to {schoolData?.to || 0} of{" "}
              {schoolData?.total || 0} schools
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

export default SchoolAllotEdit;
