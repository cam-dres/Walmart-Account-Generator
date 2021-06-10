const fs = require("fs");
const faker = require("faker");
const inquirer = require("inquirer");
const cliProgress = require("cli-progress");

const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const proxyList = setProxies();
const progressBar = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic
);

const walmartURL = "https://www.walmart.com/account/signup";

let catchall = "";

let generated = [];

let upCount = 0;
let taskTotal = 0;
let taskAmount = 0;

function setProxies() {
  let proxyFile = fs.readFileSync("./proxies.txt", "utf8").split("\r\n");
  return proxyFile;
}

function loadProxies() {
  let proxiesList = fs.readFileSync("./proxies.txt", "utf8").split("\r\n");
  let proxiesCount = proxiesList.length;
  if (proxiesList[0].length === 0) {
    console.log("No proxies loaded!");
    throw Error("Please add proxies!");
  } else {
    console.log(`${proxiesCount} proxies loaded`);
  }
}

function selectProxy() {
  return proxyList[faker.datatype.number({ min: 1, max: proxyList.length })];
}

async function start() {
  if (isNaN(taskAmount) !== true) {
    beginGenerator();
  } else {
    throw Error("Invalid task amount!");
  }
}

function backToStart() {
  beginGenerator();
}

async function beginGenerator() {
  const password = faker.internet.password();
  progressBar.update(upCount);
  if (taskAmount === 0) {
    let finalOutput = generated.join("\n");
    fs.writeFileSync("./Output.txt", finalOutput, "utf8", function (err) {
      if (err) {
        console.log(err);
      }
    });
    console.log(" Generation Complete!");
    progressBar.stop();
  } else {
    const email = `${faker.fake(
      "{{name.firstName}}{{name.lastName}}{{random.number}}"
    )}@${catchall}`;
    await createAccount(email, password).then((result) => {
      if (result == true) {
        taskAmount--;
        upCount++;
        generated.push(`${email}:${password}`);
        backToStart();
      }
    });
  }
}

async function createAccount(email, password) {
  try {
    let unconfiguredProxy = selectProxy();
    let splitProxy = unconfiguredProxy.split(":");
    let proxyUrl = `http://${splitProxy[0]}:${splitProxy[1]}`;
    let proxyUsername = splitProxy[2];
    let proxyPassword = splitProxy[3];

    try {
      const browser = await puppeteer.launch({
        args: [`--proxy-server=${proxyUrl}`],
        headless: true,
      });

      const page = await browser.newPage();
      await page.authenticate({
        username: proxyUsername,
        password: proxyPassword,
      });
      await page.setDefaultNavigationTimeout(30000);
      await page._client.send("Page.setDownloadBehavior", {
        behavior: "deny",
      });

      await page.goto(walmartURL);
      await page.type("#first-name-su", faker.fake("{{name.firstName}}"));
      await page.type("#last-name-su", faker.fake("{{name.lastName}}"));
      await page.type("#email-su", email);
      await page.type("#password-su", password);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Space");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Space");
      await page.keyboard.press("Enter");
      await page.waitForNavigation({
        waitUntil: "networkidle0",
      });
      await browser.close();

      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  } catch (err) {
    console.log(err);
    backToStart();
  }
}

console.log("Walmart Account Generator v1.0.0");

loadProxies();

inquirer
  .prompt([
    {
      name: "catchall",
      message: "What is your catchall? (Example: catchall.com)",
    },
    {
      name: "taskAmount",
      message: "How many accounts would you like to generate?",
    },
  ])
  .then((rsp) => {
    catchall = rsp.catchall;
    taskAmount = rsp.taskAmount;
    taskTotal = rsp.taskAmount;
    progressBar.start(taskTotal, 0);
    start();
  });
