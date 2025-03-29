// allows you to perform asynchronous operations
async function initializeDashboard(containerId){
     
    /**
     * Initialize the dashboard and set up data loading
     * @param {string} conatinerId: Main container element ID
     * @returns {Object} Dashboard configurtation object
     */

    // The containerId is a string that represents the ID of an HTML element (usually a div) where the dashboard or visualization will be rendered.
    console.log(`Initializing dashboard in containerId: #${containerId}`);

    // Select the container and clear it
    // selects an HTML element based on its id DOM
    const container = document.getElementById(containerId);
    //Error Handeling if container is not found
    if (!container) {
        console.error(`Error: Container with ID "${containerId}" not found.`);
        return null;
    }

    // sets the inner HTML of a container element to dynamically create three visualization cards for the dashboard.
    container.innerHTML = `
        <div id="scatterPlot" class="visualization-card">
            <h2>Streams vs Playlist Reach</h2>
            <div class="viz-controls" id="controlsS"></div>
        </div>
        <div id="topArtists" class="visualization-card">
            <h2>Top Artists by Streams</h2>
            <div class="viz-controls" id="controlsB"></div>
        </div>
        <div id="platformComparison" class="visualization-card">
            <h2>Platform Comparison</h2>
            <div class="viz-controls" id="controlsP"></div>
        </div>
    `;

    // Call integrateVisualizations to load the graphs
    const dashboardController = await integrateVisualizations({
        scatterPlot: "#scatterPlot",
        barChart: "#topArtists",
        platformComparison: "#platformComparison"
    });

    // Error Handeling: Ensure refresh function exists before returning
    if (!dashboardController) {
        console.error("Failed to initialize visualizations.");
        return null;
    }  

    return {
        containerId,
        container,
        refresh: dashboardController.refresh // Allows refreshing the dashboard
    };

}


function createScatterPlot(
    container,
    data,
    config = {
        width: 800,
        height: 400,
        margin: {top: 20, right: 30, bottom: 40, left: 150}
    }

){
    /**
     *  Create interactive scatter plot of streams vs playlisyt reach 
     * 
     * @param {string} container: Container element selector
     * @param {array} data: Streaming data array
     * @param {Object} config: Visualization configuration
     * @returns {Object} svg: D3 visualization instance 
     */


    // Create a button for resetting zoom
    //  retrieve an HTML element with the id of "controlsS" from the document.
    // This element will be used as a container for the new button.
    const controls = document.getElementById('controlsS');
    // create a new <button> element dynamically.
    // The created button element is stored in the variables resetButton and updateButton.
    const resetButton = document.createElement('button');
    const updateButton = document.createElement('button');
    // sets the text content of the buttons to 'Reset Zoom' and 'Update Data'
    resetButton.textContent = 'Reset Zoom';
    updateButton.textContent = 'Update Data';
    // appends the newly created resetButton and updateButton to the controls element.
    controls.appendChild(resetButton);
    controls.appendChild(updateButton);

    // extract dimension details 
    const {width, height, margin} = config;

    // Select the container 
    // Returns a D3 selection object (not a direct DOM element)
    const containerSelector = d3.select(container);
    // Error Handeling: if container is not found print error message
    if (!container) {
        console.error(`Error: Scatter plot container "${container}" not found.`);
        return;
    }
   
    // set up svg
    const svg = containerSelector.append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create a group for the zoomable content
    const g = svg.append('g');

    // Set up scales
    const x = d3.scaleLinear()
        // extent finds the lowest and highest values
        .domain(d3.extent(data, d => d.streams))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        // max sets the domain from 0 to the maximum value in data.
        .domain([0, d3.max(data, d => d.reach)])
        .range([height - margin.bottom, margin.top]);

    //format Billions with B instead of G 
    const customFormat = d => {
        if (d >= 1_000_000_000) {
            return (d / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + "B"; // 2B
        } else if (d >= 1_000_000) {
            return (d / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M"; // 10M
        } else if (d >= 1_000) {
            return (d / 1_000).toFixed(1).replace(/\.0$/, '') + "K"; // 5K
        }
        return d.toString(); // Keep small numbers as-is
    };

    // Create and customize x-axis
    const xAxis = d3.axisBottom(x)
        .ticks(8)                     // Number of ticks
        .tickFormat(customFormat)     // Format tick labels so that M,B are used to represent million and billion.
        .tickSize(10)                 // Size of tick marks
        .tickPadding(5);             // Padding between ticks and labels

    // Create and customize y-axis
    const yAxis = d3.axisLeft(y)
        .ticks(5)                  // Number of ticks
        .tickFormat(customFormat) // Format tick labels so that M,B are used to represent million and billion.
        .tickSize(10)             // Size of tick marks
        .tickPadding(5);         // Padding between ticks and labels


    // Add axes
    // X-axis 
    g.append("g")
        .attr('class', 'x axis')
        .attr("transform", `translate(0,${height - margin.bottom})`)  // move downward
        .call(xAxis);
   
    // Y-axis 
    g.append("g")
        .attr('class', 'y axis') 
        .attr("transform", `translate(${margin.left},0)`) // move to left
        .call(yAxis);

    // Style the axes
    g.selectAll('.axis path, .axis line')
        .style('stroke', '#333')
        .style('stroke-width', 1)
        .style('shape-rendering', 'crispEdges');

    g.selectAll('.axis text')
        .style('font-size', '12px')
        .style('font-family', 'sans-serif');

    // Add axis labels
    g.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2 + 50)
        .attr('y', height + 20)
        .text('Spotify Streams')
        .style('font-size', '14px');

    g.append('text')
        .attr('class', 'y label')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', (-height / 2))
        .attr('y', 40)
        .text('Playlist Reach')
        .style('font-size', '14px');

    // Add vertical gridlines
    g.selectAll("line.vertical-grid")
       .data(x.ticks(5))
       .enter()
       .append("line")
       .attr("class", "vertical-grid")
       .attr("x1", function (d) { return x(d); })
       .attr("y1", 0)
       .attr("x2", function (d) { return x(d); })
       .attr("y2", height)
       .style("stroke", "gray")
       .style("stroke-width", 0.5)
       .style("stroke-dasharray", "3 3");


    // Create circles points
    g.selectAll("circle")
        .data(data)
        .enter().append("circle")
            .attr("cx", d => x(d.streams))
            .attr("cy", d => y(d.reach))
            .attr("r", 5)
            .attr("fill", "#1DB954")
            .style("opacity", 0.7);

    // Create a tooltip div that will stay hidden until hover
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        // Set the initial styling for the tooltip
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "10px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("pointer-events", "none");

    g.selectAll("circle")
      // When mouse hovers over an element
      .on("mouseover", function(event, d) {
          // Change the appearance of the hovered element
          d3.select(this)
              .transition()  // Makes the change smooth
              .duration(500)  // Animation duration in milliseconds
              .attr("fill", "#191414")
              .attr("opacity", 0.5);
          
          // Show the tooltip
          tooltip.transition()
              .duration(500)
              .style("opacity", 0.9);
          
          // Set tooltip content and position
          //helped with the breaks to make each track info their own line
          tooltip.html(`
                <strong>Track:</strong> ${d.track} <br>
                <strong>Artist:</strong> ${d.artist} <br> 
                <strong>Streams:</strong> ${d.streams.toLocaleString()} <br>
                <strong>Reach:</strong> ${d.reach.toLocaleString()}
          `)
              // Position tooltip near the mouse
              // left: Defines how far the element (tooltip) is positioned from the left edge of the page
              // pageX and pageY represent the mouse pointer's position on the screen when the event occurs.
              // The + "px" converts the numeric values into valid CSS pixel (px) values.
              .style("left", (event.pageX + 10) + "px") // Moves tooltip 10px to the right of mouse pointer
              // top: Defines how far the element (tooltip) is positioned from the top edge of the page (or its containing element).
              .style("top", (event.pageY - 20) + "px"); // Moves tooltip 28px above mouse pointer
      })
     // When mouse leaves the element
      .on("mouseout", function() {
          // Return the element to its original appearance
          d3.select(this)
              .transition()
              .duration(500)
              .attr("fill", "#1DB954")
              .attr("opacity", 1);
          
          // Hide the tooltip
          tooltip.transition()
              .duration(500)
              .style("opacity", 0);
      });


    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.5, 5]) // Set minimum and maximum zoom scales
        .on('zoom', zoomed);

    // Apply zoom behavior to SVG
    svg.call(zoom);

    // Zoom event handler
    function zoomed(event) {
        // Apply transformation to the group containing all elements
        g.attr('transform', event.transform);
    }

    // Reset zoom handler
    function resetZoom() {
        svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    }

    // Add reset functionality to button
    resetButton.addEventListener('click', resetZoom);

    // Add instructions text
    svg.append('text')
        .attr('x', 150)
        .attr('y', 10)
        .text('Use mouse wheel to zoom, drag to pan')
        .attr('font-size', '14px')
        .attr('fill', '#666');

// Update pattern with transitions
function update() {

    // Apply a slight transformation to each data point chat
    data.forEach(d => {
        d.streams *= (0.95 + Math.random() * 0.1); // Adjust streams by ±5%
        d.reach *= (0.95 + Math.random() * 0.1);   // Adjust reach by ±5%
    });
    
    // Select all circles and update their positions with animation
    g.selectAll("circle")
        .transition()
        .duration(1000) // Smooth animation duration
        .ease(d3.easeCubicInOut) // Smooth easing function
        .attr("cx", d => x(d.streams))
        .attr("cy", d => y(d.reach));
    }

    // Add event listeners to update the chart when a button is clicked
    updateButton.addEventListener('click', () => update());

    return svg;

}


function createTopArtistChart(
    container,
    data,
    config = {
        width: 800,
        height : 400,
        margin: {top: 20, right: 150, bottom: 60, left: 150}
    }
) {
    /**
     * Create interactive bar chart of top artists. 
     * 
     * @param {string} container - Container element selector
     * @param {Array} data - Artist streaming data
     * @param {Object} config - Chart configuration
     * @returns {Object} D3 visualization instance 
     */

    // Define sort toggle variable
    let sortedAscending = true;
    // Create a button for resetting zoom
    //  retrieve an HTML element with the id of "controls" from the document.
    // This element will be used as a container for the new button.
    const controls = document.getElementById('controlsB');
    // create a new <button> element dynamically.
    // The created button element is stored in the variable resetButton.
    const sortButton = document.createElement('button');
    // sets the text content of the button to "Reset Zoom"
    sortButton.textContent = "Sort";
    // appends the newly created resetButton to the controls element.
    controls.appendChild(sortButton);


     // extract dimension details 
    const {width, height, margin} = config;

     // Select the container 
     // Returns a D3 selection object (not a direct DOM element)
    const containerSelector = d3.select(container);
    
     // set up svg
    const svg = containerSelector.append('svg')
         .attr("width", width + margin.left + margin.right)
         .attr("height", height + margin.top + margin.bottom)
         .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    // transform our data values into pixel coordinates
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.streams)])
        .range([margin.left, width - margin.right])
          
    const y = d3.scaleBand() 
        .domain(data.map(d => d.artist))
        .range([height - margin.bottom, margin.top])
        .padding(0.1);

    // Helped to format Billions with B instead of G 
    const customFormat = d => {
        if (d >= 1_000_000_000) {
            return (d / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + "B"; // 2B
        } else if (d >= 1_000_000) {
            return (d / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M"; // 10M
        } else if (d >= 1_000) {
            return (d / 1_000).toFixed(1).replace(/\.0$/, '') + "K"; // 5K
        }
        return d.toString(); // Keep small numbers as-is
    };

    // Create and customize x-axis
    const xAxis = d3.axisBottom(x)
        .ticks(8)                     // Number of ticks
        .tickFormat(customFormat)       // Format tick labels so that M,B are used to represent million and billion.
        .tickSize(10)                 // Size of tick marks
        .tickPadding(5);             // Padding between ticks and labels

    // Create and customize y-axis
    const yAxis = d3.axisLeft(y)
        .ticks(5)                  // Number of ticks
        .tickSize(10)             // Size of tick marks
        .tickPadding(5);         // Padding between ticks and labels

    // Add axes
    // X-axis 
    svg.append("g")
        .attr('class', 'x axis')
        .attr("transform", `translate(0,${height - margin.bottom})`)  // move downward
        .call(xAxis);
   
    // Y-axis 
    svg.append("g")
        .attr('class', 'y axis') 
        .attr("transform", `translate(${margin.left},0)`) // move to left
        .call(yAxis);

     // Style the axes
    svg.selectAll('.axis path, .axis line')
        .style('stroke', '#333')
        .style('stroke-width', 1)
        .style('shape-rendering', 'crispEdges');

    svg.selectAll('.axis text')
        .style('font-size', '12px')
        .style('font-family', 'sans-serif');

    // Add axis labels
    svg.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + 20)
        .text('Spotify Streams')
        .style('font-size', '14px');

    // Add axis labels
    svg.append('text')
        .attr('class', 'y label')
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-90)`) 
        .attr('x', -height / 2)  // Center it along the Y-axis
        .attr('y', margin.left - 150) // Position inside the left margin
        .attr('dy', '1em') // Adjust for alignment
        .style('fill', 'black') // Ensure visibility
        .style('font-size', '14px')
        .text('TOP 10 Artists');
    
    // Add vertical gridlines
    svg.selectAll("line.vertical-grid")
        .data(x.ticks(5))
        .enter()
        .append("line")
        .attr("class", "vertical-grid")
        .attr("x1", function (d) { return x(d); })
        .attr("y1", 0)
        .attr("x2", function (d) { return x(d); })
        .attr("y2", height)
        .style("stroke", "gray")
        .style("stroke-width", 0.5)
        .style("stroke-dasharray", "3 3");

    // Create bars
    // selects all rect emelemts in the svg even if they don't exits yet 
    svg.selectAll("rect")
        //Each item in data corresponds to one bar in the bar chart.
        .data(data)
        //enter () Checks if there are more data items than existing elements.
        // If no <rect> elements exist yet, .enter() creates a new placeholder for each data item.
        // creates a <rect> for each data item.
        .enter().append("rect")
            .attr("y", d => y(d.artist)) // Correctly places bars on the Y-axis
            .attr("x", margin.left)  // Always start bars at the left margin
            .attr("width", d => x(d.streams) - margin.left)
            .attr("height", y.bandwidth())
            .attr("fill", "#1DB954")
            .attr("opacity", 0.7)
           

    // Create a formatter for numbers with commas for hover label : 1234567 -> "1,234,567"
    const formatNumber = d3.format(","); 

    function sortBars() {
        // Toggle sorting order
        sortedAscending = !sortedAscending;
    
        // use ternary operator to choose between ascending and descending sorting based on the value of sortedAscending
        data.sort((a, b) => sortedAscending ? d3.ascending(a.streams, b.streams) : d3.descending(a.streams, b.streams));
    
        // Update the Y scale with new sorted artist names
        y.domain(data.map(d => d.artist));
    
        // Re-select bars and update their positions
        svg.selectAll("rect")
            .data(data, d => d.artist) // Bind updated sorted data
            .transition()
            .duration(1000)
            .attr("y", d => y(d.artist));

        // helped with excluding the x and y title label as I kept struggeling with it
        const updatedLabels = svg.selectAll("text.label:not(.x.label):not(.y.label)")
            .data(data, d => d.artist);
        

        // updated lables for when data is sorted
        updatedLabels.transition()
            .duration(1000)
            .attr("x", d => x(d.streams) + 5)
            .attr("y", d => y(d.artist) + y.bandwidth() / 2)
            .text(d => `${d.artist}: ${formatNumber(d.streams)}`);
    
        updatedLabels.enter().append("text")
            .attr("class", "label")
            .attr("x", d => x(d.streams) + 5)
            .attr("y", d => y(d.artist) + y.bandwidth() / 2)
            .attr("dy", ".35em")
            .style("font-family", "sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "bold")
            .style('fill', '#3c3d28')
            .style("opacity", 0)
            .text(d => `${d.artist}: ${formatNumber(d.streams)}`)
            .transition()
            .duration(1000)
            .style("opacity", 0);

        // Animate Y-axis to reflect new order
        svg.select(".y.axis")
            .transition()
            .duration(1000)
            .call(yAxis);

        // reapply hover effect to updated labels
        svg.selectAll("rect")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("fill", "#1DB954")
                .attr("opacity", 1)
                .attr("stroke", "#191414")
                .attr("stroke-width", 2);

            // Re-select updated labels and apply hover effect
            updatedLabels.filter(label => label.artist === d.artist)
                .transition()
                .duration(300)
                .style("opacity", 1);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                .duration(500)
                .attr("fill", "#1DB954")
                .attr("opacity", 0.7)
                .attr("stroke", 0)
                .attr("stroke-width", 0);

            // Hide the tooltip for updated labels
            updatedLabels.filter(label => label.artist === d.artist)
                .transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    }

    // Attach event listener to the button
    sortButton.addEventListener('click', sortBars);

    // Add labels to the end of each bar
    const labels = svg.selectAll("text.label:not(.x.label):not(.y.label)")
        .data(data)
        .enter().append("text")
        //  Accesses the streams value for each data point
        // Converts the streams value into a pixel position on the X-axis
        .attr("x", function (d) { return x(d.streams) + 5; })
        .attr("y", function (d) { return y(d.artist) + y.bandwidth() / 2; })
        .attr("dy", ".35em")
        .style("font-family", "sans-serif")
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .style('fill', '#3c3d28')
        .style("opacity", 0)
        .text(d => `${d.artist}: ${formatNumber(d.streams)}`); // Format number with commas

    svg.selectAll("rect")
    // When mouse hovers over an element
    .on("mouseover", function(event, d) {
        // Change the appearance of the hovered element
        d3.select(this)
            .transition()  // Makes the change smooth
            .duration(500)  // Animation duration in milliseconds
            .attr("fill", "#1DB954")
            .attr("opacity", 1) // brighter green
            .attr("stroke", "#191414") // add stroke 
            .attr("stroke-width", 2);

        // Show only the corresponding label
        labels.filter(label => label.artist === d.artist) // Match correct artist
            .transition()
            .duration(300)
            .style("opacity", 1); // Make label visible
    })
    // When mouse leaves the element
    .on("mouseout", function(event, d) {
        // Return the element to its original appearance
        d3.select(this)
            .transition()
            .duration(500)
            .attr("fill", "#1DB954")
            .attr("opacity", 0.7)
            .attr("stroke", 0)
            .attr("stroke-width", 0);
        
        // Hide the tooltip
        labels.filter(label => label.artist === d.artist)
            .transition()
            .duration(500)
            .style("opacity", 0);
    });

    

}


function createPlatformComparison(
    container,
    data,
    metric = 'total',
    config = {
        width: 800,
        height : 400,
        margin: {top: 20, right: 150, bottom: 60, left: 150}
    }
) {
    /**
     * Create interactive bar chart of top artists. 
     * 
     * @param {string} container - Container element selector
     * @param {Array} data - Platform streaming data
     * @param {string} metric - Comparison metric
     * @param {Object} config - Visualization configuration
     * @returns {Object} D3 visualization instance 
     */

    // Create a button for resetting zoom
    //  retrieve an HTML element with the id of "controls" from the document.
    // This element will be used as a container for the new button.
    const controls = document.getElementById('controlsP');
    // create a new <button> elements dynamically.
    // The created button element is stored in the variable names.
    const totalButton = document.createElement('button');
    const medianButton = document.createElement('button');
    const averageButton = document.createElement('button');
    // sets the text content of the buttons 
    totalButton.textContent = "Total";
    medianButton.textContent = "Median";
    averageButton.textContent = "Average";
    // appends the newly created buttons to the controls element.
    controls.appendChild(totalButton);
    controls.appendChild(medianButton);
    controls.appendChild(averageButton);

    // extract dimension details 
    const {width, height, margin} = config;

    // Select the container 
    // Returns a D3 selection object (not a direct DOM element)
    const containerSelector = d3.select(container);
    
    // set up svg
    const svg = containerSelector.append('svg')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        // // Adds a <g> (group) element  allows transformations (scaling, translation, zooming) to be applied to everything inside the group at once
        // .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    // transform our data values into pixel coordinates
    const x = d3.scaleBand()
        .domain(data.map(d => d.platform))
        .range([margin.left, width - margin.right])
        .padding(0.1);;
     
    const y = d3.scaleLinear() 
        .domain([0, d3.max(data, d => d[metric])])
        .range([height - margin.bottom, margin.top])

    //Helped to format Billions with B instead of G 
    const customFormat = d => {
        if (d >= 1_000_000_000) {
            return (d / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + "B"; // 2B
        } else if (d >= 1_000_000) {
            return (d / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M"; // 10M
        } else if (d >= 1_000) {
            return (d / 1_000).toFixed(1).replace(/\.0$/, '') + "K"; // 5K
        }
        return d.toString(); // Keep small numbers as-is
    };

    // Create and customize x-axis
    const xAxis = d3.axisBottom(x)
        .ticks(8)                     // Number of ticks
        .tickSize(10)                 // Size of tick marks
        .tickPadding(5);             // Padding between ticks and labels

    // Create and customize y-axis
    const yAxis = d3.axisLeft(y)
        .ticks(5)                  // Number of ticks
        .tickFormat(customFormat)       // Format tick labels so that M,B are used to represent million and billion.
        .tickSize(10)             // Size of tick marks
        .tickPadding(5);         // Padding between ticks and labels

    // Add axes
    // X-axis 
    svg.append("g")
        .attr('class', 'x axis')
        .attr("transform", `translate(0,${height - margin.bottom})`)  // move downward
        .call(xAxis);

    // Y-axis 
    svg.append("g")
        .attr('class', 'y axis') 
        .attr("transform", `translate(${margin.left},0)`) // move to left
        .call(yAxis);

    // Style the axes
    svg.selectAll('.axis path, .axis line')
        .style('stroke', '#333')
        .style('stroke-width', 1)
        .style('shape-rendering', 'crispEdges');

    svg.selectAll('.axis text')
        .style('font-size', '12px')
        .style('font-family', 'sans-serif');

    // Add axis labels
    svg.append('text')
        .attr('class', 'x label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + 20)
        .text('Platforms')
        .style('font-size', '14px');

    // Add axis labels
    svg.append('text')
        .attr('class', 'y label')
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-90)`) 
        .attr('x', -height / 2)  // Center it along the Y-axis
        .attr('y', margin.left - 150) // Position inside the left margin
        .attr('dy', '1em') // Adjust for alignment
        .style('fill', 'black') // Ensure visibility
        .style('font-size', '14px')
        .text(metric.charAt(0).toUpperCase() + metric.slice(1) + " Streams/Views");

    // Define a color map for specific platforms
    const platformColors = {
        "Spotify": "#1DB954",
        "YouTube": "#FF0000",
        "TikTok": "#000000"
    };

    // Create bars
    svg.selectAll("rect")
    .data(data)
    .enter().append("rect")
        .attr("x", d => x(d.platform))
        .attr("y", d => y(d[metric]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - margin.bottom - y(d[metric]))
        .attr("fill", d => platformColors[d.platform])

    // function that updates chart with transition based on metric chosen
    function updateChart(metric) {
        // Update y-axis scale domain based on selected metric
        y.domain([0, d3.max(data, d => d[metric])])

        // Transition the bars to new heights
        svg.selectAll("rect")
            .transition()
            .duration(1000)
            .attr("y", d => y(d[metric])) // Update position
            .attr("height", d => height - margin.bottom - y(d[metric])); // Update height
    
        // Transition the y-axis
        svg.select(".y.axis")
            .transition()
            .duration(1000)
            .call(yAxis);
    
        // Update Y-axis label dynamically
        svg.select(".y.label")
            .text(metric.charAt(0).toUpperCase() + metric.slice(1) + " Streams/Views");
    }

    // Add event listeners to update the chart when a button is clicked
    totalButton.addEventListener('click', () => updateChart('total'));
    medianButton.addEventListener('click', () => updateChart('median'));
    averageButton.addEventListener('click', () => updateChart('average'));

    
    // Create a legend container
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 150}, 50)`); // Position legend

    // Append legend items
    legend.selectAll("legend-dots")
        .data(data.map(d => d.platform)) // Use platform names
        .enter()
        .append("circle") // Use circle for legend markers
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 25) // Space them out
        .attr("r", 4) // Circle size
        .style("fill", d => platformColors[d]); // Assign corresponding color
      
    // Append legend text
    legend.selectAll("legend-labels")
        .data(data.map(d => d.platform))
        .enter()
        .append("text") 
        .attr("x", 20) // Position next to squares
        .attr("y", (d, i) => i * 25 + 2) // Align text with squares
        .text(d => d)
        .style("font-size", "14px")
        .style("fill", "#333")
        .attr("text-anchor", "start");

    // Create a tooltip div that will stay hidden until hover
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        // Set the initial styling for the tooltip
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "10px")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("pointer-events", "none");

    svg.selectAll("rect")
    // When mouse hovers over an element
    .on("mouseover", function(event, d) {
        // Change the appearance of the hovered element
        d3.select(this)
            .transition()  // Makes the change smooth
            .duration(100)  // Animation duration in milliseconds
            .attr("fill", d => platformColors[d.platform])
            .attr("opacity", 0.5);
        
        // Show the tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0.9);
        
        // Set tooltip content and position
        // break makes each track info their own line
        tooltip.html(`
                <strong>Track:</strong> ${d.platform} <br>
                <strong>Streams/Views:</strong> ${d[metric].toLocaleString()} <br>

        `)
            // Position tooltip near the mouse
            // left: Defines how far the element (tooltip) is positioned from the left edge of the page
            // pageX and pageY represent the mouse pointer's position on the screen when the event occurs.
            // The + "px" converts the numeric values into valid CSS pixel (px) values.
            .style("left", (event.pageX + 10) + "px") // Moves tooltip 10px to the right of mouse pointer
            // top: Defines how far the element (tooltip) is positioned from the top edge of the page (or its containing element).
            .style("top", (event.pageY - 20) + "px"); // Moves tooltip 28px above mouse pointer
    })
    // When mouse leaves the element
    .on("mouseout", function() {
        // Return the element to its original appearance
        d3.select(this)
            .transition()
            .duration(500)
            .attr("fill", d => platformColors[d.platform])
            .attr("opacity", 1);
        
        // Hide the tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    });


}

async function integrateVisualizations(
    config = {
        scatterPlot: `#scatterPlot`,
        barChart : `#topArtists`,
        platformComparison: `#platformComparison`
    }
) {
    /**
     * Integrate all visualizations into cohesive dahsboard 
     * 
     * @param {Object} config: Dashboard configuration
     * @returns {Object} : dashboard controler instance
     */

    console.log("Initializing dashboard visualizations...");

    try {
        // Fetch all data concurrently
        const [tracksResponse, artistsResponse, platformsResponse] = await Promise.all([
            fetch("http://localhost:8000/api/tracks"),
            fetch("http://localhost:8000/api/top-artists"),
            fetch("http://localhost:8000/api/platform-comparison")
        ]);

        // Convert responses to JSON dict
        const tracksData = await tracksResponse.json();
        const topArtistsData = await artistsResponse.json();
        const platformsData = await platformsResponse.json();

        console.log("Fetched all visualization data:", { tracksData, topArtistsData, platformsData });

        // Organize scatter plot data
        const scatterData = tracksData.data.map(d => ({
            streams: parseFloat(d["Spotify Streams"]),
            reach: parseFloat(d["Spotify Playlist Reach"]),
            track: d["Track"],
            artist: d["Artist"]
        }));

        // Organize bar chart data
        const barChartData = topArtistsData.map(d => ({
            artist: d["Artist"],
            streams: d["Spotify Streams"]
        }));

        // Organize platform comparison data
        const platformData = Object.keys(platformsData).map(platform => ({
            platform: platform,
            total: platformsData[platform].total,
            average: platformsData[platform].average,
            median: platformsData[platform].median
        }));

        // Display visualizations
        createScatterPlot(config.scatterPlot, scatterData);
        createTopArtistChart(config.barChart, barChartData);
        createPlatformComparison(config.platformComparison, platformData);

        // Return a controller object for updates
        return {
            refresh: async () => {
                console.log("Refreshing dashboard visualizations...");
                integrateVisualizations(config);
            }
        };

    } catch (error) {
        console.error("Error loading visualization data:", error);
    }

}      


document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard("dashboard");
});

