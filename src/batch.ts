import dotenv from "dotenv";
import {
  getTourDataBatch,
  getTourRelatedDataBatch,
  getGreenTourDataBatch,
} from "./api";

dotenv.config();

async function runBatch() {
  try {
    console.log("🚀 Starting batch processing...");
    console.log("Environment variables:");
    console.log(`  AREA_CD: ${process.env.AREA_CD}`);
    console.log(
      `  TOUR_API_KEY: ${process.env.TOUR_API_KEY ? "Set" : "Not set"}`
    );
    console.log("");

    // 기초지자체 중심 관광지 정보 배치 처리
    console.log("\n📋 Processing basic tour data...");
    const basicResult = await getTourDataBatch();

    console.log("\n📋 Processing related tour data...");
    const relatedResult = await getTourRelatedDataBatch();

    console.log("\n📋 Processing green tour data...");
    const greenResult = await getGreenTourDataBatch();

    console.log("\n✅ Batch processing completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Basic tour data: ${basicResult.totalItems} items`);
    console.log(`   - Related tour data: ${relatedResult.totalItems} items`);
    console.log(`   - Green tour data: ${greenResult.totalItems} items`);
    console.log(
      `   - Total errors: ${
        basicResult.errors.length +
        relatedResult.errors.length +
        greenResult.errors.length
      }`
    );

    if (
      basicResult.errors.length > 0 ||
      relatedResult.errors.length > 0 ||
      greenResult.errors.length > 0
    ) {
      console.log("\n❌ Errors occurred:");
      [
        ...basicResult.errors,
        ...relatedResult.errors,
        ...greenResult.errors,
      ].forEach((err: any) => {
        if (err.signguCd) {
          console.log(`   - SIGNGU_CD ${err.signguCd}: ${err.error}`);
        } else {
          console.log(`   - ${err.error}`);
        }
      });
    }

    console.log(
      "\n📁 Check the 'output' directory for the generated CSV files."
    );
  } catch (error) {
    console.error("❌ Batch processing failed:", error);
    process.exit(1);
  }
}

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  runBatch();
}
