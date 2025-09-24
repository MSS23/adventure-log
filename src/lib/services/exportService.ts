'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { TravelPattern, GeographicInsight, PhotoAnalytics } from './analyticsService'

interface ExportData {
  userStats: {
    totalAlbums: number
    totalPhotos: number
    countriesVisited: number
    citiesExplored: number
  }
  travelPatterns: TravelPattern[]
  geographicDistribution: GeographicInsight[]
  photoAnalytics: PhotoAnalytics | null
  adventureScore?: {
    score: number
    level: string
    breakdown: {
      exploration: number
      photography: number
      consistency: number
      diversity: number
    }
  }
  timelineEvents?: Array<{
    date: string
    title: string
    description: string
    value: number
    type: 'travel' | 'photo' | 'milestone'
  }>
}

export type ExportFormat = 'pdf' | 'csv' | 'excel' | 'json' | 'png'

class ExportService {
  /**
   * Export analytics data as PDF report
   */
  async exportAsPDF(data: ExportData, options: {
    includeCharts?: boolean
    filename?: string
  } = {}): Promise<void> {
    try {
      const { includeCharts = true, filename = 'adventure-log-analytics.pdf' } = options

      // Create PDF document
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 20
      let yPosition = margin

      // Helper function to add text with automatic page break
      const addText = (text: string, fontSize: number = 12, style: 'normal' | 'bold' = 'normal') => {
        if (yPosition > 280) {
          pdf.addPage()
          yPosition = margin
        }
        pdf.setFontSize(fontSize)
        pdf.setFont('helvetica', style)
        pdf.text(text, margin, yPosition)
        yPosition += fontSize + 5
      }

      // Header
      addText('Adventure Log Analytics Report', 20, 'bold')
      addText(`Generated on: ${new Date().toLocaleDateString()}`, 12)
      yPosition += 10

      // Summary Statistics
      addText('Travel Summary', 16, 'bold')
      addText(`Total Albums: ${data.userStats.totalAlbums}`)
      addText(`Total Photos: ${data.userStats.totalPhotos}`)
      addText(`Countries Visited: ${data.userStats.countriesVisited}`)
      addText(`Cities Explored: ${data.userStats.citiesExplored}`)

      if (data.adventureScore) {
        yPosition += 5
        addText(`Adventure Score: ${data.adventureScore.score}/100 (${data.adventureScore.level})`)
        addText(`- Exploration: ${data.adventureScore.breakdown.exploration}%`)
        addText(`- Photography: ${data.adventureScore.breakdown.photography}%`)
        addText(`- Consistency: ${data.adventureScore.breakdown.consistency}%`)
        addText(`- Diversity: ${data.adventureScore.breakdown.diversity}%`)
      }

      yPosition += 10

      // Travel Patterns
      if (data.travelPatterns.length > 0) {
        addText('Travel Patterns by Month', 16, 'bold')
        data.travelPatterns.forEach(pattern => {
          addText(`${pattern.period}: ${pattern.albumsCreated} albums, ${pattern.photosCount} photos`)
        })
        yPosition += 10
      }

      // Geographic Distribution
      if (data.geographicDistribution.length > 0) {
        addText('Regional Distribution', 16, 'bold')
        data.geographicDistribution.forEach(region => {
          addText(`${region.region}: ${region.count} destinations (${region.percentage}%)`)
        })
        yPosition += 10
      }

      // Photo Analytics
      if (data.photoAnalytics) {
        addText('Photography Statistics', 16, 'bold')
        addText(`Total Photos: ${data.photoAnalytics.totalPhotos}`)
        addText(`Average ISO: ${data.photoAnalytics.averageIso}`)
        addText(`Most Common Aperture: ${data.photoAnalytics.mostCommonAperture}`)

        const cameraData = Object.entries(data.photoAnalytics.cameraMakes)
        if (cameraData.length > 0) {
          addText('Camera Usage:')
          cameraData.forEach(([make, count]) => {
            addText(`  ${make}: ${count} photos`)
          })
        }
      }

      // Include chart screenshots if requested
      if (includeCharts) {
        try {
          const chartElements = document.querySelectorAll('[data-chart-export]')
          for (let i = 0; i < chartElements.length; i++) {
            const element = chartElements[i] as HTMLElement
            if (element) {
              const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 2
              })

              if (yPosition > 200) {
                pdf.addPage()
                yPosition = margin
              }

              const imgData = canvas.toDataURL('image/png')
              const imgWidth = pageWidth - 2 * margin
              const imgHeight = (canvas.height * imgWidth) / canvas.width

              pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
              yPosition += imgHeight + 10
            }
          }
        } catch (error) {
          console.warn('Could not include charts in PDF:', error)
        }
      }

      // Save PDF
      pdf.save(filename)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      throw new Error('Failed to export PDF report')
    }
  }

  /**
   * Export travel patterns as CSV
   */
  exportAsCSV(data: ExportData, filename: string = 'travel-patterns.csv'): void {
    try {
      const csvContent = [
        ['Period', 'Albums Created', 'Photos Count', 'Countries Visited', 'Cities Explored', 'Average Photos per Album'],
        ...data.travelPatterns.map(pattern => [
          pattern.period,
          pattern.albumsCreated.toString(),
          pattern.photosCount.toString(),
          pattern.countriesVisited.toString(),
          pattern.citiesExplored.toString(),
          pattern.averagePhotosPerAlbum.toString()
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      saveAs(blob, filename)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      throw new Error('Failed to export CSV file')
    }
  }

  /**
   * Export comprehensive data as Excel workbook
   */
  exportAsExcel(data: ExportData, filename: string = 'adventure-log-data.xlsx'): void {
    try {
      const workbook = XLSX.utils.book_new()

      // Summary sheet
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Albums', data.userStats.totalAlbums],
        ['Total Photos', data.userStats.totalPhotos],
        ['Countries Visited', data.userStats.countriesVisited],
        ['Cities Explored', data.userStats.citiesExplored],
        ...(data.adventureScore ? [
          ['Adventure Score', data.adventureScore.score],
          ['Adventure Level', data.adventureScore.level],
          ['Exploration Score', data.adventureScore.breakdown.exploration + '%'],
          ['Photography Score', data.adventureScore.breakdown.photography + '%'],
          ['Consistency Score', data.adventureScore.breakdown.consistency + '%'],
          ['Diversity Score', data.adventureScore.breakdown.diversity + '%']
        ] : [])
      ]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

      // Travel patterns sheet
      if (data.travelPatterns.length > 0) {
        const patternsData = [
          ['Period', 'Albums Created', 'Photos Count', 'Countries Visited', 'Cities Explored', 'Avg Photos/Album'],
          ...data.travelPatterns.map(pattern => [
            pattern.period,
            pattern.albumsCreated,
            pattern.photosCount,
            pattern.countriesVisited,
            pattern.citiesExplored,
            pattern.averagePhotosPerAlbum
          ])
        ]
        const patternsSheet = XLSX.utils.aoa_to_sheet(patternsData)
        XLSX.utils.book_append_sheet(workbook, patternsSheet, 'Travel Patterns')
      }

      // Geographic distribution sheet
      if (data.geographicDistribution.length > 0) {
        const geoData = [
          ['Region', 'Count', 'Percentage'],
          ...data.geographicDistribution.map(region => [
            region.region,
            region.count,
            region.percentage + '%'
          ])
        ]
        const geoSheet = XLSX.utils.aoa_to_sheet(geoData)
        XLSX.utils.book_append_sheet(workbook, geoSheet, 'Geographic Distribution')
      }

      // Photo analytics sheet
      if (data.photoAnalytics) {
        const photoData = [
          ['Metric', 'Value'],
          ['Total Photos', data.photoAnalytics.totalPhotos],
          ['Average ISO', data.photoAnalytics.averageIso],
          ['Most Common Aperture', data.photoAnalytics.mostCommonAperture],
          ['', ''], // Empty row
          ['Camera Make', 'Photo Count'],
          ...Object.entries(data.photoAnalytics.cameraMakes).map(([make, count]) => [make, count])
        ]
        const photoSheet = XLSX.utils.aoa_to_sheet(photoData)
        XLSX.utils.book_append_sheet(workbook, photoSheet, 'Photo Analytics')
      }

      // Timeline events sheet
      if (data.timelineEvents && data.timelineEvents.length > 0) {
        const timelineData = [
          ['Date', 'Title', 'Description', 'Value', 'Type'],
          ...data.timelineEvents.map(event => [
            new Date(event.date).toLocaleDateString(),
            event.title,
            event.description,
            event.value,
            event.type
          ])
        ]
        const timelineSheet = XLSX.utils.aoa_to_sheet(timelineData)
        XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Timeline')
      }

      // Save Excel file
      XLSX.writeFile(workbook, filename)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      throw new Error('Failed to export Excel file')
    }
  }

  /**
   * Export raw data as JSON
   */
  exportAsJSON(data: ExportData, filename: string = 'adventure-log-data.json'): void {
    try {
      const jsonData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data
      }

      const jsonString = JSON.stringify(jsonData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
      saveAs(blob, filename)
    } catch (error) {
      console.error('Error exporting JSON:', error)
      throw new Error('Failed to export JSON file')
    }
  }

  /**
   * Export chart as PNG image
   */
  async exportChartAsPNG(elementId: string, filename: string = 'chart.png'): Promise<void> {
    try {
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error('Chart element not found')
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      })

      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, filename)
        }
      }, 'image/png')
    } catch (error) {
      console.error('Error exporting chart PNG:', error)
      throw new Error('Failed to export chart as PNG')
    }
  }

  /**
   * Export multiple charts as a ZIP file
   */
  async exportAllChartsAsPNG(): Promise<void> {
    try {
      // This would require an additional library like JSZip
      // For now, we'll export charts individually
      const chartElements = document.querySelectorAll('[data-chart-export]')

      for (let i = 0; i < chartElements.length; i++) {
        const element = chartElements[i] as HTMLElement
        const chartName = element.dataset.chartName || `chart-${i + 1}`

        try {
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2
          })

          canvas.toBlob((blob) => {
            if (blob) {
              saveAs(blob, `${chartName}.png`)
            }
          }, 'image/png')

          // Add delay between exports to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.warn(`Failed to export chart ${chartName}:`, error)
        }
      }
    } catch (error) {
      console.error('Error exporting charts:', error)
      throw new Error('Failed to export charts')
    }
  }

  /**
   * Get available export formats
   */
  getAvailableFormats(): Array<{
    format: ExportFormat
    name: string
    description: string
    icon: string
  }> {
    return [
      {
        format: 'pdf',
        name: 'PDF Report',
        description: 'Comprehensive analytics report with charts',
        icon: 'FileText'
      },
      {
        format: 'excel',
        name: 'Excel Workbook',
        description: 'Multi-sheet workbook with all data',
        icon: 'FileSpreadsheet'
      },
      {
        format: 'csv',
        name: 'CSV Data',
        description: 'Travel patterns in CSV format',
        icon: 'Database'
      },
      {
        format: 'json',
        name: 'JSON Export',
        description: 'Raw data for backup or import',
        icon: 'Code'
      },
      {
        format: 'png',
        name: 'Chart Images',
        description: 'Individual charts as PNG images',
        icon: 'Image'
      }
    ]
  }
}

// Export singleton instance
export const exportService = new ExportService()

// Export types
export type { ExportData }