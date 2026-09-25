import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, X, Loader2, Info, PlusCircle, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import BASE_URL from '@/config/base-url';

const EventEditSub = () => {
  const { id: event_id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [rows, setRows] = useState([]);
  const [deletedSubIds, setDeletedSubIds] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const assignToOptions = [
    { value: 'Govind', label: 'Govind' },
    { value: 'Rahul', label: 'Rahul' },
    { value: 'Priya', label: 'Priya' },
    { value: 'Amit', label: 'Amit' },
    { value: 'Sneha', label: 'Sneha' }
  ];

  const { data: existingData, isLoading: isFetching } = useQuery({
    queryKey: ['event-sub', event_id],
    queryFn: async () => {
      const response = await axios.get(`${BASE_URL}/api/getEventSub/${event_id}`, {
        headers: {
          Authorization: `Bearer ${Cookies.get('token')}`,
        },
      });
      return response.data;
    },
    enabled: !!event_id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useEffect(() => {
    if (existingData) {
      console.log('getEventSub response:', existingData);
      let subArray = [];
      if (Array.isArray(existingData)) {
        subArray = existingData;
      } else if (Array.isArray(existingData?.data)) {
        subArray = existingData.data;
      } else if (Array.isArray(existingData?.event_sub)) {
        subArray = existingData.event_sub;
      } else if (Array.isArray(existingData?.eventSub)) {
        subArray = existingData.eventSub;
      }

      if (subArray && subArray.length > 0) {
        setIsEditing(true);
        const formattedRows = subArray.map((item, index) => {
          const rawAssign = item.event_sub_assign_to || item.assign_to || item.assigned_to || '';
          const matchedOption = assignToOptions.find(
            opt => opt.value.toLowerCase() === rawAssign.toString().trim().toLowerCase()
          );
          const assignVal = matchedOption ? matchedOption.value : rawAssign;
          const subId = item.id || item.event_sub_id;

          return {
            id: subId || index + 1,
            event_sub_id: subId,
            event_sub_description: item.event_sub_description || item.description || '',
            event_sub_local_national: item.event_sub_local_national || item.local_national || '',
            event_sub_deadline_date: item.event_sub_deadline_date ? item.event_sub_deadline_date.split('T')[0] : (item.deadline_date ? item.deadline_date.split('T')[0] : ''),
            event_sub_completed_date: item.event_sub_completed_date ? item.event_sub_completed_date.split('T')[0] : (item.completed_date ? item.completed_date.split('T')[0] : ''),
            event_sub_assign_to: assignVal,
          };
        });
        setRows(formattedRows);
      } else {
        setIsEditing(false);
        setRows([{
          id: 1,
          event_sub_description: '',
          event_sub_local_national: '',
          event_sub_deadline_date: '',
          event_sub_completed_date: '',
          event_sub_assign_to: '',
        }]);
      }
    }
  }, [existingData]);

  const addRow = () => {
    const newId = rows.length > 0 ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows([
      ...rows,
      {
        id: newId,
        event_sub_description: '',
        event_sub_local_national: '',
        event_sub_deadline_date: '',
        event_sub_completed_date: '',
        event_sub_assign_to: '',
      }
    ]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) {
      const targetRow = rows[index];
      if (targetRow.event_sub_id) {
        setDeletedSubIds((prev) => [...prev, targetRow.event_sub_id]);
      }
      const newRows = rows.filter((_, i) => i !== index);
      setRows(newRows);
    } else {
      toast.error('At least one row is required');
    }
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const headers = { 
        Authorization: `Bearer ${Cookies.get('token')}`,
        'Content-Type': 'application/json'
      };

      const dataToSend = rows.map(row => ({
        event_id: parseInt(event_id),
        event_sub_description: row.event_sub_description,
        event_sub_local_national: row.event_sub_local_national,
        event_sub_deadline_date: row.event_sub_deadline_date,
        event_sub_completed_date: row.event_sub_completed_date || null,
        event_sub_assign_to: row.event_sub_assign_to,
        assign_to: row.event_sub_assign_to,
      }));

      console.log('createMutation sending POST /api/createEventSub', dataToSend);

      const response = await axios.post(`${BASE_URL}/api/createEventSub`, 
        { dataToSend },
        { headers }
      );
      return response;
    },
    onSuccess: (response) => {
      if (response.data?.code === 200 || response.status === 200 || response.status === 201) {
        queryClient.invalidateQueries({ queryKey: ['event-sub', event_id] });
        queryClient.invalidateQueries({ queryKey: ['eventList'] });
        toast.success('Sub events created successfully!');
        navigate(`/event-list`);
      } else if (response.data?.code === 400) {
        toast.error(response.data.message || 'Validation error');
      } else {
        toast.error('Unexpected error occurred');
      }
    },
    onError: (error) => {
      console.error('Error creating sub events:', error);
      toast.error(error.response?.data?.message || 'Failed to create sub events');
    },
  });

  const updateMutation = useMutation({
  mutationFn: async () => {
    const headers = {
      Authorization: `Bearer ${Cookies.get('token')}`,
      'Content-Type': 'application/json',
    };

    const dataToSend = rows.map((row) => ({
      // IMPORTANT:
      // Existing row -> send its database ID
      // New row -> don't send id
      ...(row.event_sub_id
        ? { id: row.event_sub_id }
        : {}),

      event_id: parseInt(event_id),

      event_sub_description: row.event_sub_description,
      event_sub_local_national: row.event_sub_local_national,
      event_sub_deadline_date: row.event_sub_deadline_date,
      event_sub_completed_date:
        row.event_sub_completed_date || null,
      event_sub_assign_to: row.event_sub_assign_to,
    }));

    console.log('Sending dataToSend:', dataToSend);

    const response = await axios.put(
      `${BASE_URL}/api/updateEventSub/${event_id}`,
      {
        dataToSend,
      },
      { headers }
    );

    return response;
  },

  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ['event-sub', event_id],
    });

    queryClient.invalidateQueries({
      queryKey: ['eventList'],
    });

    toast.success('Sub events updated successfully!');
    navigate('/event-list');
  },

  onError: (error) => {
    console.error(
      'Update error:',
      error.response?.data || error
    );

    toast.error(
      error.response?.data?.message ||
      'Failed to update sub events'
    );
  },
});

  const handleSubmit = (e) => {
  e.preventDefault();

  const missingDesc = rows.some(
    row => !(row.event_sub_description || '').trim()
  );

  if (missingDesc) {
    toast.error('Please enter a description for all sub tasks');
    return;
  }

  const hasExistingRows = rows.some(
    row => !!row.event_sub_id
  );

  console.log('EDIT MODE:', isEditing);
  console.log('HAS EXISTING ID:', hasExistingRows);
  console.log('ROWS:', rows);

  if (isEditing || hasExistingRows) {
    updateMutation.mutate();
  } else {
    createMutation.mutate();
  }
};

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-full space-y-2">
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Info className="text-muted-foreground w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-md font-semibold text-gray-900">
                    {isEditing ? 'Edit Event Sub Tasks' : 'Create Event Sub Tasks'}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
            <Button
              onClick={() => navigate(`/event-list`)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </Button>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} noValidate className="w-full  ">
        <Card className="mb-2">
          <CardContent className="p-2">
            <div className="mb-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="p-2 text-center border text-sm font-medium">
                        Description <span className="text-red-500">*</span>
                      </TableHead>
                      <TableHead className="p-2 text-center border text-sm font-medium">
                        Local/National
                      </TableHead>
                      <TableHead className="p-2 text-center border text-sm font-medium">
                        Deadline Date
                      </TableHead>
                      <TableHead className="p-2 text-center border text-sm font-medium">
                        Completed Date
                      </TableHead>
                      <TableHead className="p-2 text-center border text-sm font-medium">
                        Assign To
                      </TableHead>
                      {/* <TableHead className="p-2 text-left border w-16">
                        Actions
                      </TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, rowIndex) => (
                      <TableRow key={row.id} className="hover:bg-gray-50">
                        <TableCell className="p-2 border">
                          <Textarea
                            value={row.event_sub_description}
                            onChange={(e) => handleRowChange(rowIndex, 'event_sub_description', e.target.value)}
                            placeholder="Enter description"
                            className="min-h-[80px] bg-white"
                          />
                        </TableCell>
                        <TableCell className="p-2 border">
                          <Input
                            value={row.event_sub_local_national}
                            onChange={(e) => handleRowChange(rowIndex, 'event_sub_local_national', e.target.value)}
                            placeholder="Enter local/national"
                            className="bg-white"
                          />
                        </TableCell>
                        <TableCell className="p-2 border">
                          <Input
                            type="date"
                            value={row.event_sub_deadline_date}
                            onChange={(e) => handleRowChange(rowIndex, 'event_sub_deadline_date', e.target.value)}
                            className="bg-white"
                          />
                        </TableCell>
                        <TableCell className="p-2 border">
                          <Input
                            type="date"
                            value={row.event_sub_completed_date}
                            onChange={(e) => handleRowChange(rowIndex, 'event_sub_completed_date', e.target.value)}
                            className="bg-white"
                          />
                        </TableCell>
                        <TableCell className="p-2 border">
                          <Select
                            value={row.event_sub_assign_to}
                            onValueChange={(value) => handleRowChange(rowIndex, 'event_sub_assign_to', value)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignToOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {/*<TableCell className="p-2 border">
                          <Button
                            variant="ghost"
                            onClick={() => removeRow(rowIndex)}
                            disabled={rows.length === 1}
                            className="text-red-500"
                            type="button"
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>*/}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-1 flex justify-end">
                <Button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Row
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/event-list`)}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button
            type="submit"
          
            disabled={createMutation.isLoading || updateMutation.isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {(createMutation.isLoading || updateMutation.isLoading) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Update Sub Tasks' : 'Create Sub Tasks'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EventEditSub;