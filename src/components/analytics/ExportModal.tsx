'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Database,
  Code,
  Image,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportService, ExportData, ExportFormat } from '@/lib/services/exportService'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ExportData
  title?: string
}

interface ExportOption {
  format: ExportFormat
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
  estimatedSize: string
}

const exportOptions: ExportOption[] = [
  {
    format: 'pdf',
    name: 'PDF Report',
    description: 'Comprehensive analytics report with charts and insights',
    icon: FileText,
    features: ['Visual charts', 'Formatted layout', 'Ready to share'],
    estimatedSize: '2-5 MB'
  },
  {
    format: 'excel',
    name: 'Excel Workbook',
    description: 'Multi-sheet workbook with all data for further analysis',
    icon: FileSpreadsheet,
    features: ['Multiple sheets', 'Raw data', 'Formulas ready'],
    estimatedSize: '500 KB - 2 MB'
  },
  {
    format: 'csv',
    name: 'CSV Data',
    description: 'Simple comma-separated values for basic analysis',
    icon: Database,
    features: ['Universal format', 'Lightweight', 'Excel compatible'],
    estimatedSize: '50-200 KB'
  },
  {
    format: 'json',
    name: 'JSON Export',
    description: 'Complete raw data in JSON format for developers',
    icon: Code,
    features: ['Complete data', 'Machine readable', 'API compatible'],
    estimatedSize: '100-500 KB'
  },
  {
    format: 'png',
    name: 'Chart Images',
    description: 'Individual charts as high-quality PNG images',
    icon: Image,
    features: ['High resolution', 'Web ready', 'Multiple files'],
    estimatedSize: '1-3 MB total'
  }
]

interface ExportSettings {
  includeCharts: boolean
  includeRawData: boolean
  filename: string
  dateFormat: 'iso' | 'local' | 'friendly'
  resolution: 'standard' | 'high' | 'print'
  colorScheme: 'color' | 'grayscale'
}

const defaultSettings: ExportSettings = {
  includeCharts: true,
  includeRawData: true,
  filename: 'adventure-log-export',
  dateFormat: 'friendly',
  resolution: 'standard',
  colorScheme: 'color'
}

export function ExportModal({
  open,
  onOpenChange,
  data,
  title = 'Export Analytics Data'
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf')
  const [settings, setSettings] = useState<ExportSettings>(defaultSettings)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [exportError, setExportError] = useState<string>('')

  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus('idle')
    setExportError('')

    try {
      const filename = `${settings.filename}.${selectedFormat === 'excel' ? 'xlsx' : selectedFormat}`

      switch (selectedFormat) {
        case 'pdf':
          await exportService.exportAsPDF(data, {
            includeCharts: settings.includeCharts,
            filename
          })
          break
        case 'excel':
          exportService.exportAsExcel(data, filename)
          break
        case 'csv':
          exportService.exportAsCSV(data, filename)
          break
        case 'json':
          exportService.exportAsJSON(data, filename)
          break
        case 'png':
          await exportService.exportAllChartsAsPNG()
          break
        default:
          throw new Error('Unsupported export format')
      }

      setExportStatus('success')
      setTimeout(() => {
        onOpenChange(false)
        setExportStatus('idle')
      }, 2000)
    } catch (error) {
      setExportStatus('error')
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const updateSettings = (updates: Partial<ExportSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  const selectedOption = exportOptions.find(option => option.format === selectedFormat)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Choose your preferred format and customize export settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format Selection */}
          <div>
            <Label className="text-base font-medium mb-4 block">Export Format</Label>
            <div className="grid gap-3">
              {exportOptions.map((option) => (
                <div
                  key={option.format}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
                    selectedFormat === option.format
                      ? "border-blue-200 bg-blue-50 ring-1 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setSelectedFormat(option.format)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-md",
                      selectedFormat === option.format
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      <option.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{option.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {option.estimatedSize}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {option.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {selectedFormat === option.format && (
                      <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Export Settings */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedFormat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-4 w-4" />
                <Label className="text-base font-medium">Export Settings</Label>
              </div>

              {/* Filename */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Filename</Label>
                <Input
                  value={settings.filename}
                  onChange={(e) => updateSettings({ filename: e.target.value })}
                  placeholder="adventure-log-export"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be saved as: {settings.filename}.{selectedFormat === 'excel' ? 'xlsx' : selectedFormat}
                </p>
              </div>

              {/* Format-specific settings */}
              {selectedFormat === 'pdf' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-charts"
                      checked={settings.includeCharts}
                      onCheckedChange={(checked) =>
                        updateSettings({ includeCharts: checked as boolean })
                      }
                    />
                    <Label htmlFor="include-charts" className="text-sm">
                      Include chart images in PDF
                    </Label>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Color Scheme</Label>
                    <Select
                      value={settings.colorScheme}
                      onValueChange={(value: 'color' | 'grayscale') =>
                        updateSettings({ colorScheme: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="color">Full Color</SelectItem>
                        <SelectItem value="grayscale">Grayscale (Printer Friendly)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedFormat === 'png' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Image Resolution</Label>
                    <Select
                      value={settings.resolution}
                      onValueChange={(value: 'standard' | 'high' | 'print') =>
                        updateSettings({ resolution: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard (1x)</SelectItem>
                        <SelectItem value="high">High Quality (2x)</SelectItem>
                        <SelectItem value="print">Print Quality (4x)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {(selectedFormat === 'csv' || selectedFormat === 'excel' || selectedFormat === 'json') && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Date Format</Label>
                    <Select
                      value={settings.dateFormat}
                      onValueChange={(value: 'iso' | 'local' | 'friendly') =>
                        updateSettings({ dateFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iso">ISO 8601 (2024-01-15)</SelectItem>
                        <SelectItem value="local">Local Format</SelectItem>
                        <SelectItem value="friendly">Friendly (Jan 15, 2024)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Data Preview */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Export Preview</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Albums: {data.userStats.totalAlbums}</div>
              <div>Photos: {data.userStats.totalPhotos}</div>
              <div>Countries: {data.userStats.countriesVisited}</div>
              <div>Travel Patterns: {data.travelPatterns.length} periods</div>
              {data.geographicDistribution.length > 0 && (
                <div>Geographic Data: {data.geographicDistribution.length} regions</div>
              )}
            </div>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {exportStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Export completed successfully!</span>
              </motion.div>
            )}

            {exportStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
              >
                <AlertCircle className="h-5 w-5" />
                <span>{exportError || 'Export failed. Please try again.'}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedOption?.estimatedSize && (
                <>Estimated file size: {selectedOption.estimatedSize}</>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || !settings.filename}
                className="flex items-center gap-2 min-w-[120px]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export {selectedOption?.name}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}