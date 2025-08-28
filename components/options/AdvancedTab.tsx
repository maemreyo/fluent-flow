import { Download, RotateCcw, Trash, Upload } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { supabasePaymentService } from '../../lib/services/supabase-payment-service'
import { usePaymentStore } from '../../lib/stores/payment-store'
import type { PaymentError } from '../../lib/types/payment-types'

interface AdvancedTabProps {
  handleResetSettings: () => void
}

export function AdvancedTab({ handleResetSettings }: AdvancedTabProps) {
  const handleExportData = async () => {
    try {
      // Check feature access for data export
      await supabasePaymentService.requireFeatureAccess('export_data')
      
      // Export implementation would go here
      // For now, just show success
      alert('Export feature coming soon!')
      
      // Track usage
      await supabasePaymentService.incrementUsage('export_data', 1)
      await supabasePaymentService.logActivity('data_exported', 'export_data', {
        format: 'json',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const paymentError = error as PaymentError
        if (paymentError.code === 'USAGE_LIMIT_EXCEEDED' || paymentError.code === 'FEATURE_NOT_AVAILABLE') {
          usePaymentStore.getState().showUpgrade('export_data')
          return
        }
      }
      console.error('Failed to export data:', error)
      alert('Failed to export data. Please try again.')
    }
  }

  const handleImportData = async () => {
    try {
      // Check feature access for data import
      await supabasePaymentService.requireFeatureAccess('import_data')
      
      // Import implementation would go here
      alert('Import feature coming soon!')
      
      // Track usage
      await supabasePaymentService.incrementUsage('import_data', 1)
      await supabasePaymentService.logActivity('data_imported', 'import_data', {
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const paymentError = error as PaymentError
        if (paymentError.code === 'USAGE_LIMIT_EXCEEDED' || paymentError.code === 'FEATURE_NOT_AVAILABLE') {
          usePaymentStore.getState().showUpgrade('import_data')
          return
        }
      }
      console.error('Failed to import data:', error)
      alert('Failed to import data. Please try again.')
    }
  }

  const handleClearAllData = () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return
    }
    
    // Clear data implementation would go here
    alert('Clear data feature coming soon!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Manage your FluentFlow data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4" />
              Export All Data
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleImportData}
            >
              <Upload className="h-4 w-4" />
              Import Data
            </Button>
            <Button 
              variant="destructive" 
              className="flex items-center gap-2"
              onClick={handleClearAllData}
            >
              <Trash className="h-4 w-4" />
              Clear All Data
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export and import features require a premium subscription for cloud storage access.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reset Settings</CardTitle>
          <CardDescription>Reset all settings to their default values</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleResetSettings}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}