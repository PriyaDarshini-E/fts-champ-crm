import React from 'react';
import { Card } from '@/components/ui/card';
import moment from 'moment';
import numWords from "num-words";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ReceiptDraft = ({ 
  formData, 
  donorData, 
  onSave, 
  onCancel,
  receiptControl,
  currentYear,
  open,
  onOpenChange
}) => {
  
    const convertAmountToWords = (amount) => {
        if (!amount) return '';
        
        const num = parseFloat(amount);
        if (isNaN(num)) return '';
    
        if (num === 0) return 'Zero Rupees';
    
        try {
          const words = numWords(num); 
          return words.charAt(0).toUpperCase() + words.slice(1) + ' Rupees';
        } catch (error) {
          console.error('Error converting number to words:', error);
          return 'Amount in words unavailable';
        }
      };

  const amountInWords = convertAmountToWords(formData.receipt_total_amount);

  
  const getReceiptDate = () => {
    if (receiptControl.date_open === 'No' && receiptControl.date_open_one === 'No') {
      return moment().format('YYYY-MM-DD');
    } else if (receiptControl.date_open === 'Yes') {
      return formData.receipt_date;
    } else if (receiptControl.date_open_one === 'Yes') {
      return receiptControl.date_open_one_date;
    }
    return moment().format('YYYY-MM-DD');
  };

  const receiptDate = getReceiptDate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            Receipt Preview {currentYear}
          </DialogTitle>
          <DialogDescription>
            Review the receipt details before final submission. Click "Save & Create Receipt" to proceed or "Cancel" to go back.
          </DialogDescription>
        </DialogHeader>

       
          <Card className="p-4 rounded-md">
            <div className="relative">
             

              <table className="w-full border-t border-black border-collapse text-[12px]">
                <tbody>
                  <tr>
                    <td className="border-l border-black p-1">Received with thanks from :</td>
                    <td className="border-l border-black p-1">Receipt No.</td>
                    <td className="p-2">:</td>
                    <td className="border-r border-black p-1">
                      <span className="font-bold">DRAFT</span>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-l border-black" rowSpan="2">
                      <div className="ml-6 font-bold">
                        <p className="text-sm leading-tight">
                          {donorData.indicomp_type !== "Individual" && "M/s"}
                          {donorData.indicomp_type === "Individual" && donorData.title}{" "}
                          {donorData.indicomp_full_name}
                        </p>

                        {donorData.indicomp_off_branch_address && (
                          <div className=''>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_off_branch_address}
                            </p>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_off_branch_area}
                            </p>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_off_branch_ladmark}
                            </p>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_off_branch_city} -{" "}
                              {donorData.indicomp_off_branch_pin_code},
                              {donorData.indicomp_off_branch_state}
                            </p>
                          </div>
                        )}

                        {donorData.indicomp_res_reg_address && (
                          <div>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_res_reg_address}
                            </p>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_res_reg_area}
                            </p>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_res_reg_ladmark}
                            </p>
                            <p className="text-sm leading-tight">
                              {donorData.indicomp_res_reg_city} -{" "}
                              {donorData.indicomp_res_reg_pin_code},
                              {donorData.indicomp_res_reg_state}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border-l border-t border-black p-1">Date</td>
                    <td className="p-1 border-t border-black">:</td>
                    <td className="border-r border-t border-black p-1">
                      <span className="font-bold">
                        {moment(receiptDate).format("DD-MM-YYYY")}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-l border-t border-black p-1">On account of</td>
                    <td className="p-1 border-t border-black">:</td>
                    <td className="border-r border-t border-black p-1">
                      <span className="font-bold">
                      {(formData.receipt_csr === "Yes" && formData.receipt_donation_type === "One Teacher School") ?
                   ( <>{formData.receipt_donation_type} - CSR </>)
                  : 
                      (<>{formData.receipt_donation_type}</>)}</span>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-l border-black p-1">
                      <div className="flex items-center">
                        <span>PAN No :</span>
                        <span className="font-bold ml-2">
                          {donorData.indicomp_pan_no || 'Not Provided'}
                        </span>
                      </div>
                    </td>
                    <td className="border-l border-t border-black p-1">Pay Mode</td>
                    <td className="p-1 border-t border-black">:</td>
                    <td className="border-r border-t border-black p-1">
                      <span className="font-bold">{formData.receipt_tran_pay_mode}</span>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-l border-t border-b border-black p-1">
                      Amount in words :
                      <span className="font-bold capitalize"> {amountInWords} Only</span>
                    </td>
                    <td className="border-l border-b border-t border-black p-1">Amount</td>
                    <td className="p-1 border-b border-t border-black">:</td>
                    <td className="border-r border-b border-t border-black p-1">
                      Rs. <span className="font-bold">{formData.receipt_total_amount}</span> /-
                    </td>
                  </tr>

                  <tr>
                    <td className="border-l border-b border-r border-black p-1" colSpan="4">
                      Reference :
                      <span className="font-bold text-sm">{formData.receipt_tran_pay_details}</span>
                    </td>
                  </tr>

                  <tr>
                    <td className="border-l border-b border-black p-1" colSpan="1">
                      {formData.receipt_exemption_type === "80G" && (
                        <div className="text-[12px]">
                          {moment(receiptDate).isAfter("2021-05-27") ? (
                            <>
                              Donation is exempt U/Sec.80G of the
                              <br />
                              Income Tax Act 1961 vide Order No.
                              AAAAF0290LF20214 Dt. 28-05-2021.
                            </>
                          ) : (
                            <>
                              This donation is eligible for deduction U/S 80(G) of the
                              <br />
                              Income Tax Act 1961 vide order
                              NO:DIT(E)/3260/8E/73/89-90 Dt. 13-12-2011.
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-r border-black p-1 text-right text-[12px]" colSpan="3">
                      For Friends of Tribals Society
                      <br />
                      <br />
                      <br />
                      <div className="text-center">
                        <div className="h-12 mb-1 border-b border-black w-32 mx-auto"></div>
        
                        <div className="text-sm text-gray-500">Authorized Signatory</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
      

        <DialogFooter className="flex flex-col sm:flex-row gap-2 ">
          <Button
            onClick={onSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Save & Create Receipt
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDraft;