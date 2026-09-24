import React, { useState } from 'react';
import { Button, Spinner, useToast } from '@sanity/ui';
import { DownloadIcon } from '@sanity/icons';

// Get API URL from environment variable, fallback to production
const API_BASE_URL = import.meta.env.SANITY_STUDIO_API_URL || 'https://gsdesignresearch.com';

/**
 * Downloads a CSV of all PROCESSING orders (customer names and shipping
 * addresses) for fulfilment. Moved here from the old Sync Orders tool.
 */
const ExportProcessingOrdersButton = () => {
  const [isExporting, setIsExporting] = useState(false);
  const toast = useToast();

  const exportProcessingOrders = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);

      const response = await fetch(`${API_BASE_URL}/api/export-processing-orders`, {
        method: 'GET',
        headers: { Accept: 'text/csv' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.push({
            status: 'warning',
            title: 'No processing orders found',
            description: "There are currently no orders with 'PROCESSING' status to export.",
          });
          return;
        }

        const errorText = await response.text();
        throw new Error(`Export failed with status ${response.status}: ${errorText}`);
      }

      const blob = new Blob([await response.text()], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const filename = `processing-orders-${new Date().toISOString().split('T')[0]}.csv`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.push({
        status: 'success',
        title: 'Processing orders exported',
        description: `Downloaded ${filename} with customer names and shipping addresses.`,
      });
    } catch (error) {
      console.error('Error exporting processing orders:', error);
      toast.push({
        status: 'error',
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      disabled={isExporting}
      icon={isExporting ? Spinner : DownloadIcon}
      mode="ghost"
      text={isExporting ? 'Exporting…' : 'Export processing orders (CSV)'}
      onClick={exportProcessingOrders}
    />
  );
};

export default ExportProcessingOrdersButton;
