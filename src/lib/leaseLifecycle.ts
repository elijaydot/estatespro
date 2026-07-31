import { addMonths, format } from 'date-fns';

export function calculateRenewalDates(currentEndDate: string, durationMonths = 12) {
  const endDate = new Date(currentEndDate);
  const newStartDate = new Date(endDate);
  newStartDate.setDate(newStartDate.getDate() + 1);
  const newEndDate = addMonths(newStartDate, durationMonths);

  return {
    newStartDate: format(newStartDate, 'yyyy-MM-dd'),
    newEndDate: format(newEndDate, 'yyyy-MM-dd'),
  };
}