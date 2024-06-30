import * as Excel from 'exceljs'
import { generateUploadURL } from './s3';
import axios from 'axios';
export const styleHeaderCell = (cell) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE599' },
  };
  cell.font = {
    name: "Noto Sans CJK KR",
    size: 12,
    bold: true,
    color: { argb: "ff252525" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
    cell.border = {
      top: { style: 'thin', color: { argb: "-100000f" } },
      left: { style: 'thin', color: { argb: "-100000f" } },
      bottom: { style: 'thin', color: { argb: "-100000f" } },
      right: { style: 'thin', color: { argb: "-100000f" } },
    };

}
export const styleCell = (cell) => {
  cell.font = {
    name: "Noto Sans CJK KR",
    size: 12,
    color: { argb: "ff252525" },
  };
  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
    cell.border = {
      top: { style: 'thin', color: { argb: "-100000f" } },
      left: { style: 'thin', color: { argb: "-100000f" } },
      bottom: { style: 'thin', color: { argb: "-100000f" } },
      right: { style: 'thin', color: { argb: "-100000f" } },
    };

}
export const setColor=(rows,color)=>
{
  let co;
  switch(color)
  {
      case 2://특이,보라
      co='FFD6D6FA';
      //389
      break;
      case 3://챌린지,초록
      co='FF90EE90';
      break;
      case 4://노랑,지인
      co='FFFFFFE0';
      break;
      case 5://구수방
      co='FFFFB6C1';
      break;
  }
  rows.getCell(3).fill= {type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: co },
  };
  rows.getCell(8).fill= {type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: co },
  };
  rows.getCell(9).fill= {type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: co },
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
  const uploadedFileData = await uploadedFile(fileData);

  return {success:true, url:uploadedFileData.fileUrl, objectName: uploadedFileData.objectName};

}

/**s3 파일 업로드 */
const uploadedFile = async (file: any) => {
  const presignedUrl = await generateUploadURL();

  //console.log(presignedUrl);
  await axios.put(presignedUrl.uploadURL, {
    body: file
  }, {
    headers: {
      "Content-Type": file.type,
    }
  });
  let objectName = presignedUrl.imageName;
  let fileUrl = presignedUrl.uploadURL.split('?')[0];
  return {fileUrl,objectName};
}