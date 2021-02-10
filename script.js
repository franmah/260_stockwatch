const ApiCommon = {
  baseUrl: "https://cloud.iexapis.com/",
  baseTestUrl: "https://sandbox.iexapis.com/",
  tokenKey: "token=pk_eaea0df3c02d4133b244ce7b0034b8f0",
  tokenKeyTest: "token=Tpk_72893886b1a34cfd99fe3769cc8b7fd3",
  stableVersion: "stable/",
  stock: "stock/"
}

const StockRange = {
  oneMonth: "1m",
  sixMonth: "6m",
  oneYear: "1y",
  fiveYears: "5y",
  today: "today"
}
const StockHistoricalData = {
  baseUrl: "stock/",
  chart: "chart/",
  chartCloseOnly: "chartCloseOnly=true",
}

const StockIntradayData = {
  baseUrl: "intraday-prices/"
}

const StockEarningParameters = {
  baseUrl: "earnings/",
  period: "period=annual"
}

let currentSymbol = "";
let currentRange = "";

document.getElementById("company-ctn").style.visibility = "hidden";
document.getElementById("error-container").style.display = "none";

document.getElementById("input-btn").addEventListener("click", async event => {
  event.preventDefault();
  try {

    const symbol = document.getElementById("input-txt").value;
    document.getElementById("input-txt").value = "";
    if (symbol === "")
      return;

    document.getElementById("error-container").style.display = "none";
    document.getElementById("company-ctn").style.visibility = "hidden";

    let data = await getIntradayStockData(symbol);
    setupIntradayChart(data);
    let company = await getCompanyInfo(symbol);
    displayCompanyInfo(company);

    currentRange = StockRange.today;
    currentSymbol = symbol;
    document.getElementById("company-ctn").style.visibility = "visible";

  } catch (err) {
    setErrorMessage("No stock found");
    console.log(err);
  }
});

async function updateRange(range) {
  if (range === currentRange)
    return;

  if (range === "today") {
    let data = await getIntradayStockData(currentSymbol);
    setupIntradayChart(data);
  }
  else {
    let data = await getHistoricalStockData(currentSymbol, range);
    setupHistoricalChart(data);
  }
  currentRange = range;
}

/**
 * Get stock data over a range.
 * Get date, price, volume for that day
 * @param {string} symbol Company's symbol
 * @param {string} range from StockRange object
 */
async function getHistoricalStockData(symbol, range) {
  const url = ApiCommon.baseTestUrl + ApiCommon.stableVersion + StockHistoricalData.baseUrl
    + symbol + "/" + StockHistoricalData.chart + range + "?" + StockHistoricalData.chartCloseOnly + "&" + ApiCommon.tokenKeyTest;
  const response = await fetch(url);
  if (response.status === 404) {
  }
  return await response.json();
}

/**
 * Return stock data for the last trading day.
 * Get date, minute, market open/close/high/low, 
 * @param {string} symbol Company's symbol
 */
async function getIntradayStockData(symbol) {
  const url = ApiCommon.baseTestUrl + ApiCommon.stableVersion + StockHistoricalData.baseUrl + symbol + "/" +
    StockIntradayData.baseUrl + "?" + ApiCommon.tokenKeyTest;
  const response = await fetch(url);
  if (response.status === 404){
    throw Error("Company not found");
  }
  return await response.json();
}

async function getCompanyInfo(symbol) {
  const url = ApiCommon.baseUrl + ApiCommon.stableVersion + `stock/${symbol}/company` + `?${ApiCommon.tokenKey}`;
  const response = await fetch(url);
  if (response.status === 404) {
    throw Error("Company not found");
  }
  return await response.json();
}

function setErrorMessage(msg) {
  document.getElementById("company-ctn").style.visibility = "hidden";
  const error = document.getElementById("error-container");
  error.innerHTML = msg;
  error.style.display = "block";
}

function displayCompanyInfo(data) {
  const companyInfo = document.getElementById("company-info");
  const companyStockInfo = document.getElementById("company-stock-info");
  document.getElementById("company-name").innerHTML = data.companyName + " (" + data.symbol + ")";

  let html = "";
  html += `<h3> company information</h3>`

  if (data.description.length > 0)
    html += `<div><strong>Description:</strong> ${data.description}</div><br>`
  html += `<div><strong>CEO:</strong> ${data.CEO}</div>`
  if (data.employees)
    html += `<div><strong>Employees:</strong> ${data.employees}</div>`
  html += `<div><strong>Website:</strong> ${data.website}</div>`
  html += `<div><strong>Address:</strong> ${data.address}, ${data.city}<br>${data.zip}, ${data.state}, ${data.country}</div>`
  html += `<div><strong>Phone:</strong> ${data.phone}</div>`
  companyInfo.innerHTML = html;

  html = "";
  html +=  `<h4>Stock information</h4>`
  html += `<div><strong>Exchange:</strong> ${data.exchange}</div>`
  html += `<div><strong>Industry:</strong> ${data.industry}</div>`
  html += `<div><strong>Sector:</strong> ${data.sector}</div>`
  html += `<div><strong>tags:</strong> ${data.tags}</div>`
  companyStockInfo.innerHTML = html;
}

function setupIntradayChart(data) {
  let chartData = [], times = [];

  data.forEach(stockInfo => {
    times.push(stockInfo.label);
    chartData.push({
      t: new Date(stockInfo.date + "T" + stockInfo.minute),
      y: stockInfo.close
    });
  });

  createChart(chartData, times, data);
}

function setupHistoricalChart(data) {
  let chartData = [], dates = [];

  data.forEach(day => {
    dates.push(day.date);
    chartData.push({
      t: day.date,
      y: day.close
    });
  });

  createChart(chartData, dates, data);
}

function createChart(data, labels, apiData) {
  // Clear old canvas
  let originalCanvasElement = document.getElementById("canvas-test");
  let canvasElement = document.createElement('canvas');
  canvasElement.setAttribute("id", "canvas-test");
  originalCanvasElement.parentElement.replaceChild(canvasElement, originalCanvasElement);

  new Chart(canvasElement, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: "stock",
          data: data,
          fill: false,
          borderColor: "rgb(75, 192, 192)",
        }
      ]
    },
    options: {
      legend: {
        display: false
      },
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            const info = {
              price: apiData[tooltipItem.index].close,
              volume: apiData[tooltipItem.index].volume,
              change: Math.trunc(apiData[tooltipItem.index].change),
              high: apiData[tooltipItem.index].high,
              low: apiData[tooltipItem.index].low,
              numberOfTrades: apiData[tooltipItem.index].numberOfTrades
            }
            
            let html = "";
            for (let key of Object.keys(info)) {
              if (info[key] !== undefined && info[key] !== NaN)
                html+= `<strong>${key}:</strong> ${info[key]}. `;
            }
            document.getElementById("stock-info").innerHTML = html;
          }
        }
      }
    }
  });
}
