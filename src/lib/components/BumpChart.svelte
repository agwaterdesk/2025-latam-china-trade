<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import chinaFoodImports from '../data/china-food-imports-by-country.csv';

    let { activeId } = $props();
    let chartContainer;
    let chart;

    onMount(() => {
        createChart();
        return () => {
            if (chart) {
                chart.remove();
            }
        };
    });

    function createChart() {
        if (!chartContainer) return;

        // Clear previous chart
        d3.select(chartContainer).selectAll('*').remove();

        // Filter data based on activeId
        let filteredData;
        if (activeId === 'us_china_chart') {
            // Show only United States data
            filteredData = chinaFoodImports.filter(d => d.partner === 'United States');
        } else if (activeId === 'latam_china_chart') {
            // Show full dataset
            filteredData = chinaFoodImports;
        } else {
            return; // Don't show chart for other views
        }

        // Set up dimensions
        const margin = { top: 20, right: 30, bottom: 40, left: 40 };
        const width = 400;
        const height = 300;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(chartContainer)
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Parse data
        const data = filteredData.map(d => ({
            ...d,
            value: +d.value,
            share: +d.share,
            year: +d.year
        }));

        // Get unique years and partners
        const years = [...new Set(data.map(d => d.year))].sort();
        const partners = [...new Set(data.map(d => d.partner))];

        // Create scales
        const xScale = d3.scaleLinear()
            .domain(d3.extent(years))
            .range([0, innerWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, partners.length])
            .range([0, innerHeight]);

        // Create color scale
        const colorScale = d3.scaleOrdinal()
            .domain(partners)
            .range(d3.schemeCategory10);

        // Create line generator
        const line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.rank))
            .curve(d3.curveMonotoneX);

        // Process data for bump chart
        const processedData = partners.map(partner => {
            const partnerData = data.filter(d => d.partner === partner);
            const sortedByYear = years.map(year => {
                const yearData = partnerData.find(d => d.year === year);
                return yearData ? { ...yearData, year } : null;
            }).filter(Boolean);

            // Calculate ranks for each year
            const rankedData = years.map(year => {
                const yearData = data.filter(d => d.year === year).sort((a, b) => b.value - a.value);
                const partnerIndex = yearData.findIndex(d => d.partner === partner);
                return {
                    year,
                    partner,
                    value: yearData[partnerIndex]?.value || 0,
                    share: yearData[partnerIndex]?.share || 0,
                    rank: partnerIndex >= 0 ? partnerIndex : partners.length
                };
            });

            return {
                partner,
                data: rankedData
            };
        });

        // Draw lines
        g.selectAll('.line')
            .data(processedData)
            .enter()
            .append('path')
            .attr('class', 'line')
            .attr('d', d => line(d.data))
            .attr('stroke', d => colorScale(d.partner))
            .attr('stroke-width', 2)
            .attr('fill', 'none');

        // Draw dots
        g.selectAll('.dot')
            .data(processedData.flatMap(d => d.data))
            .enter()
            .append('circle')
            .attr('class', 'dot')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.rank))
            .attr('r', 4)
            .attr('fill', d => colorScale(d.partner));

        // Add axes
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

        g.append('g')
            .call(d3.axisLeft(yScale).tickFormat(d => `#${d + 1}`));

        // Add title
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', 15)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text(activeId === 'us_china_chart' ? 'US Food Imports to China' : 'China Food Imports by Country');

        chart = svg.node();
    }

    // Recreate chart when activeId changes
    $effect(() => {
        if (chartContainer) {
            createChart();
        }
    });
</script>

<div bind:this={chartContainer} class="bump-chart-container"></div>

<style>
    .bump-chart-container {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1000;
        background: white;
        padding: 20px;
        box-sizing: border-box;
    }

    :global(.bump-chart-container svg) {
        display: block;
    }

    :global(.bump-chart-container .line) {
        opacity: 0.8;
    }

    :global(.bump-chart-container .dot) {
        opacity: 0.9;
    }
</style>
