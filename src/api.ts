import axios from "axios";
import fs from "fs";
import path from "path";
import { createObjectCsvWriter } from "csv-writer";

const areaCd = process.env.AREA_CD;

// 배치 처리를 위한 SIGNGU_CD 배열 - 경북  시군구코드
const signguCdList = [
  "47111",
  "47113",
  "47130",
  "47150",
  "47170",
  "47190",
  "47210",
  "47230",
  "47250",
  "47280",
  "47290",
  "47730",
  "47750",
  "47760",
  "47770",
  "47820",
  "47830",
  "47840",
  "47850",
  "47900",
  "47920",
  "47930",
  "47940",
];

/** 기초지차제 중심 관광지 정보 */
export async function getTourData() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const signguCd = process.env.SIGNGU_CD;
  // 기초지자체 중심 관광지 정보
  const url = `https://apis.data.go.kr/B551011/LocgoHubTarService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=100&pageNo=1&MobileOS=ETC&MobileApp=AppTest&baseYm=202503&areaCd=${areaCd}&signguCd=${signguCd}&_type=json`;

  const response = await axios.get(url);
  const data = response.data;

  // 응답 헤더 정보 추가
  const responseWithHeader = {
    header: {
      resultCode: data.response?.header?.resultCode || "00",
      resultMsg: data.response?.header?.resultMsg || "NORMAL SERVICE",
      timestamp: new Date().toISOString(),
      requestUrl: url,
    },
    body: data.response?.body || data,
  };

  // JSON 파일로 저장
  await saveAsJson(responseWithHeader);

  // CSV 파일로 저장
  await saveAsCsv(responseWithHeader);

  return responseWithHeader;
}

/** 기초지자체 중심 관광지 정보 - 페이지네이션 처리 */
export async function getTourDataWithPagination() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const signguCd = process.env.SIGNGU_CD;
  const numOfRows = 100;

  let allItems = [];
  let pageNo = 1;
  let totalCount = 0;
  let hasMoreData = true;

  console.log(
    `Fetching tour data for SIGNGU_CD: ${signguCd} with pagination...`
  );

  while (hasMoreData) {
    try {
      const url = `https://apis.data.go.kr/B551011/LocgoHubTarService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&baseYm=202503&areaCd=${areaCd}&signguCd=${signguCd}&_type=json`;

      console.log(`  Fetching page ${pageNo}...`);
      const response = await axios.get(url);
      const data = response.data;

      // 첫 번째 페이지에서 totalCount 가져오기
      if (pageNo === 1) {
        totalCount = data.response?.body?.totalCount || 0;
        console.log(`  Total count: ${totalCount}`);
      }

      const items = data.response?.body?.items?.item || [];

      if (items.length === 0) {
        console.log(`  No more data on page ${pageNo}`);
        hasMoreData = false;
        break;
      }

      allItems.push(...items);
      console.log(`  ✓ Found ${items.length} items on page ${pageNo}`);

      // 다음 페이지가 있는지 확인
      if (allItems.length >= totalCount) {
        console.log(
          `  Reached total count (${totalCount}), stopping pagination`
        );
        hasMoreData = false;
      } else {
        pageNo++;
        // API 호출 간격을 두어 서버 부하 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`✗ Error fetching page ${pageNo}:`, error.message);
      hasMoreData = false;
    }
  }

  console.log(
    `✓ Total items collected for SIGNGU_CD ${signguCd}: ${allItems.length}`
  );

  // 응답 헤더 정보 추가
  const responseWithHeader = {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL SERVICE",
      timestamp: new Date().toISOString(),
      totalCount: totalCount,
      pagesFetched: pageNo - 1,
    },
    body: {
      items: {
        item: allItems,
      },
      totalCount: totalCount,
      numOfRows: numOfRows,
      pageNo: pageNo - 1,
    },
  };

  return responseWithHeader;
}

// 배치 처리를 위한 새로운 함수
export async function getTourDataBatch() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;

  console.log(
    `Starting batch processing for ${signguCdList.length} SIGNGU_CD values...`
  );

  const allItems = [];
  const errors = [];

  for (let i = 0; i < signguCdList.length; i++) {
    const signguCd = signguCdList[i];
    console.log(
      `Processing SIGNGU_CD: ${signguCd} (${i + 1}/${signguCdList.length})`
    );

    try {
      // 페이지네이션을 포함한 데이터 수집
      const result = await getTourDataForSignguCd(signguCd);
      allItems.push(...result.items);
      console.log(
        `✓ Found ${result.items.length} items for SIGNGU_CD: ${signguCd}`
      );

      // API 호출 간격을 두어 서버 부하 방지
      if (i < signguCdList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기
      }
    } catch (error: any) {
      console.error(`✗ Error processing SIGNGU_CD: ${signguCd}`, error);
      errors.push({ signguCd, error: error.message || "Unknown error" });
    }
  }

  console.log(`\nBatch processing completed!`);
  console.log(`Total items collected: ${allItems.length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("Errors occurred for the following SIGNGU_CD values:");
    errors.forEach((err) => console.log(`  - ${err.signguCd}: ${err.error}`));
  }

  // 배치 결과를 하나의 CSV로 저장
  await saveBatchAsCsv(allItems, "tour_data_batch");

  return {
    totalItems: allItems.length,
    errors: errors,
    items: allItems,
  };
}

// 특정 SIGNGU_CD에 대한 기초지자체 중심 관광지 정보 수집 (페이지네이션 포함)
async function getTourDataForSignguCd(signguCd: string) {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const numOfRows = 100;

  let allItems = [];
  let pageNo = 1;
  let totalCount = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    try {
      const url = `https://apis.data.go.kr/B551011/LocgoHubTarService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&baseYm=202503&areaCd=${areaCd}&signguCd=${signguCd}&_type=json`;

      const response = await axios.get(url);
      const data = response.data;

      // 첫 번째 페이지에서 totalCount 가져오기
      if (pageNo === 1) {
        totalCount = data.response?.body?.totalCount || 0;
      }

      const items = data.response?.body?.items?.item || [];

      if (items.length === 0) {
        hasMoreData = false;
        break;
      }

      // 각 아이템에 SIGNGU_CD 정보 추가
      const itemsWithSignguCd = items.map((item: any) => ({
        ...item,
        SIGNGU_CD: signguCd,
      }));

      allItems.push(...itemsWithSignguCd);

      // 다음 페이지가 있는지 확인
      if (allItems.length >= totalCount) {
        hasMoreData = false;
      } else {
        pageNo++;
        // API 호출 간격을 두어 서버 부하 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(
        `Error fetching page ${pageNo} for SIGNGU_CD ${signguCd}:`,
        error.message
      );
      hasMoreData = false;
    }
  }

  return {
    items: allItems,
    totalCount: totalCount,
    pagesFetched: pageNo - 1,
  };
}

/** 관광지별 연관 관광지 정보 */
export async function getTourRelatedData() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const signguCd = process.env.SIGNGU_CD;

  const url = `https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=100&pageNo=1&MobileOS=ETC&MobileApp=AppTest&baseYm=202503&areaCd=${areaCd}&signguCd=${signguCd}&_type=json`;

  const response = await axios.get(url);
  const data = response.data;

  // 응답 헤더 정보 추가
  const responseWithHeader = {
    header: {
      resultCode: data.response?.header?.resultCode || "00",
      resultMsg: data.response?.header?.resultMsg || "NORMAL SERVICE",
      timestamp: new Date().toISOString(),
      requestUrl: url,
    },
    body: data.response?.body || data,
  };

  // JSON 파일로 저장
  await saveAsJson(responseWithHeader);

  // CSV 파일로 저장
  await saveAsCsv(responseWithHeader);

  return responseWithHeader;
}

/** 관광지별 연관 관광지 정보 - 페이지네이션 처리 */
export async function getTourRelatedDataWithPagination() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const signguCd = process.env.SIGNGU_CD;
  const numOfRows = 100;

  let allItems = [];
  let pageNo = 1;
  let totalCount = 0;
  let hasMoreData = true;

  console.log(
    `Fetching tour related data for SIGNGU_CD: ${signguCd} with pagination...`
  );

  while (hasMoreData) {
    try {
      const url = `https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&baseYm=202503&areaCd=${areaCd}&signguCd=${signguCd}&_type=json`;

      console.log(`  Fetching page ${pageNo}...`);
      const response = await axios.get(url);
      const data = response.data;

      // 첫 번째 페이지에서 totalCount 가져오기
      if (pageNo === 1) {
        totalCount = data.response?.body?.totalCount || 0;
        console.log(`  Total count: ${totalCount}`);
      }

      const items = data.response?.body?.items?.item || [];

      if (items.length === 0) {
        console.log(`  No more data on page ${pageNo}`);
        hasMoreData = false;
        break;
      }

      allItems.push(...items);
      console.log(`  ✓ Found ${items.length} items on page ${pageNo}`);

      // 다음 페이지가 있는지 확인
      if (allItems.length >= totalCount) {
        console.log(
          `  Reached total count (${totalCount}), stopping pagination`
        );
        hasMoreData = false;
      } else {
        pageNo++;
        // API 호출 간격을 두어 서버 부하 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`✗ Error fetching page ${pageNo}:`, error.message);
      hasMoreData = false;
    }
  }

  console.log(
    `✓ Total items collected for SIGNGU_CD ${signguCd}: ${allItems.length}`
  );

  // 응답 헤더 정보 추가
  const responseWithHeader = {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL SERVICE",
      timestamp: new Date().toISOString(),
      totalCount: totalCount,
      pagesFetched: pageNo - 1,
    },
    body: {
      items: {
        item: allItems,
      },
      totalCount: totalCount,
      numOfRows: numOfRows,
      pageNo: pageNo - 1,
    },
  };

  return responseWithHeader;
}

// 배치 처리를 위한 새로운 함수 - 관광지별 연관 관광지 정보
export async function getTourRelatedDataBatch() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;

  console.log(
    `Starting batch processing for ${signguCdList.length} SIGNGU_CD values (Tour Related Data)...`
  );

  const allItems = [];
  const errors = [];

  for (let i = 0; i < signguCdList.length; i++) {
    const signguCd = signguCdList[i];
    console.log(
      `\nProcessing SIGNGU_CD: ${signguCd} (${i + 1}/${signguCdList.length})`
    );

    try {
      // 페이지네이션을 포함한 데이터 수집
      const result = await getTourRelatedDataForSignguCd(signguCd);
      allItems.push(...result.items);
      console.log(
        `✓ Found ${result.items.length} items for SIGNGU_CD: ${signguCd}`
      );

      // API 호출 간격을 두어 서버 부하 방지
      if (i < signguCdList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기
      }
    } catch (error: any) {
      console.error(`✗ Error processing SIGNGU_CD: ${signguCd}`, error.message);
      errors.push({ signguCd, error: error.message || "Unknown error" });
    }
  }

  console.log(`\nBatch processing completed!`);
  console.log(`Total items collected: ${allItems.length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("Errors occurred for the following SIGNGU_CD values:");
    errors.forEach((err) => console.log(`  - ${err.signguCd}: ${err.error}`));
  }

  // 배치 결과를 하나의 CSV로 저장
  await saveBatchAsCsv(allItems, "tour_related_data");

  return {
    totalItems: allItems.length,
    errors: errors,
    items: allItems,
  };
}

// 특정 SIGNGU_CD에 대한 관광지별 연관 관광지 정보 수집 (페이지네이션 포함)
async function getTourRelatedDataForSignguCd(signguCd: string) {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const numOfRows = 100;

  let allItems = [];
  let pageNo = 1;
  let totalCount = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    try {
      const url = `https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&baseYm=202503&areaCd=${areaCd}&signguCd=${signguCd}&_type=json`;

      const response = await axios.get(url);
      const data = response.data;

      // 첫 번째 페이지에서 totalCount 가져오기
      if (pageNo === 1) {
        totalCount = data.response?.body?.totalCount || 0;
      }

      const items = data.response?.body?.items?.item || [];

      if (items.length === 0) {
        hasMoreData = false;
        break;
      }

      // 각 아이템에 SIGNGU_CD 정보 추가
      const itemsWithSignguCd = items.map((item: any) => ({
        ...item,
        SIGNGU_CD: signguCd,
      }));

      allItems.push(...itemsWithSignguCd);

      // 다음 페이지가 있는지 확인
      if (allItems.length >= totalCount) {
        hasMoreData = false;
      } else {
        pageNo++;
        // API 호출 간격을 두어 서버 부하 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(
        `Error fetching page ${pageNo} for SIGNGU_CD ${signguCd}:`,
        error.message
      );
      hasMoreData = false;
    }
  }

  return {
    items: allItems,
    totalCount: totalCount,
    pagesFetched: pageNo - 1,
  };
}

/** 두루누비 관광지 정보 - 페이지네이션 처리 */
export async function getDurunubiDataWithPagination() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const numOfRows = 100;

  let allItems = [];
  let pageNo = 1;
  let totalCount = 0;
  let hasMoreData = true;

  console.log(`Fetching durunubi data with pagination...`);

  while (hasMoreData) {
    try {
      const url = `https://apis.data.go.kr/B551011/Durunubi/routeList?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json`;

      console.log(`  Fetching page ${pageNo}...`);
      const response = await axios.get(url);
      const data = response.data;

      // 첫 번째 페이지에서 totalCount 가져오기
      if (pageNo === 1) {
        totalCount = data.response?.body?.totalCount || 0;
        console.log(`  Total count: ${totalCount}`);
      }

      const items = data.response?.body?.items?.item || [];

      if (items.length === 0) {
        console.log(`  No more data on page ${pageNo}`);
        hasMoreData = false;
        break;
      }

      allItems.push(...items);
      console.log(`  ✓ Found ${items.length} items on page ${pageNo}`);

      // 다음 페이지가 있는지 확인
      if (allItems.length >= totalCount) {
        console.log(
          `  Reached total count (${totalCount}), stopping pagination`
        );
        hasMoreData = false;
      } else {
        pageNo++;
        // API 호출 간격을 두어 서버 부하 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`✗ Error fetching page ${pageNo}:`, error.message);
      hasMoreData = false;
    }
  }

  console.log(`✓ Total items collected for durunubi: ${allItems.length}`);

  // 응답 헤더 정보 추가
  const responseWithHeader = {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL SERVICE",
      timestamp: new Date().toISOString(),
      totalCount: totalCount,
      pagesFetched: pageNo - 1,
    },
    body: {
      items: {
        item: allItems,
      },
      totalCount: totalCount,
      numOfRows: numOfRows,
      pageNo: pageNo - 1,
    },
  };

  // CSV 파일로 저장
  await saveAsCsv(responseWithHeader);

  return responseWithHeader;
}

/** 생태관관 정보 - 페이지네이션 처리 */
export async function getGreenTourDataWithPagination() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const numOfRows = 100;

  let allItems = [];
  let pageNo = 1;
  let totalCount = 0;
  let hasMoreData = true;

  console.log(`Fetching green tour data with pagination...`);

  while (hasMoreData) {
    try {
      const url = `https://apis.data.go.kr/B551011/GreenTourService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json`;

      console.log(`  Fetching page ${pageNo}...`);
      const response = await axios.get(url);
      const data = response.data;

      // 첫 번째 페이지에서 totalCount 가져오기
      if (pageNo === 1) {
        totalCount = data.response?.body?.totalCount || 0;
        console.log(`  Total count: ${totalCount}`);
      }

      const items = data.response?.body?.items?.item || [];

      if (items.length === 0) {
        console.log(`  No more data on page ${pageNo}`);
        hasMoreData = false;
        break;
      }

      allItems.push(...items);
      console.log(`  ✓ Found ${items.length} items on page ${pageNo}`);

      // 다음 페이지가 있는지 확인
      if (allItems.length >= totalCount) {
        console.log(
          `  Reached total count (${totalCount}), stopping pagination`
        );
        hasMoreData = false;
      } else {
        pageNo++;
        // API 호출 간격을 두어 서버 부하 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(`✗ Error fetching page ${pageNo}:`, error.message);
      hasMoreData = false;
    }
  }

  console.log(`✓ Total items collected for green tour: ${allItems.length}`);

  // 응답 헤더 정보 추가
  const responseWithHeader = {
    header: {
      resultCode: "00",
      resultMsg: "NORMAL SERVICE",
      timestamp: new Date().toISOString(),
      totalCount: totalCount,
      pagesFetched: pageNo - 1,
    },
    body: {
      items: {
        item: allItems,
      },
      totalCount: totalCount,
      numOfRows: numOfRows,
      pageNo: pageNo - 1,
    },
  };

  // CSV 파일로 저장
  await saveAsCsv(responseWithHeader);

  return responseWithHeader;
}

// 생태관광 정보 배치 처리를 위한 새로운 함수
export async function getGreenTourDataBatch() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;

  console.log(`Starting batch processing for green tour data...`);

  const allItems = [];
  const errors = [];

  try {
    // 페이지네이션을 포함한 데이터 수집
    const result = await getGreenTourDataForAllPages();
    allItems.push(...result.items);
    console.log(`✓ Found ${result.items.length} items for green tour data`);
  } catch (error: any) {
    console.error(`✗ Error processing green tour data:`, error.message);
    errors.push({ error: error.message || "Unknown error" });
  }

  console.log(`\nBatch processing completed!`);
  console.log(`Total items collected: ${allItems.length}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("Errors occurred:");
    errors.forEach((err) => console.log(`  - ${err.error}`));
  }

  // 배치 결과를 하나의 CSV로 저장
  await saveBatchAsCsv(allItems, "green_tour_data");

  return {
    totalItems: allItems.length,
    errors: errors,
    items: allItems,
  };
}

// 생태관광 정보 전체 페이지 수집 (페이지네이션 포함)
async function getGreenTourDataForAllPages() {
  const apiKey = process.env.TOUR_API_KEY;
  const areaCd = process.env.AREA_CD;
  const numOfRows = 100;

  let allItems = [];
  let pageNo = 1;
  let totalCount = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    try {
      const url = `https://apis.data.go.kr/B551011/GreenTourService1/areaBasedList1?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&MobileOS=ETC&MobileApp=AppTest&_type=json`;

      const response = await axios.get(url);
      const data = response.data;

      // 첫 번째 페이지에서 totalCount 가져오기
      if (pageNo === 1) {
        totalCount = data.response?.body?.totalCount || 0;
      }

      const items = data.response?.body?.items?.item || [];

      if (items.length === 0) {
        hasMoreData = false;
        break;
      }

      allItems.push(...items);

      // 다음 페이지가 있는지 확인
      if (allItems.length >= totalCount) {
        hasMoreData = false;
      } else {
        pageNo++;
        // API 호출 간격을 두어 서버 부하 방지
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error: any) {
      console.error(
        `Error fetching page ${pageNo} for green tour data:`,
        error.message
      );
      hasMoreData = false;
    }
  }

  return {
    items: allItems,
    totalCount: totalCount,
    pagesFetched: pageNo - 1,
  };
}

async function saveAsJson(data: any) {
  const areaCd = process.env.AREA_CD;
  const signguCd = process.env.SIGNGU_CD;
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tour_data_${areaCd}_${signguCd}_${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`JSON saved: ${filepath}`);
}

async function saveAsCsv(data: any) {
  const areaCd = process.env.AREA_CD;
  const signguCd = process.env.SIGNGU_CD;
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tour_data_${areaCd}_${signguCd}_${timestamp}.csv`;
  const filepath = path.join(outputDir, filename);

  // API 응답에서 items 배열 추출
  const items = data.body?.items?.item || [];

  if (items.length === 0) {
    console.log("No data to save as CSV");
    return;
  }

  // 첫 번째 아이템에서 헤더 생성
  const headers = Object.keys(items[0]).map((key) => ({
    id: key,
    title: key,
  }));

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: headers,
  });

  await csvWriter.writeRecords(items);
  console.log(`CSV saved: ${filepath}`);
}

// saveBatchAsCsv 함수 수정: 파일명 지정 가능하게
async function saveBatchAsCsv(
  allItems: any[],
  prefix: string = "tour_data_batch"
) {
  const areaCd = process.env.AREA_CD;
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${prefix}_${areaCd}_${timestamp}.csv`;
  const filepath = path.join(outputDir, filename);

  if (allItems.length === 0) {
    console.log("No data to save as CSV");
    return;
  }

  // 첫 번째 아이템에서 헤더 생성
  const headers = Object.keys(allItems[0]).map((key) => ({
    id: key,
    title: key,
  }));

  const csvWriter = createObjectCsvWriter({
    path: filepath,
    header: headers,
  });

  await csvWriter.writeRecords(allItems);
  console.log(`Batch CSV saved: ${filepath}`);
  console.log(`Total records: ${allItems.length}`);
}
