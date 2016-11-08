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
    $scope.currentAbortionView = "Relative Change";
    $scope.currentCrimeView = "Relative Change";
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
        $scope.colorAbortionsLinear = d3.scaleLinear().range(["#f5f5f5", "#552d84"]);
        $scope.colorAbortionsDiverging = d3.scaleSequential(d3.interpolatePuOr);
            //.range(["darkred", "#f5f5f5", "steelblue"]);
        $scope.colorCrimeLinear = d3.scaleLinear()
            .range(["darkred", "#f5f5f5"]);
        $scope.colorCrimeDiverging = d3.scaleSequential(d3.interpolateRdYlBu);

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
                var prevYear = -1;
                for(var year in d)
                {
                    if(year != 'State')
                    {
                        var abortions = {};
                        abortions['Number'] = +d[year];
                        abortions['Reference Year'] = prevYear;
                        abortions['Reference Number'] = $scope.abortionsByState[d.State][prevYear] ? $scope.abortionsByState[d.State][prevYear]['Number'] : NaN;
                        abortions['Absolute Change'] = $scope.abortionsByState[d.State][prevYear] ? abortions['Number']-$scope.abortionsByState[d.State][prevYear]['Number'] : NaN;
                        abortions['Relative Change'] = isNaN(abortions['Absolute Change']) ? NaN : Math.round(100*abortions['Absolute Change']*2 / ($scope.abortionsByState[d.State][prevYear]['Number'] + abortions['Number']));

                        $scope.abortionsByState[d.State][year] = abortions;
                    }
                    prevYear = year;
                }
            })
            .defer(d3.tsv, "crimes.tsv", function(d)
            {
                if(!$scope.crimesByState[d.State])
                    $scope.crimesByState[d.State] = {};


                var refYear = d.Year < 1965 ? 1960 : d.Year - 5;
                //console.log(refYear);
                $scope.crimesByState[d.State][d.Year] = d;

                if($scope.crimesByState[d.State][refYear])
                {
                    for(var crimeType in d)
                    {
                        var currValue = +d[crimeType];
                        var refValue = +$scope.crimesByState[d.State][refYear][crimeType];

                        if(refValue)
                        {
                            var absChange = currValue - refValue;

                            var relChange = Math.round(100 * absChange * 2 / (refValue + currValue));

                            var absKey = 'Absolute Change in ' + crimeType;
                            var relKey = 'Relative Change in ' + crimeType;

                            $scope.crimesByState[d.State][d.Year]['Reference Year'] = refYear;
                            $scope.crimesByState[d.State][d.Year][absKey] = Math.round(absChange);
                            $scope.crimesByState[d.State][d.Year][relKey] = relChange;
                        }

                    }
                }
                //console.log($scope.crimesByState[d.State]);
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
                //console.log(thisStatesAbortions);
                //console.log(thisStatesAbortions[$scope.currentYear][$scope.currentAbortionView]);

                //return $scope.colorAbortions(-200);
                return $scope.colorAbortions(thisStatesAbortions[$scope.currentYear][$scope.currentAbortionView]);
                /*color(d.rate = unemployment.get(d.id));*/
            })
            .attr("d", $scope.path)
            .on('mouseover', function(d)
            {
                $scope.$apply(function()
                {
                    $scope.hoveredState = d.properties.name;
                    $scope.updateActive();
                });
            })
            /*.append("title")
            .text(function(d)
            {
                var thisStatesAbortions = $scope.abortionsByState[d.properties.name];
                var label = d.properties.name;
                if(thisStatesAbortions)
                {
                    if($scope.currentAbortionView == 'Number')
                    {
                        label += ': ' + thisStatesAbortions[$scope.currentYear][$scope.currentAbortionView] + ' abortions';
                    }
                    else if($scope.currentAbortionView == 'Absolute Change')
                    {
                        var isMore = thisStatesAbortions[$scope.currentYear][$scope.currentAbortionView] >= 0;
                        var abs = Math.abs(thisStatesAbortions[$scope.currentYear][$scope.currentAbortionView]);

                        label += ': ' + abs + ' abortions ';
                        label += isMore ? 'more' : 'less';
                        label += ' than in ' + thisStatesAbortions[$scope.currentYear]['Reference Year'];
                    }

                    else if($scope.currentAbortionView == 'Relative Change')
                    {
                        label += ': ' + thisStatesAbortions[$scope.currentYear][$scope.currentAbortionView] + ' percent abortions';
                        label += ' more than in ' + thisStatesAbortions[$scope.currentYear]['Reference Year'];
                    }

                }


                return label;
            })*/;

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

                var crimeType = $scope.getFullCurrentCrimeType();
                return $scope.colorCrime(thisStatesCrimes[$scope.currentCrimeYear][crimeType]);
                /*color(d.rate = unemployment.get(d.id));*/
            })
            .attr("d", $scope.path)
            .on('mouseover', function(d)
            {
                $scope.$apply(function()
                {
                    $scope.hoveredState = d.properties.name;
                    $scope.updateActive();
                });
            })
            /*.append("title")
            .text(function(d)
            {
                var label = d.properties.name;
                var thisStatesCrimes = $scope.crimesByState[d.properties.name];
                //console.log(thisStatesCrimes);
                if(thisStatesCrimes)
                {
                    if(thisStatesCrimes[$scope.currentCrimeYear])
                    {
                        var crimeType = $scope.getFullCurrentCrimeType();
                        var number = thisStatesCrimes[$scope.currentCrimeYear][crimeType];
                        label += ': ' + number + ' crimes';
                    }
                    else
                        console.log('no crimes of type ', $scope.currentCrimeType, 'found in ', $scope.currentCrimeYear, ' in ', d.properties.name);
                }

                return label;
            })*/;
    }

    function getClosestCrimeYear()
    {
        var stateCrimes = $scope.crimesByState["Alabama"]; // Any state is fine
        //console.log($scope.currentDelayYears);

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
    $scope.getFullCurrentCrimeType = function()
    {
        var key = $scope.currentCrimeView == 'Number' ? '' : $scope.currentCrimeView + ' in ';
        key += $scope.currentCrimeType;
        return key;
    };

    $scope.setColorScales = function()
    {
        var abortionsDiverging = false;
        $scope.currentCrimeYear = getClosestCrimeYear();

        if($scope.currentAbortionView == 'Number')
        {
            $scope.colorAbortions = $scope.colorAbortionsLinear;
        }
        else
        {
            $scope.colorAbortions = $scope.colorAbortionsDiverging;
            abortionsDiverging = true;
        }

        var crimeDiverging = false;
        if($scope.currentCrimeView == 'Number')
        {
            $scope.colorCrime = $scope.colorCrimeLinear;
        }
        else
        {
            crimeDiverging = true;
            $scope.colorCrime = $scope.colorCrimeDiverging;
        }

        var lowestAbortions = 10000;
        var highestAbortions = 0;
        var lowestCrimes = 10000;
        var highestCrimes = 1;

        for(var state in $scope.abortionsByState)
        {
            for(var year in $scope.abortionsByState[state])
            {
                var abortions = +$scope.abortionsByState[state][year][$scope.currentAbortionView];
                if(abortions > highestAbortions)
                    highestAbortions = abortions;
                if(abortions < lowestAbortions)
                    lowestAbortions = abortions;
            }
            /*if($scope.abortionsByState[state][$scope.currentYear] > highestAbortions)
             highestAbortions = $scope.abortionsByState[state][$scope.currentYear];*/
        }
        //console.log($scope.currentCrimeType);
        for(state in $scope.crimesByState)
        {
            //for(year in $scope.crimesByState[state])
            {
                var year = $scope.currentCrimeYear;
                var crimeType = $scope.getFullCurrentCrimeType();
                //console.log(year);
                if($scope.crimesByState[state][year])
                {
                    var crimes = +$scope.crimesByState[state][year][crimeType];
                    //console.log(crimes);

                    if(crimes > highestCrimes)
                        highestCrimes = crimes;
                    if(crimes < lowestCrimes)
                        lowestCrimes = crimes;
                }

            }
        }
        //console.log(highestAbortions);
        //console.log(highestCrimes);
        //highestCrimes = 200000;
        var abortionsDomain;
        if(abortionsDiverging)
        {
            // here, i want to make sure that the domain is symmetric around 0 so 0 gets the neutral color.
            var higherAbs = highestAbortions;
            if(Math.abs(lowestAbortions) > highestAbortions) higherAbs = Math.abs(lowestAbortions);

            abortionsDomain = [higherAbs * -1, higherAbs];
        }
        else
        {
            abortionsDomain = [lowestAbortions, highestAbortions];
        }

        var crimeDomain;
        if(crimeDiverging)
        {
            // here, i want to make sure that the domain is symmetric around 0 so 0 gets the neutral color.
            higherAbs = highestCrimes;
            if(Math.abs(lowestCrimes) > highestCrimes) higherAbs = Math.abs(lowestCrimes);

            crimeDomain = [higherAbs * -1, higherAbs];
        }
        else
        {
            crimeDomain = [lowestCrimes, highestCrimes];
        }

        //console.log(abortionsDomain);
        //console.log(crimeDomain);
        crimeDomain.reverse();
        $scope.colorAbortions.domain(abortionsDomain);
        $scope.colorCrime.domain(crimeDomain);


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