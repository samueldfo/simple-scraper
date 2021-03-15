const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

const cookie = {
  url: process.env.BASE_URL,
  name: process.env.COOKIE_NAME,
  value: process.env.SESSION,
  path: '/',
  httpOnly: true
};

const totalPages = 2326;
const batchSize = 250;
const pageSize = 21;
let csvCount = 1;
let csvTotal = Math.ceil(2326 / 250)

async function main() {
  let initialPage = 0 + (csvCount === 1 ? 0 : (batchSize * (csvCount - 1)));
  while (initialPage <= totalPages) {
    const writeStream = fs.createWriteStream(`csv/file${csvCount}.csv`);
    console.log(`Scraping ${csvCount}/${csvTotal} start: file${csvCount}.csv`);
    writeStream.write(`ID,NAME,DIV0,DIV1,DIV2,DIV3,DIV4 \n`);
    if (initialPage <= (totalPages - batchSize)) {
      await scraper(initialPage, initialPage + batchSize, writeStream);
      initialPage = initialPage + batchSize;
    } else {
      await scraper(initialPage, totalPages, writeStream);
      initialPage = initialPage + batchSize;
    }
    console.log(`Scraping ${csvCount}/${csvTotal} done: file${csvCount}.csv`);
    csvCount++
  }
}

async function scraper(firstPage, lastPage, writeStream) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setCookie(cookie)
  let lastProgress = 0;
  for (let pageIndex = firstPage; pageIndex <= lastPage; pageIndex++) {
    await page.goto(`${process.env.BASE_URL}${process.env.LIST_URL}?page=${pageIndex}`);
    for (let index = 1; index <= pageSize; index++) {
      await Promise.all([
        page.click(`body > div > div > section > div:nth-child(4) > div:nth-child(${index}) > form > button`),
        page.waitForNavigation()
      ]);
      const name = await getValue(page, `/html/body/div/div/section/div[1]/div[2]/h3`);
      const div0 = await getValue(page, `/html/body/div/div/section/div[1]/div[2]/div/div[1]/span`);
      const div1 = await getValue(page, `/html/body/div/div/section/div[1]/div[2]/div/div[3]/span`);
      const div2 = await getValue(page, `/html/body/div/div/section/div[1]/div[2]/div/div[4]/span`);
      const div3 = await getValue(page, `/html/body/div/div/section/div[1]/div[2]/div/div[5]/div/span`);
      const div4 = await getValue(page, `/html/body/div/div/section/div[1]/div[2]/div/div[6]/div/span`);
      // console.log(`${index + pageIndex * pageSize},${name},${div0},${div1 ? div1 : ''},${div2 ? div2 : ''},${div3 ? div3 : ''},${div4 ? div4 : ''}`);
      writeStream.write(`${index + (pageSize * (csvCount - 1)) + pageIndex * pageSize},${name},${div0},${div1 ? div1 : ''},${div2 ? div2 : ''},${div3 ? div3 : ''},${div4 ? div4 : ''}\n`);
      await page.goBack();
    }
    let progress = Math.round(((pageIndex - (batchSize * (csvCount - 1)) + 1) / (lastPage - (batchSize * (csvCount - 1)) + 1)) * 100)
    if (progress > lastProgress) {
      lastProgress = 0 + progress;
      console.log(`${csvCount}/${csvTotal}: ${progress}% @ ` + new Date().toLocaleString());
    }
  }
  browser.close();
}

async function getValue(page, element) {
  const [el] = await page.$x(element);
  const txt = el && await el.getProperty('textContent');
  const value = txt && await txt.jsonValue();
  return value;
}

main();