var abortionVis, crimeVis, width, height, g, gLine, path;
var w = window,
    d = document,
    e = d.documentElement,
    body = d.getElementsByTagName('body')[0],
    windowWidth = w.innerWidth || e.clientWidth || g.clientWidth,
    windowHeight = w.innerHeight|| e.clientHeight|| g.clientHeight;


angular.module('abortionsCrimeApp',[]).controller('abortionsCrimeController', function($scope)
{
    $scope.currentYear = "1985";
    $scope.currentDelayYears = 18;
    $scope.currentCrimeYear = ""; // Calculated roughly as currentYear + currentDelayYears, considering available data.
    $scope.currentCrimeType = "Violent Crime rate";
    $scope.hoveredState = null;
    
    abortionVis = d3.select('.content').select('svg#abortion-vis');
    crimeVis = d3.select('.content').select('svg#crime-vis');

    updateWindow();

    $scope.updatePlot = function()
    {
        plotCharts();
    };

    $scope.updateCrimeType = function()
    {
        //$scope.setColorScales();
        plotCharts();
    };
    $scope.updateYear = function()
    {
        //$scope.setColorScales();
        plotCharts();
    };


    $scope.visWidth = 800;
    $scope.visHeight = 500;

    $scope.setupCharts = function(callback)
    {
        $scope.colorAbortions = d3.scaleLinear()
            .range(["#f5f5f5", "steelblue"]);
        $scope.colorCrime = d3.scaleLinear()
            .range(["#f5f5f5", "darkred"]);

        var projection = d3.geoAlbersUsa()
            .translate([$scope.visWidth/2, $scope.visHeight/2])    // translate to center of screen
            .scale([1000]);
        $scope.path = d3.geoPath().projection(projection);

        getData(callback);
    };

    $scope.init = function()
    {
        $scope.setupCharts(plotCharts);
    };
    $scope.init();

    function getData(callback)
    {
        if(!callback) callback = function(){};

        $scope.abortionsByState = {};
        $scope.crimesByState = {};

        d3.queue()
            .defer(d3.json, "us-states.json")
            .defer(d3.tsv, "abortions.tsv", function(d)
            {
                $scope.abortionsByState[d.State] = {};
                for(var year in d)
                {
                    if(year != 'State')
                    {
                        $scope.abortionsByState[d.State][year] = +d[year];
                    }
                }
            })
            .defer(d3.tsv, "crimes.tsv", function(d)
            {
                if(!$scope.crimesByState[d.State])
                    $scope.crimesByState[d.State] = {};

                $scope.crimesByState[d.State][d.Year] = d;
            })
            .await(function(error, json)
            {
                if(error) return console.error(error);
                $scope.$apply(function()
                {
                    $scope.mapData = json;
                    callback();
                });
            });
    }

    $scope.updateActive = function()
    {
        abortionVis.selectAll('path')
            .classed('hovered', function(d) { return d.properties.name == $scope.hoveredState; });

        crimeVis.selectAll('path')
            .classed('hovered', function(d) { return d.properties.name == $scope.hoveredState; });
    };

    function plotCharts()
    {
        $scope.setColorScales();

        abortionVis.append("g")
            .attr("class", "states")
            .selectAll("path")
            .data($scope.mapData.features)
            .enter().append("path")
            .style("fill", function(d)
            {
                var thisStatesAbortions = $scope.abortionsByState[d.properties.name];
                if(!thisStatesAbortions)
                {
                    console.log('no abortions found for ', d.properties.name);
                    return '#cccccc';
                }

                return $scope.colorAbortions(thisStatesAbortions[$scope.currentYear]);
                /*color(d.rate = unemployment.get(d.id));*/
            })
            .attr("d", $scope.path)
            .on('mouseover', function(d)
            {
                $scope.hoveredState = d.properties.name;
                $scope.updateActive();
            })
            .append("title")
            .text(function(d)
            {
                var thisStatesAbortions = $scope.abortionsByState[d.properties.name];
                var label = d.properties.name;
                if(thisStatesAbortions)
                    label += ': ' + thisStatesAbortions[$scope.currentYear] + ' abortions';

                return label;
            });

        crimeVis.append("g")
            .attr("class", "states")
            .selectAll("path")
            .data($scope.mapData.features)
            .enter().append("path")
            .style("fill", function(d)
            {
                var thisStatesCrimes = $scope.crimesByState[d.properties.name];

                if(!thisStatesCrimes || !thisStatesCrimes[$scope.currentCrimeYear])
                {
                    //console.log('no crimes found for ', d.properties.name);
                    return '#cccccc';
                }

                return $scope.colorCrime(thisStatesCrimes[$scope.currentCrimeYear][$scope.currentCrimeType]);
                /*color(d.rate = unemployment.get(d.id));*/
            })
            .attr("d", $scope.path)
            .on('mouseover', function(d)
            {
                $scope.hoveredState = d.properties.name;
                $scope.updateActive();
            })
            .append("title")
            .text(function(d)
            {
                var label = d.properties.name;
                var thisStatesCrimes = $scope.crimesByState[d.properties.name];
                //console.log(thisStatesCrimes);
                if(thisStatesCrimes)
                {
                    if(thisStatesCrimes[$scope.currentCrimeYear])
                        label += ': ' + thisStatesCrimes[$scope.currentCrimeYear][$scope.currentCrimeType] + ' crimes';
                    else
                        console.log('no crimes of type ', $scope.currentCrimeType, 'found in ', $scope.currentCrimeYear, ' in ', d.properties.name);
                }

                return label;
            });
    }

    function getClosestCrimeYear()
    {
        var stateCrimes = $scope.crimesByState["Alabama"]; // Any state is fine
        console.log($scope.currentDelayYears);

        var goalYear = (+$scope.currentYear) + (+$scope.currentDelayYears);
        var min = 1000;
        var best = -1;

        for(var year in stateCrimes)
        {
            var diff = Math.abs(year - goalYear);
            if(diff < min)
            {
                min = diff;
                best = year;
            }
        }
        return best;
    }

    $scope.setColorScales = function()
    {
        var highestAbortions = 1;
        var highestCrimes = 1;

        for(var state in $scope.abortionsByState)
        {
            for(var year in $scope.abortionsByState[state])
            {
                var abortions = +$scope.abortionsByState[state][year];
                if(abortions > highestAbortions)
                    highestAbortions = abortions;
            }
            /*if($scope.abortionsByState[state][$scope.currentYear] > highestAbortions)
             highestAbortions = $scope.abortionsByState[state][$scope.currentYear];*/
        }
        //console.log($scope.currentCrimeType);
        for(state in $scope.crimesByState)
        {
            for(year in $scope.crimesByState[state])
            {
                var crimes = +$scope.crimesByState[state][year][$scope.currentCrimeType];
                /*if(state == "Texas")
                {
                    console.log(year, $scope.crimesByState[state][year][$scope.currentCrimeType], crimes, highestCrimes, $scope.crimesByState[state][year][$scope.currentCrimeType] > highestCrimes);
                }*/

                if(crimes > highestCrimes)
                    highestCrimes = crimes;
            }
        }
        //console.log(highestAbortions);
        //console.log(highestCrimes);
        //highestCrimes = 200000;
        $scope.colorAbortions.domain([0, highestAbortions]);
        $scope.colorCrime.domain([0, highestCrimes]);

        $scope.currentCrimeYear = getClosestCrimeYear();
        //console.log($scope.currentCrimeYear);

        //callback();
    };
});



function updateWindow()
{
    windowWidth = w.innerWidth || e.clientWidth || body.clientWidth;
    windowHeight = w.innerHeight|| e.clientHeight|| body.clientHeight;

    width = windowWidth - 3;
    height = windowHeight - 5;

    //vis.attr("width", width).attr("height", height);
}
window.onresize = updateWindow;