const aws = require('aws-sdk');
const crypto1 = require('crypto');
const { promisify } = require('util')
const randomBytes = promisify(crypto1.randomBytes)


const bucketName = "cham-storage";
const region='';
const accessKeyId ='';
const secretAccessKey='';

const s3 = new aws.S3({
    region  ,
    accessKeyId,
    secretAccessKey,
    signatureVersion:"v4"
})

export async function generateUploadURL() {
    const s3 = new aws.S3({
      region : process.env.AWS_S3_REGION,
      accessKeyId:process.env.AWS_S3_ACCESSKEY_ID,
      secretAccessKey:process.env.AWS_S3_SECRET_ACCESSKEY,
      signatureVersion:"v4"
    })

    const rawBytes = await randomBytes(16);
    const imageName = rawBytes.toString('hex')
  
    const params = ({
      Bucket: bucketName,
      Key: imageName,
      Expires: 60
    })
  
    const uploadURL = await s3.getSignedUrlPromise('putObject', params)
    
    console.log('---------------------');
    console.log(uploadURL);
    return uploadURL
  }
  
//   module.exports = {
//     generateUploadURL,
//   }