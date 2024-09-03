import express from "express";
import {getWordFrequencies, processUrl} from "../controllers/apiController.js";

const router = express.Router()

router.post("/enqueueUrl", processUrl)

router.get('/wordcloud', async (req, res) => {
    const {wordArray, maxVal} = await getWordFrequencies();
    res.render('./index', {map: wordArray, maxVal})
});

export default router;

