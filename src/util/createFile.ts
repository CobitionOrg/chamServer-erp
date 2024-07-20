import * as Excel from 'exceljs'
const fs = require('fs');
const path = require('path');

export const createExcelFile = async (fileData: Excel.Buffer, fileName: string) => {
    // 파일 이름이 인자로 전달 되었을 때 (자동 발송)
    let filePath = `./src/files/${fileName}.xlsx`;
    //저장할 디렉토리 존재 확인
    try {
        await fs.access(path.resolve('../files'))
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            //없을시 생성
            await fs.mkdir(path.resolve('../files'), (err) => {
                console.error(err);
            });
        }
    }
    fs.writeFile(filePath, fileData, (err) => {
        if (err) {
            console.error('파일 저장 중 에러 발생:', err);
            return '';
        } else {
            console.log('엑셀 파일이 성공적으로 저장되었습니다.');
        }
    })
    return filePath;
}  