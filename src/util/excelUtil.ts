import * as Excel from 'exceljs'
import { generateUploadURL } from './s3';
import axios from 'axios';

export const styleHeaderCell = (cell) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "ffebebeb" },
  };
  cell.border = {
    bottom: { style: "thin", color: { argb: "-100000f" } },
    right: { style: "thin", color: { argb: "-100000f" } },
  };
  cell.font = {
    name: "Arial",
    size: 12,
    bold: true,
    color: { argb: "ff252525" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
}

//현금 입금처리할 때 중복, 노매치 데이터 엑셀 처리
export const createExcelCash = async (duplicates, noMatches) => {
  const wb = new Excel.Workbook();
  const header = ['date', 'return', 'cash', 'name', 'bank', 'cashReceipt', 'type'];
  const headerWidths = [25, 16, 16, 16, 10, 15, 10];

  //중복 데이터 시트
  const sheetDuplicate = wb.addWorksheet("중복 데이터 시트");

  const headerRowDuplicate = sheetDuplicate.addRow(header);
  headerRowDuplicate.height = 30.75;

  headerRowDuplicate.eachCell((cell, colNum) => {
    styleHeaderCell(cell);
    sheetDuplicate.getColumn(colNum).width = headerWidths[colNum - 1];
  });

  duplicates.forEach((e) => {
    const rowDatas = [e.date, e.return, e.cash, e.name, e.bank, e.cashReceipt??'',e.type];
    const appendRow = sheetDuplicate.addRow(rowDatas);
  });


  //일치하지 않는 데이터 시트
  const sheetNoMatches = wb.addWorksheet('일치하지 않는 데이터 시트');

  const headerRowNoMatches = sheetNoMatches.addRow(header);
  headerRowNoMatches.height = 30.75;

  headerRowNoMatches.eachCell((cell, colNum) => {
    styleHeaderCell(cell);
    sheetNoMatches.getColumn(colNum).width = headerWidths[colNum - 1];
  });

  noMatches.forEach((e) => {
    const rowDatas = [e.date, e.return, e.cash, e.name, e.bank,e.cashReceipt??'', e.type];
    const appendRow = sheetNoMatches.addRow(rowDatas);
  });

  const fileData = await wb.xlsx.writeBuffer();
  const url = await uploadedFile(fileData);

  return {success:true, url};

}


const uploadedFile = async (file: any) => {
  const presignedUrl = await generateUploadURL();

  console.log(presignedUrl);
  await axios.put(presignedUrl, {
    body: file
  }, {
    headers: {
      "Content-Type": file.type,
    }
  });

  let fileUrl = presignedUrl.split('?')[0];
  return fileUrl;
}