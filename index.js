/* Document */
const population_chart_element = document.getElementById('populationChart');

/* The model */
const start_year = 1980;
const end_year = 2120;
const beginning_population = 4.46;
var population_chart;

const model_variables = {
    years: [],
    pop: {
        carrying_capacity_bil: 10,
        data: [],
        rate: .018
    },
};

const buildYears = () => {
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

/* main */
buildYears();
buildPop();
generatePopChart();


/* Form controls */
const f_carrying_cap = document.getElementById("max_pop");
f_carrying_cap.onchange = () => {
  model_variables.pop.carrying_capacity_bil = f_carrying_cap.value;
  buildPop();
  generatePopChart();
};
