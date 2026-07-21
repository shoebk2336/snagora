'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Project, Building, Wing, Floor, Room, Issue } from '@/database/db';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, FileText, ArrowRight, ShieldAlert, 
  Settings, CheckCircle2, Download, AlertCircle, Coins 
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useLicenseStore, canExportReport } from '@/store/licenseStore';

const convertBlobToBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const result = reader.result as string;
    const base64 = result.substring(result.indexOf(',') + 1);
    resolve(base64);
  };
  reader.readAsDataURL(blob);
});

export default function ReportsPage() {
  const { user } = useAuthStore();
  const { reportCreditsRemaining, isUnlimited, consumeCredit } = useLicenseStore();
  const router = useRouter();

  // Export filters state
  const [selectedProj, setSelectedProj] = useState('');
  const [selectedBld, setSelectedBld] = useState('');
  const [selectedWing, setSelectedWing] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [exporting, setExporting] = useState(false);

  // Queries
  const projects = useLiveQuery(() => db.projects.toArray());
  const buildings = useLiveQuery(() => selectedProj ? db.buildings.where({ projectId: selectedProj }).toArray() : Promise.resolve([] as Building[]), [selectedProj]);
  const wings = useLiveQuery(() => selectedBld ? db.wings.where({ buildingId: selectedBld }).toArray() : Promise.resolve([] as Wing[]), [selectedBld]);
  const floors = useLiveQuery(() => selectedWing ? db.floors.where({ wingId: selectedWing }).toArray() : Promise.resolve([] as Floor[]), [selectedWing]);
  const rooms = useLiveQuery(() => selectedFloor ? db.rooms.where({ floorId: selectedFloor }).toArray() : Promise.resolve([] as Room[]), [selectedFloor]);

  if (!user) return null;

  // Retrieve issues matching the active filters
  const getFilteredIssues = async (): Promise<Issue[]> => {
    let list = await db.issues.toArray();

    if (selectedProj) list = list.filter(i => i.projectId === selectedProj);
    if (selectedBld) list = list.filter(i => i.buildingId === selectedBld);
    if (selectedWing) list = list.filter(i => i.wingId === selectedWing);
    if (selectedFloor) list = list.filter(i => i.floorId === selectedFloor);
    if (selectedRoom) list = list.filter(i => i.roomId === selectedRoom);

    return list;
  };

  // 2. EXCEL GENERATION EXCELJS
  const handleExportExcel = async () => {
    if (!canExportReport()) {
      alert('Each report export costs 5 tokens (coins). You do not have enough tokens. Please renew or sync your license.');
      return;
    }

    setExporting(true);
    try {
      const issueList = await getFilteredIssues();
      if (issueList.length === 0) {
        alert('No issues match the selected filter criteria.');
        setExporting(false);
        return;
      }

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Defects Register');

      // Helper: strip base64 data URI prefix and detect extension
      const parseBase64Image = (dataUrl: string): { base64: string; extension: 'png' | 'jpeg' } | null => {
        if (!dataUrl) return null;
        const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (!match) return null;
        const ext = match[1] === 'jpg' ? 'jpeg' : match[1] === 'webp' ? 'png' : match[1] as 'png' | 'jpeg';
        return { base64: match[2], extension: ext };
      };

      // 1. Gather all photos and map them per issue to know the maximum number of columns needed
      const allRooms = await db.rooms.toArray();
      const allPhotos = await db.photos.toArray();
      
      const issuesWithImages = [];
      let maxImagesCount = 0;

      for (const issue of issueList) {
        const issuePhotos = allPhotos.filter(p => issue.photos.includes(p.id));
        let imagesToEmbed: string[] = [];

        if (issuePhotos.length === 1) {
          const photo = issuePhotos[0];
          imagesToEmbed.push(photo.originalUrl);
          if (photo.annotationsJson) {
            imagesToEmbed.push(photo.annotatedUrl);
          }
        } else if (issuePhotos.length >= 2) {
          imagesToEmbed = issuePhotos.map(p => p.annotationsJson ? p.annotatedUrl : p.originalUrl);
        }

        issuesWithImages.push({ issue, imagesToEmbed });
        if (imagesToEmbed.length > maxImagesCount) {
          maxImagesCount = imagesToEmbed.length;
        }
      }

      // 2. Define sheet columns dynamically
      const columns = [
        { header: 'Project Name', key: 'project', width: 25 },
        { header: 'Building', key: 'building', width: 20 },
        { header: 'Wing', key: 'wing', width: 15 },
        { header: 'Floor', key: 'floor', width: 15 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Location', key: 'subcategory', width: 15 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Description', key: 'title', width: 30 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Created By', key: 'createdby', width: 18 },
        { header: 'Created Date', key: 'createddate', width: 18 }
      ];

      // Add dynamic photo columns
      const firstPhotoColIndex = columns.length + 1; // 1-based index (e.g. 17 = Column Q)
      for (let i = 0; i < maxImagesCount; i++) {
        let headerLabel = `Photo ${i + 1}`;
        if (maxImagesCount === 2) {
          headerLabel = i === 0 ? 'Photo 1 / Original' : 'Photo 2 / Annotated';
        }
        columns.push({
          header: headerLabel,
          key: `photo_${i}`,
          width: 22
        });
      }

      sheet.columns = columns;

      // Header row styles
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FF059669' } }
        };
      });
      headerRow.height = 30;

      // 3. Populate rows from issues and embed photos
      for (let idx = 0; idx < issuesWithImages.length; idx++) {
        const { issue, imagesToEmbed } = issuesWithImages[idx];
        const rm = allRooms.find(r => r.id === issue.roomId);
        const proj = await db.projects.get(issue.projectId);
        const rowNumber = idx + 2; // Row 1 is header

        // Build the row object dynamically
        const rowData: any = {
          project: proj?.name || 'Unknown Project',
          building: rm?.building || '',
          wing: rm?.wing || '',
          floor: rm?.floor || '',
          room: rm?.number || '',
          category: issue.category || '',
          subcategory: issue.subCategory || '',
          priority: issue.priority || '',
          title: issue.title || '',
          description: issue.description || '',
          remarks: issue.remarks || '',
          status: issue.status === 'completed' ? 'Completed' : 'Pending',
          createdby: issue.createdBy || '',
          createddate: new Date(issue.createdDate).toLocaleDateString(),
          lat: issue.gps?.latitude || '',
          lng: issue.gps?.longitude || ''
        };

        // Initialize empty strings for photo columns
        for (let i = 0; i < maxImagesCount; i++) {
          rowData[`photo_${i}`] = '';
        }

        sheet.addRow(rowData);

        // Embed the images
        let hasImage = false;
        for (let i = 0; i < imagesToEmbed.length; i++) {
          const imgUrl = imagesToEmbed[i];
          const parsed = parseBase64Image(imgUrl);
          if (parsed) {
            try {
              const imgId = workbook.addImage({
                base64: parsed.base64,
                extension: parsed.extension,
              });
              
              sheet.addImage(imgId, {
                tl: { col: firstPhotoColIndex - 1 + i, row: rowNumber - 1 } as any,
                ext: { width: 140, height: 105 },
              });
              hasImage = true;
            } catch (e) {
              console.warn(`Failed to embed photo ${i + 1} for issue`, issue.id, e);
            }
          }
        }

        // Set row height: taller when image is embedded
        const row = sheet.getRow(rowNumber);
        row.height = hasImage ? 85 : 22;
      }

      // Formatting details cells
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.font = { name: 'Segoe UI', size: 10 };
        row.alignment = { wrapText: true, vertical: 'middle' };

        // Color status column
        const statusCell = row.getCell('status');
        if (statusCell.value === 'Completed') {
          statusCell.font = { bold: true, color: { argb: 'FF059669' } }; // Green
        } else {
          statusCell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Red
        }

        // Color Priority column
        const priorityCell = row.getCell('priority');
        const pVal = priorityCell.value;
        if (pVal === 'Critical') priorityCell.font = { bold: true, color: { argb: 'FFE11D48' } };
        else if (pVal === 'High') priorityCell.font = { bold: true, color: { argb: 'FFEA580C' } };
        else if (pVal === 'Medium') priorityCell.font = { bold: true, color: { argb: 'FFCA8A04' } };
        else priorityCell.font = { color: { argb: 'FF475569' } };
      });

      // Write excel file and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer as ArrayBuffer)], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const fileName = `Snagora-Inspection-Register-${Date.now()}.xlsx`;

      // Trigger download or share
      if (Capacitor.isNativePlatform()) {
        try {
          const base64 = await convertBlobToBase64(blob);
          let savedDirectly = false;
          try {
            const permStatus = await Filesystem.checkPermissions();
            if (permStatus.publicStorage !== 'granted') {
              const reqStatus = await Filesystem.requestPermissions();
              if (reqStatus.publicStorage !== 'granted') {
                throw new Error('Public storage permission not granted');
              }
            }
            await Filesystem.writeFile({
              path: `Download/${fileName}`,
              data: base64,
              directory: Directory.ExternalStorage
            });
            savedDirectly = true;
            alert(`Excel file saved successfully to your phone's Downloads folder as:\n${fileName}`);
          } catch (writeErr) {
            console.warn('Could not write directly to Downloads folder, falling back to Share sheet:', writeErr);
          }

          if (!savedDirectly) {
            const writeResult = await Filesystem.writeFile({
              path: fileName,
              data: base64,
              directory: Directory.Cache
            });
            await Share.share({
              title: fileName,
              url: writeResult.uri
            });
          }
        } catch (shareErr) {
          console.error('Failed to share file on native platform', shareErr);
          alert('Failed to save and share Excel file locally.');
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      // Successfully generated, consume one credit
      await consumeCredit();
    } catch (e) {
      console.error(e);
      alert('Failed to generate Excel sheet.');
    } finally {
      setExporting(false);
    }
  };

  // 3. PDF REPORT GENERATION JSPDF
  const handleExportPDF = async () => {
    if (!canExportReport()) {
      alert('Each report export costs 5 tokens (coins). You do not have enough tokens. Please renew or sync your license.');
      return;
    }

    setExporting(true);
    try {
      const issueList = await getFilteredIssues();
      if (issueList.length === 0) {
        alert('No issues match the selected filter criteria.');
        setExporting(false);
        return;
      }

      // Initialize Portrait PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // --- PAGE 1: COVER PAGE ---
      pdf.setFillColor(16, 185, 129); // Emerald background block
      pdf.rect(0, 0, pageWidth, 80, 'F');

      // Title on cover
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.text('FACILITY INSPECTION DOSSIER', 20, 40);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.text('Snagora - Offline Inspection & Reporting System', 20, 52);

      // Metadatas block
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('REPORT SCOPE DETAILS', 20, 110);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      let yShift = 120;

      const pObj = await db.projects.get(selectedProj);
      pdf.text(`Project Name: ${pObj ? pObj.name : 'All Projects'}`, 20, yShift);
      yShift += 8;

      if (selectedBld) {
        const bld = await db.buildings.get(selectedBld);
        pdf.text(`Building: ${bld?.name || ''}`, 20, yShift);
        yShift += 8;
      }

      pdf.text(`Inspector: ${user.name} (${user.role})`, 20, yShift);
      yShift += 8;
      pdf.text(`Export Date: ${new Date().toLocaleString()}`, 20, yShift);
      yShift += 8;
      pdf.text(`Total Defects Highlighted: ${issueList.length}`, 20, yShift);

      // Statistics grid outline
      yShift += 15;
      pdf.setFillColor(241, 245, 249);
      pdf.rect(20, yShift, pageWidth - 40, 30, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary Metrics:', 25, yShift + 8);
      pdf.setFont('helvetica', 'normal');
      
      const criticalCount = issueList.filter(i => i.priority === 'Critical').length;
      const highCount = issueList.filter(i => i.priority === 'High').length;
      const pendingCount = issueList.filter(i => i.status === 'pending').length;
      const resolvedCount = issueList.filter(i => i.status === 'completed').length;

      pdf.text(`Critical Issues: ${criticalCount}    |    High Issues: ${highCount}`, 25, yShift + 16);
      pdf.text(`Open (Pending): ${pendingCount}    |    Resolved: ${resolvedCount}`, 25, yShift + 24);

      // Footer cover
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Generated completely offline via Snagora local database core.', pageWidth / 2, 280, { align: 'center' });

      // --- PAGE 2+ INDIVIDUAL ISSUE PAGES ---
      const allPhotos = await db.photos.toArray();
      const allRooms = await db.rooms.toArray();

      for (let index = 0; index < issueList.length; index++) {
        const issue = issueList[index];
        const room = allRooms.find(r => r.id === issue.roomId);
        pdf.addPage();

        // Top thin line
        pdf.setFillColor(16, 185, 129);
        pdf.rect(0, 0, pageWidth, 5, 'F');

        // Issue page header
        pdf.setTextColor(16, 185, 129);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.text(`DEFECT RECORD #${index + 1} OF ${issueList.length}`, 15, 15);

        // Title
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(16);
        pdf.text(issue.title, 15, 23);

        // Location & Attributes Table Grid
        pdf.setFillColor(248, 250, 252);
        pdf.rect(15, 28, pageWidth - 30, 32, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text('LOCATION INFO', 18, 34);
        pdf.text('METRICS', 110, 34);

        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Room: ${room?.number || ''}`, 18, 40);
        pdf.text(`Wing/Floor: ${room?.wing || ''} / ${room?.floor || ''}`, 18, 45);
        pdf.text(`Building: ${room?.building || ''}`, 18, 50);

        pdf.text(`Category: ${issue.category || 'N/A'} | Location: ${issue.subCategory || 'N/A'}`, 110, 40);
        pdf.text(`Priority: ${issue.priority || 'N/A'}`, 110, 45);
        pdf.text(`Status: ${issue.status === 'completed' ? 'Resolved/Approved' : 'Open'}`, 110, 50);

        // GPS location if present
        if (issue.gps) {
          pdf.text(`GPS: Lat: ${issue.gps.latitude.toFixed(5)}, Lng: ${issue.gps.longitude.toFixed(5)} (Acc: ±${issue.gps.accuracy}m)`, 18, 56);
        } else {
          pdf.text('GPS: Not captured (indoors/unavailable)', 18, 56);
        }

        // Description & Action
        let curY = 68;
        const descText = issue.description || '';
        if (descText) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Defect Description:', 15, curY);
          pdf.setFont('helvetica', 'normal');
          curY += 5;
          const descLines = pdf.splitTextToSize(descText, pageWidth - 30);
          pdf.text(descLines, 15, curY);
          curY += descLines.length * 5;
        }

        const remarksText = issue.remarks || '';
        if (remarksText) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Recommended Actions & Remarks:', 15, curY);
          pdf.setFont('helvetica', 'normal');
          const remarksLines = pdf.splitTextToSize(remarksText, pageWidth - 30);
          pdf.text(remarksLines, 15, curY + 5);
          curY += 5 + remarksLines.length * 5;
        }

        // Photos layout
        const issuePhotos = allPhotos.filter(p => issue.photos.includes(p.id));
        let currentPhotoY = curY + 5;
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Inspection Photos:', 15, currentPhotoY);
        currentPhotoY += 5;

        if (issuePhotos.length > 0) {
          const photoW = 85;
          const photoH = 65;
          
          let pendingSinglePhoto: typeof issuePhotos[0] | null = null;

          const renderRow = (
            leftPhoto: typeof issuePhotos[0], 
            rightPhoto: typeof issuePhotos[0] | null, 
            isLeftAnnotated: boolean, 
            isRightAnnotated: boolean
          ) => {
            // Check if we need to add a page if it overflows
            if (currentPhotoY + photoH + 10 > pageHeight) {
              pdf.addPage();
              // Draw top thin line on new page
              pdf.setFillColor(16, 185, 129);
              pdf.rect(0, 0, pageWidth, 5, 'F');
              currentPhotoY = 15;
            }

            // Draw left photo
            try {
              const leftImg = isLeftAnnotated ? leftPhoto.annotatedUrl : leftPhoto.originalUrl;
              pdf.addImage(leftImg, 'JPEG', 15, currentPhotoY, photoW, photoH);
              
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8);
              const label = isLeftAnnotated ? 'Annotated Markup' : 'Photo Capture';
              pdf.text(label, 15 + photoW / 2, currentPhotoY + photoH + 4, { align: 'center' });
            } catch (e) {
              console.error('Failed to add left photo to PDF', e);
            }

            // Draw right photo
            if (rightPhoto) {
              try {
                const rightImg = isRightAnnotated ? rightPhoto.annotatedUrl : rightPhoto.originalUrl;
                pdf.addImage(rightImg, 'JPEG', 110, currentPhotoY, photoW, photoH);
                
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(8);
                const label = isRightAnnotated ? 'Annotated Markup' : 'Photo Capture';
                pdf.text(label, 110 + photoW / 2, currentPhotoY + photoH + 4, { align: 'center' });
              } catch (e) {
                console.error('Failed to add right photo to PDF', e);
              }
            }

            currentPhotoY += photoH + 10;
          };

          if (issuePhotos.length === 1) {
            const photo = issuePhotos[0];
            if (photo.annotationsJson) {
              // If only one photo and it's annotated, show original and annotated side-by-side
              renderRow(photo, photo, false, true);
            } else {
              // If not annotated, only show original once
              renderRow(photo, null, false, false);
            }
          } else {
            // Multiple photos: Pair different photos side-by-side
            for (let pIdx = 0; pIdx < issuePhotos.length; pIdx++) {
              const photo = issuePhotos[pIdx];
              const isAnnotated = !!photo.annotationsJson;

              if (pendingSinglePhoto) {
                // Render the paired photo
                renderRow(pendingSinglePhoto, photo, !!pendingSinglePhoto.annotationsJson, isAnnotated);
                pendingSinglePhoto = null;
              } else {
                pendingSinglePhoto = photo;
              }
            }

            // Render remaining single photo if any
            if (pendingSinglePhoto) {
              renderRow(pendingSinglePhoto, null, !!pendingSinglePhoto.annotationsJson, false);
            }
          }
        } else {
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9);
          pdf.setTextColor(148, 163, 184);
          pdf.text('No photos captured for this inspection issue.', 15, currentPhotoY + 3);
        }

        // Page number footer
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Page ${index + 2} of ${issueList.length + 1}`, pageWidth / 2, 285, { align: 'center' });
      }

      // Write PDF and trigger download
      const pdfArrayBuffer = pdf.output('arraybuffer' as any);
      const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      const pdfFileName = `Snagora-Inspection-Report-${Date.now()}.pdf`;

      // Trigger download or share
      if (Capacitor.isNativePlatform()) {
        try {
          const base64 = await convertBlobToBase64(pdfBlob);
          let savedDirectly = false;
          try {
            const permStatus = await Filesystem.checkPermissions();
            if (permStatus.publicStorage !== 'granted') {
              const reqStatus = await Filesystem.requestPermissions();
              if (reqStatus.publicStorage !== 'granted') {
                throw new Error('Public storage permission not granted');
              }
            }
            await Filesystem.writeFile({
              path: `Download/${pdfFileName}`,
              data: base64,
              directory: Directory.ExternalStorage
            });
            savedDirectly = true;
            alert(`PDF file saved successfully to your phone's Downloads folder as:\n${pdfFileName}`);
          } catch (writeErr) {
            console.warn('Could not write directly to Downloads folder, falling back to Share sheet:', writeErr);
          }

          if (!savedDirectly) {
            const writeResult = await Filesystem.writeFile({
              path: pdfFileName,
              data: base64,
              directory: Directory.Cache
            });
            await Share.share({
              title: pdfFileName,
              url: writeResult.uri
            });
          }
        } catch (shareErr) {
          console.error('Failed to share file on native platform', shareErr);
          alert('Failed to save and share PDF file locally.');
        }
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      // Successfully generated, consume one credit
      await consumeCredit();
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF document.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-background h-full w-full overflow-hidden relative min-h-0">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-6 pb-4 min-h-0">
      
      {/* Title */}
      <div>
        <span className="text-[10px] text-accent font-bold uppercase block tracking-wider">Reports Center</span>
        <h2 className="text-lg font-black text-foreground">Export Audits</h2>
      </div>

      {/* Locked Alert Box */}
      {((user.status as string) === 'locked' || (user.status as string) === 'LOCKED') && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-rose-600 dark:text-rose-450 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex gap-3">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <div className="text-left">
              <span className="font-bold text-xs block text-rose-800 dark:text-rose-400">App is locked</span>
              <span className="text-[10px] text-rose-700/80 dark:text-slate-350 block mt-0.5">Please contact Admin.</span>
            </div>
          </div>
          <button
            onClick={() => router.push('/activate?method=sales')}
            className="bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-[10px] px-3 py-1.5 rounded-xl font-bold transition-all select-none cursor-pointer"
          >
            Contact Admin
          </button>
        </div>
      )}

      {/* Filter Parameters Card */}
      <div className="p-4 rounded-3xl border border-border bg-surface shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Configure Export Scope
        </h3>

        {/* 1. Project */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Project Filter</label>
          <select
            value={selectedProj}
            onChange={(e) => {
              setSelectedProj(e.target.value);
              setSelectedBld('');
              setSelectedWing('');
              setSelectedFloor('');
              setSelectedRoom('');
            }}
            className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground focus:outline-none"
          >
            <option value="">-- All Projects --</option>
            {projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* 2. Building */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Building Filter</label>
          <select
            disabled={!selectedProj}
            value={selectedBld}
            onChange={(e) => {
              setSelectedBld(e.target.value);
              setSelectedWing('');
              setSelectedFloor('');
              setSelectedRoom('');
            }}
            className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground focus:outline-none disabled:opacity-40"
          >
            <option value="">-- All Buildings --</option>
            {buildings?.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* 3. Room Selection detail (Optional shortcut to crop list) */}
        <div className="grid grid-cols-3 gap-2">
          {/* Wing */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">Wing</label>
            <select
              disabled={!selectedBld}
              value={selectedWing}
              onChange={(e) => {
                setSelectedWing(e.target.value);
                setSelectedFloor('');
                setSelectedRoom('');
              }}
              className="w-full rounded-xl border border-border bg-surface p-2 text-[10px] text-foreground focus:outline-none disabled:opacity-40"
            >
              <option value="">All</option>
              {wings?.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          {/* Floor */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">Floor</label>
            <select
              disabled={!selectedWing}
              value={selectedFloor}
              onChange={(e) => {
                setSelectedFloor(e.target.value);
                setSelectedRoom('');
              }}
              className="w-full rounded-xl border border-border bg-surface p-2 text-[10px] text-foreground focus:outline-none disabled:opacity-40"
            >
              <option value="">All</option>
              {floors?.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          {/* Room */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">Room</label>
            <select
              disabled={!selectedFloor}
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface p-2 text-[10px] text-foreground focus:outline-none disabled:opacity-40"
            >
              <option value="">All</option>
              {rooms?.map(r => (
                <option key={r.id} value={r.id}>{r.number}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Insufficient Tokens Banner */}
      {!canExportReport() && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300 text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
              <Coins className="h-4.5 w-4.5 text-amber-500 fill-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400">Insufficient Tokens</h4>
              <p className="text-[10px] text-amber-700/80 dark:text-slate-300 leading-relaxed mt-0.5">
                Each report export costs 5 tokens. You currently have only {isUnlimited ? '∞' : reportCreditsRemaining} tokens. Please top up your tokens to resume exporting.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/subscription')}
            className="h-9 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold shadow-sm transition-colors cursor-pointer text-center"
          >
            Top Up Tokens
          </button>
        </div>
      )}

      {/* Export Action Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Export Actions (Offline Compilation)
          </h3>
          <span className="text-[10px] font-bold text-accent bg-accent-surface px-2 py-0.5 rounded-full">
            Credits: {isUnlimited ? '∞' : reportCreditsRemaining}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Excel Export */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || !canExportReport() || (user.status as string) === 'locked' || (user.status as string) === 'LOCKED'}
            className="flex flex-col items-center justify-center p-4 rounded-3xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-center font-bold text-xs space-y-2.5 shadow-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface ripple"
          >
            <div className="h-11 w-11 rounded-full bg-accent-surface flex items-center justify-center text-accent">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <span>Export Excel</span>
          </button>

          {/* PDF Export */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting || !canExportReport() || (user.status as string) === 'locked' || (user.status as string) === 'LOCKED'}
            className="flex flex-col items-center justify-center p-4 rounded-3xl border border-border bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 text-center font-bold text-xs space-y-2.5 shadow-sm text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface ripple"
          >
            <div className="h-11 w-11 rounded-full bg-accent-surface flex items-center justify-center text-accent">
              <FileText className="h-6 w-6" />
            </div>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Warning message explaining offline compilation */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex gap-3 text-xs text-amber-700 dark:text-amber-400">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div>
          <span className="font-bold">Offline Generation Note:</span>
          <p className="mt-0.5 text-[11px] opacity-90">
            Export calculations compile image binaries directly inside your mobile browser sandbox. Large reports with high counts of marked-up photos may take a few seconds to package.
          </p>
        </div>
      </div>

      {/* Export Loader Overlay */}
      {exporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="text-center bg-surface p-6 rounded-3xl border border-border shadow-2xl space-y-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent mx-auto" />
            <p className="text-sm font-bold text-foreground">Assembling Inspection Register...</p>
            <p className="text-xs text-slate-400">Please do not close the browser while images encode.</p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
