async function create_page(target_data) {
    // load and process data
    us = await d3.json('https://d3js.org/us-10m.v2.json');
    map_data = topojson.feature(us, us.objects.states).features;
    covid_data = await d3.csv('data/Covid_per_season_per_state.csv');
    processData(us, covid_data, target_data);
    console.log(min_rate);

    createSVG();
    createMap()
    createLegend();

    if(target_data == "spring_rate"){
        createAnnotationSpring();
    }
    else if(target_data == "summer_rate"){
        createAnnotationSummer();
    }
    else if (target_data == "autumn_rate"){
        createAnnotationAutumn();
    }
    else if (target_data == "winter_rate"){
        createAnnotationWinter();
    }
  }

function processData(us, covid_data, target_data){
    namemap = new Map(us.objects.states.geometries.map(d => [d.properties.name, d.id]));
    valuemap = new Map(covid_data.map(d => [d.Province_State, parseFloat(d[target_data])]));
    abbrmap = new Map(covid_data.map(d => [d.Province_State, d["Abbreviation"]]));
    statemap = new Map(map_data.map(d => [d.properties.name, d]));
    statemesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b);
    max_rate = Math.max(...covid_data.map(o => o[target_data]));
    min_rate = Math.min(...covid_data.map(o => o[target_data]));
}

function createSVG(){
    width = 960;
    height = 600;
    svg = d3.select('body')
      .append('svg')
      .attr("transform","translate(100, 100)")
      .attr('width', width)
      .attr('height', height);
}

function createMap(){
    cdomain = [min_rate, max_rate];
    crange = ["green", "red"];
    cs = d3.scaleLinear().domain(cdomain).range(crange);

    init_map_scale = 0.75;
    init_map_translate = 100;
    // Create an instance of geoPath.
    path = d3.geoPath();
    zoom = d3.zoom().scaleExtent([0.5, 6]).on('zoom', handleZoom);

    // Use the path to plot the US map based on the geometry data.
    map = svg.append('g')
    .attr("transform","scale("+ init_map_scale + ") translate("+init_map_translate+", "+init_map_translate+")");
    svg.call(zoom.transform, d3.zoomIdentity);
    svg.call(zoom);

    paths = map.selectAll('path')
      .data(map_data)
      .join('path')
      .attr('d', path)
      .style('fill', d => cs(valuemap.get(d.properties.name)))
      .attr('id', d => abbrmap.get(d.properties.name));

    //create tooltip
    paths.append("svg:title")
            .text(d => d.properties.name + "\nDeath rate: " + (valuemap.get(d.properties.name)*100).toFixed(4) + '%');

    paths.each(
        (d, i, nodes) => {
            const centroid = path.centroid(d);
            abbr = abbrmap.get(d.properties.name);
            if (abbr != "DC"){
                map.append("text")
                    .text(abbr)
                    .attr("x", centroid[0])
                    .attr("y", centroid[1])
                    .attr("text-anchor", "middle")
                    .style("font-size", "10px");
            }
        }
    );

    d3.select('#resetMap').on("click", resetMap);
}

function handleZoom(){
    d3.select('svg g').attr('transform', d3.zoomIdentity.scale(init_map_scale).translate(init_map_translate, init_map_translate));
    d3.select('svg g').attr('transform', d3.event.transform.scale(init_map_scale).translate(init_map_translate, init_map_translate));
    d3.select('svg .annotation-group').transition().duration(20).attr("opacity", 0);
}

function resetMap(){
    map.transition().duration(1000)
        .attr('transform', d3.zoomIdentity.scale(init_map_scale).translate(init_map_translate, init_map_translate));
    d3.select('svg .annotation-group').transition().duration(10).delay(1000).attr("opacity", 1);
}

function createLegend(){
    var legendItemWidth = 10;
    var legendItemHeight = 0.50;
    var legendSpacing = 0;
    var xOffset = 850;
    var yOffset = 400;
    const legend_len = 500;
    const legend_val = [];
    const yOffsetTop = yOffset - (legendItemHeight + legendSpacing) * legend_len + legendItemHeight;

    for (let i = 0; i < legend_len; i++) {
      legend_val.push(i*(max_rate-min_rate)/legend_len);
    }

    var legend = svg.append('g')

    legend.append('rect')
            .attr('width', width - xOffset + 10)
            .attr('height', legendItemHeight * legend_len + 100)
            .style('fill', 'white')
            .attr('opacity', '0.8')
            .attr('transform', 'translate('+ (parseInt(xOffset) - 30) +','+ (parseInt(yOffsetTop) - 50) +')');

    legend
       .append('text')
       .attr('x', xOffset - 10)
       .attr('y', yOffset + 30)
       .text('Death rate');

    legend
       .append('text')
       .attr('x', 5 + xOffset + legendItemWidth)
       .attr('y', yOffset)
       .text((min_rate*100).toFixed(2)+'%');

    legend
       .append('text')
       .attr('x', 5 + xOffset + legendItemWidth)
       .attr('y', yOffsetTop)
       .text((max_rate*100).toFixed(2)+'%');

    legend = legend
        .selectAll('.legendItem')
        .data(legend_val);

    //Create legend items
    legend
       .enter()
       .append('rect')
       .attr('class', 'legendItem')
       .attr('width', legendItemWidth)
       .attr('height', legendItemHeight)
       .style('fill', d => cs(d))
       .attr('transform',
            (d, i) => {
                var x = xOffset;
                var y = yOffset - (legendItemHeight + legendSpacing) * i;
                return 'translate(' + x + ',' + y + ')';
            });

}

function createAnnotationSpring(){
    bbox = svg.select("#NY").node().getBBox();
    const annotations = [
        {
          note: {
            label: "Very high death rate in New York and New Jersy",
          },
          x: bbox.x + bbox.width/2,
          y: bbox.y + bbox.height/2,
          dy: -100,
          dx: -150
        }
    ];
    makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotations)

    svg.append('g').attr("transform","scale("+ init_map_scale + ") translate("+init_map_translate+", "+init_map_translate+")")
        .attr("class", "annotation-group")
        .call(makeAnnotations)
}

function createAnnotationSummer(){

    bbox = svg.select("#TX").node().getBBox();
    const annotations = [
        {
          note: {
            label: "High death rate in the south",
          },
          x: bbox.x + bbox.width/2,
          y: bbox.y + bbox.height/2,
          dy: 100,
          dx: 150
        },
        {
          note: {
            label: "Lower death rate in general",
          },
          x: 1020,
          y: 100,
          dy: -100,
          dx: -50
        }
    ];
    makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotations)

    svg.append('g').attr("transform","scale("+ init_map_scale + ") translate("+init_map_translate+", "+init_map_translate+")")
        .attr("class", "annotation-group")
        .call(makeAnnotations)
}

function createAnnotationAutumn(){
    bbox1 = svg.select("#NY").node().getBBox();
    bbox2 = svg.select("#CA").node().getBBox();
    const annotations = [
        {
          note: {
            label: "Lower death rate on the coasts",
          },
          x: bbox1.x + bbox1.width/2,
          y: bbox1.y + bbox1.height/2,
          dy: -100,
          dx: -100
        },
        {
          note: {
            label: "Lower death rate on the coasts",
          },
          x: bbox2.x + bbox2.width/2,
          y: bbox2.y + bbox2.height/2,
          dy: 50,
          dx: -100
        }
    ];
    makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotations)

    svg.append('g').attr("transform","scale("+ init_map_scale + ") translate("+init_map_translate+", "+init_map_translate+")")
        .attr("class", "annotation-group")
        .call(makeAnnotations)
}

function createAnnotationWinter(){
    const annotations = [
        {
          note: {
            label: "Higher death rate in general",
          },
          x: 1020,
          y: 100,
          dy: -100,
          dx: -50
        }
    ];
    makeAnnotations = d3.annotation()
      .type(d3.annotationLabel)
      .annotations(annotations)

    svg.append('g').attr("transform","scale("+ init_map_scale + ") translate("+init_map_translate+", "+init_map_translate+")")
        .attr("class", "annotation-group")
        .call(makeAnnotations)
}