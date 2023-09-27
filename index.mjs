import { PassThrough } from "stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import sharp from "sharp";
 
export const handler = async (event) => {
  const region = event.Records[0].awsRegion;
  const sourceBucket = event.Records[0].s3.bucket.name;
  const sourceKey = event.Records[0].s3.object.key;
  const splittedSourceKey = sourceKey.split("/");
  const fileName = splittedSourceKey.pop();
  const destinationPrefix = splittedSourceKey
    .join("/")
    .replace("original", "resized");
  const destinationKey = `${destinationPrefix}/resized-${fileName}`;
  console.log(region, sourceBucket, decodeURI(sourceKey), destinationKey);
  const s3Client = new S3Client({
    region: region,
  });

  const originalImageObject = await s3Client.send(
    new GetObjectCommand({ Bucket: sourceBucket, Key: sourceKey })
  );

  const resizeStream = sharp()
    .rotate()
    .resize({
      width: 150,
      height: 150,
      fit: sharp.fit.inside,
      withoutEnlargement: true,
    })
    .webp();

  const passThrough = new PassThrough();
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: sourceBucket,
      Key: destinationKey,
      Body: passThrough,
      ContentType: "image/webp",
    },
  });

  originalImageObject.Body.pipe(resizeStream).pipe(passThrough);
  await upload.done();
};
