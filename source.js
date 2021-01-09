// SHOP_PMF[l][c] is probability that a shop slot will cost `c` when you are level `c`.
const SHOP_PMF = [
  [1.00, 0.00, 0.00, 0.00, 0.00],
  [1.00, 0.00, 0.00, 0.00, 0.00],
  [0.75, 0.25, 0.00, 0.00, 0.00],
  [0.55, 0.30, 0.15, 0.00, 0.00],
  [0.45, 0.30, 0.20, 0.05, 0.00],
  [0.30, 0.35, 0.25, 0.10, 0.00],
  [0.19, 0.35, 0.30, 0.15, 0.01],
  [0.14, 0.20, 0.35, 0.25, 0.06],
  [0.10, 0.15, 0.30, 0.30, 0.15],
]

// COPIES[c] is the total number of copies of a champion with cost `c`.
const COPIES = [29, 22, 18, 12, 10];

// CHAMPS[c] is the number of unique champions with cost `c`.
const CHAMPIONS = [13, 13, 13, 11, 8];

function factorial(x) {
	if (x == 0) return 0.0;
	var prod = 1;
  for (var i = 1; i <= x; ++i) {
  	prod *= i;
  }
  return prod;
}

function choose(n, k) {
	if (n == k) return 1;
  if (k == 0) return 1;

	return factorial(n) / (factorial(k) * factorial(n - k));
}

// k := number of positive outcomes
// n := number of trials
// p := probability of a positive trial
function binom_pmf(k, n, p) {
	return choose(n, k) * Math.pow(p, k) * Math.pow(1-p, n-k);
}

// k := number of copies to search for
// n := number of copies in pool
// m := number of different same-cost copies in pool
// r := number of rolls remaining
// l := level of roller
// c := cost of champion being rolled for
function cdf(k, n, m, r, l, c, memo) {
  if (k > n) return 0.0;
	if (k <= 0) return 1.0;
  if (r == 0) return 0.0;

  console.assert(n >= 0, "n < 0");
  console.assert(r >= 0, "r < 0");

  const key_obj = {k:k, n:n, m:m, r:r, l:l, c:c};
  const key = JSON.stringify(key_obj);
  if (!memo.has(key)) {
  	var p = 0.0;
    for (var s = 0; s <= 5; s++) {
      const p_s = binom_pmf(s, 5, SHOP_PMF[l-1][c-1]);
      // TODO: used to MAX(k, s) here but did not converge to 1. why?
      for (var sn = 0; sn <= s; sn++) {
        // TODO: this is an approximation (assumes replacement)
        const p_sn = binom_pmf(sn, s, n / (n + m));
        const p_recursive = cdf(k - sn, n - sn, m, r - 1, l, c, memo);
        p += p_s * p_sn * p_recursive;
      }
    }
    memo.set(key, p);
  }
  return memo.get(key);
}

var memo = new Map();
function generateData(k, n, m, l, c, bins) {
	var data = [];
  for (var r = 0; r < bins; r++) {
  	var obj = {x:r, y:cdf(k, n, m, r, l, c, memo)};
    data.push(obj);
  }
  return data;
}

function getSelectedRadio(name) {
	const radios = document.getElementsByName(name);
  for (var radio of radios) {
  	if (radio.checked) {
    	return parseInt(radio.value);
    }
  }
}

function setSelectedRadio(name, value) {
  var radios = document.getElementsByName(name);
  for (var radio of radios) {
    if (radio.value == value) {
      radio.checked = true;
    } else {
      radio.checked = false;
    }
  }
}

function getSliderValue(id) {
	const slider = document.getElementById(id);
  return parseInt(slider.value);
}

function setSliderValue(id, value) {
  const slider = document.getElementById(id);
  slider.value = value;
}

function getCheckboxChecked(id) {
	const checkbox = document.getElementById(id);
  return checkbox.checked;
}

function setCheckboxChecked(id, checked) {
	const checkbox = document.getElementById(id);
  checkbox.checked = checked;
}

function setSliderLimits(id, min, max) {
	var slider = document.getElementById(id);
  slider.min = min;
  slider.max = max;
}

function getCopiesForStarLevel(starLevel) {
	return Math.pow(3, starLevel - 1);
}

function getChampionsForCost(cost) {
	return CHAMPIONS[cost - 1];
}

function getCopiesForCost(cost) {
	return COPIES[cost - 1];
}

function setHeader(id, label, curr, max) {
	var header = document.getElementById(id);
  header.textContent = label + " (" + curr + " of " + max + ")";
}

function copyRadio(src, dst) {
    const selected = getSelectedRadio(src);
    setSelectedRadio(dst, selected);
}

function copySlider(src, dst) {
  const value = getSliderValue(src);
  setSliderValue(dst, value);
}

function copyCheckbox(src, dst) {
  const checked = getCheckboxChecked(src);
  setCheckboxChecked(dst, checked);
}

function copyControls(src, dst) {
  for (var radio of ["level", "star", "cost"]) {
    copyRadio(radio + src, radio + dst);
  }

  // Update slider limits with new radio settings.
  processController(dst);

  for (var slider of ["owned", "taken", "other"]) {
    copySlider(slider + src, slider + dst);
  }

  copyCheckbox("display" + src, "display" + dst);

  // Update the data.
  processController(dst);

  // Redraw everything.
  update();
}

function processController(controller) {
  const level = getSelectedRadio("level" + controller);
  const starLevel = getSelectedRadio("star" + controller);
  const cost = getSelectedRadio("cost" + controller);

  const copiesForStarLevel = getCopiesForStarLevel(starLevel);
  const copiesForCost = getCopiesForCost(cost);
  const championsForCost = getChampionsForCost(cost);

  setSliderLimits("owned" + controller, 0, copiesForStarLevel);
  setSliderLimits("taken" + controller, 0, copiesForCost);
  setSliderLimits("other" + controller, 0, copiesForCost * (championsForCost - 1));

  const owned = getSliderValue("owned" + controller);
  setHeader("headerOwned" + controller, "Owned", owned, copiesForStarLevel);

  const taken = getSliderValue("taken" + controller);
  setHeader("headerTaken" + controller, "Taken", taken, copiesForCost);

  const other = getSliderValue("other" + controller);
  setHeader("headerOther" + controller, "Other", other, copiesForCost * (championsForCost - 1));

  const display = getCheckboxChecked("display" + controller);

  return {
  	level: level,
    starLevel: starLevel,
    cost: cost,
    owned: owned,
    taken: taken,
    other: other,
    display: display
  };
}

// k := number of copies to search for
// n := number of copies in pool
// m := number of different same-cost copies in pool
// r := number of rolls remaining
// l := level of roller
// c := cost of champion being rolled for
function computeData(params, bins) {
	const copiesNeeded = getCopiesForStarLevel(params.starLevel);
  const k = Math.max(0, copiesNeeded - params.owned);

  const n = Math.max(0, getCopiesForCost(params.cost) - params.owned - params.taken);

  const otherCopies = getCopiesForCost(params.cost) * (getChampionsForCost(params.cost) - 1);
  const m = Math.max(0, otherCopies - params.other);


  const l = params.level;

  const c = params.cost;


	return generateData(k, n, m, l, c, bins);
}


function copy1() {
  copyControls("1", "2");
}

function copy2() {
  copyControls("2", "1");
}

function doSvgThing() {
	const container = document.getElementById("container");
	const svg = d3.select("svg");

  const margin = 60;
  const chart = svg.append('g')
  .attr('transform', `translate(${margin}, ${margin})`)
  .attr('id', "thechart");
  const height = 400;

	var width = container.offsetWidth - margin * 2;
  const bins = 60;
  width = Math.floor(width / bins) * bins;



const yScale = d3.scaleLinear()
  .range([height, 0])
  .domain([0, 1]);

chart.append('g')
  .call(d3.axisLeft(yScale));

const xScale = d3.scaleLinear()
  .range([0, width])
  .domain([0, bins]);

chart.append('g')
  .attr('transform', `translate(0, ${height})`)
  .call(d3.axisBottom(xScale));

  svg.attr("width", width + 2 * margin);
	svg.attr("height", height + 2 * margin);


  var data = [];
  var data1 = [];
	for (var b = 0; b < bins; b++) {
    data.push({x: b, y: 0.5, c: "#ff333355"});
    data1.push({x: b, y: 0.5, c: "#3333ff55"});
  }

	function lmao(x) {
    x
      .attr('x', (s) => xScale(s.x))
      .attr('y', (s) => yScale(s.y))
      .attr('height', (s) => height - yScale(s.y))
      .attr('width', xScale(1))
    .style("fill", (s) => s.c);
	}

  var nodes = chart.selectAll()
    .data(data)
    .enter()
    .append('rect')
    .on("mouseenter", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseout);

  var nodes1 = chart.selectAll()
    .data(data1)
    .enter()
    .append('rect')
    .on("mouseenter", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseout);

  lmao(nodes);
	lmao(nodes1);

  return {
  	xScale: xScale,
    yScale: yScale,
  	nodes1: nodes,
    nodes2: nodes1,
    bins: bins,
    height: height
  }
}

function updateNodes(nodes, data) {
	nodes.data(data);
}


function mouseover(d, i) {
  tooltip.style("visibility", "visible");
}

function mouseout(d, i) {
  tooltip.style("visibility", "hidden");
}


function setTooltipValues(rolls, p1, p2) {
	var rollsDiv = document.getElementById('tooltipRolls');
	rollsDiv.textContent = "rolls = " + rolls;

  function setProbabilityValue(name, p, divId, displayId) {
  	var div = document.getElementById(divId);
    const pStr = Number.parseFloat(p* 100).toFixed(2);
    div.textContent = "p(" + name + ") = " + pStr + "%"
   	const display = getCheckboxChecked(displayId);
    div.style.display = display ? 'block' : 'none';
  }

  setProbabilityValue("1", p1, "tooltipProb1", "display1");
  setProbabilityValue("2", p2, "tooltipProb2", "display2");
}


function lookupRolls(rolls, data) {
	for (const tuple of data) {
  	if (tuple.x == rolls) return tuple.y;
  }
}

function mousemove(d, i) {
	const dx = 20;
  const dy = 0;
	tooltip.style("left", d.x + dx + "px");
  tooltip.style("top", d.y - dy + "px");

  const rolls = i.x;
  const p1 = lookupRolls(rolls, data1);
  const p2 = lookupRolls(rolls, data2);

  setTooltipValues(rolls, p1, p2);
}


function redrawNodes(nodes, xScale, yScale, height, color, display) {
	nodes.
  	attr('x', (s) => xScale(s.x))
   .attr('y', (s) => yScale(s.y))
   .attr('height', (s) =>   height - yScale(s.y))
   .attr('width', xScale(1))
   .style('display', display ? 'inline-block' : 'none')
   .style("fill", color);
}

function updateAndRedrawNodes(nodes, data, xScale, yScale, height, color, display) {
  updateNodes(nodes, data);
  redrawNodes(nodes, xScale, yScale, height, color, display);
}

function getCSSVariable(name) {
  return getComputedStyle(document.body).getPropertyValue(name);
}

function update() {
  const p1 = processController(1);
  const p2 = processController(2);

  data1 = computeData(p1, chart.bins);
  data2 = computeData(p2, chart.bins);

  const color1 = getCSSVariable("--c1-plot");
  const color2 = getCSSVariable("--c2-plot");

  updateAndRedrawNodes(
  	chart.nodes1, data1, chart.xScale, chart.yScale, chart.height, color1, p1.display);
  updateAndRedrawNodes(
  	chart.nodes2, data2, chart.xScale, chart.yScale, chart.height, color2, p2.display);
}



var chart = null;
var data1 = null;
var data2 = null;
var tooltip = null;

window.addEventListener("load", function() {
  chart = doSvgThing();
  tooltip = d3.select("#tooltip")
	  .style("position", "fixed")
	  .style("background", "white");
  update();
});
