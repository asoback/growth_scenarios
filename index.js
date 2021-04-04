/* Document */
const population_chart_element = document.getElementById('populationChart');
const energy_chart_element = document.getElementById('energyChart');
const population_chart_div_element = document.getElementById('population-chart-div');
const energy_chart_div_element = document.getElementById('energy-chart-div');

/* Util */
const BILLION = 1000000000;

/* Init variables */
const f_carrying_cap = document.getElementById("max_pop");
const f_demand_rate = document.getElementById("demand_rate");
const f_per_cap_demand = document.getElementById("per_cap_demand");
const f_renewables_rate = document.getElementById("renewables_rate");
const f_undiscovered_fossil = document.getElementById("undiscovered_fossil");
const f_years_until_peak_fossil = document.getElementById("years_until_peak_fossil");

/* The model */
const start_year = 1980;
const end_year = 2120;
const num_historical_years = 2018 - 1980;
const beginning_population = 4.46;
var population_chart;
var energy_chart;

// This information was generally derived from
// https://knoema.com/EIAINTL2018May/international-energy-data-monthly-update
// Public domain
// Total energy data is a ratio using 1980 as the baseline.
// Other values are percentages.
// Renewables includes nuclear, and renewables such as wind and solar.
const historical_data = {
  total_energy_1980:      1,
  total_energy_2018:      2.05,
  percent_coal_1980:      0.2677,
  percent_coal_2018:      0.2777,
  percent_gas_1980:       0.1840,
  percent_gas_2018:       0.2397,
  percent_oil_1980:       0.4514,
  percent_oil_2018:       0.3308,
  percent_renewable_1980: 0.096,
  percent_renewable_2018: 0.152,
  coal_years_remaining: 100,
  oil_years_remaining: 50,
  gas_years_remaining: 50
}

const getRateFromCompoundInterest = (principle, final, time) => {
  const interest = final - principle;
  const rate = Math.pow((final/principle), 1/time) - 1;
  return rate;
};

const model_variables = {
    years: [],
    current_year: 0,
    peak_fossil_year: 0,
    pop: {
        carrying_capacity_bil: 10,
        data: [],
        rate: .018
    },
    renewables: {
        data: [],
        rate: 0
    },
    coal: {
        years_remaining: 100,
        data: [],
        rate: 0
    },
    oil: {
        years_remaining: 50,
        data: [],
        rate: 0
    },
    natural_gas: {
        years_remaining: 50,
        data: [],
        rate: 0
    },
    demand: {
        per_capita_peak: 21,
        peak_demand: 0,
        data: [],
        rate: 0
    }
};

const triggerWarnings = () => {
  const energy_per_cap_low = document.getElementById("energy_per_cap_low");
  if (model_variables.demand.per_capita_peak < 4) {
    energy_per_cap_low.style.display = "block";
  } else {
    energy_per_cap_low.style.display = "none";
  }
  const warn_low_energy_demand = document.getElementById("warn_low_energy_demand");
  if (model_variables.demand.rate < .019) {
    warn_low_energy_demand.style.display = "block";
  } else {
    warn_low_energy_demand.style.display = "none";
  }

  const warn_high_undiscovered_resources = document.getElementById("warn_high_undiscovered_resources");
  if (f_undiscovered_fossil.value > 0) {
    warn_high_undiscovered_resources.style.display = "block";
  } else {
    warn_high_undiscovered_resources.style.display = "none";
  }

  let energy_shortage = false;
  const warn_energy_crisis = document.getElementById("warn_energy_crisis");
  for (let i = 0; i < end_year-start_year; i++) {
    const total_energy = model_variables.renewables.data[i] + 
      model_variables.coal.data[i] + 
      model_variables.oil.data[i] + 
      model_variables.natural_gas.data[i];
    if (total_energy > model_variables.demand.data[i] * 0.9) {
      energy_shortage = true;
      break;
    }
  }
  if (energy_shortage == true) {
    warn_energy_crisis.style.display = "block";
  } else {
    warn_energy_crisis.style.display = "none";
  }
};

const buildYears = () => {
  model_variables.current_year = parseInt(new Date().getFullYear());
  model_variables.years = [];
  for (let i = start_year; i <= end_year; i++) {
    model_variables.years.push(i);
  }
};

const buildPop = () => {
  // See https://en.wikipedia.org/wiki/Logistic_function
  const num_years = end_year - start_year; 
  let last_pop = beginning_population;
  model_variables.pop.data = [];
  
  for (let i = 0; i < num_years; i++) {
    const pop_growth = 
      last_pop * model_variables.pop.rate *
        (1 -
          ((last_pop - beginning_population) /
          (model_variables.pop.carrying_capacity_bil - beginning_population))
        );
    const curr_pop = last_pop + pop_growth;

    model_variables.pop.data.push(curr_pop);
    last_pop = curr_pop;
  }
};

const peakDemandCalc = () => {
  const index = 2018 - start_year;
  const current_demand = model_variables.demand.data[index];
  const current_pop = model_variables.pop.data[index];
  const current_per_cap_demand = current_demand / current_pop; // per cap in this case is really "per billion"

  model_variables.demand.peak_demand = current_per_cap_demand *
    model_variables.demand.per_capita_peak *
    model_variables.pop.carrying_capacity_bil;
};

const peakThenDecline = (starting_consumption_amount, remaining_amount, peak_consumption_amount, starting_growth_rate, look_ahead) => {
  const a = [];
  let last_amount = starting_consumption_amount;
  let last_remaining = remaining_amount;
  let sum_used = 0;

  // Grow
  while (last_remaining >= 1 && last_amount < peak_consumption_amount * 0.95 && look_ahead > 0) {
      last_amount += last_amount * starting_growth_rate * (1 - (last_amount - starting_consumption_amount) / (peak_consumption_amount - starting_consumption_amount)); 
      a.push(last_amount);
      sum_used += last_amount;
      last_remaining = last_remaining - last_amount;
      --look_ahead;
  }

  // Decline
  let last_rate = 0.001;
  const max_rate = 0.025;
  while (last_remaining >= 5 && look_ahead > 0) {
      last_rate += max_rate * (1 - (remaining_amount - sum_used)/remaining_amount);
      last_amount = last_amount - (last_amount * last_rate);
      a.push(last_amount);
      sum_used += last_amount;
      last_remaining = last_remaining - last_amount;
      --look_ahead;
  } 

  // Last drops
  while (last_remaining > 0 && look_ahead > 0) {
      last_amount = last_amount - (last_amount * last_rate);
      a.push(last_amount);
      last_remaining = last_remaining - last_amount;
      --look_ahead;
  }

  // zero fill
  while (look_ahead > 0){
      a.push(0);
      --look_ahead;
  }

  return a;
};

const buildEnergy = () => {
  model_variables.oil.data = [];
  model_variables.coal.data = [];
  model_variables.natural_gas.data = [];
  model_variables.renewables.data = [];
  model_variables.demand.data = [];

  // historical data
  const historical_rate = getRateFromCompoundInterest(
    historical_data.total_energy_1980, historical_data.total_energy_2018, num_historical_years);

  let current_oil_percent = historical_data.percent_oil_1980;
  let current_gas_percent = historical_data.percent_gas_1980;
  let current_coal_percent = historical_data.percent_coal_1980;
  let current_renewables_percent = historical_data.percent_renewable_1980;

  const current_oil_percent_delta = (historical_data.percent_oil_2018 - historical_data.percent_oil_1980) / num_historical_years;
  const current_gas_percent_delta = (historical_data.percent_gas_2018 - historical_data.percent_gas_1980) / num_historical_years;
  const current_coal_percent_delta = (historical_data.percent_coal_2018 - historical_data.percent_coal_1980) / num_historical_years;
  const current_renewables_percent_delta = (historical_data.percent_renewable_2018 - historical_data.percent_renewable_1980) / num_historical_years;

  // let current_total_primary_energy = historical_data.total_energy_1980;
  let current_oil = historical_data.percent_oil_1980;
  let current_gas = historical_data.percent_gas_1980;
  let current_coal = historical_data.percent_coal_1980;
  let current_renewables = historical_data.percent_renewable_1980;
  let current_demand = historical_data.total_energy_1980;

  model_variables.oil.data.push(current_oil);
  model_variables.coal.data.push(current_coal);
  model_variables.natural_gas.data.push(current_gas);
  model_variables.renewables.data.push(current_renewables);
  model_variables.demand.data.push(current_demand);

  for (let i = 1; i <= 2018-1980; i++) {
    current_demand = current_demand + (current_demand * historical_rate);

    current_oil_percent = current_oil_percent + current_oil_percent_delta;
    current_gas_percent = current_gas_percent + current_gas_percent_delta;
    current_coal_percent = current_coal_percent + current_coal_percent_delta;
    current_renewables_percent = current_renewables_percent + current_renewables_percent_delta;

    current_oil = current_demand * current_oil_percent;
    current_gas = current_demand * current_gas_percent;
    current_coal = current_demand * current_coal_percent;
    current_renewables = current_demand * current_renewables_percent;

    model_variables.oil.data.push(current_oil);
    model_variables.coal.data.push(current_coal);
    model_variables.natural_gas.data.push(current_gas);
    model_variables.renewables.data.push(current_renewables);
    model_variables.demand.data.push(current_demand);
  }

  peakDemandCalc();
  
  // Prediction data
  for (let i = 1; i <= end_year-2018; i++) {
    current_demand = current_demand + (current_demand * model_variables.demand.rate * 
      ( 1 - ((current_demand - 1) / (model_variables.demand.peak_demand - 1))));

    current_renewables = current_renewables + (current_renewables * model_variables.renewables.rate);

    model_variables.demand.data.push(current_demand);
    model_variables.renewables.data.push(current_renewables);
  }

  const coal_reserve = current_coal * model_variables.coal.years_remaining;
  const oil_reserve = current_oil * model_variables.oil.years_remaining;
  const gas_reserve = current_gas * model_variables.natural_gas.years_remaining;

  let peak_coal_val = current_coal;
  let peak_oil_val = current_oil;
  let peak_gas_val = current_gas;

  for (let i = 1; i <= model_variables.peak_fossil_year - 2018; i++) {
    peak_coal_val = peak_coal_val + (peak_coal_val * model_variables.coal.rate);
    peak_oil_val = peak_oil_val + (peak_oil_val * model_variables.oil.rate);
    peak_gas_val = peak_gas_val + (peak_gas_val * model_variables.natural_gas.rate);
  }
  const peak_coal = peak_coal_val;
  const peak_oil = peak_oil_val;
  const peak_gas = peak_gas_val;
  const remaining_years = end_year - 2018;

  model_variables.coal.data =
    model_variables.coal.data.concat(peakThenDecline(current_coal, coal_reserve, peak_coal, model_variables.coal.rate, remaining_years));
  model_variables.oil.data =
    model_variables.oil.data.concat(peakThenDecline(current_oil, oil_reserve, peak_oil, model_variables.oil.rate, remaining_years));
  model_variables.natural_gas.data =
    model_variables.natural_gas.data.concat(peakThenDecline(current_gas, gas_reserve, peak_gas, model_variables.natural_gas.rate, remaining_years));
};

const generateEnergyChart = () => {
  let max_ticks = 4;
  const data = {};
  data.labels = model_variables.years;
  data.datasets = [
    {
      label: 'Coal Consumption',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderColor: 'rgb(0, 0, 0)',
      data: model_variables.coal.data
    },
    {
      label: 'Oil Consumption',
      backgroundColor: 'rgba(64, 37, 29, 0.5)',
      borderColor: 'rgb(64, 37, 29)',
      data: model_variables.oil.data
    },
    {
      label: 'Natural Gas Consumption',
      backgroundColor: 'rgba(196, 170, 0, 0.5)',
      borderColor: 'rgb(196, 170, 0)',
      data: model_variables.natural_gas.data
    },
    {
      label: 'Renewables and Nuclear Consumption',
      backgroundColor: 'rgba(0, 181, 30, 0.5)',
      borderColor: 'rgb(0, 181, 30)',
      data: model_variables.renewables.data
    },
    {
      label: 'Demand',
      yAxisID: 'unstacked_line',
      backgroundColor: 'rgba(255, 120, 250, 0.2)',
      borderColor: 'rgb(255, 120, 250)',
      data: model_variables.demand.data
    },
  ];
  let ctx = energy_chart_element.getContext('2d');
  if (energy_chart) {
    energy_chart.destroy();
  }
  const options = {
    scales: {
      yAxes: [{
        stacked: true,
        ticks: {
          beginAtZero: true,
          min: 0,
          max: max_ticks
        },
      },
      {
        id: 'unstacked_line',
        stacked: false,
        display: false, // ticks on y axis
        ticks: {
          beginAtZero: true,
          min: 0,
          max: max_ticks
        },
      }]
    }
  };

  energy_chart = new Chart(ctx, {
    type: "line",
    data: data,
    options: options
  });	
};

const generatePopChart = () => {
  const data = {};
  data.labels = model_variables.years;
  data.datasets = [
    {
      label: 'Population (Billions)',
      borderColor: 'rgb(99, 255, 132)',
      data: model_variables.pop.data
    }
  ];
  let ctx = population_chart_element.getContext('2d');
  if (population_chart) {
    population_chart.destroy();
  }
  population_chart = new Chart(ctx, {
    type: "line",
    data: data,
    options: {}
  });	
};

/* tab controls */
const showChart = (e, chart_name) => {
  if (chart_name == 'Population') {
    energy_chart_div_element.style.display = 'none';
    population_chart_div_element.style.display = 'block';
  } else if (chart_name == 'Energy') {
    population_chart_div_element.style.display = 'none';
    energy_chart_div_element.style.display = 'block';
  }

  let tablinks = document.getElementsByClassName('tablinks');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(' active', '');
  }

  e.currentTarget.className += ' active';
};


/* main */

buildYears();

model_variables.pop.carrying_capacity_bil = f_carrying_cap.value;
model_variables.demand.rate = f_demand_rate.value / 100;
model_variables.demand.per_capita_peak = f_per_cap_demand.value;
model_variables.renewables.rate = f_renewables_rate.value / 100;
model_variables.peak_fossil_year = parseInt(model_variables.current_year) + parseInt(f_years_until_peak_fossil.value);
model_variables.oil.years_remaining =
  historical_data.oil_years_remaining * (1 + f_undiscovered_fossil.value / 100);
model_variables.coal.years_remaining =
  historical_data.coal_years_remaining * (1 + f_undiscovered_fossil.value / 100);
model_variables.natural_gas.years_remaining =
  historical_data.gas_years_remaining * (1 + f_undiscovered_fossil.value / 100);

model_variables.coal.rate = getRateFromCompoundInterest(
  historical_data.total_energy_1980 * historical_data.percent_coal_1980,
  historical_data.total_energy_2018 * historical_data.percent_coal_2018, num_historical_years);
model_variables.oil.rate = getRateFromCompoundInterest(
  historical_data.total_energy_1980 * historical_data.percent_oil_1980,
  historical_data.total_energy_2018 * historical_data.percent_oil_2018, num_historical_years);
model_variables.natural_gas.rate = getRateFromCompoundInterest(
  historical_data.total_energy_1980 * historical_data.percent_gas_1980,
  historical_data.total_energy_2018 * historical_data.percent_gas_2018, num_historical_years);

/* Init charts */
buildPop();
buildEnergy();
generateEnergyChart();
generatePopChart();
population_chart_div_element.style.display = 'none';
energy_chart_div_element.style.display = 'block';

/* Tab element controls */
document.getElementById('pop-chart-tab').onclick = () => {
  showChart(event, "Population");
};
document.getElementById('energy-chart-tab').onclick = () => {
  showChart(event, "Energy");
};

/* Form controls */
f_carrying_cap.onchange = () => {
  model_variables.pop.carrying_capacity_bil = f_carrying_cap.value;
  buildPop();
  generatePopChart();
  triggerWarnings();
};

f_demand_rate.onchange = () => {
  model_variables.demand.rate = f_demand_rate.value / 100;
  buildEnergy();
  generateEnergyChart();
  triggerWarnings();
};

f_per_cap_demand.onchange = () => {
  model_variables.demand.per_capita_peak = f_per_cap_demand.value;
  buildEnergy();
  generateEnergyChart();
  triggerWarnings();
};

f_renewables_rate.onchange = () => {
  model_variables.renewables.rate = f_renewables_rate.value / 100;
  buildPop();
  generatePopChart();
  triggerWarnings();
};

f_undiscovered_fossil.onchange = () => {
  model_variables.oil.years_remaining =
    historical_data.oil_years_remaining * (1 + f_undiscovered_fossil.value / 100);
  model_variables.coal.years_remaining =
    historical_data.coal_years_remaining * (1 + f_undiscovered_fossil.value / 100);
  model_variables.natural_gas.years_remaining =
    historical_data.gas_years_remaining * (1 + f_undiscovered_fossil.value / 100);
  buildEnergy();
  generateEnergyChart();
  triggerWarnings();
};

f_years_until_peak_fossil.onchange = () => {
  model_variables.peak_fossil_year = model_variables.current_year + f_years_until_peak_fossil.value;
  buildEnergy();
  generateEnergyChart();
  triggerWarnings();
};

triggerWarnings();