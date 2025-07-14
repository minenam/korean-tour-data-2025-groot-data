import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import {
  getDurunubiDataWithPagination,
  getGreenTourDataBatch,
  getGreenTourDataWithPagination,
  getTourData,
  getTourDataBatch,
  getTourDataWithPagination,
  getTourRelatedData,
  getTourRelatedDataBatch,
  getTourRelatedDataWithPagination,
} from "./api";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// 기초지자체 중심 관광지 정보
app.get("/tour", async (req, res) => {
  try {
    console.log("Fetching tour data and saving to files...");
    const data = await getTourData();
    console.log("Data fetched and saved successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch tour data" });
  }
});

app.get("/tour/pagination", async (req, res) => {
  try {
    console.log("Fetching tour data with pagination...");
    const data = await getTourDataWithPagination();
    console.log("Tour data with pagination fetched successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch tour data with pagination" });
  }
});

// 기초지자체 중심 관광지 정보 배치 처리
app.get("/tour/batch", async (req, res) => {
  try {
    console.log("Starting batch processing for multiple SIGNGU_CD values...");
    const data = await getTourDataBatch();
    console.log("Batch processing completed successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process batch tour data" });
  }
});

app.get("/tour/related", async (req, res) => {
  try {
    console.log("Fetching tour related data and saving to files...");
    const data = await getTourRelatedData();
    console.log("Tour related data fetched and saved successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch tour related data" });
  }
});

app.get("/tour/related/pagination", async (req, res) => {
  try {
    console.log("Fetching tour related data with pagination...");
    const data = await getTourRelatedDataWithPagination();
    console.log("Tour related data with pagination fetched successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch tour related data with pagination" });
  }
});

app.get("/tour/related/batch", async (req, res) => {
  try {
    console.log("Starting batch processing for related tour data...");
    const data = await getTourRelatedDataBatch();
    console.log(
      "Batch processing for related tour data completed successfully"
    );
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Failed to process batch related tour data" });
  }
});

app.get("/durunubi/pagination", async (req, res) => {
  try {
    console.log("Fetching durunubi data with pagination...");
    const data = await getDurunubiDataWithPagination();
    console.log("Durunubi data with pagination fetched successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch durunubi data with pagination" });
  }
});

app.get("/green-tour/pagination", async (req, res) => {
  try {
    console.log("Fetching green tour data with pagination...");
    const data = await getGreenTourDataWithPagination();
    console.log("Green tour data with pagination fetched successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch green tour data with pagination" });
  }
});

app.get("/green-tour/batch", async (req, res) => {
  try {
    console.log("Starting batch processing for green tour data...");
    const data = await getGreenTourDataBatch();
    console.log("Batch processing for green tour data completed successfully");
    res.json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to process batch green tour data" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
